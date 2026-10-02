import * as XLSX from 'xlsx';
import { Product, DEFAULT_CATEGORIES, DEFAULT_UNITS } from '../types/inventory';

export interface ParsedImportRow {
  raw: Record<string, string>;
  product: {
    sku: string;
    name: string;
    category: string;
    unit: string;
    quantity: number;
    minStock: number;
    isFocus: boolean;
    note: string;
  };
  isNew: boolean;
  isValid: boolean;
  error?: string;
}

export interface ColumnMapping {
  nameIndex: number;
  quantityIndex: number;
  skuIndex: number;
  categoryIndex: number;
  unitIndex: number;
  minStockIndex: number;
  focusIndex: number;
  noteIndex: number;
}

export interface ProcessedSheetData {
  sheetName: string;
  rawRows: string[][];
  headerRowIndex: number; // -1 if no header row (data starts row 0)
  headers: string[];
  mapping: ColumnMapping;
  parsedRows: ParsedImportRow[];
  totalValid: number;
  totalNew: number;
  totalUpdates: number;
}

/**
 * Decode an ArrayBuffer to string supporting UTF-8 and Windows-874 / TIS-620 (Thai ANSI)
 */
export function decodeBufferToString(buffer: ArrayBuffer): string {
  try {
    const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
    return utf8Decoder.decode(buffer);
  } catch {
    try {
      const thaiDecoder = new TextDecoder('windows-874');
      return thaiDecoder.decode(buffer);
    } catch {
      const fallbackDecoder = new TextDecoder('utf-8');
      return fallbackDecoder.decode(buffer);
    }
  }
}

/**
 * Parse plain CSV/TSV text into 2D string array
 */
