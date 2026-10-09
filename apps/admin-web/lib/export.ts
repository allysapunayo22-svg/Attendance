import { jsPDF } from "jspdf";

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const headers = Object.keys(rows[0] ?? {});
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? "")).join(","))
  ].join("\n");
  downloadBlob(filename, new Blob([csv], { type: "text/csv;charset=utf-8" }));
}

export function downloadPdf(filename: string, title: string, rows: Record<string, unknown>[]) {
  createPdfDocument(title, rows).save(filename);
}

export function createPdfDocument(title: string, rows: Record<string, unknown>[]) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 18);
  doc.setFontSize(9);
  rows.slice(0, 35).forEach((row, index) => {
    doc.text(Object.values(row).join("  |  ").slice(0, 110), 14, 30 + index * 6);
  });
  return doc;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
