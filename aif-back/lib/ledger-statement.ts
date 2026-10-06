const months: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

export type StatementEntry = {
  line: number;
  date: string;
  type: "debit" | "credit";
  amount: number;
  narration: string;
  particulars: string;
  vchType: string;
  vchNo: string;
};

export type LedgerStatement = {
  headerLines: string[];
  period: string;
  entries: StatementEntry[];
};

function keyOf(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function parseTable(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if (char === "\n") {
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    if (char !== "\r") cell += char;
  }
  if (cell || row.length) {
    row.push(cell.trim());
    if (row.some(Boolean)) rows.push(row);
  }
  return rows;
}

function columnIndex(headers: string[], ...names: string[]) {
  const keys = headers.map(keyOf);
  return keys.findIndex((key) => names.includes(key));
}

function isStatementHeader(row: string[]) {
  const date = columnIndex(row, "date");
  const particulars = columnIndex(row, "particulars", "particular");
  const debit = columnIndex(row, "debit", "dr");
  const credit = columnIndex(row, "credit", "cr");
  return date >= 0 && particulars >= 0 && (debit >= 0 || credit >= 0);
}

export function parseAmount(value: string) {
  const cleaned = value.replace(/[₹,\s]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "—") return 0;
  const negative = /^\(.*\)$/.test(cleaned);
  const amount = Number(negative ? cleaned.slice(1, -1) : cleaned);
  if (!Number.isFinite(amount)) return Number.NaN;
  return negative ? -amount : amount;
}

export function parseStatementDate(value: string) {
  const text = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const named = text.match(/^(\d{1,2})[/-]([A-Za-z]{3})[/-](\d{2,4})$/);
  if (named) {
    const month = months[named[2].toLowerCase()];
    if (!month) return "";
    const year = named[3].length === 2 ? `20${named[3]}` : named[3];
    return `${year}-${month}-${named[1].padStart(2, "0")}`;
  }
  const numeric = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (numeric) {
    const year = numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3];
    return `${year}-${numeric[2].padStart(2, "0")}-${numeric[1].padStart(2, "0")}`;
  }
  return "";
}

function skipHeaderLine(line: string) {
  const text = line.trim();
  if (!text) return true;
  if (/^[^a-z0-9]+$/i.test(text)) return true;
  if (/^ledger account$/i.test(text)) return true;
  if (/^page\s+\d+$/i.test(text)) return true;
  if (/\bto\b/i.test(text) && parseStatementDate(text.split(/\bto\b/i)[0]?.trim() ?? "")) return true;
  return false;
}

