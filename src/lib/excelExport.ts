import * as XLSX from "xlsx";

import { saveBlobToInternalStorage } from "@/lib/nativeFileStorage";

export type ExcelPalette = {
  header: string;
  alternate: string;
};

export type ExcelReportMeta = {
  title: string;
  reportDateLabel: string;
  recordCount: number;
  totalColumns: number;
  palette?: ExcelPalette;
  sourceHeaderRow?: number;
};

type ExcelWorkbook = any;
type ExcelWorksheet = any;

const INSTITUTION_NAME = "المجلس اليمني للاختصاصات الطبية";
const BRANCH_NAME = "فرع صعدة";
const BLACK = "FF000000";
const TOTAL_FILL = "FFFEF3C7";
const DEFAULT_PALETTE: ExcelPalette = { header: "FFF5DEB3", alternate: "FFFFFDF5" };

export const getExcelPalette = (title: string): ExcelPalette => {
  if (title.includes("قسط") || title.includes("الأقساط") || title.includes("الاقساط")) {
    return { header: "FF0F766E", alternate: "FFF0FDFA" };
  }
  if (title.includes("حافظ") || title.includes("حوافظ")) {
    return { header: "FFFEF3C7", alternate: "FFFFFBEB" };
  }
  if (title.includes("قيود") || title.includes("اليومية")) {
    return { header: "FF0E2B40", alternate: "FFF8FAFC" };
  }
  if (title.includes("الحساب الشهري") || title.includes("كشف الحساب") || title.includes("تقرير الحساب")) {
    return { header: "FF1E293B", alternate: "FFF8FAFC" };
  }
  if (title.includes("الحساب الجاري") || title.includes("الحساب")) {
    return { header: "FFE7E2D8", alternate: "FFFAF9F6" };
  }
  return DEFAULT_PALETTE;
};

const blackBorder = {
  top: { style: "thin", color: { argb: BLACK } },
  left: { style: "thin", color: { argb: BLACK } },
  bottom: { style: "thin", color: { argb: BLACK } },
  right: { style: "thin", color: { argb: BLACK } },
};

const asText = (value: unknown) => (value == null ? "" : String(value));

const columnLetter = (column: number): string => {
  let result = "";
  let current = Math.max(1, column);
  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }
  return result;
};

const readableHeaderFont = (argb: string): string => {
  const hex = argb.slice(-6);
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance < 155 ? "FFFFFFFF" : BLACK;
};

export async function createExcelWorkbook(): Promise<ExcelWorkbook> {
  const ExcelJS = (await import("exceljs")).default;
  return new ExcelJS.Workbook();
}

export async function loadReportLetterhead(workbook: ExcelWorkbook): Promise<number | null> {
  try {
    const response = await fetch("/report-letterhead.png");
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return workbook.addImage({ buffer: new Uint8Array(buffer) as any, extension: "png" });
  } catch {
    return null;
  }
}

export function setWorksheetRtl(worksheet: ExcelWorksheet, freezeRow?: number) {
  worksheet.views = [
    freezeRow
      ? { rightToLeft: true, state: "frozen", ySplit: freezeRow }
      : { rightToLeft: true },
  ];
  worksheet.pageSetup = {
    orientation: "landscape",
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalDpi: 300,
    verticalDpi: 300,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.35,
      bottom: 0.35,
      header: 0.15,
      footer: 0.15,
    },
  };
  worksheet.printOptions = { horizontalCentered: true, verticalCentered: false };
  worksheet.headerFooter = {
    oddFooter: '&L&"Arial"المجلس اليمني للاختصاصات الطبية&C&"Arial"صفحة &P من &N&R&"Arial"فرع صعدة',
  };
  worksheet.properties = { defaultRowHeight: 20 };
}

