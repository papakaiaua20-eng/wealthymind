import React, { useState, useMemo } from 'react';
import {
  Download,
  FileSpreadsheet,
  X,
  Boxes,
  History,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Database,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  AlertTriangle,
  Star,
  Eye,
} from 'lucide-react';
import { Product, StockTransaction } from '../types/inventory';
import {
  exportProductsToCSV,
  exportTransactionsToCSV,
  exportCombinedBackupToCSV,
  exportBackupJSON,
} from '../utils/csvExport';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  transactions: StockTransaction[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  products,
  transactions,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'products' | 'transactions'>('all');
  const [productFilter, setProductFilter] = useState<'ALL' | 'LOW' | 'FOCUS'>('ALL');
  const [txFilter, setTxFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [txDateRange, setTxDateRange] = useState<'ALL' | '7DAYS' | '30DAYS'>('ALL');
  const [showPreview, setShowPreview] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Compute metrics
  const totalProducts = products.length;
  const totalQty = products.reduce((sum, p) => sum + p.quantity, 0);
  const normalStockCount = products.filter((p) => p.quantity > p.minStock).length;
  const lowStockCount = products.filter((p) => p.quantity <= p.minStock).length;
  const focusCount = products.filter((p) => p.isFocus).length;

  const totalTx = transactions.length;
  const inTxCount = transactions.filter((t) => t.type === 'IN').length;
  const outTxCount = transactions.filter((t) => t.type === 'OUT').length;

  // Filtered Products for export
  const exportTargetProducts = useMemo(() => {
    if (productFilter === 'LOW') {
      return products.filter((p) => p.quantity <= p.minStock);
    }
    if (productFilter === 'FOCUS') {
      return products.filter((p) => p.isFocus);
    }
    return products;
  }, [products, productFilter]);

  // Filtered Transactions for export
  const exportTargetTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (txFilter === 'IN' && tx.type !== 'IN') return false;
      if (txFilter === 'OUT' && tx.type !== 'OUT') return false;

      if (txDateRange !== 'ALL' && tx.dateTime) {
        const txTime = new Date(tx.dateTime).getTime();
        const now = Date.now();
        const daysAgo7 = now - 7 * 24 * 60 * 60 * 1000;
        const daysAgo30 = now - 30 * 24 * 60 * 60 * 1000;
        if (txDateRange === '7DAYS' && txTime < daysAgo7) return false;
        if (txDateRange === '30DAYS' && txTime < daysAgo30) return false;
      }
      return true;
    });
  }, [transactions, txFilter, txDateRange]);

  const triggerSuccessAlert = (msg: string) => {
    setDownloadSuccess(msg);
    setTimeout(() => {
      setDownloadSuccess(null);
    }, 4000);
  };

  // Export handlers
  const handleExportProducts = () => {
    exportProductsToCSV(exportTargetProducts);
    triggerSuccessAlert(`ส่งออกข้อมูลสินค้า ${exportTargetProducts.length} รายการเป็นไฟล์ CSV เรียบร้อย`);
  };

  const handleExportTransactions = () => {
    exportTransactionsToCSV(exportTargetTransactions);
    triggerSuccessAlert(`ส่งออกประวัติการทำรายการ ${exportTargetTransactions.length} รายการเป็นไฟล์ CSV เรียบร้อย`);
  };

  const handleExportBothSeparate = () => {
    exportProductsToCSV(products);
    setTimeout(() => {
      exportTransactionsToCSV(transactions);
    }, 300);
    triggerSuccessAlert('ส่งออกทั้งไฟล์สต็อกสินค้าและประวัติการทำรายการ (2 ไฟล์ CSV) เรียบร้อย');
  };

  const handleExportCombined = () => {
    exportCombinedBackupToCSV(products, transactions);
    triggerSuccessAlert('ดาวน์โหลดไฟล์ CSV รวมเล่ม (สินค้า + ความเคลื่อนไหวสต็อก) สำเร็จ');
  };

  const handleExportJSON = () => {
    exportBackupJSON(products, transactions);
    triggerSuccessAlert('ดาวน์โหลดไฟล์สำรองฉุกเฉิน JSON (Full Backup) เรียบร้อย');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-2xl border border-white/20 text-emerald-400">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold tracking-tight">ศูนย์ส่งออกและสำรองข้อมูล (CSV Export & Backup)</h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    UTF-8 BOM รองรับภาษาไทย
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  ดาวน์โหลดข้อมูลสต็อกสินค้าและประวัติการทำรายการแบบออฟไลน์ สำหรับทำรายงาน ทำบัญชี หรือสำรองข้อมูล
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10">
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-[11px] text-slate-300 block">สินค้าในคลัง</span>
              <span className="text-lg font-bold text-white font-mono">
                {totalProducts} <span className="text-xs font-normal text-slate-300">รายการ</span>
              </span>
              <span className="text-[10px] text-emerald-400 block mt-0.5 font-mono">{totalQty.toLocaleString()} ชิ้นรวม</span>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-[11px] text-slate-300 block">สต็อกปกติ</span>
              <span className="text-lg font-bold text-emerald-400 font-mono">
                {normalStockCount} <span className="text-xs font-normal text-slate-300">รายการ</span>
              </span>
              <span className="text-[10px] text-emerald-300 block mt-0.5">
                ระดับปลอดภัย พร้อมจ่าย
              </span>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-[11px] text-slate-300 block">ประวัติการทำรายการ</span>
              <span className="text-lg font-bold text-white font-mono">
                {totalTx} <span className="text-xs font-normal text-slate-300">ครั้ง</span>
              </span>
              <span className="text-[10px] text-slate-300 block mt-0.5">
                รับเข้า {inTxCount} | ตัดออก {outTxCount}
              </span>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-[11px] text-slate-300 block">สถานะสต็อก</span>
              <span className="text-lg font-bold text-amber-400 font-mono">
                {lowStockCount} <span className="text-xs font-normal text-slate-300">ใกล้หมด</span>
              </span>
              <span className="text-[10px] text-indigo-300 block mt-0.5">
                โฟกัสพิเศษ {focusCount} รายการ
              </span>
            </div>
          </div>
        </div>

        {/* Success toast if triggered */}
        {downloadSuccess && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center justify-between text-xs font-semibold text-emerald-800 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{downloadSuccess}</span>
            </div>
            <button
              onClick={() => setDownloadSuccess(null)}
              className="text-emerald-600 hover:text-emerald-900 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Sub-tab selection */}
        <div className="px-6 pt-4 border-b border-slate-100 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setActiveSubTab('all')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>สำรองข้อมูลครบชุด (Full Backup)</span>
            </button>
            <button
              onClick={() => setActiveSubTab('products')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'products'
                  ? 'bg-emerald-700 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>ส่งออกสินค้าคงคลัง (Products)</span>
            </button>
            <button
              onClick={() => setActiveSubTab('transactions')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'transactions'
                  ? 'bg-indigo-700 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>ส่งออกประวัติสต็อก (Transactions)</span>
            </button>
          </div>

          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1 shrink-0 ${
              showPreview
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showPreview ? 'ซ่อนตัวอย่างข้อมูล' : 'ดูตัวอย่างข้อมูล'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: Complete Backup */}
          {activeSubTab === 'all' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Option 1: Dual CSV download */}
                <div className="p-5 rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/40 hover:bg-emerald-50/70 transition flex flex-col justify-between space-y-4">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-3 shadow-md shadow-emerald-500/20">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">ดาวน์โหลด 2 ไฟล์ CSV แยกกัน</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      ดาวน์โหลดไฟล์ CSV สินค้า ({products.length} รายการ) และไฟล์ประวัติการทำรายการ ({transactions.length} รายการ) พร้อมกัน 2 ไฟล์ทันที
                    </p>
                  </div>
                  <button
                    onClick={handleExportBothSeparate}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>ดาวน์โหลด 2 ไฟล์ CSV ทันที</span>
                  </button>
                </div>

                {/* Option 2: Combined Ledger CSV */}
                <div className="p-5 rounded-2xl border-2 border-indigo-500/30 bg-indigo-50/40 hover:bg-indigo-50/70 transition flex flex-col justify-between space-y-4">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-3 shadow-md shadow-indigo-500/20">
                      <Database className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">ไฟล์ CSV รวมเล่ม (Combined Ledger)</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      รวมทั้งสต็อกคงคลังและประวัติความเคลื่อนไหวทั้งหมดไว้ในไฟล์เดียว โดยแบ่งเป็น 2 ส่วนชัดเจนสำหรับเปิดในโปรแกรมสเปรดชีต
                    </p>
                  </div>
                  <button
                    onClick={handleExportCombined}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>ดาวน์โหลด CSV รวมเล่ม</span>
                  </button>
                </div>

                {/* Option 3: Full Backup JSON */}
                <div className="p-5 rounded-2xl border-2 border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 transition flex flex-col justify-between space-y-4">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center mb-3 shadow-md shadow-slate-700/20">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">สำรองข้อมูลฉุกเฉิน (JSON Backup)</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      สำรองโครงสร้างข้อมูลดิบแบบ 100% ครบทุกฟิลด์ สำหรับเก็บไว้ในเครื่องเพื่อกู้คืนข้อมูลหรือตรวจสอบทางเทคนิค
                    </p>
                  </div>
                  <button
                    onClick={handleExportJSON}
                    className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-2 cursor-pointer transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>ดาวน์โหลดไฟล์ JSON Backup</span>
                  </button>
                </div>
              </div>

              {/* Offline Usage Notes */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">คำแนะนำสำหรับการใช้งานออฟไลน์ (Offline Reporting):</p>
                  <p className="text-amber-800 leading-relaxed">
                    ไฟล์ CSV ที่ดาวน์โหลดมาทั้งหมดถูกเข้ารหัสแบบ <strong>UTF-8 with BOM</strong> สามารถดับเบิ้ลคลิกเปิดด้วยโปรแกรม <strong>Microsoft Excel, Apple Numbers, หรือ Google Sheets</strong> ได้ทันที โดยภาษาไทยจะไม่เป็นภาษาต่างดาว และสามารถนำไปทำสูตร Pivot Table, VLOOKUP หรือส่งให้ฝ่ายบัญชีได้สะดวก
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Export Products Only */}
          {activeSubTab === 'products' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <label className="text-xs font-bold text-slate-700 block">เลือกเงื่อนไขรายการสินค้าที่ต้องการส่งออก:</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setProductFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition ${
                      productFilter === 'ALL'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    สินค้าทั้งหมด ({products.length} รายการ)
                  </button>
                  <button
                    onClick={() => setProductFilter('LOW')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition flex items-center gap-1 ${
                      productFilter === 'LOW'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>เฉพาะสินค้าใกล้หมด/หมดสต็อก ({lowStockCount} รายการ)</span>
                  </button>
                  <button
                    onClick={() => setProductFilter('FOCUS')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition flex items-center gap-1 ${
                      productFilter === 'FOCUS'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5" />
                    <span>เฉพาะสินค้าโฟกัสพิเศษ ({focusCount} รายการ)</span>
                  </button>
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">พร้อมส่งออก: {exportTargetProducts.length} รายการ</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    คอลัมน์ที่จะส่งออก: SKU, ชื่อสินค้า, หมวดหมู่, หน่วยนับ, จำนวนคงเหลือ, จุดเตือนขั้นต่ำ, สถานะสินค้า, สินค้าโฟกัส, อัปเดตล่าสุด, หมายเหตุ
                  </p>
                </div>
                <button
                  onClick={handleExportProducts}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลด CSV สินค้า ({exportTargetProducts.length})</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Export Transactions Only */}
          {activeSubTab === 'transactions' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2">ประเภทรายการ:</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setTxFilter('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition ${
                        txFilter === 'ALL'
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      ทั้งหมด ({transactions.length})
                    </button>
                    <button
                      onClick={() => setTxFilter('IN')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition flex items-center gap-1 ${
                        txFilter === 'IN'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      <span>เฉพาะรับเข้าสินค้า ({inTxCount})</span>
                    </button>
                    <button
                      onClick={() => setTxFilter('OUT')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition flex items-center gap-1 ${
                        txFilter === 'OUT'
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>เฉพาะตัดสต็อกสินค้า ({outTxCount})</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2">ช่วงเวลา:</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setTxDateRange('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition ${
                        txDateRange === 'ALL'
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      ข้อมูลทั้งหมดตลอดเวลา
                    </button>
                    <button
                      onClick={() => setTxDateRange('7DAYS')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition ${
                        txDateRange === '7DAYS'
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      ย้อนหลัง 7 วันล่าสุด
                    </button>
                    <button
                      onClick={() => setTxDateRange('30DAYS')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition ${
                        txDateRange === '30DAYS'
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      ย้อนหลัง 30 วันล่าสุด
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">พร้อมส่งออก: {exportTargetTransactions.length} รายการ</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    คอลัมน์ที่จะส่งออก: ID, วันที่เวลา, ประเภท, SKU, ชื่อสินค้า, จำนวน, สาเหตุ/แหล่งที่มา, เลขที่บิล, ผู้บันทึก, หมายเหตุ
                  </p>
                </div>
                <button
                  onClick={handleExportTransactions}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-2 cursor-pointer transition shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลด CSV ประวัติ ({exportTargetTransactions.length})</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Preview Area */}
          {showPreview && (
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-indigo-600" />
                  ตัวอย่างข้อมูลก่อนดาวน์โหลด (5 รายการแรก)
                </span>
                <span className="text-[11px] text-slate-500">
                  {activeSubTab === 'transactions' ? 'ตารางประวัติการทำรายการ' : 'ตารางสินค้าคงเหลือ'}
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white max-h-48 text-xs">
                {activeSubTab === 'transactions' ? (
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 text-[11px]">
                      <tr>
                        <th className="p-2">วันที่</th>
                        <th className="p-2">ประเภท</th>
                        <th className="p-2">SKU</th>
                        <th className="p-2">สินค้า</th>
                        <th className="p-2 text-right">จำนวน</th>
                        <th className="p-2">สาเหตุ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {exportTargetTransactions.slice(0, 5).map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50">
                          <td className="p-2 text-slate-500 font-mono text-[10px]">{tx.dateTime.slice(0, 16)}</td>
                          <td className="p-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                tx.type === 'IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td className="p-2 font-mono text-slate-600">{tx.sku}</td>
                          <td className="p-2 font-medium text-slate-900">{tx.productName}</td>
                          <td className="p-2 text-right font-bold">{tx.quantity}</td>
                          <td className="p-2 text-slate-500">{tx.reasonOrSource}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 text-[11px]">
                      <tr>
                        <th className="p-2">SKU</th>
                        <th className="p-2">ชื่อสินค้า</th>
                        <th className="p-2">หมวดหมู่</th>
                        <th className="p-2 text-right">คงเหลือ</th>
                        <th className="p-2 text-right">จุดเตือนขั้นต่ำ</th>
                        <th className="p-2">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {exportTargetProducts.slice(0, 5).map((p, idx) => (
                        <tr key={p.id ? `${p.id}` : `${p.sku}-${idx}`} className="hover:bg-slate-50">
                          <td className="p-2 font-mono text-slate-600">{p.sku}</td>
                          <td className="p-2 font-medium text-slate-900">{p.name}</td>
                          <td className="p-2 text-slate-500">{p.category}</td>
                          <td className="p-2 text-right font-bold">{p.quantity} {p.unit}</td>
                          <td className="p-2 text-right font-mono text-slate-500">{p.minStock} {p.unit}</td>
                          <td className="p-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                p.quantity <= 0
                                  ? 'bg-rose-100 text-rose-800'
                                  : p.quantity <= p.minStock
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {p.quantity <= 0 ? 'หมดสต็อก' : p.quantity <= p.minStock ? 'ใกล้หมด' : 'ปกติ'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            ระบบจัดเก็บไฟล์พร้อมวันที่และเวลากำกับโดยอัตโนมัติ
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
