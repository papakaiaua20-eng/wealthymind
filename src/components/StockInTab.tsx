import React, { useState, useMemo } from 'react';
import {
  ArrowDownLeft,
  Search,
  CheckCircle,
  Calendar,
  Layers,
  Truck,
  History,
  Tag,
  DollarSign,
  Filter,
  RotateCcw,
  SlidersHorizontal,
  X,
  FileText,
  Package,
  TrendingUp,
  Download,
} from 'lucide-react';
import { Product, StockTransaction, STOCK_IN_REASONS } from '../types/inventory';
import { ConfirmModal } from './ConfirmModal';
import { exportTransactionsToCSV } from '../utils/csvExport';

interface StockInTabProps {
  products: Product[];
  recentTransactions: StockTransaction[];
  onStockIn: (tx: {
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

export const StockInTab: React.FC<StockInTabProps> = ({
  products,
  recentTransactions,
  onStockIn,
  isSyncing,
}) => {
  // Form States
  const [selectedSKU, setSelectedSKU] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState(STOCK_IN_REASONS[0]);
  const [dateTime, setDateTime] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [note, setNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [productStatusQuickFilter, setProductStatusQuickFilter] = useState<'ALL' | 'NEED_RESTOCK'>('ALL');

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // History Search & Filter States
  const [historySearch, setHistorySearch] = useState('');
  const [historyReasonFilter, setHistoryReasonFilter] = useState<string>('ALL');
  const [historyStartDate, setHistoryStartDate] = useState<string>('');
  const [historyEndDate, setHistoryEndDate] = useState<string>('');
  const [historyDatePreset, setHistoryDatePreset] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [showHistoryFilters, setShowHistoryFilters] = useState<boolean>(false);

  // Selected product
  const selectedProduct = products.find((p) => p.sku === selectedSKU);

  const handleSelectProduct = (sku: string) => {
    setSelectedSKU(sku);
  };

  const parsedQty = parseFloat(quantity) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      alert('กรุณาเลือกสินค้าที่ต้องการรับเข้า');
      return;
    }
    if (parsedQty <= 0) {
      alert('กรุณาระบุจำนวนรับเข้ามากกว่า 0');
      return;
    }

    setIsConfirmOpen(true);
  };

  const handleConfirmExecute = async () => {
    if (!selectedProduct) return;
    try {
      setIsSubmitting(true);

      await onStockIn({
        sku: selectedProduct.sku,
        productName: selectedProduct.name,
        quantity: parsedQty,
        unitPrice: 0,
        totalPrice: 0,
        reasonOrSource: reason,
        documentNo: '',
        dateTime: new Date(dateTime).toISOString(),
        note: note.trim(),
      });

      setSuccessMessage(`รับเข้าสินค้า "${selectedProduct.name}" สำเร็จ (+${parsedQty} ${selectedProduct.unit})`);
      setTimeout(() => setSuccessMessage(null), 5000);

      // Reset form
      setQuantity('');
      setNote('');
      setIsConfirmOpen(false);
    } catch (err: any) {
      alert(`ไม่สามารถบันทึกการรับเข้าสต็อกได้: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered product suggestions in Form
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchQuick =
        productStatusQuickFilter === 'ALL' ||
        (productStatusQuickFilter === 'NEED_RESTOCK' && p.quantity <= p.minStock);

      return matchSearch && matchQuick;
    });
  }, [products, searchQuery, productStatusQuickFilter]);

  // Date Preset Handler for History
  const handleHistoryDatePreset = (preset: 'ALL' | 'TODAY' | 'WEEK' | 'MONTH') => {
    setHistoryDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (preset === 'ALL') {
      setHistoryStartDate('');
      setHistoryEndDate('');
    } else if (preset === 'TODAY') {
      setHistoryStartDate(todayStr);
      setHistoryEndDate(todayStr);
    } else if (preset === 'WEEK') {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      setHistoryStartDate(past.toISOString().slice(0, 10));
      setHistoryEndDate(todayStr);
    } else if (preset === 'MONTH') {
      const past = new Date();
      past.setDate(now.getDate() - 30);
      setHistoryStartDate(past.toISOString().slice(0, 10));
      setHistoryEndDate(todayStr);
    }
  };

  const handleResetHistoryFilters = () => {
    setHistorySearch('');
    setHistoryReasonFilter('ALL');
    setHistoryStartDate('');
    setHistoryEndDate('');
    setHistoryDatePreset('ALL');
  };

  const isHistoryFilterActive =
    historySearch !== '' ||
    historyReasonFilter !== 'ALL' ||
    historyStartDate !== '' ||
    historyEndDate !== '';

  // All Stock-In Transactions
  const inTransactions = useMemo(() => {
    return recentTransactions.filter((tx) => tx.type === 'IN');
  }, [recentTransactions]);

  // Filtered History Transactions
  const filteredInTransactions = useMemo(() => {
    return inTransactions.filter((tx) => {
      // Search: Product Name, SKU, DocNo, Reason/Source, Note
      const term = historySearch.toLowerCase().trim();
      const matchSearch =
        !term ||
        tx.productName.toLowerCase().includes(term) ||
        tx.sku.toLowerCase().includes(term) ||
        (tx.documentNo && tx.documentNo.toLowerCase().includes(term)) ||
        (tx.reasonOrSource && tx.reasonOrSource.toLowerCase().includes(term)) ||
        (tx.note && tx.note.toLowerCase().includes(term));

      // Reason filter
      const matchReason =
        historyReasonFilter === 'ALL' ||
        tx.reasonOrSource.includes(historyReasonFilter) ||
        (historyReasonFilter.includes('รับคืนสินค้า') && tx.reasonOrSource.includes('รับคืนสินค้า')) ||
        (historyReasonFilter.includes('ปรับปรุงสต็อก') && tx.reasonOrSource.includes('ปรับปรุงสต็อก'));

      // Date range filter
      let matchDate = true;
      const txDate = tx.dateTime ? tx.dateTime.slice(0, 10) : '';
      if (historyStartDate && txDate && txDate < historyStartDate) matchDate = false;
      if (historyEndDate && txDate && txDate > historyEndDate) matchDate = false;

      return matchSearch && matchReason && matchDate;
    });
  }, [inTransactions, historySearch, historyReasonFilter, historyStartDate, historyEndDate]);

  // Summary Metrics of filtered history
  const historySummary = useMemo(() => {
    const totalQty = filteredInTransactions.reduce((sum, tx) => sum + tx.quantity, 0);
    const distinctSkus = new Set(filteredInTransactions.map((tx) => tx.sku)).size;
    return { totalQty, distinctSkus, count: filteredInTransactions.length };
  }, [filteredInTransactions]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">รับเข้าสินค้า (Stock In)</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            บันทึกการรับสินค้าเข้าคลัง ค้นหาและกรองประวัติรับเข้าตามช่วงวันที่
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Main Grid: Form on Left, History & Filter on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Card (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs h-fit space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              <span>บันทึกรับเข้าคลัง</span>
            </h3>
            {/* Quick Status Filter for Product Selector */}
            <button
              type="button"
              onClick={() =>
                setProductStatusQuickFilter(
                  productStatusQuickFilter === 'ALL' ? 'NEED_RESTOCK' : 'ALL'
                )
              }
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition cursor-pointer ${
                productStatusQuickFilter === 'NEED_RESTOCK'
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {productStatusQuickFilter === 'NEED_RESTOCK'
                ? '⭐ กำลังดู: ของใกล้หมด'
                : 'ดูเฉพาะของใกล้หมด'}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Step 1: Select Product */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                เลือกสินค้า <span className="text-emerald-500">*</span>
              </label>

              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อสินค้า หรือ SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-emerald-500 outline-none"
                  />
                </div>

                <select
                  required
                  value={selectedSKU}
                  onChange={(e) => handleSelectProduct(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 outline-none bg-white text-slate-800 font-medium cursor-pointer"
                >
                  <option value="">-- เลือกสินค้า ({filteredProducts.length} รายการ) --</option>
                  {filteredProducts.map((p, idx) => (
                    <option key={p.id ? `${p.id}` : `${p.sku}-${idx}`} value={p.sku}>
                      [{p.sku}] {p.name} (คงเหลือ: {p.quantity} {p.unit.split(' ')[0]})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Product Card Info */}
              {selectedProduct && (
                <div className="mt-2.5 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-emerald-700 block text-xs">
                      {selectedProduct.sku}
                    </span>
                    <span className="font-bold text-slate-900 block truncate max-w-[180px]">
                      {selectedProduct.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">คงเหลือปัจจุบัน</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {selectedProduct.quantity} {selectedProduct.unit.split(' ')[0]}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                จำนวนรับเข้า <span className="text-emerald-500">*</span>
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
                  className="w-full px-3 py-2 text-sm font-bold font-mono rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-emerald-700"
                />
                {selectedProduct && (
                  <span className="absolute right-2.5 top-2.5 text-xs text-slate-400">
                    {selectedProduct.unit.split(' ')[0]}
                  </span>
                )}
              </div>
            </div>

            {/* Type / Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ประเภทการรับเข้า <span className="text-emerald-500">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 outline-none bg-white text-slate-800"
              >
                {STOCK_IN_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Date & Time */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                วันและเวลาที่รับเข้า
              </label>
              <input
                type="datetime-local"
                required
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 outline-none font-mono"
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
                placeholder="เช่น ตรวจรับครบถ้วน, ล็อต 2026"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !selectedSKU}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>ยืนยันการรับเข้าสินค้า</span>
            </button>
          </form>
        </div>

        {/* History & Filter Section (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-base">ประวัติและค้นหารายการรับเข้า</h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                {filteredInTransactions.length} รายการ
              </span>
            </div>

            {/* Filter Toggle & Export */}
            <div className="flex items-center gap-2">
              {filteredInTransactions.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    exportTransactionsToCSV(
                      filteredInTransactions,
                      `ประวัติรับเข้าสินค้า_StockIn_${new Date().toISOString().slice(0, 10)}.csv`
                    )
                  }
                  title="ส่งออกรายการรับเข้าที่ค้นหาเป็นไฟล์ CSV"
                  className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 flex items-center gap-1 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ส่งออก CSV ({filteredInTransactions.length})</span>
                </button>
              )}
              {isHistoryFilterActive && (
                <button
                  type="button"
                  onClick={handleResetHistoryFilters}
                  className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 flex items-center gap-1 transition cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>ล้างตัวกรอง</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowHistoryFilters(!showHistoryFilters)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border flex items-center gap-1 transition cursor-pointer ${
                  showHistoryFilters || isHistoryFilterActive
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>ตัวกรองช่วงวันที่</span>
              </button>
            </div>
          </div>

          {/* Search Bar & Reason Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="ค้นหาชื่อสินค้า, SKU, หมายเหตุ..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-7 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-emerald-500 outline-none"
              />
              {historySearch && (
                <button
                  onClick={() => setHistorySearch('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div>
              <select
                value={historyReasonFilter}
                onChange={(e) => setHistoryReasonFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-emerald-500 outline-none text-slate-700 cursor-pointer"
              >
                <option value="ALL">ประเภทการรับเข้าทั้งหมด</option>
                {STOCK_IN_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Collapsible Date Range Filter for History */}
          {showHistoryFilters && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 animate-in fade-in duration-150 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  กรองตามช่วงวันที่รับเข้าสินค้า
                </span>
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    onClick={() => handleHistoryDatePreset('TODAY')}
                    className={`px-2 py-0.5 rounded-md ${historyDatePreset === 'TODAY' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                  >
                    วันนี้
                  </button>
                  <button
                    onClick={() => handleHistoryDatePreset('WEEK')}
                    className={`px-2 py-0.5 rounded-md ${historyDatePreset === 'WEEK' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                  >
                    7 วัน
                  </button>
                  <button
                    onClick={() => handleHistoryDatePreset('MONTH')}
                    className={`px-2 py-0.5 rounded-md ${historyDatePreset === 'MONTH' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                  >
                    30 วัน
                  </button>
                  <button
                    onClick={() => handleHistoryDatePreset('ALL')}
                    className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-600"
                  >
                    ทั้งหมด
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">ตั้งแต่วันที่</label>
                  <input
                    type="date"
                    value={historyStartDate}
                    onChange={(e) => {
                      setHistoryStartDate(e.target.value);
                      setHistoryDatePreset('ALL');
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">ถึงวันที่</label>
                  <input
                    type="date"
                    value={historyEndDate}
                    onChange={(e) => {
                      setHistoryEndDate(e.target.value);
                      setHistoryDatePreset('ALL');
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Filter KPI Mini Banner */}
          <div className="grid grid-cols-3 gap-2 bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 text-xs">
            <div>
              <span className="text-[10px] text-emerald-800 block">จำนวนชิ้นที่รับเข้า</span>
              <span className="font-mono font-bold text-emerald-900 text-sm">
                +{historySummary.totalQty.toLocaleString('th-TH')}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-800 block">ชนิดสินค้า</span>
              <span className="font-mono font-bold text-emerald-900 text-sm">
                {historySummary.distinctSkus} รายการ
              </span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-800 block">จำนวนครั้ง</span>
              <span className="font-mono font-bold text-emerald-900 text-sm">
                {historySummary.count} บิล
              </span>
            </div>
          </div>

          {/* History List Table */}
          <div className="flex-1 overflow-y-auto max-h-[420px] space-y-2 pr-1">
            {filteredInTransactions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                ไม่พบประวัติการรับเข้าตรงตามเงื่อนไขที่ค้นหา
              </div>
            ) : (
              filteredInTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-100 transition text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs line-clamp-1">
                      {tx.productName}
                    </span>
                    <span className="font-mono font-bold text-emerald-600 text-sm shrink-0">
                      +{tx.quantity}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span className="font-mono font-semibold text-slate-700">{tx.sku}</span>
                    <span className="truncate max-w-[200px]">{tx.reasonOrSource}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400 text-[10px] pt-1 border-t border-slate-200/60">
                    <div className="flex items-center gap-2">
                      <span>{new Date(tx.dateTime).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      {tx.documentNo && (
                        <span className="font-mono bg-white px-1.5 py-0.2 rounded border border-slate-200 text-slate-600">
                          {tx.documentNo}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-500">
                      {tx.recordedBy || 'เจ้าหน้าที่'}
                    </span>
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
        title="ยืนยันการรับเข้าสินค้า"
        message={`ต้องการบันทึกการรับเข้าสต็อกสินค้านี้ลงระบบ และเพิ่มยอดคงเหลือใน Google Sheets หรือไม่?`}
        variant="primary"
        confirmLabel="ยืนยันการรับเข้า"
        cancelLabel="ยกเลิก"
        isLoading={isSubmitting}
        details={
          selectedProduct
            ? [
                { label: 'รหัสสินค้า', value: selectedProduct.sku },
                { label: 'ชื่อสินค้า', value: selectedProduct.name },
                { label: 'จำนวนที่รับเข้า', value: `+${parsedQty} ${selectedProduct.unit}` },
                { label: 'สต็อกคงเหลือเดิม', value: `${selectedProduct.quantity} ${selectedProduct.unit}` },
                { label: 'สต็อกใหม่หลังรับเข้า', value: `${selectedProduct.quantity + parsedQty} ${selectedProduct.unit}` },
                { label: 'ประเภทการรับเข้า', value: reason },
              ]
            : undefined
        }
        onConfirm={handleConfirmExecute}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
};