export function addReportHeader(
  workbook: ExcelWorkbook,
  worksheet: ExcelWorksheet,
  meta: ExcelReportMeta,
  imageId: number | null,
): number {
  const totalColumns = Math.max(1, meta.totalColumns);
  const palette = meta.palette || DEFAULT_PALETTE;
  setWorksheetRtl(worksheet);

  if (imageId != null) {
    worksheet.addImage(imageId, {
      tl: { col: 0, row: 0 },
      br: { col: totalColumns, row: 4 },
    });
  }

  worksheet.mergeCells(5, 1, 5, totalColumns);
  worksheet.mergeCells(6, 1, 6, totalColumns);
  worksheet.mergeCells(7, 1, 7, Math.max(1, Math.ceil(totalColumns / 2)));
  worksheet.mergeCells(7, Math.max(1, Math.ceil(totalColumns / 2)) + 1, 7, totalColumns);

  const titleCell = worksheet.getCell(5, 1);
  titleCell.value = `${INSTITUTION_NAME} - ${BRANCH_NAME}`;
  const reportTitleCell = worksheet.getCell(6, 1);
  reportTitleCell.value = meta.title;
  const dateCell = worksheet.getCell(7, 1);
  dateCell.value = `تاريخ التقرير: ${meta.reportDateLabel}`;
  const countCell = worksheet.getCell(7, Math.max(1, Math.ceil(totalColumns / 2)) + 1);
  countCell.value = `عدد السجلات: ${meta.recordCount}`;

  [titleCell, reportTitleCell, dateCell, countCell].forEach((cell) => {
    cell.border = blackBorder;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true, shrinkToFit: true };
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: BLACK } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
  });
  reportTitleCell.font = { name: "Arial", size: 13, bold: true, color: { argb: BLACK } };
  reportTitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: palette.header } };
  worksheet.getRow(1).height = 30;
  worksheet.getRow(2).height = 30;
  worksheet.getRow(3).height = 30;
  worksheet.getRow(4).height = 18;
  worksheet.getRow(5).height = 24;
  worksheet.getRow(6).height = 28;
  worksheet.getRow(7).height = 24;
  worksheet.getRow(8).height = 8;

  return 9;
}

function isTotalLabel(value: unknown): boolean {
  const text = asText(value);
  return text.includes("الإجمالي") || text.includes("اجمالي") || text.includes("جملة");
}