function fieldText(record: Record<string, unknown>, ...names: string[]) {
  for (const [key, value] of Object.entries(record)) {
    if (names.includes(keyOf(key)) && value != null && (typeof value === "string" || typeof value === "number") && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function findVoucherRows(value: unknown): unknown[] | null {
  if (Array.isArray(value)) {
    const looksLikeVoucher = value.some(
      (item) => item && typeof item === "object" && ("dspvchdate" in item || "date" in item || "particulars" in item || "dspvchledaccount" in item),
    );
    if (looksLikeVoucher) return value;
    for (const item of value) {
      const found = findVoucherRows(item);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const direct = record.dspvchdetail ?? record.rows ?? record.entries ?? record.ledger ?? record.transactions;
  if (Array.isArray(direct)) return direct;
  for (const child of Object.values(record)) {
    const found = findVoucherRows(child);
    if (found) return found;
  }
  return null;
}

function voucherNumber(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    const text = String(value).trim();
    const marked = text.match(/no\.?\s*:?\s*(\d+)/i);
    if (marked) return marked[1];
    return /^\d+$/.test(text) ? text : "";
  }
  if (!value || typeof value !== "object") return "";
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = voucherNumber(item);
      if (found) return found;
    }
    return "";
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    const found = voucherNumber(child);
    if (found) return found;
  }
  return "";
}

function voucherLabel(value: string) {
  const labels: Record<string, string> = {
    rcpt: "Receipt",
    pymt: "Payment",
    jrnl: "Journal",
    ctra: "Contra",
    purc: "Purchase",
    sales: "Sales",
  };
  const key = value.trim().toLowerCase();
  return labels[key] ?? value.trim();
}

function statementFromJson(raw: string): LedgerStatement | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  let investor = "";
  if (data && typeof data === "object" && !Array.isArray(data)) {
    investor = fieldText(data as Record<string, unknown>, "investor", "investorname", "name", "client", "clientname");
  }
  const rows = findVoucherRows(data);
  if (!rows) return null;

  const entries: StatementEntry[] = [];
  let carriedDate = "";
  rows.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const row = item as Record<string, unknown>;
    const particulars = fieldText(row, "particulars", "particular", "narration", "description", "dspvchledaccount");
    if (/closing\s*balance/i.test(particulars)) return;
    const parsedDate = parseStatementDate(fieldText(row, "date", "dspvchdate"));
    if (parsedDate) carriedDate = parsedDate;
    const debit = parseAmount(fieldText(row, "debit", "dr", "dspvchdramt"));
    const credit = parseAmount(fieldText(row, "credit", "cr", "dspvchcramt"));
    const explicit = fieldText(row, "entrytype", "side").toLowerCase();
    const typeWord = fieldText(row, "type", "dspvchtype").toLowerCase();
    const amountField = parseAmount(fieldText(row, "amount"));
    let type: "debit" | "credit" | "" = "";
    let amount = 0;
    if (debit > 0 && credit <= 0) {
      type = "debit";
      amount = debit;
    } else if (credit > 0 && debit <= 0) {
      type = "credit";
      amount = credit;
    } else if (amountField > 0 && (explicit === "debit" || explicit === "credit" || typeWord === "debit" || typeWord === "credit")) {
      type = explicit === "debit" || typeWord === "debit" ? "debit" : "credit";
      amount = amountField;
    }
    if (!type || !amount) return;
    const voucherType = voucherLabel(
      fieldText(row, "vchtype", "vouchertype", "dspvchtype") || (typeWord && typeWord !== "debit" && typeWord !== "credit" ? fieldText(row, "type") : ""),
    );
    const voucherNo = fieldText(row, "vchno", "voucherno", "vouchernumber") || voucherNumber(row.dspvchnumber);
    const detail = particulars.replace(/^(dr|cr)\s+/i, "").trim();
    entries.push({
      line: index + 1,
      date: carriedDate,
      type,
      amount,
      narration: [detail, [voucherType, voucherNo].filter(Boolean).join(" ")].filter(Boolean).join(" · "),
      particulars: detail,
      vchType: voucherType,
      vchNo: voucherNo,
    });
  });
  if (entries.length === 0) return null;
  return { headerLines: investor ? [investor] : [], period: "", entries };
}

function normalizeOcrLine(line: string) {
  return line.replace(/(\d(?:,\d{2,3})+)\s+(\d{2})\s*$/g, "$1.$2");
}

function readPeriod(line: string) {
  const dates = [...line.matchAll(/(\d{1,2})\s*-?\s*([A-Za-z]{3})\s*-?\s*(\d{2})/gi)];
  if (dates.length < 2) return "";
  const month = (value: string) => value.slice(0, 1).toUpperCase() + value.slice(1, 3).toLowerCase();
  const start = dates[0];
  const end = dates[dates.length - 1];
  return `${start[1]}-${month(start[2])}-${start[3]} to ${end[1]}-${month(end[2])}-${end[3]}`;
}

