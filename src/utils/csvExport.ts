import { Product, StockTransaction } from '../types/inventory';

/**
 * Escapes a CSV cell value to handle commas, newlines, and double quotes.
 */
function escapeCSV(val: any): string {
  if (val === null || val === undefined) {
    return '""';
  }
  const stringVal = String(val);
  const escaped = stringVal.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Trigger browser file download from Blob
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Format date for filename
 */
function getTimestampForFilename(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${yyyy}${mm}${dd}_${hh}${min}`;
}

/**
 * Export Products to CSV with UTF-8 BOM for Thai language compatibility in Excel
 * Note: Only inventory quantities and status, without prices as requested.
 */
export function exportProductsToCSV(products: Product[], customFilename?: string) {
  const headers = [
    'รหัสสินค้า (SKU)',
    'ชื่อสินค้า',
    'หมวดหมู่',
    'หน่วยนับ',
    'จำนวนคงเหลือ',
    'จุดเตือนสต็อกขั้นต่ำ',
    'สถานะสินค้า',
    'สินค้าโฟกัสพิเศษ',
    'อัปเดตล่าสุด',
    'หมายเหตุ',
  ];

  const rows = products.map((p) => {
    const status =
      p.quantity <= 0 ? 'หมดสต็อก (Out of Stock)' : p.quantity <= p.minStock ? 'ใกล้หมด (Low Stock)' : 'ปกติ (In Stock)';
    const focusStr = p.isFocus ? 'ใช่ (Focus)' : 'ไม่ใช่';
    const updated = p.lastUpdated ? p.lastUpdated.replace('T', ' ').slice(0, 19) : '';

    return [
      escapeCSV(p.sku),
      escapeCSV(p.name),
      escapeCSV(p.category),
      escapeCSV(p.unit),
      p.quantity,
      p.minStock,
      escapeCSV(status),
      escapeCSV(focusStr),
      escapeCSV(updated),
      escapeCSV(p.note || ''),
    ].join(',');
  });

  // UTF-8 BOM: \uFEFF ensures Thai characters render properly in Excel
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = customFilename || `สต็อกสินค้า_Products_${getTimestampForFilename()}.csv`;
  downloadBlob(blob, filename);
}

/**
 * Export Stock Transactions to CSV with UTF-8 BOM
 */
export function exportTransactionsToCSV(
  transactions: StockTransaction[],
  customFilename?: string
) {
  const headers = [
    'รหัสรายการ (ID)',
    'วันที่-เวลาทำรายการ',
    'ประเภทรายการ',
    'รหัสสินค้า (SKU)',
    'ชื่อสินค้า',
    'จำนวน',
    'สาเหตุ / แหล่งที่มา / ลูกค้า',
    'เลขที่เอกสาร / บิล / PO',
    'ผู้บันทึกรายการ',
    'หมายเหตุ',
  ];

  const rows = transactions.map((tx) => {
    const typeLabel = tx.type === 'IN' ? 'รับเข้า (IN)' : 'ตัดออก (OUT)';
    const formattedDate = tx.dateTime ? tx.dateTime.replace('T', ' ').slice(0, 19) : '';

    return [
      escapeCSV(tx.id),
      escapeCSV(formattedDate),
      escapeCSV(typeLabel),
      escapeCSV(tx.sku),
      escapeCSV(tx.productName),
      tx.quantity,
      escapeCSV(tx.reasonOrSource || ''),
      escapeCSV(tx.documentNo || ''),
      escapeCSV(tx.recordedBy || ''),
      escapeCSV(tx.note || ''),
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = customFilename || `ประวัติการทำรายการ_Transactions_${getTimestampForFilename()}.csv`;
  downloadBlob(blob, filename);
}

/**
 * Export a Complete Backup CSV file containing both Products and Transactions in one structured file
 */
export function exportCombinedBackupToCSV(
  products: Product[],
  transactions: StockTransaction[],
  customFilename?: string
) {
  const timestamp = new Date().toLocaleString('th-TH');
  const totalQty = products.reduce((sum, p) => sum + p.quantity, 0);

  const lines: string[] = [];

  // Metadata header
  lines.push(escapeCSV('=== ไฟล์สำรองข้อมูลระบบจัดการสต็อกสินค้า (SMART STOCK BACKUP) ==='));
  lines.push(`${escapeCSV('วันที่และเวลาสำรองข้อมูล')},${escapeCSV(timestamp)}`);
  lines.push(`${escapeCSV('จำนวนรายการสินค้าทั้งหมด')},${products.length},${escapeCSV('จำนวนชิ้นรวมในคลัง')},${totalQty}`);
  lines.push(`${escapeCSV('จำนวนประวัติการทำรายการทั้งหมด')},${transactions.length}`);
  lines.push('');

  // Section 1: Products
  lines.push(escapeCSV('=== 1. ข้อมูลรายการสต็อกสินค้าคงคลัง (PRODUCTS CATALOG) ==='));
  const productHeaders = [
    'รหัสสินค้า (SKU)',
    'ชื่อสินค้า',
    'หมวดหมู่',
    'หน่วยนับ',
    'จำนวนคงเหลือ',
    'จุดเตือนสต็อกขั้นต่ำ',
    'สถานะสินค้า',
    'สินค้าโฟกัสพิเศษ',
    'อัปเดตล่าสุด',
    'หมายเหตุ',
  ];
  lines.push(productHeaders.join(','));

  products.forEach((p) => {
    const status =
      p.quantity <= 0 ? 'หมดสต็อก' : p.quantity <= p.minStock ? 'ใกล้หมด' : 'ปกติ';
    const focusStr = p.isFocus ? 'ใช่' : 'ไม่ใช่';
    const updated = p.lastUpdated ? p.lastUpdated.replace('T', ' ').slice(0, 19) : '';

    lines.push(
      [
        escapeCSV(p.sku),
        escapeCSV(p.name),
        escapeCSV(p.category),
        escapeCSV(p.unit),
        p.quantity,
        p.minStock,
        escapeCSV(status),
        escapeCSV(focusStr),
        escapeCSV(updated),
        escapeCSV(p.note || ''),
      ].join(',')
    );
  });

  lines.push('');
  lines.push('');

  // Section 2: Transactions
  lines.push(escapeCSV('=== 2. ประวัติการทำรายการรับเข้าและตัดสต็อก (TRANSACTIONS AUDIT TRAIL) ==='));
  const txHeaders = [
    'รหัสรายการ (ID)',
    'วันที่-เวลาทำรายการ',
    'ประเภทรายการ',
    'รหัสสินค้า (SKU)',
    'ชื่อสินค้า',
    'จำนวน',
    'สาเหตุ / แหล่งที่มา / ลูกค้า',
    'เลขที่เอกสาร / บิล / PO',
    'ผู้บันทึกรายการ',
    'หมายเหตุ',
  ];
  lines.push(txHeaders.join(','));

  transactions.forEach((tx) => {
    const typeLabel = tx.type === 'IN' ? 'รับเข้า (IN)' : 'ตัดออก (OUT)';
    const formattedDate = tx.dateTime ? tx.dateTime.replace('T', ' ').slice(0, 19) : '';

    lines.push(
      [
        escapeCSV(tx.id),
        escapeCSV(formattedDate),
        escapeCSV(typeLabel),
        escapeCSV(tx.sku),
        escapeCSV(tx.productName),
        tx.quantity,
        escapeCSV(tx.reasonOrSource || ''),
        escapeCSV(tx.documentNo || ''),
        escapeCSV(tx.recordedBy || ''),
        escapeCSV(tx.note || ''),
      ].join(',')
    );
  });

  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = customFilename || `สำรองข้อมูลสต็อกฉบับสมบูรณ์_CompleteBackup_${getTimestampForFilename()}.csv`;
  downloadBlob(blob, filename);
}

/**
 * Export JSON backup for offline archiving and restoration
 */
export function exportBackupJSON(
  products: Product[],
  transactions: StockTransaction[],
  customFilename?: string
) {
  const backupData = {
    appName: 'Smart Stock Manager',
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    stats: {
      totalProducts: products.length,
      totalQuantity: products.reduce((sum, p) => sum + p.quantity, 0),
      totalTransactions: transactions.length,
    },
    products,
    transactions,
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const filename = customFilename || `SmartStock_Backup_${getTimestampForFilename()}.json`;
  downloadBlob(blob, filename);
}
