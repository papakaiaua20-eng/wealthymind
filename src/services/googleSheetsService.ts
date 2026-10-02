import { Product, StockTransaction } from '../types/inventory';

const SPREADSHEET_NAME = 'ระบบสต็อกสินค้า_SmartStockDB';
const SPREADSHEET_STORAGE_KEY = 'stock_manager_spreadsheet_id';

export const INITIAL_DEMO_PRODUCTS: Product[] = [
  {
    id: 'P001',
    sku: 'SKU-001',
    name: 'กาแฟคั่วบด อาราบิก้า 100% (250g)',
    category: 'อาหารและเครื่องดื่ม (Food & Beverage)',
    unit: 'ถุง (Bag)',
    costPrice: 120,
    sellingPrice: 195,
    quantity: 45,
    minStock: 20,
    isFocus: true,
    lastUpdated: new Date().toISOString(),
    note: 'สินค้าขายดีอันดับ 1 เมล็ดคั่วกลาง',
  },
  {
    id: 'P002',
    sku: 'SKU-002',
    name: 'ชาเขียวมัทฉะ ผงอุจิเกรดพรีเมียม (100g)',
    category: 'อาหารและเครื่องดื่ม (Food & Beverage)',
    unit: 'กระป๋อง (Can)',
    costPrice: 280,
    sellingPrice: 420,
    quantity: 12,
    minStock: 15,
    isFocus: true,
    lastUpdated: new Date().toISOString(),
    note: 'นำเข้าจากญี่ปุ่น สต็อกเหลือน้อย',
  },
  {
    id: 'P003',
    sku: 'SKU-003',
    name: 'แก้วเก็บความเย็นสแตนเลส 24oz สกรีนโลโก้',
    category: 'สินค้าอุปโภคบริโภค (Consumer Goods)',
    unit: 'ใบ (Piece)',
    costPrice: 150,
    sellingPrice: 290,
    quantity: 80,
    minStock: 25,
    isFocus: false,
    lastUpdated: new Date().toISOString(),
    note: 'เก็บความเย็นได้ 18 ชั่วโมง',
  },
  {
    id: 'P004',
    sku: 'SKU-004',
    name: 'สมุดโน้ตถนอมสายตา ปกหนัง A5',
    category: 'เครื่องใช้สำนักงาน (Office Supplies)',
    unit: 'เล่ม (Piece)',
    costPrice: 45,
    sellingPrice: 89,
    quantity: 120,
    minStock: 30,
    isFocus: false,
    lastUpdated: new Date().toISOString(),
    note: 'กระดาษกริด 80 แกรม',
  },
  {
    id: 'P005',
    sku: 'SKU-005',
    name: 'สายชาร์จถัก Fast Charge Type-C 65W (1.5m)',
    category: 'อุปกรณ์ไอทีและอิเล็กทรอนิกส์ (IT & Electronics)',
    unit: 'เส้น (Piece)',
    costPrice: 90,
    sellingPrice: 199,
    quantity: 6,
    minStock: 10,
    isFocus: true,
    lastUpdated: new Date().toISOString(),
    note: 'รองรับ PD 3.0 สต็อกด่วน',
  },
  {
    id: 'P006',
    sku: 'SKU-006',
    name: 'กล่องกระดาษลูกฟูก เบอร์ 2A (10 กล่อง/แพ็ค)',
    category: 'สินค้าอุปโภคบริโภค (Consumer Goods)',
    unit: 'แพ็ค (Pack)',
    costPrice: 65,
    sellingPrice: 110,
    quantity: 50,
    minStock: 15,
    isFocus: false,
    lastUpdated: new Date().toISOString(),
    note: 'สำหรับแพ็คส่งพัสดุด่วน',
  },
];

