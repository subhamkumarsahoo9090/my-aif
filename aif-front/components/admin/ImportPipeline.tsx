"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api, apiFetch } from "@/config/endapi";
import { parseLedgerStatement, type LedgerStatement } from "@/lib/ledger-statement";
import StatusBadge from "@/components/ui/StatusBadge";

type ImportKind = "ledger" | "holdings";
type PreviewRow = { line: number; ok: boolean; errors: string[]; values: Record<string, string> };
type ClientOption = { code: string; name: string };
type ImportRecord = {
  id: string;
  type: string;
  fileName: string;
  status: string;
  valid: number;
  failed: number;
  at: string;
  actor: string;
  clientCode?: string;
  clientName?: string;
};

const ledgerSample = `{
  "lvbody": {
    "dspvchdetail": [
      {
        "dspvchdate": "21-Aug-25",
        "dspvchledaccount": "Wealth Discovery India Opportunity Fund ICICI",
        "dspvchtype": "Rcpt",
        "dspvchcramt": 2500000.0,
        "dspvchnumber": { "dspvchnumber": { "dspexplvchnumber": "(No. :10)" } }
      }
    ]
  }
}`;

export default function ImportPipeline({ kind }: { kind: ImportKind }) {
  const type = kind;
  const [fileName, setFileName] = useState("");
  const [csv, setCsv] = useState("");
  const [clientCode, setClientCode] = useState("");
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [counts, setCounts] = useState({ valid: 0, failed: 0 });
  const [report, setReport] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [history, setHistory] = useState<ImportRecord[]>([]);

  async function loadHistory() {
    const response = await apiFetch(api.admin.imports);
    const data = (await response.json().catch(() => ({}))) as { imports?: ImportRecord[] };
    if (response.ok) setHistory((data.imports ?? []).filter((job) => job.type === type));
  }

  useEffect(() => {
    let active = true;
    async function loadClients() {
      const response = await apiFetch(api.admin.clients);
      const data = (await response.json().catch(() => ({}))) as { clients?: ClientOption[] };
      if (active && response.ok) setClients(data.clients ?? []);
    }
    void loadClients();
    if (type === "ledger") void loadHistory();
    return () => {
      active = false;
    };
  }, []);

  async function readFile(file: File) {
    setFileName(file.name);
    setRows(null);
    setReport("");
    const lower = file.name.toLowerCase();
    if (type === "ledger" && !/\.(xlsx|xls|pdf)$/.test(lower)) {
      setCsv("");
      setMessage("Upload an Excel or PDF file.");
      return;
    }
    if (type === "ledger" && lower.endsWith(".pdf")) {
      setPending(true);
      setMessage("Reading the PDF...");
      try {
        const text = await readPdf(file);
        setCsv(text);
        setMessage(null);
        await preview(text, file.name);
      } catch {
        setCsv("");
        setMessage("The PDF could not be read. Use a text PDF, or an Excel file.");
      } finally {
        setPending(false);
      }
      return;
    }
    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      const XLSX = await import("xlsx");
      const book = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = book.Sheets[book.SheetNames[0]];
      const text = XLSX.utils.sheet_to_csv(sheet);
      setCsv(text);
      setMessage(null);
      if (type === "ledger") await preview(text, file.name);
      return;
    }
    const text = await file.text();
    setCsv(text);
    setMessage(null);
    await preview(text, file.name);
  }

  async function preview(source = csv, name = fileName) {
    setPending(true);
    setMessage(null);
    try {
      const response = await apiFetch(api.admin.imports, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "preview", type, csv: source, fileName: name, clientCode }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        rows?: PreviewRow[];
        valid?: number;
        failed?: number;
        message?: string;
      };
      if (!response.ok || !data.rows) {
        setMessage(data.message ?? "The file could not be checked.");
        return;
      }
      setRows(data.rows);
      setCounts({ valid: data.valid ?? 0, failed: data.failed ?? 0 });
    } catch {
      setMessage("The file could not be checked.");
    } finally {
      setPending(false);
    }
  }

  async function commit() {
    setPending(true);
    const response = await apiFetch(api.admin.imports, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "commit", type, csv, fileName, clientCode }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      job?: { valid: number; failed: number };
      errorReport?: string;
      message?: string;
    };
    setPending(false);
    if (!response.ok || !data.job) {
      setMessage(data.message ?? "The import could not be committed.");
      return;
    }
    setReport(data.errorReport ?? "");
    setMessage(
      isLedger
        ? `Saved ${data.job.valid} rows for this client. ${data.job.failed} rows were left out.`
        : `Committed ${data.job.valid} rows. ${data.job.failed} rows were logged as errors.`,
    );
    if (isLedger) await loadHistory();
  }

  const statement = useMemo(
    () => (type === "ledger" && csv.trim() ? parseLedgerStatement(csv) : null),
    [type, csv],
  );

  const isLedger = type === "ledger";

  return (
    <div className="flex flex-col gap-4">
      <section className={`${cardClass} p-5`}>
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7F0FF] text-sm font-semibold text-[#1D4E89]">1</span>
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-[#2E5FA5]">{isLedger ? <ListIcon /> : <GridIcon />}</span>
          <div>
            <h2 className="text-[15px] font-semibold text-[#16324F]">{isLedger ? "Upload ledger" : "Add holding"}</h2>
            <p className="text-xs text-[#7B8794]">
              {isLedger
                ? "The file replaces that client's ledger. Dates, particulars, voucher, debit, and credit are kept."
                : "Bring in scheme units for investor accounts."}
            </p>
          </div>
        </div>

        <div className={`grid gap-4 ${isLedger ? "md:grid-cols-2" : ""}`}>
          {isLedger ? (
            <label className="text-sm">
              <span className="mb-1.5 block text-sm font-medium text-[#1B3C6C]">Client</span>
              <span className="relative block">
                <select
                  value={clientCode}
                  onChange={(event) => setClientCode(event.target.value)}
                  className={`${fieldClass} appearance-none pr-10! ${clientCode ? "" : "text-[#9AA3AF]"}`}
                >
                  <option value="">Match the name in the file</option>
                  {clients.map((client) => (
                    <option key={client.code} value={client.code}>
                      {client.name} · {client.code}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#8B95A5]">
                  <ChevronDown />
                </span>
              </span>
            </label>
          ) : null}

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#D5DDE6] bg-[#F8FAFC] px-4 py-6 text-center hover:border-[#F97316]">
            <input
              type="file"
              accept={isLedger ? ".xlsx,.xls,.pdf,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : ".csv,text/csv"}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.currentTarget.value = "";
                if (file) void readFile(file);
              }}
            />
            <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF1E6] text-[#F97316]">
              <UploadIcon />
            </span>
            <span className="text-sm font-semibold text-[#16324F]">
              {pending ? "Checking the file..." : fileName || (isLedger ? "Choose a ledger file" : "Choose a CSV file")}
            </span>
            <span className="mt-1 text-xs text-[#7B8794]">{isLedger ? "Excel or PDF" : "CSV with ISIN, allottee, PAN, and units"}</span>
          </label>
        </div>

        <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[#7B8794]">
          <InfoIcon />
          {isLedger
            ? "Columns used are Date, Particulars, Vch Type, Vch No., Debit, and Credit. Closing balance rows are left off the import."
            : "Rows are kept when the PAN matches a client. ISIN, description, allotment date, allottee, PAN, and units are saved."}
        </p>

        {statement ? <LedgerSheet statement={statement} /> : null}

        {isLedger ? (
          <>
            <label className="mt-5 block text-sm">
              <span className="mb-1.5 flex items-center justify-between gap-3">
                <span className="font-medium text-[#1B3C6C]">{statement ? "Source text" : "Paste instead"}</span>
                <span className="text-xs text-[#7B8794]">{csv ? `${csv.split(/\r?\n/).length} lines` : "Optional"}</span>
              </span>
              <textarea
                value={csv}
                onChange={(event) => setCsv(event.target.value)}
                rows={statement ? 6 : 8}
                placeholder={ledgerSample}
                spellCheck={false}
                className="min-h-36 w-full resize-y rounded-xl border border-[#E3E8EF] bg-white px-4 py-3 font-mono text-sm leading-6 text-foreground outline-none placeholder:text-[#9AA3AF] focus:border-[#F97316]"
              />
            </label>
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => void preview()} className={orangeButtonClass} disabled={pending || !csv.trim()}>
                {pending ? "Checking..." : "Check file"}
              </button>
            </div>
          </>
        ) : null}
      </section>

      {message ? <p className={`${cardClass} px-5 py-3 text-sm text-[#16324F]`}>{message}</p> : null}

      {rows ? (
        <section className={cardClass}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7F0FF] text-sm font-semibold text-[#1D4E89]">2</span>
              <div>
                <h2 className="text-[15px] font-semibold text-[#16324F]">Preview</h2>
                <p className="text-xs text-[#7B8794]">{counts.valid} rows ready · {counts.failed} rows failed</p>
              </div>
            </div>
            <button type="button" onClick={() => void commit()} className={orangeButtonClass} disabled={pending || counts.valid === 0}>
              {isLedger ? "Commit valid rows" : "Upload matched rows"}
            </button>
          </div>
          {rows.some((row) => "isin" in row.values) ? (
            <HoldingPreview rows={rows} />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-y border-[#E6EDF5] text-xs uppercase tracking-wide text-[#7B8794]">
                  <tr>
                    <th className="px-5 py-3 font-medium">Line</th>
                    <th className="px-5 py-3 font-medium">Result</th>
                    <th className="px-5 py-3 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.line} className="border-b border-[#EEF2F6] last:border-0">
                      <td className="px-5 py-3 font-medium text-[#16324F]">{row.line}</td>
                      <td className="px-5 py-3">
                        <StatusBadge tone={row.ok ? "success" : "danger"}>{row.ok ? "Valid" : "Failed"}</StatusBadge>
                      </td>
                      <td className="px-5 py-3 text-[#3D4C5E]">{row.ok ? Object.values(row.values).join(" · ") : row.errors.join(" ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {isLedger ? <LedgerHistory jobs={history} /> : null}

      {report.trim().split("\n").length > 1 ? (
        <section className={`${cardClass} flex flex-wrap items-center justify-between gap-3 p-5`}>
          <div>
            <h2 className="text-[15px] font-semibold text-[#16324F]">Error log</h2>
            <p className="text-xs text-[#7B8794]">Rows that were not committed.</p>
          </div>
          <a
            className="inline-flex items-center rounded-full border border-[#D5DDE6] bg-white px-5 py-2.5 text-sm font-medium text-[#1B3C6C] hover:bg-[#F8FAFC]"
            href={`data:text/plain;charset=utf-8,${encodeURIComponent(report)}`}
            download="import-errors.txt"
          >
            Download error report
          </a>
        </section>
      ) : null}
    </div>
  );
}

const cardClass = "rounded-2xl border border-[#E6EDF5] bg-white shadow-[0_8px_24px_rgba(20,50,90,0.05)]";
const fieldClass =
  "w-full rounded-xl border border-[#E3E8EF] bg-white py-2.5 pl-3 pr-3 text-sm text-foreground outline-none focus:border-[#F97316]";
const orangeButtonClass =
  "inline-flex items-center justify-center rounded-full bg-[#F97316] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(249,115,22,0.35)] hover:bg-[#EA6C0C] disabled:cursor-not-allowed disabled:opacity-60";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      {children}
    </svg>
  );
}

function ListIcon() {
  return (
    <Icon>
      <path d="M8 7h11M8 12h11M8 17h11" strokeLinecap="round" />
      <path d="M4 7h.01M4 12h.01M4 17h.01" strokeLinecap="round" />
    </Icon>
  );
}

function GridIcon() {
  return (
    <Icon>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </Icon>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 16V6" strokeLinecap="round" />
      <path d="m8 9 4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 19h14" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="m7 10 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 11v5M12 8h.01" strokeLinecap="round" />
    </svg>
  );
}

function LedgerHistory({ jobs }: { jobs: ImportRecord[] }) {
  return (
    <section className={cardClass}>
      <div className="flex items-center gap-3 px-5 pt-5">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7F0FF] text-sm font-semibold text-[#1D4E89]">3</span>
        <div>
          <h2 className="text-[15px] font-semibold text-[#16324F]">Upload history</h2>
          <p className="text-xs text-[#7B8794]">When a ledger file was saved, which client it was for, and who uploaded it.</p>
        </div>
      </div>
      {jobs.length === 0 ? (
        <p className="m-5 rounded-xl border border-dashed border-[#E3E8EF] px-3 py-6 text-center text-sm text-[#7B8794]">
          No ledger file has been uploaded yet.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-y border-[#E6EDF5] text-xs uppercase tracking-wide text-[#7B8794]">
              <tr>
                {["When", "File", "Client", "Rows", "Uploaded by", "Status"].map((column) => (
                  <th key={column} className="whitespace-nowrap px-5 py-3 font-medium">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b border-[#EEF2F6] last:border-0">
                  <td className="whitespace-nowrap px-5 py-3 text-[#16324F]">{historyWhen(job.at)}</td>
                  <td className="px-5 py-3 font-medium text-[#16324F]">{job.fileName}</td>
                  <td className="px-5 py-3 text-[#3D4C5E]">
                    {job.clientName || job.clientCode ? (
                      <>
                        <span className="text-[#16324F]">{job.clientName || job.clientCode}</span>
                        {job.clientName && job.clientCode ? <span className="mt-0.5 block text-xs text-[#7B8794]">{job.clientCode}</span> : null}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-[#16324F]">
                    {job.valid} saved{job.failed ? ` · ${job.failed} failed` : ""}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-[#3D4C5E]">{job.actor || "—"}</td>
                  <td className="px-5 py-3">
                    <StatusBadge tone={job.status === "committed" ? "success" : "danger"}>
                      {job.status === "committed" ? "Saved" : "Failed"}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function historyWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function HoldingPreview({ rows }: { rows: PreviewRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-y border-[#E6EDF5] text-xs uppercase tracking-wide text-[#7B8794]">
          <tr>
            {["Sr. No.", "ISIN", "Description", "Allotment date", "Allottee", "PAN", "Units", "Client", "Result"].map((column) => (
              <th key={column} className="whitespace-nowrap px-4 py-3 font-medium">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.line} className="border-b border-[#EEF2F6] last:border-0">
              <td className="px-4 py-3 text-[#16324F]">{row.values.srno}</td>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-[#16324F]">{row.values.isin}</td>
              <td className="min-w-56 px-4 py-3 text-[#3D4C5E]">{row.values.description}</td>
              <td className="whitespace-nowrap px-4 py-3 text-[#3D4C5E]">{sheetDate(row.values.allotmentdate)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-[#16324F]">{row.values.allottee}</td>
              <td className="whitespace-nowrap px-4 py-3 text-[#3D4C5E]">{row.values.pan}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-[#16324F]">{row.values.units}</td>
              <td className="whitespace-nowrap px-4 py-3 text-[#16324F]">{row.values.clientname || "—"}</td>
              <td className="px-4 py-3">
                {row.ok ? (
                  <StatusBadge tone="success">Matched</StatusBadge>
                ) : (
                  <span className="text-danger">{row.errors.join(" ")}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LedgerSheet({ statement }: { statement: LedgerStatement }) {
  const [title, investor] = statement.headerLines;
  const debitTotal = statement.entries.reduce((sum, entry) => sum + (entry.type === "debit" ? entry.amount : 0), 0);
  const creditTotal = statement.entries.reduce((sum, entry) => sum + (entry.type === "credit" ? entry.amount : 0), 0);

  return (
    <article className="mt-5 overflow-hidden rounded-2xl border border-[#d7e2f0] bg-white shadow-[0_16px_40px_rgba(20,50,90,0.08)]">
      <header className="bg-[linear-gradient(180deg,#16386a_0%,#1B3C6C_100%)] px-6 py-7 text-center text-white">
        <p className="text-lg font-semibold tracking-tight">{title || "Ledger account"}</p>
        {investor ? <p className="mt-1 text-base font-semibold">{investor}</p> : null}
        <p className="mt-1 text-sm text-white/75">Ledger Account</p>
        {statement.period ? <p className="mt-4 text-sm tracking-wide">{statement.period}</p> : null}
      </header>
      <div className="overflow-x-auto px-4 py-5 sm:px-6">
        <table className="min-w-[46rem] w-full border-collapse text-sm">
          <thead>
            <tr className="border-y-2 border-[#1B3C6C] text-left text-xs uppercase tracking-wide text-[#1B3C6C]">
              <th className="px-3 py-3 font-semibold">Date</th>
              <th className="px-3 py-3 font-semibold">Particulars</th>
              <th className="px-3 py-3 font-semibold">Vch Type</th>
              <th className="px-3 py-3 font-semibold">Vch No.</th>
              <th className="px-3 py-3 text-right font-semibold">Debit</th>
              <th className="px-3 py-3 text-right font-semibold">Credit</th>
            </tr>
          </thead>
          <tbody>
            {statement.entries.map((entry) => (
              <tr key={`${entry.line}-${entry.vchNo}`} className="border-b border-[#e6eef8]">
                <td className="whitespace-nowrap px-3 py-3 text-[#1B3C6C]">{sheetDate(entry.date)}</td>
                <td className="px-3 py-3 text-[#1B3C6C]">{entry.particulars}</td>
                <td className="px-3 py-3 capitalize text-[#1B3C6C]">{entry.vchType}</td>
                <td className="px-3 py-3 text-[#1B3C6C]">{entry.vchNo}</td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-[#1B3C6C]">
                  {entry.type === "debit" ? sheetAmount(entry.amount) : ""}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-[#1B3C6C]">
                  {entry.type === "credit" ? sheetAmount(entry.amount) : ""}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#1B3C6C] text-[#1B3C6C]">
              <td className="px-3 py-3" colSpan={4}>
                <span className="font-semibold">Total</span>
                <span className="ml-2 text-xs font-normal text-muted">Closing balance is not imported</span>
              </td>
              <td className="whitespace-nowrap border-t border-[#1B3C6C] px-3 py-3 text-right font-semibold tabular-nums">
                {debitTotal ? sheetAmount(debitTotal) : ""}
              </td>
              <td className="whitespace-nowrap border-t border-[#1B3C6C] px-3 py-3 text-right font-semibold tabular-nums">
                {creditTotal ? sheetAmount(creditTotal) : ""}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </article>
  );
}

function sheetDate(iso: string) {
  if (!iso) return "";
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day}-${names[month - 1]}-${String(year).slice(2)}`;
}

function sheetAmount(value: number) {
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

async function readPdf(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let number = 1; number <= doc.numPages; number += 1) {
    const page = await doc.getPage(number);
    const content = await page.getTextContent();
    pages.push(linesFromPdfItems(content.items));
  }
  const text = pages.map((page) => page.trim()).filter(Boolean).join("\n");
  if (!text) throw new Error("This PDF has no text.");
  return text;
}

function linesFromPdfItems(items: unknown[]) {
  const rows = new Map<number, Array<{ x: number; text: string }>>();
  for (const item of items) {
    if (!item || typeof item !== "object" || !("str" in item) || !("transform" in item)) continue;
    const text = String((item as { str: unknown }).str).trim();
    const transform = (item as { transform: unknown }).transform;
    if (!text || !Array.isArray(transform)) continue;
    const y = Math.round(Number(transform[5]));
    const key = [...rows.keys()].find((value) => Math.abs(value - y) <= 2) ?? y;
    const line = rows.get(key) ?? [];
    line.push({ x: Number(transform[4]), text });
    rows.set(key, line);
  }
  return [...rows.entries()]
    .sort((left, right) => right[0] - left[0])
    .map(([, line]) =>
      line
        .sort((left, right) => left.x - right.x)
        .map((part) => part.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean)
    .join("\n");
}