function statementFromPlainText(source: string): LedgerStatement | null {
  const lines = source.split(/\r?\n/).map((line) => normalizeOcrLine(line.trim())).filter(Boolean);
  if (lines.length === 0) return null;
  const headerAt = lines.findIndex((line) => /date/i.test(line) && /particular/i.test(line));
  const preamble = headerAt >= 0 ? lines.slice(0, headerAt) : [];
  const body = headerAt >= 0 ? lines.slice(headerAt + 1) : lines;
  const period = preamble.map(readPeriod).find(Boolean) ?? "";
  const headerLines = preamble.filter((line) => !skipHeaderLine(line) && !readPeriod(line) && !/debit|credit|vch|veh|page\s+\d/i.test(line));
  const entries: StatementEntry[] = [];
  let carriedDate = "";
  const amountPattern = /((?:\d{1,3}(?:,\d{2,3})+|\d+)\.\d{2})\s*$/;
  body.forEach((line, index) => {
    if (/closing\s*balance/i.test(line)) return;
    const first = line.match(amountPattern);
    if (!first || first.index == null) return;
    const withoutFirst = line.slice(0, first.index).trim();
    const second = withoutFirst.match(amountPattern);
    if (second) return;
    let rest = withoutFirst.replace(/[—–-]\s*$/g, "").trim();
    const dateLead = rest.match(/^(\d{1,2}[-/][A-Za-z]{3}[-/]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4})(?:\s+|$)/);
    if (dateLead) {
      const parsed = parseStatementDate(dateLead[1]);
      if (parsed) carriedDate = parsed;
      rest = rest.slice(dateLead[0].length).trim();
    }
    const tokens = rest.split(/\s+/).filter((token) => token && !/^[—–-]+$/.test(token));
    let voucherNo = "";
    if (/^\d+$/.test(tokens.at(-1) ?? "")) voucherNo = tokens.pop() ?? "";
    const voucherTypes = new Set(["receipt", "payment", "journal", "contra", "sales", "purchase"]);
    let voucherType = "";
    if (voucherTypes.has((tokens.at(-1) ?? "").toLowerCase())) voucherType = tokens.pop() ?? "";
    const particulars = tokens.join(" ").trim();
    if (!particulars || !/[A-Za-z]/.test(particulars)) return;
    entries.push({
      line: (headerAt >= 0 ? headerAt + 1 : 0) + index + 2,
      date: carriedDate,
      type: "credit",
      amount: parseAmount(first[1]),
      narration: [particulars.replace(/^(dr|cr)\s+/i, ""), [voucherType, voucherNo].filter(Boolean).join(" ")].filter(Boolean).join(" · "),
      particulars,
      vchType: voucherType,
      vchNo: voucherNo,
    });
  });
  if (entries.length === 0) return null;
  return { headerLines, period, entries };
}

function statementFromTable(table: string[][]): LedgerStatement | null {
  const headerIndex = table.findIndex(isStatementHeader);
  if (headerIndex < 0) return null;
  const headers = table[headerIndex];
  const dateIndex = columnIndex(headers, "date");
  const particularsIndex = columnIndex(headers, "particulars", "particular");
  const typeIndex = columnIndex(headers, "vchtype", "vouchertype");
  const numberIndex = columnIndex(headers, "vchno", "voucherno", "vouchernumber");
  const debitIndex = columnIndex(headers, "debit", "dr");
  const creditIndex = columnIndex(headers, "credit", "cr");

  const headerLines = table
    .slice(0, headerIndex)
    .map((row) => row.filter(Boolean).join(" ").trim())
    .filter((line) => !skipHeaderLine(line));

  const entries: StatementEntry[] = [];
  let carriedDate = "";
  table.slice(headerIndex + 1).forEach((row, offset) => {
    const particulars = row[particularsIndex] ?? "";
    if (!particulars.trim()) return;
    if (/closing\s*balance|^total$/i.test(particulars.trim())) return;
    const debit = debitIndex >= 0 ? parseAmount(row[debitIndex] ?? "") : 0;
    const credit = creditIndex >= 0 ? parseAmount(row[creditIndex] ?? "") : 0;
    if (!particulars.trim() && !debit && !credit) return;
    if (debit > 0 && credit > 0) return;

    const parsedDate = parseStatementDate(row[dateIndex] ?? "");
    if (parsedDate) carriedDate = parsedDate;
    const amount = debit > 0 ? debit : credit;
    if (!amount) return;
    const detail = particulars.replace(/^(dr|cr)\s+/i, "").trim();
    const voucher = [row[typeIndex] ?? "", row[numberIndex] ?? ""].map((item) => item.trim()).filter(Boolean).join(" ");
    entries.push({
      line: headerIndex + offset + 2,
      date: carriedDate,
      type: debit > 0 ? "debit" : "credit",
      amount,
      narration: [detail, voucher].filter(Boolean).join(" · "),
      particulars: particulars.trim(),
      vchType: (row[typeIndex] ?? "").trim(),
      vchNo: (row[numberIndex] ?? "").trim(),
    });
  });

  return { headerLines, period: "", entries };
}

