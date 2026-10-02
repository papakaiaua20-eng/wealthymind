export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  costPrice?: number;
  sellingPrice?: number;
  quantity: number;
  minStock: number;
  isFocus: boolean;
  lastUpdated: string;
  note?: string;
}

export type TransactionType = 'IN' | 'OUT';

export interface StockTransaction {
  id: string;
  dateTime: string; // ISO string or YYYY-MM-DD HH:mm
  type: TransactionType;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
  reasonOrSource: string; // e.g. "ขายหน้าร้าน", "ส่งสินค้าออนไลน์", "ผู้จำหน่าย A"
  documentNo?: string; // เลขที่เอกสาร / บิล / PO
  note?: string;
  recordedBy?: string;
}

export const DEFAULT_CATEGORIES = [
  'ทั่วไป (General)',
  'อาหารและเครื่องดื่ม (Food & Beverage)',
  'สินค้าอุปโภคบริโภค (Consumer Goods)',
  'เครื่องใช้สำนักงาน (Office Supplies)',
  'อุปกรณ์ไอทีและอิเล็กทรอนิกส์ (IT & Electronics)',
  'เครื่องมือช่างและฮาร์ดแวร์ (Tools & Hardware)',
  'เสื้อผ้าและแฟชั่น (Fashion & Apparel)',
  'สุขภาพและความงาม (Health & Beauty)',
  'อะไหล่และอุปกรณ์เสริม (Spare Parts)',
  'อื่นๆ (Others)',
];

export const DEFAULT_UNITS = [
  'ชิ้น (Piece)',
  'กล่อง (Box)',
  'แพ็ค (Pack)',
  'ขวด (Bottle)',
  'กระป๋อง (Can)',
  'กิโลกรัม (Kg)',
  'กรัม (g)',
  'ลิตร (L)',
  'เมตร (m)',
  'โหล (Dozen)',
  'ชุด (Set)',
  'ถุง (Bag)',
];

export const STOCK_OUT_REASONS = [
  'ขายหน้าร้าน',
  'ขายออนไลน์ / ส่งพัสดุ',
  'เบิกใช้งานภายในร้าน',
  'สินค้าชำรุด / เสียหาย',
  'สินค้าหมดอายุ',
  'คืนผู้ผลิต / เคลม',
  'ปรับปรุงสต็อก (ตรวจนับขาด)',
  'แจกเป็นสินค้าตัวอย่าง',
  'อื่นๆ',
];

export const STOCK_IN_REASONS = [
  'สั่งซื้อสินค้าเข้าสต็อกใหม่',
  'รับคืนสินค้าจากลูกค้า(พัสดุตีกลับ)',
  'ปรับปรุงสต็อก(ตรวจนับเกิน)',
  'อื่นๆ',
];
