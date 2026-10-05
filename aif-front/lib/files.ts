import { api, apiFetch } from "@/config/endapi";

export function downloadBlob(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function loadStatementFile(id: string) {
  const response = await apiFetch(api.portal.statement(id));
  if (!response.ok) {
    throw new Error("Statement download failed.");
  }
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  return {
    blob,
    fileName: match?.[1] ?? "statement.pdf",
  };
}
