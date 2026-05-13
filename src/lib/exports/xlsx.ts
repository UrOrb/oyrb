import ExcelJS from "exceljs";

/**
 * Shared XLSX serialization for the income + bookings exports.
 *
 * Two non-obvious decisions every Excel-flavored export has to get right:
 *
 *   1. Real Excel ListObject (Table) — emitted via worksheet.addTable so
 *      Excel renders an autofilter dropdown on every header, banded
 *      rows, and lets the pro use structured references in formulas
 *      (=Table[gross_amount_usd]). A plain worksheet with autoFilter
 *      gets you sortable headers but not the rest. ExcelJS rejects an
 *      empty `rows` array so we substitute a single all-blank row when
 *      the data is empty — Excel still opens it cleanly and the pro
 *      sees the headers + empty filterable Table.
 *
 *   2. Header row stays frozen (views: { state: 'frozen', ySplit: 1 })
 *      so scrolling 200+ bookings doesn't lose the column labels.
 *
 * Numeric and currency cells stay typed as numbers (not strings) so
 * Excel's sort + SUM/AVG work without coercion. Callers pass an
 * optional columnFormats map keyed by column id → numFmt string
 * (e.g. '"$"#,##0.00' for currency).
 */

export type XlsxOutput = {
  buffer: Buffer;
  rowCount: number;
  byteSize: number;
};

export type XlsxOptions<TColumn extends string> = {
  sheetName: string;
  tableName: string;
  columnFormats?: Partial<Record<TColumn, string>>;
};

export async function formatXlsxTable<TColumn extends string>(
  columns: readonly TColumn[],
  rows: ReadonlyArray<Record<TColumn, unknown>>,
  options: XlsxOptions<TColumn>,
): Promise<XlsxOutput> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "OYRB";
  wb.created = new Date();

  const ws = wb.addWorksheet(options.sheetName);

  const tableRows: unknown[][] =
    rows.length > 0
      ? rows.map((r) => columns.map((c) => r[c] ?? ""))
      : [columns.map(() => "")];

  ws.addTable({
    name: options.tableName,
    ref: "A1",
    headerRow: true,
    totalsRow: false,
    style: {
      theme: "TableStyleMedium2",
      showRowStripes: true,
    },
    columns: columns.map((c) => ({ name: c, filterButton: true })),
    rows: tableRows,
  });

  ws.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];

  // Column widths + per-column number formats. Width is a heuristic:
  // header length + a small padding, capped so no single column can
  // blow out the viewport. Pros can still drag-resize in Excel.
  const formats: Partial<Record<TColumn, string>> = options.columnFormats ?? {};
  columns.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    col.width = Math.min(40, Math.max(c.length + 2, 12));
    const numFmt = formats[c];
    if (numFmt) col.numFmt = numFmt;
  });

  const arrayBuffer = await wb.xlsx.writeBuffer();
  const buffer = Buffer.from(arrayBuffer as ArrayBuffer);
  return { buffer, rowCount: rows.length, byteSize: buffer.byteLength };
}

export const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