export function parseCSV(text: string): string[][] {
  let cleanText = text;
  if (cleanText.charCodeAt(0) === 0xfeff) {
    cleanText = cleanText.slice(1);
  }

  // Detect delimiter
  const firstLine = cleanText.split(/\r\n|\n|\r/)[0] || '';
  let delimiter = ',';
  if (firstLine.includes('\t') && !firstLine.includes(',')) {
    delimiter = '\t';
  } else if (firstLine.includes(';') && !firstLine.includes(',')) {
    delimiter = ';';
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          insideQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Read Excel (.xlsx, .xls) or CSV buffer and extract all sheets as 2D string arrays
 */
export function parseFileBufferToSheets(
  buffer: ArrayBuffer,
  fileName: string
): { sheetNames: string[]; sheets: Record<string, string[][]> } {
  const isExcel = /\.(xlsx|xls|xlsm|xlsb)$/i.test(fileName);

  if (isExcel) {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetNames = workbook.SheetNames;
    const sheets: Record<string, string[][]> = {};

    sheetNames.forEach((name) => {
      const sheet = workbook.Sheets[name];
      if (sheet) {
        const rawJson: any[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: '',
          blankrows: false,
        });

        // Normalize each cell to string and remove empty trailing cells
        const stringRows: string[][] = rawJson
          .map((row) =>
            (row || []).map((cell) =>
              cell !== null && cell !== undefined ? String(cell).trim() : ''
            )
          )
          .filter((row) => row.some((c) => c.length > 0));

        sheets[name] = stringRows;
      }
    });

    return { sheetNames, sheets };
  } else {
    // Plain text / CSV
    const text = decodeBufferToString(buffer);
    const rows = parseCSV(text);
    return {
      sheetNames: ['Sheet1'],
      sheets: { Sheet1: rows },
    };
  }
}

// Thai & English Keywords for intelligent matching
const NAME_KEYWORDS = [
  'ชื่อสินค้า',
  'ชื่อพัสดุ',
  'ชื่อสิ่งของ',
  'ชื่อรายการ',
  'รายการสินค้า',
  'รายการ',
  'สินค้า',
  'ชื่อ',
  'รายละเอียดสินค้า',
  'รายละเอียด',
  'description',
  'product name',
  'productname',
  'product',
  'item name',
  'itemname',
  'item',
  'material',
  'อุปกรณ์',
  'วัสดุ',
  'เวชภัณฑ์',
  'model',
  'part name',
  'title',
  'ชื่อไทย',
  'ชื่อสามัญ',
  'ชื่อสิ่งอุปกรณ์',
];

const QTY_KEYWORDS = [
  'ยกยอด',
  'ยอดยกยอด',
  'ยกยอดมา',
  'ยอดยกมา',
  'ยกยอดไป',
  'ยอดยกไป',
  'ยอดสต็อก',
  'สต็อกคงเหลือ',
  'สต๊อกคงเหลือ',
  'จำนวนคงเหลือ',
  'ยอดคงเหลือ',
  'คงเหลือ',
  'จำนวน',
  'ยอดเหลือ',
  'สต็อก',
  'สต๊อก',
  'quantity',
  'qty',
  'stock',
  'balance',
  'remain',
  'remaining',
  'count',
  'on hand',
  'onhand',
  'amount',
  'ยอดรวม',
  'จน.',
  'ยอดตรวจนับ',
  'คงคลัง',
  'ยอดปัจจุบัน',
  'ยอดจริง',
];

const SKU_KEYWORDS = [
  'ลำดับsku',
  'รหัสสินค้า',
  'รหัสพัสดุ',
  'รหัสสิ่งของ',
  'รหัส',
  'บาร์โค้ด',
  'barcode',
  'sku',
  'code',
  'item code',
  'itemcode',
  'product code',
  'productcode',
  'part no',
  'partno',
  'id',
  'ลำดับ',
  'ลำดับที่',
  'no',
  'no.',
  'item no',
  'itemno',
  '#',
];

const CATEGORY_KEYWORDS = [
  'หมวดหมู่',
  'หมวด',
  'กลุ่มสินค้า',
  'กลุ่ม',
  'ประเภทสินค้า',
  'ประเภท',
  'category',
  'group',
  'type',
  'dept',
  'department',
  'แผนก',
  'สายการผลิต',
];

const UNIT_KEYWORDS = [
  'หน่วยนับ',
  'หน่วย',
  'unit',
  'uom',
  'package',
  'pack',
  'หน่วยบรรจุ',
];

const MIN_KEYWORDS = [
  'จุดเตือน',
  'เตือนขั้นต่ำ',
  'ขั้นต่ำ',
  'จุดสั่งซื้อ',
  'เซฟตี้',
  'min stock',
  'minstock',
  'min',
  'alert',
  'safety',
  'reorder',
];

const FOCUS_KEYWORDS = [
  'โฟกัสพิเศษ',
  'โฟกัส',
  'focus',
  'isfocus',
  'star',
  'สำคัญ',
];

const NOTE_KEYWORDS = [
  'หมายเหตุ',
  'note',
  'remark',
  'คำอธิบาย',
  'สถานที่เก็บ',
  'location',
  'ช่องเก็บ',
];

/**
 * Score a row to determine if it is likely a header row
 */
function calculateHeaderRowScore(row: string[]): number {
  let score = 0;
  const norm = row.map((cell) => cell.toLowerCase().replace(/[\s\-_()]/g, ''));

  norm.forEach((cell) => {
    if (!cell) return;
    if (cell.includes('ยกยอด') || cell.includes('ยอดยก')) score += 15;
    if (NAME_KEYWORDS.some((k) => cell.includes(k.replace(/\s+/g, '')))) score += 10;
    if (QTY_KEYWORDS.some((k) => cell.includes(k.replace(/\s+/g, '')))) score += 8;
    if (SKU_KEYWORDS.some((k) => cell.includes(k.replace(/\s+/g, '')))) score += 7;
    if (CATEGORY_KEYWORDS.some((k) => cell.includes(k.replace(/\s+/g, '')))) score += 5;
    if (UNIT_KEYWORDS.some((k) => cell.includes(k.replace(/\s+/g, '')))) score += 4;
    if (MIN_KEYWORDS.some((k) => cell.includes(k.replace(/\s+/g, '')))) score += 3;
    if (['ลำดับ', 'ที่', 'no', '#', 'itemno'].some((k) => cell.includes(k))) score += 5;
  });

  return score;
}

/**
 * Find the most probable header row index in the first 25 rows
 */
export function findHeaderRowIndex(rows: string[][]): number {
  if (rows.length === 0) return -1;

  let bestIndex = 0;
  let maxScore = -1;

  const maxScan = Math.min(25, rows.length);
  for (let i = 0; i < maxScan; i++) {
    const score = calculateHeaderRowScore(rows[i]);
    if (score > maxScore) {
      maxScore = score;
      bestIndex = i;
    }
  }

  // If even the best score is 0, let's see if row 0 looks like data
  if (maxScore <= 0) {
    // Check if row 0 is pure numbers or looks like a data record
    return 0; // default to first row
  }

  return bestIndex;
}

/**
 * Intelligent Column Detection with fallback to data column inspection
 */
export function detectColumnMapping(
  headers: string[],
  dataRows?: string[][]
): ColumnMapping {
  const norm = headers.map((h) => h.toLowerCase().replace(/[\s\-_()]/g, ''));

  const findIdx = (keywords: string[]) => {
    // 1. Exact match first
    const exact = norm.findIndex((h) =>
      keywords.some((k) => h === k.replace(/[\s\-_()]/g, ''))
    );
    if (exact >= 0) return exact;

    // 2. Substring match
    return norm.findIndex((h) =>
      keywords.some((k) => h.includes(k.replace(/[\s\-_()]/g, '')))
    );
  };

  // 1. Quantity Detection: Give HIGHEST PRIORITY to "ยกยอด" (Opening/Stock Balance)
  const yukYodIdx = norm.findIndex((h) => h.includes('ยกยอด') || h.includes('ยอดยก'));
  let quantityIndex = yukYodIdx >= 0 ? yukYodIdx : findIdx(QTY_KEYWORDS);

  // 2. Name Detection
  let nameIndex = findIdx(NAME_KEYWORDS);

  // 3. SKU Detection: Explicit code/SKU keywords or "ลำดับSKU" / "ลำดับ" in front
  let skuIndex = findIdx(SKU_KEYWORDS);
  // If not found or if column 0 has "ลำดับ" / "no":
  if (skuIndex < 0 || skuIndex === nameIndex) {
    const seqIdx = norm.findIndex((h) =>
      ['ลำดับsku', 'ลำดับ', 'ลำดับที่', 'no', 'no.', 'ที่', '#'].some((k) => h === k || h.includes(k))
    );
    if (seqIdx >= 0 && seqIdx !== nameIndex && seqIdx !== quantityIndex) {
      skuIndex = seqIdx;
    }
  }

  // If still not matched, and column 0 is not nameIndex or quantityIndex:
  // "ตัวเลขด้านหน้าคือลำดับSKU" -> column 0 is likely the SKU
  if (skuIndex < 0 && headers.length > 1 && nameIndex !== 0 && quantityIndex !== 0) {
    skuIndex = 0;
  }

  let categoryIndex = findIdx(CATEGORY_KEYWORDS);
  let unitIndex = findIdx(UNIT_KEYWORDS);
  let minStockIndex = findIdx(MIN_KEYWORDS);
  let focusIndex = findIdx(FOCUS_KEYWORDS);
  let noteIndex = findIdx(NOTE_KEYWORDS);

  // If quantity and name collide, resolve
  if (nameIndex >= 0 && nameIndex === quantityIndex) {
    quantityIndex = -1;
  }
  if (skuIndex >= 0 && skuIndex === nameIndex) {
    skuIndex = -1;
  }

  // Fallback: If nameIndex is not found from header keywords, inspect dataRows
  if (nameIndex < 0 && dataRows && dataRows.length > 0) {
    const colCount = Math.max(...dataRows.slice(0, 10).map((r) => r.length), headers.length);
    let bestTextCol = -1;
    let maxTextLen = 0;

    for (let col = 0; col < colCount; col++) {
      if (col === quantityIndex || col === skuIndex) continue;
      let nonNumCount = 0;
      let totalLen = 0;

      dataRows.slice(0, 10).forEach((r) => {
        const val = r[col] || '';
        if (val.length > 1 && !/^\d+([.,]\d+)?$/.test(val)) {
          nonNumCount++;
          totalLen += val.length;
        }
      });

      if (nonNumCount >= 2 && totalLen > maxTextLen) {
        maxTextLen = totalLen;
        bestTextCol = col;
      }
    }

    if (bestTextCol >= 0) {
      nameIndex = bestTextCol;
    } else {
      // Default to column 0 or 1
      nameIndex = colCount > 1 ? 1 : 0;
    }
  }

  // Fallback: If quantityIndex is not found from header keywords, find numeric column
  if (quantityIndex < 0 && dataRows && dataRows.length > 0) {
    const colCount = Math.max(...dataRows.slice(0, 10).map((r) => r.length), headers.length);
    for (let col = 0; col < colCount; col++) {
      if (col === nameIndex || col === skuIndex) continue;
      const numericCount = dataRows.slice(0, 10).filter((r) => {
        const val = (r[col] || '').replace(/,/g, '').trim();
        return val.length > 0 && !isNaN(Number(val));
      }).length;

      if (numericCount >= 2) {
        quantityIndex = col;
        break;
      }
    }
  }

  return {
    nameIndex,
    quantityIndex,
    skuIndex,
    categoryIndex,
    unitIndex,
    minStockIndex,
    focusIndex,
    noteIndex,
  };
}

/**
 * Process Raw rows with given column mapping into normalized Product candidates
 */
export function processImportRows(
  dataRows: string[][],
  headers: string[],
  mapping: ColumnMapping,
  existingProducts: Product[]
): {
  parsedRows: ParsedImportRow[];
  totalValid: number;
  totalNew: number;
  totalUpdates: number;
} {
  if (!dataRows || dataRows.length === 0) {
    return {
      parsedRows: [],
      totalValid: 0,
      totalNew: 0,
      totalUpdates: 0,
    };
  }

  // Build maps of existing products
  const existingSkuMap = new Map<string, Product>();
  const existingNameMap = new Map<string, Product>();

  let maxSkuNum = 0;
  existingProducts.forEach((p) => {
    if (p.sku) existingSkuMap.set(p.sku.toLowerCase().trim(), p);
    if (p.name) existingNameMap.set(p.name.toLowerCase().trim(), p);
    const m = p.sku.match(/\d+/);
    if (m) {
      maxSkuNum = Math.max(maxSkuNum, parseInt(m[0], 10));
    }
  });

  const parsedRows: ParsedImportRow[] = [];
  let generatedSkuCounter = maxSkuNum + 1;
  const seenImportSkus = new Map<string, number>();

  dataRows.forEach((row) => {
    // Skip completely empty rows
    if (!row.some((cell) => cell.length > 0)) {
      return;
    }

    const rawObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rawObj[h || `คอลัมน์ ${idx + 1}`] = row[idx] || '';
    });

    // Extract values based on mapping
    const rawName = mapping.nameIndex >= 0 ? row[mapping.nameIndex] || '' : '';
    let rawSku = mapping.skuIndex >= 0 ? String(row[mapping.skuIndex] || '').replace(/\.0+$/, '').trim() : '';
    const rawCategory = mapping.categoryIndex >= 0 ? row[mapping.categoryIndex] || '' : '';
    const rawUnit = mapping.unitIndex >= 0 ? row[mapping.unitIndex] || '' : '';
    const rawQty = mapping.quantityIndex >= 0 ? row[mapping.quantityIndex] || '0' : '0';
    const rawMinStock = mapping.minStockIndex >= 0 ? row[mapping.minStockIndex] || '10' : '10';
    const rawFocus = mapping.focusIndex >= 0 ? row[mapping.focusIndex] || '' : '';
    const rawNote = mapping.noteIndex >= 0 ? row[mapping.noteIndex] || '' : '';

    const name = rawName.trim();
    // If name is completely blank, skip row
    if (!name) {
      return;
    }

    // Skip if row happens to duplicate header names (e.g. repeated header in multi-page tables)
    if (NAME_KEYWORDS.some((k) => name.toLowerCase() === k)) {
      return;
    }

    // Match existing
    const matchBySku = rawSku ? existingSkuMap.get(rawSku.toLowerCase().trim()) : undefined;
    const matchByName = existingNameMap.get(name.toLowerCase());
    const existing = matchBySku || matchByName;

    // Generate SKU if missing
    if (!rawSku.trim()) {
      if (existing) {
        rawSku = existing.sku;
      } else {
        rawSku = `SKU-${String(generatedSkuCounter++).padStart(3, '0')}`;
      }
    }

    // Deduplicate SKU within this imported set
    let finalSku = rawSku.trim();
    const lowerSku = finalSku.toLowerCase();
    if (seenImportSkus.has(lowerSku)) {
      const count = seenImportSkus.get(lowerSku)! + 1;
      seenImportSkus.set(lowerSku, count);
      finalSku = `${finalSku}-${count}`;
    } else {
      seenImportSkus.set(lowerSku, 1);
    }

    // Parse quantities safely
    const cleanQtyStr = rawQty.replace(/,/g, '').replace(/[^\d.-]/g, '');
    const parsedQty = cleanQtyStr ? parseFloat(cleanQtyStr) || 0 : 0;

    const cleanMinStr = rawMinStock.replace(/,/g, '').replace(/[^\d.-]/g, '');
    const parsedMinStock = cleanMinStr ? parseFloat(cleanMinStr) || 10 : 10;

    const isFocus =
      rawFocus.toLowerCase() === 'true' ||
      rawFocus.toLowerCase() === '1' ||
      rawFocus.includes('ใช่') ||
      rawFocus.includes('โฟกัส');

    const category = rawCategory.trim() || existing?.category || DEFAULT_CATEGORIES[0];
    const unit = rawUnit.trim() || existing?.unit || DEFAULT_UNITS[0];

    const isNew = !existing;

    parsedRows.push({
      raw: rawObj,
      product: {
        sku: finalSku,
        name,
        category,
        unit,
        quantity: Math.max(0, parsedQty),
        minStock: Math.max(0, parsedMinStock),
        isFocus: isFocus || (existing ? existing.isFocus : false),
        note: rawNote.trim() || existing?.note || '',
      },
      isNew,
      isValid: true,
    });
  });

  const totalValid = parsedRows.length;
  const totalNew = parsedRows.filter((r) => r.isNew).length;
  const totalUpdates = totalValid - totalNew;

  return {
    parsedRows,
    totalValid,
    totalNew,
    totalUpdates,
  };
}

