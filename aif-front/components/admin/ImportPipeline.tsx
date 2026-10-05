"use client";

import { useEffect, useMemo, useState } from "react";
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/classes";
import { api, apiFetch } from "@/config/endapi";
import { parseLedgerStatement, type LedgerStatement } from "@/lib/ledger-statement";
import StatusBadge from "@/components/ui/StatusBadge";

type ImportKind = "ledger" | "holdings";
type PreviewRow = { line: number; ok: boolean; errors: string[]; values: Record<string, string> };
type ClientOption = { code: string; name: string };

const samples: Record<ImportKind, string> = {
  ledger: `{
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
}`,
  holdings: "clientCode,identifier,quantity,averageCost,marketValue\nTC24018,TGF-I-A,4500,1000,5130000",
};

export default function ImportPipeline() {
  const [type, setType] = useState<ImportKind>("ledger");
  const [fileName, setFileName] = useState("");
  const [csv, setCsv] = useState("");
  const [clientCode, setClientCode] = useState("");
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [counts, setCounts] = useState({ valid: 0, failed: 0 });
  const [report, setReport] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadClients() {
      const response = await apiFetch(api.admin.clients);
      const data = (await response.json().catch(() => ({}))) as { clients?: ClientOption[] };
      if (active && response.ok) setClients(data.clients ?? []);
    }
    void loadClients();
    return () => {
      active = false;
    };
  }, []);

  async function readFile(file: File) {
    setFileName(file.name);
    setRows(null);
    setReport("");
    const lower = file.name.toLowerCase();
    if (type === "ledger" && lower.endsWith(".csv")) {
      setCsv("");
      setMessage("CSV is not accepted. Upload Excel, TXT, JSON, PDF, or a JPG.");
      return;
    }
    if (type === "ledger" && lower.endsWith(".pdf")) {
      setPending(true);
      setMessage("Reading the PDF...");
      try {
        setCsv(await readPdf(file));
        setMessage(null);
      } catch {
        setCsv("");
        setMessage("The PDF could not be read. Use a text PDF, or a JPG of the ledger.");
      } finally {
        setPending(false);
      }
      return;
    }
    if (type === "ledger" && /\.(jpe?g|png|webp)$/i.test(lower)) {
      setPending(true);
      setMessage("Reading the image...");
      try {
        const tesseract = await import("tesseract.js");
        const result = await tesseract.default.recognize(file, "eng");
        setCsv(result.data.text);
        setMessage(null);
      } catch {
        setCsv("");
        setMessage("The image could not be read. Use a clear JPG of the ledger.");
      } finally {
        setPending(false);
      }
      return;
    }
    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      const XLSX = await import("xlsx");
      const book = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = book.Sheets[book.SheetNames[0]];
      setCsv(XLSX.utils.sheet_to_csv(sheet));
      setMessage(null);
      return;
    }
    setCsv(await file.text());
    setMessage(null);
  }

  async function preview() {
    setPending(true);
    setMessage(null);
    const response = await apiFetch(api.admin.imports, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "preview", type, csv, fileName, clientCode }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      rows?: PreviewRow[];
      valid?: number;
      failed?: number;
      message?: string;
    };
    setPending(false);
    if (!response.ok || !data.rows) {
      setMessage(data.message ?? "The file could not be checked.");
      return;
    }
    setRows(data.rows);
    setCounts({ valid: data.valid ?? 0, failed: data.failed ?? 0 });
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
    setMessage(`Committed ${data.job.valid} rows. ${data.job.failed} rows were logged as errors.`);
  }

  const statement = useMemo(
    () => (type === "ledger" && csv.trim() ? parseLedgerStatement(csv) : null),
    [type, csv],
  );

  return (
    <div className="w-full space-y-4">
      <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_24px_rgba(20,50,90,0.05)]">
        <h2 className="text-sm font-semibold text-primary">1. Upload and type</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <label className="text-sm">
            <span className={labelClass}>Import type</span>
            <select
              value={type}
              onChange={(event) => {
                setType(event.target.value as ImportKind);
                setRows(null);
              }}
              className={inputClass}
            >
              <option value="ledger">Ledger</option>
              <option value="holdings">Holdings</option>
            </select>
          </label>
          {type === "ledger" ? (
            <label className="text-sm">
              <span className={labelClass}>Client</span>
              <select value={clientCode} onChange={(event) => setClientCode(event.target.value)} className={inputClass}>
                <option value="">Match the name in the file</option>
                {clients.map((client) => (
                  <option key={client.code} value={client.code}>
                    {client.name} · {client.code}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className={`text-sm ${type === "ledger" ? "" : "lg:col-span-2"}`}>
            <span className={labelClass}>{type === "ledger" ? "Ledger file" : "CSV file"}</span>
            <input
              type="file"
              accept={type === "ledger" ? ".xlsx,.xls,.txt,.json,.pdf,.jpg,.jpeg,.png,.webp,image/*" : ".csv,text/csv"}
              className="block w-full cursor-pointer rounded-xl border border-dashed border-border bg-[var(--pm-portal-page)] px-3 py-3 text-sm text-foreground file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void readFile(file);
              }}
            />
          </label>
        </div>
        {type === "ledger" ? (
          <p className="mt-4 text-sm text-muted">
            Upload Excel, TXT, JSON, PDF, or a JPG of the ledger. The statement below uses Date, Particulars, Vch Type, Vch No., Debit, and Credit. Closing balance rows are left off the import.
          </p>
        ) : null}
        {statement ? <LedgerSheet statement={statement} /> : null}
        <label className="mt-4 block text-sm">
          <span className="mb-1 flex items-center justify-between gap-3">
            <span className="font-medium text-foreground">{statement ? "Source text" : fileName || "File contents"}</span>
            <span className="text-xs text-muted">{csv ? `${csv.split(/\r?\n/).length} lines` : "Paste or upload"}</span>
          </span>
          <textarea
            value={csv}
            onChange={(event) => setCsv(event.target.value)}
            rows={statement ? 6 : 18}
            placeholder={samples[type]}
            spellCheck={false}
            className={`${statement ? "min-h-36" : "min-h-[28rem]"} w-full resize-y rounded-2xl border border-border bg-[var(--pm-portal-page)] px-4 py-4 font-mono text-sm leading-7 text-foreground outline-none focus:border-primary`}
          />
        </label>
        <button type="button" onClick={() => void preview()} className={`${primaryButtonClass} mt-4`} disabled={pending || !csv.trim()}>
          {pending ? "Checking..." : "Check file"}
        </button>
      </section>

      {rows ? (
        <section className="rounded-2xl border border-border bg-white p-4 shadow-[0_10px_24px_rgba(20,50,90,0.05)]">
          <h2 className="text-sm font-medium text-primary">2. Preview and mapping</h2>
          <p className="mt-2 text-sm text-muted">{counts.valid} rows ready · {counts.failed} rows failed</p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[var(--pm-card-blue-color)]">
                <tr>
                  <th className="px-2 py-2">Line</th>
                  <th className="px-2 py-2">Result</th>
                  <th className="px-2 py-2">Detail</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.line} className="border-t border-border">
                    <td className="px-2 py-2">{row.line}</td>
                    <td className="px-2 py-2">
                      <StatusBadge tone={row.ok ? "success" : "danger"}>{row.ok ? "Valid" : "Failed"}</StatusBadge>
                    </td>
                    <td className="px-2 py-2">{row.ok ? Object.values(row.values).join(" · ") : row.errors.join(" ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={() => void commit()} className={`${primaryButtonClass} mt-4`} disabled={pending || counts.valid === 0}>
            Commit valid rows
          </button>
        </section>
      ) : null}

      {message ? <p className="text-sm text-primary">{message}</p> : null}
      {report.trim().split("\n").length > 1 ? (
        <section className="rounded-2xl border border-border bg-white p-4 shadow-[0_10px_24px_rgba(20,50,90,0.05)]">
          <h2 className="text-sm font-medium text-primary">3. Error log</h2>
          <a
            className={`${secondaryButtonClass} mt-3`}
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
