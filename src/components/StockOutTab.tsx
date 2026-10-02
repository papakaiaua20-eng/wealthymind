import React, { useState } from 'react';
import {
  ArrowUpRight,
  Search,
  AlertTriangle,
  CheckCircle,
  FileText,
  Calendar,
  Layers,
  DollarSign,
  User,
  History,
  Tag,
  Download,
} from 'lucide-react';
import { Product, StockTransaction, STOCK_OUT_REASONS } from '../types/inventory';
import { ConfirmModal } from './ConfirmModal';
import { exportTransactionsToCSV } from '../utils/csvExport';

interface StockOutTabProps {
  products: Product[];
  recentTransactions: StockTransaction[];
  onStockOut: (tx: {
    sku: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    reasonOrSource: string;
    documentNo: string;
    dateTime: string;
    note: string;
  }) => Promise<void>;
  isSyncing: boolean;
}

export const StockOutTab: React.FC<StockOutTabProps> = ({
  products,
  recentTransactions,
  onStockOut,
  isSyncing,
}) => {
  const [selectedSKU, setSelectedSKU] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState(STOCK_OUT_REASONS[0]);
  const [documentNo, setDocumentNo] = useState('');
  const [dateTime, setDateTime] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [note, setNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Selected product
  const selectedProduct = products.find((p) => p.sku === selectedSKU);

  const handleSelectProduct = (sku: string) => {
    setSelectedSKU(sku);
  };

  const parsedQty = parseFloat(quantity) || 0;
  const isOverStock = selectedProduct ? parsedQty > selectedProduct.quantity : false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      alert('กรุณาเลือกสินค้าที่ต้องการตัดสต็อก');
      return;
    }
    if (parsedQty <= 0) {
      alert('กรุณาระบุจำนวนที่ต้องการตัดมากกว่า 0');
      return;
    }
    if (isOverStock) {
      if (
        !window.confirm(
          `คำเตือน: จำนวนที่ต้องการตัด (${parsedQty} ${selectedProduct.unit}) มากกว่าสต็อกคงเหลือ (${selectedProduct.quantity} ${selectedProduct.unit})\nต้องการดำเนินการต่อหรือไม่?`
        )
      ) {
        return;
      }
    }

    setIsConfirmOpen(true);
  };

  const handleConfirmExecute = async () => {
    if (!selectedProduct) return;
    try {
      setIsSubmitting(true);
      await onStockOut({
        sku: selectedProduct.sku,
        productName: selectedProduct.name,
        quantity: parsedQty,
        unitPrice: 0,
        totalPrice: 0,
        reasonOrSource: reason,
        documentNo: documentNo.trim(),
        dateTime: new Date(dateTime).toISOString(),
        note: note.trim(),
      });

      setSuccessMessage(`ตัดสต็อกสินค้า "${selectedProduct.name}" สำเร็จ (${parsedQty} ${selectedProduct.unit})`);
      setTimeout(() => setSuccessMessage(null), 5000);

      // Reset form
      setQuantity('');
      setDocumentNo('');
      setNote('');
      setIsConfirmOpen(false);
    } catch (err: any) {
      alert(`ไม่สามารถบันทึกการตัดสต็อกได้: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Recent Stock-out transactions filter
  const outTransactions = recentTransactions.filter((tx) => tx.type === 'OUT').slice(0, 10);

  // Filtered product suggestions
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">ตัดสต็อกสินค้า (Stock Out)</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            บันทึกการขายสินค้า เบิกใช้ หรือตัดสต็อกชำรุด พร้อมอัปเดตลง Google Sheets ทันที
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Card */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Step 1: Select Product */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                1. เลือกสินค้าที่ต้องการตัดสต็อก <span className="text-rose-500">*</span>
              </label>

              {/* Quick Search Dropdown / Picker */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="พิมพ์ค้นหาชื่อสินค้า หรือ รหัส SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none transition"
                  />
                </div>

                <select
                  required
                  value={selectedSKU}
                  onChange={(e) => handleSelectProduct(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none bg-white text-slate-800 font-medium cursor-pointer"
                >
                  <option value="">-- กรุณาเลือกสินค้าจากรายการ ({filteredProducts.length}) --</option>
                  {filteredProducts.map((p, idx) => (
                    <option key={p.id ? `${p.id}` : `${p.sku}-${idx}`} value={p.sku}>
                      [{p.sku}] {p.name} (คงเหลือ: {p.quantity} {p.unit.split(' ')[0]})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Product Card Info */}
              {selectedProduct && (
                <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-mono font-bold text-rose-600 block text-xs">
                      {selectedProduct.sku}
                    </span>
                    <span className="font-bold text-slate-900 text-sm block">
                      {selectedProduct.name}
                    </span>
                    <span className="text-slate-500">หมวด: {selectedProduct.category}</span>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span className="text-slate-400 block text-[10px]">คงเหลือในระบบ</span>
                      <span
                        className={`font-mono font-bold text-base ${
                          selectedProduct.quantity <= selectedProduct.minStock
                            ? 'text-rose-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {selectedProduct.quantity} {selectedProduct.unit.split(' ')[0]}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">ราคาขายปัจจุบัน</span>
                      <span className="font-mono font-bold text-slate-900 text-base">
                        ฿{selectedProduct.sellingPrice}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Quantity */}
            <div className="pt-2 border-t border-slate-100">
              {/* Quantity to cut */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  จำนวนที่ตัดสต็อก <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0"
                    className={`w-full px-3 py-2 text-base font-bold font-mono rounded-xl border outline-none ${
                      isOverStock
                        ? 'border-rose-500 bg-rose-50/50 text-rose-700 focus:ring-2 focus:ring-rose-200'
                        : 'border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                    }`}
                  />
                  {selectedProduct && (
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">
                      {selectedProduct.unit.split(' ')[0]}
                    </span>
                  )}
                </div>
                {isOverStock && (
                  <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    จำนวนมากกว่าสต็อกที่มี ({selectedProduct?.quantity})
                  </p>
                )}
              </div>
            </div>

            {/* Step 3: Reason & Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  สาเหตุการตัดสต็อก <span className="text-rose-500">*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none bg-white text-slate-800"
                >
                  {STOCK_OUT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  เลขที่เอกสาร / รหัสบิล / ลูกค้า
                </label>
                <input
                  type="text"
                  value={documentNo}
                  onChange={(e) => setDocumentNo(e.target.value)}
                  placeholder="เช่น INV-0012, ORD-4889, บิลหน้าร้าน"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none"
                />
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  วันและเวลาที่ทำรายการ
                </label>
                <input
                  type="datetime-local"
                  required
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  หมายเหตุเพิ่มเติม
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="เช่น ลูกค้าขอเปลี่ยนสินค้า, ตัดชำรุดรอเคลม"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmitting || !selectedSKU}
                className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md shadow-rose-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowUpRight className="w-5 h-5" />
                <span>ยืนยันการตัดสต็อกสินค้า</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right side: Recent Stock-Out History */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              <h3 className="font-bold text-slate-900 text-sm">ประวัติการตัดสต็อกล่าสุด</h3>
            </div>
            {outTransactions.length > 0 && (
              <button
                onClick={() => exportTransactionsToCSV(outTransactions, `ประวัติตัดสต็อก_StockOut_${new Date().toISOString().slice(0, 10)}.csv`)}
                title="ส่งออกรายการตัดสต็อกล่าสุดเป็น CSV"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ส่งออก CSV ({outTransactions.length})</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto max-h-[500px] space-y-2.5 pr-1">
            {outTransactions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                ยังไม่มีรายการตัดสต็อกล่าสุด
              </div>
            ) : (
              outTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-100 transition text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs line-clamp-1">
                      {tx.productName}
                    </span>
                    <span className="font-mono font-bold text-rose-600 text-sm shrink-0">
                      -{tx.quantity}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span className="font-mono">{tx.sku}</span>
                    <span>{tx.reasonOrSource}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400 text-[10px] pt-0.5 border-t border-slate-200/60">
                    <span>{new Date(tx.dateTime).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    {tx.documentNo && (
                      <span className="font-mono text-slate-600">
                        {tx.documentNo}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="ยืนยันการตัดสต็อกสินค้า"
        message={`ต้องการบันทึกการตัดสต็อกสินค้านี้ลงระบบ และอัปเดตลง Google Sheets หรือไม่?`}
        variant="danger"
        confirmLabel="ยืนยันการตัดสต็อก"
        cancelLabel="ยกเลิก"
        isLoading={isSubmitting}
        details={
          selectedProduct
            ? [
                { label: 'รหัสสินค้า', value: selectedProduct.sku },
                { label: 'ชื่อสินค้า', value: selectedProduct.name },
                { label: 'จำนวนที่ตัด', value: `${parsedQty} ${selectedProduct.unit}` },
                { label: 'สต็อกคงเหลือเดิม', value: `${selectedProduct.quantity} ${selectedProduct.unit}` },
                { label: 'สต็อกที่จะเหลือหลังตัด', value: `${selectedProduct.quantity - parsedQty} ${selectedProduct.unit}` },
                { label: 'สาเหตุการตัด', value: reason },
              ]
            : undefined
        }
        onConfirm={handleConfirmExecute}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
};