function statementFromTallyExport(table: string[][]): LedgerStatement | null {
  const entries: StatementEntry[] = [];
  let carriedDate = "";
  for (let index = 0; index < table.length; index += 1) {
    const row = table[index];
    const parsedDate = parseStatementDate(row[0] ?? "");
    const particulars = (row[1] ?? "").replace(/^(dr|cr)\s+/i, "").trim();
    const typeRaw = (row[2] ?? "").trim();
    if (!parsedDate || !particulars || !typeRaw || /closing\s*balance/i.test(particulars)) continue;
    carriedDate = parsedDate;
    const cells = row.slice(3);
    while (cells.length > 0 && !cells[cells.length - 1].trim()) cells.pop();
    const debit = parseAmount(cells[0] ?? "");
    const credit = cells.length > 1 ? parseAmount(cells[1] ?? "") : 0;
    let type: "debit" | "credit" | "" = "";
    let amount = 0;
    if (debit > 0 && !(credit > 0)) {
      type = "debit";
      amount = debit;
    } else if (credit > 0 && !(debit > 0)) {
      type = "credit";
      amount = credit;
    }
    if (!type || !amount) continue;
    let voucherNo = "";
    const next = table[index + 1];
    const nextText = next?.map((cell) => cell.trim()).filter(Boolean).join(" ") ?? "";
    if (next && voucherNumber(nextText) && !parseStatementDate(next[0] ?? "")) {
      voucherNo = voucherNumber(nextText);
      index += 1;
    }
    const voucherType = voucherLabel(typeRaw);
    entries.push({
      line: index + 1,
      date: carriedDate,
      type,
      amount,
      narration: [particulars, [voucherType, voucherNo].filter(Boolean).join(" ")].filter(Boolean).join(" · "),
      particulars,
      vchType: voucherType,
      vchNo: voucherNo,
    });
  }
  if (entries.length === 0) return null;
  return { headerLines: [], period: "", entries };
}

export function parseLedgerStatement(source: string): LedgerStatement | null {
  const trimmed = source.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const fromJson = statementFromJson(trimmed);
    if (fromJson) return fromJson;
  }
  const table = parseTable(source);
  const fromComma = statementFromTable(table);
  if (fromComma) return fromComma;
  const fromTally = statementFromTallyExport(table);
  if (fromTally) return fromTally;
  if (source.includes("\t")) {
    const tabTable = source
      .split(/\r?\n/)
      .map((line) => line.split("\t").map((cell) => cell.trim()))
      .filter((row) => row.some(Boolean));
    const fromTabs = statementFromTable(tabTable);
    if (fromTabs) return fromTabs;
  }
  return statementFromPlainText(source);
}

export function investorMatchScore(clientName: string, line: string) {
  const name = clientName.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const candidate = line.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!name || !candidate) return 0;
  if (name === candidate) return 100;
  if (candidate.includes(name) || name.includes(candidate)) return 85;
  const tokens = name.split(" ").filter((token) => token.length > 2);
  if (tokens.length === 0) return 0;
  const hits = tokens.filter((token) => candidate.includes(token)).length;
  if (hits === tokens.length) return 80;
  if (hits >= 2) return 65;
  return 0;
}
