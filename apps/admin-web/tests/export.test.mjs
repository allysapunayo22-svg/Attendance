import assert from "node:assert/strict";
import { test } from "node:test";
import { createPdfDocument } from "../lib/export.ts";

test("PDF reports render representative text with patched jsPDF", () => {
  const rows = Array.from({ length: 40 }, (_, index) => ({
    student: `Student ${index + 1}`,
    event: index === 0 ? "University Meet – Gonzaga" : "Campus event",
    status: index % 2 ? "verified" : "pending_verification"
  }));
  const document = createPdfDocument("Attendance Report ✓", rows);
  const output = document.output("arraybuffer");
  assert.equal(output instanceof ArrayBuffer, true);
  assert.equal(output.byteLength > 500, true);
  assert.equal(document.getNumberOfPages(), 1);
});
