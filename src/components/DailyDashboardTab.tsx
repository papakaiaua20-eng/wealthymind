import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar as CalendarIcon,
  TrendingDown,
  ShoppingBag,
  Layers,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Search,
  Filter,
  RotateCcw,
  SlidersHorizontal,
  X,
  Star,
  Package,
} from 'lucide-react';
import { StockTransaction, Product, STOCK_OUT_REASONS } from '../types/inventory';

interface DailyDashboardTabProps {
  transactions: StockTransaction[];
  products: Product[];
}

export const DailyDashboardTab: React.FC<DailyDashboardTabProps> = ({
  transactions,
  products,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Date Mode: 'SINGLE' or 'RANGE'
  const [dateMode, setDateMode] = useState<'SINGLE' | 'RANGE'>('SINGLE');
  const [singleDate, setSingleDate] = useState<string>(todayStr);
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [datePreset, setDatePreset] = useState<'TODAY' | 'YESTERDAY' | '7DAYS' | '30DAYS' | 'THIS_MONTH' | 'CUSTOM'>('TODAY');

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReason, setSelectedReason] = useState<string>('ALL');
  const [productStatusFilter, setProductStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'FOCUS'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Product lookup map for quick access
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.sku, p));
    return map;
  }, [products]);

  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category))), [products]);

  // Date Presets Handler
  const handleDatePreset = (preset: 'TODAY' | 'YESTERDAY' | '7DAYS' | '30DAYS' | 'THIS_MONTH') => {
    setDatePreset(preset);
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    if (preset === 'TODAY') {
      setDateMode('SINGLE');
      setSingleDate(today);
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'YESTERDAY') {
      const y = new Date();
      y.setDate(now.getDate() - 1);
      const yesterday = y.toISOString().slice(0, 10);
      setDateMode('SINGLE');
      setSingleDate(yesterday);
      setStartDate(yesterday);
      setEndDate(yesterday);
    } else if (preset === '7DAYS') {
      const past = new Date();
      past.setDate(now.getDate() - 6);
      setDateMode('RANGE');
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(today);
    } else if (preset === '30DAYS') {
      const past = new Date();
      past.setDate(now.getDate() - 29);
      setDateMode('RANGE');
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(today);
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      setDateMode('RANGE');
      setStartDate(firstDay);
      setEndDate(today);
    }
  };

  // Navigate Date prev / next in single date mode
  const handleShiftDate = (days: number) => {
    const d = new Date(singleDate);
    d.setDate(d.getDate() + days);
    const newDateStr = d.toISOString().slice(0, 10);
    setSingleDate(newDateStr);
    setStartDate(newDateStr);
    setEndDate(newDateStr);
    setDatePreset('CUSTOM');
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedReason('ALL');
    setProductStatusFilter('ALL');
    setSelectedCategory('ALL');
  };

  const isFilterActive =
    searchTerm !== '' ||
    selectedReason !== 'ALL' ||
    productStatusFilter !== 'ALL' ||
    selectedCategory !== 'ALL';

  // Filter Transactions by Type === 'OUT', Date Range, Search, Status, and Category
  const filteredOutTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Must be OUT transaction
      if (tx.type !== 'OUT') return false;

      // 1. Date Filter
      const txDate = tx.dateTime ? tx.dateTime.slice(0, 10) : '';
      if (dateMode === 'SINGLE') {
        if (txDate !== singleDate) return false;
      } else {
        if (startDate && txDate < startDate) return false;
        if (endDate && txDate > endDate) return false;
      }

      // 2. Search Filter (Product Name, SKU, Document No, Reason, Note)
      const term = searchTerm.toLowerCase().trim();
      if (term) {
        const matchName = tx.productName.toLowerCase().includes(term);
        const matchSku = tx.sku.toLowerCase().includes(term);
        const matchDoc = tx.documentNo && tx.documentNo.toLowerCase().includes(term);
        const matchReason = tx.reasonOrSource && tx.reasonOrSource.toLowerCase().includes(term);
        const matchNote = tx.note && tx.note.toLowerCase().includes(term);
        if (!matchName && !matchSku && !matchDoc && !matchReason && !matchNote) return false;
      }

      // 3. Reason Filter
      if (selectedReason !== 'ALL' && !tx.reasonOrSource.includes(selectedReason)) {
        return false;
      }

      // 4. Product Status Filter (Check current status of the item in stock)
      const product = productMap.get(tx.sku);
      if (productStatusFilter !== 'ALL') {
        if (!product) return false;
        if (productStatusFilter === 'OUT_OF_STOCK' && product.quantity > 0) return false;
        if (productStatusFilter === 'LOW_STOCK' && (product.quantity <= 0 || product.quantity > product.minStock)) return false;
        if (productStatusFilter === 'IN_STOCK' && product.quantity <= product.minStock) return false;
        if (productStatusFilter === 'FOCUS' && !product.isFocus) return false;
      }

      // 5. Category Filter
      if (selectedCategory !== 'ALL') {
        if (!product || product.category !== selectedCategory) return false;
      }

      return true;
    });
  }, [
    transactions,
    dateMode,
    singleDate,
    startDate,
    endDate,
    searchTerm,
    selectedReason,
    productStatusFilter,
    selectedCategory,
    productMap,
  ]);

  // Aggregate metrics
  const totalQtyIssued = useMemo(() => {
    return filteredOutTransactions.reduce((sum, tx) => sum + tx.quantity, 0);
  }, [filteredOutTransactions]);

  const totalTransactionsCount = filteredOutTransactions.length;

  const distinctProductsCount = useMemo(() => {
    return new Set(filteredOutTransactions.map((tx) => tx.sku)).size;
  }, [filteredOutTransactions]);

  const avgQtyPerTx = totalTransactionsCount > 0 ? (totalQtyIssued / totalTransactionsCount).toFixed(1) : '0';

  // Aggregated summary of all distinct products that went out on the selected date/range
  const allOutProductsSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        sku: string;
        name: string;
        category: string;
        unit: string;
        currentStock: number;
        minStock: number;
        isFocus: boolean;
        totalOutQty: number;
        txCount: number;
        reasons: Set<string>;
      }
    >();

    filteredOutTransactions.forEach((tx) => {
      const existing = map.get(tx.sku);
      const prod = productMap.get(tx.sku);
      const reason = tx.reasonOrSource || 'ไม่ระบุ';

      if (existing) {
        existing.totalOutQty += tx.quantity;
        existing.txCount += 1;
        existing.reasons.add(reason);
      } else {
        map.set(tx.sku, {
          sku: tx.sku,
          name: tx.productName || prod?.name || tx.sku,
          category: prod?.category || 'ทั่วไป',
          unit: prod?.unit || 'ชิ้น',
          currentStock: prod?.quantity ?? 0,
          minStock: prod?.minStock ?? 10,
          isFocus: prod?.isFocus ?? false,
          totalOutQty: tx.quantity,
          txCount: 1,
          reasons: new Set([reason]),
        });
      }
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        percentage: totalQtyIssued > 0 ? Math.round((item.totalOutQty / totalQtyIssued) * 100) : 0,
        reasonsList: Array.from(item.reasons).join(', '),
      }))
      .sort((a, b) => b.totalOutQty - a.totalOutQty);
  }, [filteredOutTransactions, productMap, totalQtyIssued]);

  // Formatted date string for banner
  const dateDisplayLabel = useMemo(() => {
    if (dateMode === 'SINGLE') {
      try {
        const d = new Date(singleDate);
        return d.toLocaleDateString('th-TH', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } catch {
        return singleDate;
      }
    } else {
      return `ช่วงวันที่ ${startDate} ถึง ${endDate}`;
    }
  }, [dateMode, singleDate, startDate, endDate]);

  // Export CSV of aggregated products summary
  const handleExportProductsSummaryCSV = () => {
    const headers = [
      'ชื่อสินค้า',
      'หมวดหมู่',
      'จำนวนที่ตัดออก',
      'หน่วยนับ',
      'สัดส่วน (%)',
      'จำนวนครั้งที่ตัด (บิล)',
      'สต็อกคงเหลือปัจจุบัน',
      'สถานะสต็อก',
      'สาเหตุการตัด',
    ];
    const rows = allOutProductsSummary.map((item) => {
      const status =
        item.currentStock <= 0 ? 'หมดสต็อก' : item.currentStock <= item.minStock ? 'ใกล้หมด' : 'ปกติ';
      return [
        `"${item.name.replace(/"/g, '""')}"`,
        `"${item.category}"`,
        item.totalOutQty,
        `"${item.unit}"`,
        `${item.percentage}%`,
        item.txCount,
        item.currentStock,
        `"${status}"`,
        `"${item.reasonsList}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `สรุปสินค้าที่ออก_${dateMode === 'SINGLE' ? singleDate : `${startDate}_${endDate}`}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export CSV of dashboard items (without price and without SKU)
  const handleExportCSV = () => {
    const headers = [
      'รหัสรายการ',
      'วันที่-เวลา',
      'ชื่อสินค้า',
      'จำนวนตัดออก',
      'สาเหตุการตัด',
      'เลขที่เอกสาร',
      'หมายเหตุ',
      'ผู้บันทึก',
    ];
    const rows = filteredOutTransactions.map((tx) => [
      `"${tx.id}"`,
      `"${tx.dateTime}"`,
      `"${tx.productName}"`,
      tx.quantity,
      `"${tx.reasonOrSource}"`,
      `"${tx.documentNo || ''}"`,
      `"${tx.note || ''}"`,
      `"${tx.recordedBy || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `แดชบอร์ดตัดสต็อก_${dateMode === 'SINGLE' ? singleDate : `${startDate}_${endDate}`}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Date Picker */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">แดชบอร์ดสินค้าที่ออก</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {filteredOutTransactions.length} รายการ
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ค้นหาและกรองสถิติการตัดสต็อก ยอดขาย และอันดับสินค้าที่ออกตามช่วงวันที่และสถานะสินค้า
          </p>
        </div>

        {/* Action: Export CSV */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>ส่งออก CSV</span>
          </button>
        </div>
      </div>

      {/* Date Filter & Mode Selector Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-xs font-bold text-slate-600 mr-1">ช่วงเวลา:</span>
            <button
              onClick={() => handleDatePreset('TODAY')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                datePreset === 'TODAY'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              วันนี้
            </button>
            <button
              onClick={() => handleDatePreset('YESTERDAY')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                datePreset === 'YESTERDAY'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              เมื่อวาน
            </button>
            <button
              onClick={() => handleDatePreset('7DAYS')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                datePreset === '7DAYS'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              7 วันล่าสุด
            </button>
            <button
              onClick={() => handleDatePreset('30DAYS')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                datePreset === '30DAYS'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              30 วันล่าสุด
            </button>
            <button
              onClick={() => handleDatePreset('THIS_MONTH')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                datePreset === 'THIS_MONTH'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              เดือนนี้
            </button>
          </div>

          {/* Mode Switcher: Single Date vs Date Range */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setDateMode('SINGLE')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                dateMode === 'SINGLE' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              รายวัน
            </button>
            <button
              onClick={() => setDateMode('RANGE')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                dateMode === 'RANGE' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              ช่วงวันที่
            </button>
          </div>
        </div>

        {/* Date Inputs row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          {dateMode === 'SINGLE' ? (
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => handleShiftDate(-1)}
                title="วันก่อนหน้า"
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 px-2">
                <CalendarIcon className="w-4 h-4 text-indigo-600" />
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => {
                    setSingleDate(e.target.value);
                    setStartDate(e.target.value);
                    setEndDate(e.target.value);
                    setDatePreset('CUSTOM');
                  }}
                  className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer font-mono"
                />
              </div>

              <button
                onClick={() => handleShiftDate(1)}
                title="วันถัดไป"
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500">ตั้งแต่:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset('CUSTOM');
                  }}
                  className="bg-transparent text-xs font-bold text-slate-800 outline-none font-mono cursor-pointer"
                />
              </div>
              <span className="text-slate-400">ถึง</span>
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500">ถึง:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset('CUSTOM');
                  }}
                  className="bg-transparent text-xs font-bold text-slate-800 outline-none font-mono cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Toggle More Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition cursor-pointer ml-auto font-semibold ${
              showFilters || isFilterActive
                ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                : 'border-slate-200 hover:bg-slate-100 text-slate-600'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>ค้นหา & กรองเพิ่มเติม {isFilterActive && '(เปิดใช้งาน)'}</span>
          </button>
        </div>

        {/* Collapsible Search & Filter controls */}
        {showFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-150 text-xs">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="ค้นหาชื่อสินค้า, SKU, บิล, สาเหตุ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-7 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Product Status Filter */}
            <div>
              <select
                value={productStatusFilter}
                onChange={(e) => setProductStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none text-slate-700 cursor-pointer"
              >
                <option value="ALL">สถานะสินค้าทั้งหมด</option>
                <option value="IN_STOCK">✅ สินค้าสต็อกพร้อมขาย (ปกติ)</option>
                <option value="LOW_STOCK">⚠️ สินค้าสต็อกใกล้หมด</option>
                <option value="OUT_OF_STOCK">❌ สินค้าหมดสต็อกแล้ว</option>
                <option value="FOCUS">⭐ สินค้าโฟกัสพิเศษ</option>
              </select>
            </div>

            {/* Reason Filter */}
            <div>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none text-slate-700 cursor-pointer"
              >
                <option value="ALL">สาเหตุการตัดทั้งหมด</option>
                {STOCK_OUT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter + Reset */}
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none text-slate-700 cursor-pointer"
              >
                <option value="ALL">ทุกหมวดหมู่ ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {isFilterActive && (
                <button
                  onClick={handleResetFilters}
                  title="ล้างตัวกรอง"
                  className="p-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Date Banner */}
      <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-indigo-600" />
          <span className="font-bold text-indigo-950">
            สรุปข้อมูลประจำ: {dateDisplayLabel}
          </span>
        </div>
        <span className="font-mono font-semibold text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-200/60 shadow-xs">
          {dateMode === 'SINGLE' ? singleDate : `${startDate} → ${endDate}`}
        </span>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Quantity */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block">จำนวนชิ้นที่ออกรวม</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold font-mono text-rose-600">
                {totalQtyIssued.toLocaleString('th-TH')}
              </span>
              <span className="text-xs text-slate-400">ชิ้น</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">ตัดสต็อกในเงื่อนไขที่เลือก</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* Transactions Count */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block">จำนวนบิล/รายการ</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold font-mono text-indigo-600">
                {totalTransactionsCount}
              </span>
              <span className="text-xs text-slate-400">ครั้ง</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">การทำรายการตัดสต็อก</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        {/* Distinct Products */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block">ชนิดสินค้าที่ออก</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold font-mono text-amber-600">
                {distinctProductsCount}
              </span>
              <span className="text-xs text-slate-400">รายการ</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">SKU ที่มีการเคลื่อนไหว</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Average pieces per transaction */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block">เฉลี่ยต่อบิล</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold font-mono text-emerald-600">
                {avgQtyPerTx}
              </span>
              <span className="text-xs text-slate-400">ชิ้น/ครั้ง</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">อัตราการตัดสต็อกเฉลี่ย</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* All Products Out on Selected Date/Range */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                สินค้าทั้งหมดที่ออก ณ {dateDisplayLabel} ({allOutProductsSummary.length} รายการ)
              </h3>
              <p className="text-xs text-slate-500">
                สรุปรวมจำนวนและรายการสินค้าที่มีการตัดออกจากสต็อกในวันที่เลือก
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportProductsSummaryCSV}
              disabled={allOutProductsSummary.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>ส่งออก CSV สรุปสินค้านี้</span>
            </button>
            <span className="font-mono text-xs font-bold px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              รวม -{totalQtyIssued.toLocaleString('th-TH')} ชิ้น
            </span>
          </div>
        </div>

        {/* Table of all out products */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">ชื่อสินค้า</th>
                <th className="py-3 px-4">หมวดหมู่</th>
                <th className="py-3 px-4 text-right">จำนวนที่ออกรวม</th>
                <th className="py-3 px-4 text-center">สัดส่วน</th>
                <th className="py-3 px-4 text-center">จำนวนครั้งที่ตัด</th>
                <th className="py-3 px-4 text-right">สต็อกคงเหลือปัจจุบัน</th>
                <th className="py-3 px-4 text-center">สถานะสต็อก</th>
                <th className="py-3 px-4">สาเหตุการตัดที่ระบุ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allOutProductsSummary.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-medium">ไม่มีรายการสินค้าที่ตัดออกในเงื่อนไขและช่วงเวลาที่เลือก</p>
                  </td>
                </tr>
              ) : (
                allOutProductsSummary.map((item, idx) => {
                  const isOutOfStock = item.currentStock <= 0;
                  const isLowStock = item.currentStock > 0 && item.currentStock <= item.minStock;

                  return (
                    <tr key={`${item.sku}-${idx}`} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 text-center font-mono text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          {item.isFocus && (
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                          )}
                          <span>{item.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px]">
                          {item.category.split(' ')[0]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono font-bold text-rose-600 text-sm">
                          -{item.totalOutQty.toLocaleString('th-TH')}
                        </span>
                        <span className="text-[11px] text-slate-400 ml-1">{item.unit.split(' ')[0]}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                            <div
                              className="h-full bg-rose-500 rounded-full"
                              style={{ width: `${Math.min(100, item.percentage)}%` }}
                            />
                          </div>
                          <span>{item.percentage}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                        {item.txCount} บิล
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono font-bold text-slate-800">
                          {item.currentStock.toLocaleString('th-TH')}
                        </span>
                        <span className="text-[11px] text-slate-400 ml-1">{item.unit.split(' ')[0]}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            หมดสต็อก
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            ใกล้หมด (≤{item.minStock})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ปกติ
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate" title={item.reasonsList}>
                        <span className="inline-flex px-2 py-0.5 rounded-lg text-[11px] bg-slate-100 text-slate-700">
                          {item.reasonsList}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {allOutProductsSummary.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100/80 font-bold text-slate-900 border-t-2 border-slate-200">
                  <td colSpan={3} className="py-3 px-4 text-right">
                    รวมสินค้าทั้งหมดที่ออก ({allOutProductsSummary.length} รายการ):
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-rose-700 text-sm">
                    -{totalQtyIssued.toLocaleString('th-TH')} ชิ้น
                  </td>
                  <td className="py-3 px-4 text-center font-mono">100%</td>
                  <td className="py-3 px-4 text-center font-mono">{totalTransactionsCount} บิล</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Detailed Stock-out Log for the Date or Date Range */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-slate-900 text-sm">
              รายการตัดสต็อกทั้งหมด ({filteredOutTransactions.length} รายการ)
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3">วันและเวลา</th>
                <th className="py-2.5 px-3">ชื่อสินค้า</th>
                <th className="py-2.5 px-3 text-right">จำนวนตัดออก</th>
                <th className="py-2.5 px-3">สาเหตุการตัด</th>
                <th className="py-2.5 px-3">เอกสาร / อ้างอิง</th>
                <th className="py-2.5 px-3">ผู้บันทึก</th>
                <th className="py-2.5 px-3">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOutTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    ไม่พบรายการตัดสต็อกสินค้าในเงื่อนไขการค้นหาและช่วงเวลาที่เลือก
                  </td>
                </tr>
              ) : (
                filteredOutTransactions.map((tx) => {
                  const dateStr = new Date(tx.dateTime).toLocaleString('th-TH', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  });

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono text-slate-500">{dateStr}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 max-w-[200px] truncate">
                        {tx.productName}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                        -{tx.quantity}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                          {tx.reasonOrSource}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {tx.documentNo || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {tx.recordedBy || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 max-w-[150px] truncate">
                        {tx.note || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