/**
 * Downloads a sample Excel / CSV Template
 */
export function downloadSampleStockTemplate() {
  const headers = [
    'ชื่อสินค้า',
    'หมวดหมู่',
    'หน่วยนับ',
    'จำนวนคงเหลือ',
    'จุดเตือนขั้นต่ำ',
    'รหัสสินค้า (SKU - ไม่ใส่ได้ระบบจะสร้างให้อัตโนมัติ)',
    'โฟกัสพิเศษ (ใช่/ไม่ใช่)',
    'หมายเหตุ',
  ];

  const sampleRows = [
    [
      'กาแฟสำเร็จรูป 3 in 1 (แพ็ค 30 ซอง)',
      'อาหารและเครื่องดื่ม (Food & Beverage)',
      'แพ็ค (Pack)',
      '150',
      '20',
      'SKU-001',
      'ใช่',
      'ช่องเก็บ A1 ชั้น 2',
    ],
    [
      'ปลั๊กไฟ 3 ตา 5 ช่อง 3 เมตร มอก.',
      'อุปกรณ์อิเล็กทรอนิกส์ (Electronics)',
      'ชิ้น (Piece)',
      '45',
      '10',
      'SKU-002',
      'ไม่ใช่',
      'นำเข้าล็อตใหม่ ม.ค.',
    ],
    [
      'กระดาษถ่ายเอกสาร A4 80 แกรม',
      'เครื่องเขียนและสำนักงาน (Stationery)',
      'รีม (Ream)',
      '80',
      '15',
      '',
      'ไม่ใช่',
      'สั่งซื้อจากร้านค้าส่งประจำ',
    ],
    [
      'กล่องพัสดุ เบอร์ 00 (แพ็ค 20 ใบ)',
      'บรรจุภัณฑ์ (Packaging)',
      'แพ็ค (Pack)',
      '12',
      '20',
      '',
      'ใช่',
      'ใกล้หมด รีบสั่งเพิ่ม',
    ],
  ];

  const lines = [
    headers.map((h) => `"${h}"`).join(','),
    ...sampleRows.map((row) => row.map((val) => `"${val.replace(/"/g, '""')}"`).join(',')),
  ];

  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `แม่แบบนำเข้าสต็อก_Stock_Import_Template.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