export function formatWorksheet(
  worksheet: ExcelWorksheet,
  options: {
    headerRow?: number;
    totalRows?: number[];
    palette?: ExcelPalette;
    minColumnWidth?: number;
    maxColumnWidth?: number;
  } = {},
) {
  const palette = options.palette || DEFAULT_PALETTE;
  const headerRow = options.headerRow;
  const totalRows = new Set(options.totalRows || []);
  const minColumnWidth = options.minColumnWidth ?? 9;
  const maxColumnWidth = options.maxColumnWidth ?? 34;

  setWorksheetRtl(worksheet);
  worksheet.eachRow({ includeEmpty: true }, (row: any, rowNumber: number) => {
    let rowHasContent = false;
    row.eachCell({ includeEmpty: true }, (cell: any) => {
      if (cell.value != null && cell.value !== "") rowHasContent = true;
      const isNumeric = typeof cell.value === "number" || (typeof cell.value === "object" && cell.value?.formula);
      cell.border = blackBorder;
      cell.font = {
        name: "Arial",
        size: 10,
        bold: cell.font?.bold || false,
        color: { argb: BLACK },
      };
      cell.alignment = {
        horizontal: isNumeric ? "center" : "right",
        vertical: "middle",
        wrapText: true,
        shrinkToFit: true,
      };
      if (isNumeric) cell.numFmt = "#,##0.00;[Red]-#,##0.00";
    });
    if (rowHasContent) row.height = Math.max(row.height || 20, rowNumber === headerRow ? 34 : 23);
  });

  if (headerRow) {
    worksheet.getRow(headerRow).eachCell({ includeEmpty: true }, (cell: any) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: palette.header } };
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: BLACK } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true, shrinkToFit: true };
      cell.border = blackBorder;
    });
  }

  worksheet.eachRow({ includeEmpty: true }, (row: any, rowNumber: number) => {
    const firstValue = row.getCell(1)?.value;
    const isTotal = totalRows.has(rowNumber) || isTotalLabel(firstValue);
    if (isTotal) {
      row.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_FILL } };
        cell.font = { name: "Arial", size: 10, bold: true, color: { argb: BLACK } };
        cell.border = blackBorder;
      });
    } else if (rowNumber > (headerRow || 0) && rowNumber % 2 === 0) {
      row.eachCell({ includeEmpty: true }, (cell: any) => {
        if (!cell.fill || cell.fill.type !== "pattern") {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: palette.alternate } };
        }
      });
    }
  });

  const columnCount = worksheet.columnCount || 1;
  if (headerRow) {
    setWorksheetRtl(worksheet, headerRow);
    worksheet.pageSetup.printTitlesRow = `${headerRow}:${headerRow}`;
    worksheet.autoFilter = {
      from: { row: headerRow, column: 1 },
      to: { row: headerRow, column: columnCount },
    };
  }
  worksheet.pageSetup.printArea = `A1:${columnLetter(columnCount)}${Math.max(1, worksheet.rowCount)}`;
  worksheet.properties.tabColor = { argb: palette.header };

  for (let col = 1; col <= columnCount; col++) {
    let maxLength = 0;
    for (let row = 1; row <= worksheet.rowCount; row++) {
      const cell = worksheet.getCell(row, col);
      const text = asText(cell.value && typeof cell.value === "object" ? cell.value.result ?? cell.value.formula : cell.value);
      maxLength = Math.max(maxLength, Math.min(text.length, 42));
    }
    worksheet.getColumn(col).width = Math.min(maxColumnWidth, Math.max(minColumnWidth, maxLength + 2));
  }
}

export function appendRows(
  worksheet: ExcelWorksheet,
  rows: unknown[][],
  startRow: number,
): number {
  rows.forEach((values, index) => {
    const row = worksheet.getRow(startRow + index);
    values.forEach((value, colIndex) => {
      row.getCell(colIndex + 1).value = value as any;
    });
  });
  return startRow + rows.length - 1;
}

export function appendXlsxSheet(
  workbook: ExcelWorkbook,
  source: XLSX.WorkSheet,
  sheetName: string,
  meta: ExcelReportMeta,
  imageId: number | null,
): ExcelWorksheet {
  const worksheet = workbook.addWorksheet(sheetName, { views: [{ rightToLeft: true }] });
  const dataStartRow = addReportHeader(workbook, worksheet, meta, imageId);
  const range = XLSX.utils.decode_range(source["!ref"] || "A1");

  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const address = XLSX.utils.encode_cell({ r: row, c: col });
      const sourceCell = source[address];
      if (!sourceCell) continue;
      const cell = worksheet.getCell(dataStartRow + row, col + 1);
      if (sourceCell.f) {
        cell.value = { formula: sourceCell.f, result: sourceCell.v } as any;
      } else {
        cell.value = sourceCell.v as any;
      }
    }
  }

  (source["!merges"] || []).forEach((merge: XLSX.Range) => {
    worksheet.mergeCells(
      dataStartRow + merge.s.r,
      merge.s.c + 1,
      dataStartRow + merge.e.r,
      merge.e.c + 1,
    );
  });

  formatWorksheet(worksheet, {
    headerRow: dataStartRow + (meta.sourceHeaderRow ?? Math.max(0, (source["!merges"] || []).length ? 3 : 0)),
    palette: meta.palette,
  });
  return worksheet;
}

export async function downloadWorkbook(workbook: ExcelWorkbook, fileName: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const internalUri = await saveBlobToInternalStorage(blob, fileName);
  if (internalUri) return;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
