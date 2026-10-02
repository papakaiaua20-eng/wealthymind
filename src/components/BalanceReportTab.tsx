import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Search,
  Filter,
  Download,
  Printer,
  DollarSign,
  Package,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  XCircle,
  FileSpreadsheet,
  Calendar,
  RotateCcw,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react';
import { Product } from '../types/inventory';

interface BalanceReportTabProps {
  products: Product[];
  onOpenSpreadsheet?: () => void;
  spreadsheetUrl?: string;
}

export const BalanceReportTab: React.FC<BalanceReportTabProps> = ({
  products,
  onOpenSpreadsheet,
  spreadsheetUrl,
}) => {
  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NORMAL' | 'LOW' | 'OUT' | 'FOCUS'>('ALL');
  const [sortBy, setSortBy] = useState<'qty-desc' | 'qty-asc' | 'name' | 'date'>('qty-desc');

  // Date Range Filters (Last updated)
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Quantity range filter
  const [minQty, setMinQty] = useState<string>('');
  const [maxQty, setMaxQty] = useState<string>('');

  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category))), [products]);

  // Date Preset Handler
  const handleDatePreset = (preset: 'ALL' | 'TODAY' | 'WEEK' | 'MONTH') => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'TODAY') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'WEEK') {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === 'MONTH') {
      const past = new Date();
      past.setDate(now.getDate() - 30);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(todayStr);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('ALL');
    setStatusFilter('ALL');
    setStartDate('');
    setEndDate('');
    setDatePreset('ALL');
    setMinQty('');
    setMaxQty('');
    setSortBy('qty-desc');
  };

  const isFilterActive =
    searchTerm !== '' ||
    selectedCategory !== 'ALL' ||
    statusFilter !== 'ALL' ||
    startDate !== '' ||
    endDate !== '' ||
    minQty !== '' ||
    maxQty !== '';

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Search term: name, sku, category
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term);

      // 2. Category Filter
      const matchCategory = selectedCategory === 'ALL' || p.category === selectedCategory;

      // 3. Status Filter
      let matchStatus = true;
      if (statusFilter === 'OUT') matchStatus = p.quantity <= 0;
      else if (statusFilter === 'LOW') matchStatus = p.quantity > 0 && p.quantity <= p.minStock;
      else if (statusFilter === 'NORMAL') matchStatus = p.quantity > p.minStock;
      else if (statusFilter === 'FOCUS') matchStatus = p.isFocus === true;

      // 4. Date Range Filter
      let matchDate = true;
      const itemDate = p.lastUpdated ? p.lastUpdated.slice(0, 10) : '';
      if (startDate && itemDate && itemDate < startDate) matchDate = false;
      if (endDate && itemDate && itemDate > endDate) matchDate = false;

      // 5. Quantity Range
      let matchQty = true;
      if (minQty && p.quantity < parseFloat(minQty)) matchQty = false;
      if (maxQty && p.quantity > parseFloat(maxQty)) matchQty = false;

      return matchSearch && matchCategory && matchStatus && matchDate && matchQty;
    });
  }, [products, searchTerm, selectedCategory, statusFilter, startDate, endDate, minQty, maxQty]);

  // Sorted Products
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      if (sortBy === 'qty-desc') return b.quantity - a.quantity;
      if (sortBy === 'qty-asc') return a.quantity - b.quantity;
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'th');
      if (sortBy === 'date') return (b.lastUpdated || '').localeCompare(a.lastUpdated || '');
      return 0;
    });
  }, [filteredProducts, sortBy]);

  // Recalculated Summary Metrics based on filtered dataset
  const summary = useMemo(() => {
    const totalItems = sortedProducts.length;
    const totalQuantity = sortedProducts.reduce((sum, p) => sum + p.quantity, 0);
    const normalStockCount = sortedProducts.filter((p) => p.quantity > p.minStock).length;
    const focusCount = sortedProducts.filter((p) => p.isFocus).length;
    const lowStockCount = sortedProducts.filter((p) => p.quantity > 0 && p.quantity <= p.minStock).length;
    const outOfStockCount = sortedProducts.filter((p) => p.quantity <= 0).length;
    return {
      totalItems,
      totalQuantity,
      normalStockCount,
      focusCount,
      lowStockCount,
      outOfStockCount,
    };
  }, [sortedProducts]);

  // Export CSV of filtered products
  const handleExportCSV = () => {
    const headers = [
      'รหัสสินค้า (SKU)',
      'ชื่อสินค้า',
      'หมวดหมู่',
      'หน่วยนับ',
      'จำนวนคงเหลือ',
      'จุดเตือนขั้นต่ำ',
      'สถานะ',
      'สินค้าโฟกัส',
      'อัปเดตล่าสุด',
    ];
    const rows = sortedProducts.map((p) => {
      const status = p.quantity <= 0 ? 'หมดสต็อก' : p.quantity <= p.minStock ? 'ใกล้หมด' : 'ปกติ';
      return [
        `"${p.sku}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.category}"`,
        `"${p.unit}"`,
        p.quantity,
        p.minStock,
        `"${status}"`,
        p.isFocus ? 'ใช่' : 'ไม่ใช่',
        `"${p.lastUpdated ? p.lastUpdated.slice(0, 10) : ''}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `รายงานสินค้าคงเหลือ_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <ClipboardList className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">หน้ารายงานสินค้าคงเหลือ (Stock Balance)</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {sortedProducts.length} รายการ
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            สรุปภาพรวมยอดสต็อกคงคลัง พร้อมระบบค้นหาและกรองข้อมูลตามสถานะสินค้าและช่วงวันที่
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {spreadsheetUrl && (
            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>เปิดชีต</span>
            </a>
          )}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>ส่งออก CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-300" />
            <span>พิมพ์รายงาน</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards (Dynamically recalculates on active filters) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Quantity */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block">จำนวนคงเหลือรวม</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold font-mono text-slate-900">
                {summary.totalQuantity.toLocaleString('th-TH')}
              </span>
              <span className="text-xs text-slate-400">ชิ้น</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              จาก {summary.totalItems} รายการที่กรอง
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* Normal Stock Status */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block">สต็อกปกติ (พร้อมจ่าย)</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold font-mono text-emerald-600">
                {summary.normalStockCount}
              </span>
              <span className="text-xs text-slate-400">รายการ</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
              ระดับสต็อกปลอดภัย
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Focus Items Count */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block">สินค้าโฟกัสพิเศษ</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold font-mono text-amber-600">
                {summary.focusCount}
              </span>
              <span className="text-xs text-slate-400">รายการ</span>
            </div>
            <span className="text-[11px] text-amber-600 font-medium mt-1 block">
              ติดตามใกล้ชิด
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Star className="w-5 h-5 fill-amber-500" />
          </div>
        </div>

        {/* Stock Alert Summary */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block">ต้องรีบสั่งซื้อเติม</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-rose-600">
                {summary.lowStockCount + summary.outOfStockCount}
              </span>
              <span className="text-xs text-slate-400">รายการ</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px]">
              <span className="text-rose-600 font-semibold">หมด: {summary.outOfStockCount}</span>
              <span className="text-amber-600 font-semibold">ใกล้หมด: {summary.lowStockCount}</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="ค้นหาชื่อสินค้า, SKU, หรือหมวดหมู่..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-7 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none text-slate-700 cursor-pointer"
            >
              <option value="ALL">สถานะสินค้าทั้งหมด</option>
              <option value="NORMAL">✅ สต็อกปกติ (พร้อมขาย)</option>
              <option value="LOW">⚠️ สต็อกใกล้หมด (ต่ำกว่าเกณฑ์)</option>
              <option value="OUT">❌ สินค้าหมดสต็อก</option>
              <option value="FOCUS">⭐ สินค้าโฟกัสพิเศษ</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none text-slate-700 cursor-pointer"
            >
              <option value="ALL">ทุกหมวดหมู่ ({categories.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By & Advanced Filter Toggle */}
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none text-slate-700 cursor-pointer"
            >
              <option value="qty-desc">เรียง: คงเหลือ (มาก→น้อย)</option>
              <option value="qty-asc">เรียง: คงเหลือ (น้อย→มาก)</option>
              <option value="name">เรียง: ชื่อสินค้า (ก-ฮ)</option>
              <option value="date">เรียง: วันที่อัปเดตล่าสุด</option>
            </select>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`p-2 rounded-xl border flex items-center justify-center transition cursor-pointer ${
                showAdvancedFilters || startDate || endDate || minQty || maxQty
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-600'
              }`}
              title="กรองตามช่วงวันที่อัปเดต และจำนวนสต็อก"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {isFilterActive && (
              <button
                onClick={handleResetFilters}
                className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                title="ล้างตัวกรองทั้งหมด"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Advanced Filters */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-150 text-xs">
            {/* Date Range on Last Updated */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  กรองตามช่วงวันที่อัปเดตสต็อก
                </span>
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    onClick={() => handleDatePreset('TODAY')}
                    className={`px-2 py-0.5 rounded-md ${datePreset === 'TODAY' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                  >
                    วันนี้
                  </button>
                  <button
                    onClick={() => handleDatePreset('WEEK')}
                    className={`px-2 py-0.5 rounded-md ${datePreset === 'WEEK' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                  >
                    7 วัน
                  </button>
                  <button
                    onClick={() => handleDatePreset('MONTH')}
                    className={`px-2 py-0.5 rounded-md ${datePreset === 'MONTH' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                  >
                    30 วัน
                  </button>
                  <button
                    onClick={() => handleDatePreset('ALL')}
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
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setDatePreset('ALL');
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">ถึงวันที่</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setDatePreset('ALL');
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Quantity Range */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-indigo-600" />
                กรองตามจำนวนคงเหลือ (ชิ้น)
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">จำนวนต่ำสุด</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={minQty}
                    onChange={(e) => setMinQty(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">จำนวนสูงสุด</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="ไม่จำกัด"
                    value={maxQty}
                    onChange={(e) => setMaxQty(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Report Table View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4">รหัส SKU</th>
                <th className="py-3.5 px-4">ชื่อสินค้า</th>
                <th className="py-3.5 px-4">หมวดหมู่</th>
                <th className="py-3.5 px-4 text-right">คงเหลือปัจจุบัน</th>
                <th className="py-3.5 px-4 text-right">จุดเตือนขั้นต่ำ</th>
                <th className="py-3.5 px-4 text-center">สถานะ</th>
                <th className="py-3.5 px-4 text-center">อัปเดตล่าสุด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {sortedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">ไม่พบข้อมูลสินค้าตรงกับเงื่อนไขที่เลือก</p>
                    {isFilterActive && (
                      <button
                        onClick={handleResetFilters}
                        className="mt-2 text-xs text-indigo-600 hover:underline font-semibold"
                      >
                        กดที่นี่เพื่อล้างตัวกรองทั้งหมด
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                sortedProducts.map((p, idx) => {
                  const isOutOfStock = p.quantity <= 0;
                  const isLowStock = p.quantity > 0 && p.quantity <= p.minStock;

                  return (
                    <tr key={p.id ? `${p.id}` : `${p.sku}-${idx}`} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 text-center text-xs text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-xs text-slate-700">
                        {p.sku}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {p.name}
                        {p.isFocus && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            โฟกัส
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {p.category.split(' ')[0]}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono font-bold text-slate-900 text-base">
                          {p.quantity.toLocaleString('th-TH')}
                        </span>
                        <span className="text-xs text-slate-400 ml-1">{p.unit.split(' ')[0]}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600 text-xs">
                        {p.minStock} {p.unit.split(' ')[0]}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            หมดสต็อก
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            ใกล้หมด (≤{p.minStock})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ปกติ
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-xs text-slate-400">
                        {p.lastUpdated ? p.lastUpdated.slice(0, 10) : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {sortedProducts.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100/80 font-bold text-slate-900 border-t-2 border-slate-200 text-sm">
                  <td colSpan={4} className="py-3 px-4 text-right">
                    รวมทั้งสิ้น ({sortedProducts.length} รายการที่แสดง):
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-base">
                    {summary.totalQuantity.toLocaleString('th-TH')} ชิ้น
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