export const INITIAL_DEMO_TRANSACTIONS: StockTransaction[] = [
  {
    id: 'TX-1001',
    dateTime: new Date(Date.now() - 3600000 * 5).toISOString(),
    type: 'OUT',
    sku: 'SKU-001',
    productName: 'กาแฟคั่วบด อาราบิก้า 100% (250g)',
    quantity: 5,
    unitPrice: 195,
    totalPrice: 975,
    reasonOrSource: 'ขายหน้าร้าน',
    documentNo: 'INV-20260929-01',
    note: 'ลูกค้าประจำ สาขาหลัก',
    recordedBy: 'แคชเชียร์ 1',
  },
  {
    id: 'TX-1002',
    dateTime: new Date(Date.now() - 3600000 * 3).toISOString(),
    type: 'OUT',
    sku: 'SKU-005',
    productName: 'สายชาร์จถัก Fast Charge Type-C 65W (1.5m)',
    quantity: 4,
    unitPrice: 199,
    totalPrice: 796,
    reasonOrSource: 'ขายออนไลน์ / ส่งพัสดุ',
    documentNo: 'ORD-88912',
    note: 'ออเดอร์ Shopee',
    recordedBy: 'แอดมินออนไลน์',
  },
  {
    id: 'TX-1003',
    dateTime: new Date(Date.now() - 3600000 * 2).toISOString(),
    type: 'IN',
    sku: 'SKU-003',
    productName: 'แก้วเก็บความเย็นสแตนเลส 24oz สกรีนโลโก้',
    quantity: 30,
    unitPrice: 150,
    totalPrice: 4500,
    reasonOrSource: 'สั่งซื้อสินค้าเข้าสต็อกใหม่',
    documentNo: 'PO-2026-0920',
    note: 'รับเข้าจากโรงงาน บจก.สแตนเลสไทย',
    recordedBy: 'หัวหน้าคลังสินค้า',
  },
];

// Helper headers
const PRODUCT_HEADERS = [
  'รหัสสินค้า (SKU)',
  'ชื่อสินค้า',
  'หมวดหมู่',
  'หน่วยนับ',
  'ราคาทุน (บาท)',
  'ราคาขาย (บาท)',
  'จำนวนคงเหลือ',
  'จุดเตือนขั้นต่ำ',
  'สินค้าโฟกัส (TRUE/FALSE)',
  'อัปเดตล่าสุด',
  'หมายเหตุ',
];

const TRANSACTION_HEADERS = [
  'รหัสรายการ',
  'วันที่-เวลา',
  'ประเภท (IN/OUT)',
  'รหัสสินค้า (SKU)',
  'ชื่อสินค้า',
  'จำนวน',
  'ราคาต่อหน่วย',
  'ราคารวม',
  'สาเหตุ/ที่มา',
  'เลขที่เอกสาร',
  'หมายเหตุ',
  'ผู้บันทึก',
];

export const getSavedSpreadsheetId = (): string | null => {
  return localStorage.getItem(SPREADSHEET_STORAGE_KEY);
};

export const setSavedSpreadsheetId = (id: string) => {
  localStorage.setItem(SPREADSHEET_STORAGE_KEY, id);
};

/**
 * Searches Drive for an existing inventory spreadsheet or creates a new one
 */
export async function findOrCreateSpreadsheet(accessToken: string): Promise<{ id: string; name: string; url: string }> {
  // Check if saved ID in localStorage is valid
  const savedId = getSavedSpreadsheetId();
  if (savedId) {
    try {
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${savedId}?fields=spreadsheetId,properties.title`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        return {
          id: data.spreadsheetId,
          name: data.properties?.title || SPREADSHEET_NAME,
          url: `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
        };
      }
    } catch {
      // Continue to search/create
    }
  }

  // Search Drive for file with SPREADSHEET_NAME
  try {
    const q = encodeURIComponent(`name = '${SPREADSHEET_NAME}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink)`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        const found = searchData.files[0];
        setSavedSpreadsheetId(found.id);
        return {
          id: found.id,
          name: found.name,
          url: found.webViewLink || `https://docs.google.com/spreadsheets/d/${found.id}/edit`,
        };
      }
    }
  } catch (err) {
    console.warn('Drive search error, falling back to direct create', err);
  }

  // If not found, create new spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: SPREADSHEET_NAME,
      },
      sheets: [
        { properties: { title: 'Products' } },
        { properties: { title: 'Transactions' } },
      ],
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`ไม่สามารถสร้าง Google Sheet ได้: ${errText}`);
  }

  const createdData = await createRes.json();
  const spreadsheetId = createdData.spreadsheetId;
  setSavedSpreadsheetId(spreadsheetId);

  // Initialize sheets with header rows and initial demo data
  await initSpreadsheetData(spreadsheetId, accessToken);

  return {
    id: spreadsheetId,
    name: SPREADSHEET_NAME,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}

/**
 * Initializes header rows and starter demo items in the new sheet
 */
export async function initSpreadsheetData(spreadsheetId: string, accessToken: string) {
  // 1. Populate Products sheet
  const productRows = [
    PRODUCT_HEADERS,
    ...INITIAL_DEMO_PRODUCTS.map((p) => [
      p.sku,
      p.name,
      p.category,
      p.unit,
      p.costPrice,
      p.sellingPrice,
      p.quantity,
      p.minStock,
      p.isFocus ? 'TRUE' : 'FALSE',
      p.lastUpdated,
      p.note || '',
    ]),
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Products!A1:K${productRows.length}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: productRows }),
  });

  // 2. Populate Transactions sheet
  const txRows = [
    TRANSACTION_HEADERS,
    ...INITIAL_DEMO_TRANSACTIONS.map((t) => [
      t.id,
      t.dateTime,
      t.type,
      t.sku,
      t.productName,
      t.quantity,
      t.unitPrice,
      t.totalPrice,
      t.reasonOrSource,
      t.documentNo || '',
      t.note || '',
      t.recordedBy || '',
    ]),
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transactions!A1:L${txRows.length}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: txRows }),
  });
}

/**
 * Fetch all products from Products sheet
 */
export async function fetchProductsFromSheet(spreadsheetId: string, accessToken: string): Promise<Product[]> {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Products!A2:K1000`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error('ไม่สามารถอ่านข้อมูลสินค้าจาก Google Sheets ได้');
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];

  return rows
    .filter((r) => r[0] && r[1]) // Must have SKU and Name
    .map((r, idx) => ({
      id: `P-${idx + 1}-${r[0]}`,
      sku: String(r[0] || '').trim(),
      name: String(r[1] || '').trim(),
      category: String(r[2] || 'ทั่วไป (General)').trim(),
      unit: String(r[3] || 'ชิ้น (Piece)').trim(),
      costPrice: parseFloat(r[4]) || 0,
      sellingPrice: parseFloat(r[5]) || 0,
      quantity: parseFloat(r[6]) || 0,
      minStock: parseFloat(r[7]) || 0,
      isFocus: String(r[8]).toUpperCase() === 'TRUE',
      lastUpdated: r[9] || new Date().toISOString(),
      note: r[10] || '',
    }));
}

/**
 * Sync entire products list back to Google Sheet
 */
export async function syncProductsToSheet(spreadsheetId: string, products: Product[], accessToken: string): Promise<void> {
  // Clear Products tab content first
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Products!A2:K1000:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (products.length === 0) return;

  const rows = products.map((p) => [
    p.sku,
    p.name,
    p.category,
    p.unit,
    p.costPrice,
    p.sellingPrice,
    p.quantity,
    p.minStock,
    p.isFocus ? 'TRUE' : 'FALSE',
    p.lastUpdated,
    p.note || '',
  ]);

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Products!A2:K${rows.length + 1}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: rows }),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.text();
    throw new Error(`บันทึกสินค้าลงชีตไม่สำเร็จ: ${err}`);
  }
}

/**
 * Fetch all stock transactions from Transactions sheet
 */
export async function fetchTransactionsFromSheet(spreadsheetId: string, accessToken: string): Promise<StockTransaction[]> {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transactions!A2:L2000`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error('ไม่สามารถอ่านประวัติการเคลื่อนไหวสต็อกจาก Google Sheets ได้');
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];

  return rows
    .filter((r) => r[0] && r[3]) // Must have TX ID and SKU
    .map((r) => ({
      id: String(r[0] || '').trim(),
      dateTime: r[1] || new Date().toISOString(),
      type: (r[2] === 'IN' || r[2] === 'OUT' ? r[2] : 'OUT') as 'IN' | 'OUT',
      sku: String(r[3] || '').trim(),
      productName: String(r[4] || '').trim(),
      quantity: parseFloat(r[5]) || 0,
      unitPrice: parseFloat(r[6]) || 0,
      totalPrice: parseFloat(r[7]) || 0,
      reasonOrSource: String(r[8] || '').trim(),
      documentNo: String(r[9] || '').trim(),
      note: String(r[10] || '').trim(),
      recordedBy: String(r[11] || '').trim(),
    }))
    .reverse(); // Latest first
}

/**
 * Append single transaction row to Transactions sheet
 */
export async function appendTransactionToSheet(
  spreadsheetId: string,
  tx: StockTransaction,
  accessToken: string
): Promise<void> {
  const row = [
    tx.id,
    tx.dateTime,
    tx.type,
    tx.sku,
    tx.productName,
    tx.quantity,
    tx.unitPrice,
    tx.totalPrice,
    tx.reasonOrSource,
    tx.documentNo || '',
    tx.note || '',
    tx.recordedBy || '',
  ];

  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transactions!A:L:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [row] }),
    }
  );

  if (!appendRes.ok) {
    const err = await appendRes.text();
    throw new Error(`บันทึก Transaction ลงชีตไม่สำเร็จ: ${err}`);
  }
}
