import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Star,
  Package,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  X,
  Layers,
  ArrowUpDown,
  Tag,
  Calendar,
  RotateCcw,
  Download,
  Upload,
} from 'lucide-react';
import { Product, DEFAULT_CATEGORIES, DEFAULT_UNITS } from '../types/inventory';
import { ConfirmModal } from './ConfirmModal';
import { exportProductsToCSV } from '../utils/csvExport';

interface ProductsTabProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id' | 'lastUpdated'>) => Promise<void>;
  onUpdateProduct: (product: Product) => Promise<void>;
  onDeleteProduct: (sku: string) => Promise<void>;
  onToggleFocus: (sku: string) => Promise<void>;
  onOpenImport?: () => void;
  isSyncing: boolean;
}

export const ProductsTab: React.FC<ProductsTabProps> = ({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onToggleFocus,
  onOpenImport,
  isSyncing,
}) => {
  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'FOCUS'>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'sku' | 'quantity' | 'date'>('sku');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Date Range Filters (Last updated)
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM'>('ALL');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmSKU, setDeleteConfirmSKU] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: DEFAULT_CATEGORIES[0],
    unit: DEFAULT_UNITS[0],
    quantity: '',
    minStock: '10',
    isFocus: false,
    note: '',
  });

  const resetForm = () => {
    setFormData({
      sku: '',
      name: '',
      category: DEFAULT_CATEGORIES[0],
      unit: DEFAULT_UNITS[0],
      quantity: '',
      minStock: '10',
      isFocus: false,
      note: '',
    });
  };

  const handleOpenAdd = () => {
    const maxNum = products.reduce((max, p) => {
      const match = p.sku.match(/\d+/);
      return match ? Math.max(max, parseInt(match[0], 10)) : max;
    }, 0);
    const nextSKU = `SKU-${String(maxNum + 1).padStart(3, '0')}`;

    setFormData({
      sku: nextSKU,
      name: '',
      category: DEFAULT_CATEGORIES[0],
      unit: DEFAULT_UNITS[0],
      quantity: '0',
      minStock: '10',
      isFocus: false,
      note: '',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      sku: p.sku,
      name: p.name,
      category: p.category,
      unit: p.unit,
      quantity: String(p.quantity),
      minStock: String(p.minStock),
      isFocus: p.isFocus,
      note: p.note || '',
    });
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sku.trim() || !formData.name.trim()) return;

    if (products.some((p) => p.sku.toLowerCase() === formData.sku.trim().toLowerCase())) {
      alert(`รหัสสินค้า (SKU) "${formData.sku}" มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น`);
      return;
    }

    try {
      setIsSubmitting(true);
      await onAddProduct({
        sku: formData.sku.trim(),
        name: formData.name.trim(),
        category: formData.category,
        unit: formData.unit,
        costPrice: 0,
        sellingPrice: 0,
        quantity: parseFloat(formData.quantity) || 0,
        minStock: parseFloat(formData.minStock) || 0,
        isFocus: formData.isFocus,
        note: formData.note.trim(),
      });
      setIsAddModalOpen(false);
      resetForm();
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !formData.name.trim()) return;

    try {
      setIsSubmitting(true);
      await onUpdateProduct({
        ...editingProduct,
        name: formData.name.trim(),
        category: formData.category,
        unit: formData.unit,
        costPrice: 0,
        sellingPrice: 0,
        quantity: parseFloat(formData.quantity) || 0,
        minStock: parseFloat(formData.minStock) || 0,
        isFocus: formData.isFocus,
        note: formData.note.trim(),
        lastUpdated: new Date().toISOString(),
      });
      setEditingProduct(null);
      resetForm();
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาดในการแก้ไข: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExecute = async () => {
    if (!deleteConfirmSKU) return;
    try {
      setIsSubmitting(true);
      await onDeleteProduct(deleteConfirmSKU);
      setDeleteConfirmSKU(null);
    } catch (err: any) {
      alert(`ไม่สามารถลบสินค้าได้: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('ALL');
    setStockStatusFilter('ALL');
    setDatePreset('ALL');
    setStartDate('');
    setEndDate('');
    setSortBy('sku');
    setSortOrder('asc');
  };

  const isFilterActive =
    searchTerm !== '' ||
    selectedCategory !== 'ALL' ||
    stockStatusFilter !== 'ALL' ||
    startDate !== '' ||
    endDate !== '';

  // Filter & Sort Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Search filter: Name, SKU, Category, Note
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        (p.note && p.note.toLowerCase().includes(term));

      // 2. Category Filter
      const matchCategory = selectedCategory === 'ALL' || p.category === selectedCategory;

      // 3. Status Filter
      let matchStatus = true;
      if (stockStatusFilter === 'OUT_OF_STOCK') matchStatus = p.quantity <= 0;
      else if (stockStatusFilter === 'LOW_STOCK') matchStatus = p.quantity > 0 && p.quantity <= p.minStock;
      else if (stockStatusFilter === 'IN_STOCK') matchStatus = p.quantity > p.minStock;
      else if (stockStatusFilter === 'FOCUS') matchStatus = p.isFocus === true;

      // 4. Date Range Filter (based on p.lastUpdated)
      let matchDate = true;
      if (startDate || endDate) {
        const itemDate = p.lastUpdated ? p.lastUpdated.slice(0, 10) : '';
        if (startDate && itemDate && itemDate < startDate) matchDate = false;
        if (endDate && itemDate && itemDate > endDate) matchDate = false;
      }

      return matchSearch && matchCategory && matchStatus && matchDate;
    });
  }, [products, searchTerm, selectedCategory, stockStatusFilter, startDate, endDate]);

  // Sort
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name, 'th');
      } else if (sortBy === 'sku') {
        // Natural numeric sort: 1, 2, 3... 10 or SKU-001, SKU-002...
        const cleanA = (a.sku || '').trim();
        const cleanB = (b.sku || '').trim();
        const numA = Number(cleanA);
        const numB = Number(cleanB);
        if (!isNaN(numA) && !isNaN(numB)) {
          comparison = numA - numB;
        } else {
          comparison = cleanA.localeCompare(cleanB, undefined, { numeric: true, sensitivity: 'base' });
        }
      } else if (sortBy === 'quantity') {
        comparison = a.quantity - b.quantity;
      } else if (sortBy === 'date') {
        comparison = (a.lastUpdated || '').localeCompare(b.lastUpdated || '');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredProducts, sortBy, sortOrder]);

  const categoriesInUse = Array.from(new Set(products.map((p) => p.category)));
  const productToDelete = products.find((p) => p.sku === deleteConfirmSKU);

  // Status Counts
  const statusCounts = useMemo(() => {
    return {
      all: products.length,
      inStock: products.filter((p) => p.quantity > p.minStock).length,
      lowStock: products.filter((p) => p.quantity > 0 && p.quantity <= p.minStock).length,
      outOfStock: products.filter((p) => p.quantity <= 0).length,
      focus: products.filter((p) => p.isFocus).length,
    };
  }, [products]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">จัดการข้อมูลสต๊อคสินค้า</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              {filteredProducts.length} จาก {products.length} รายการ
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ค้นหา กรองตามสถานะสินค้า ช่วงวันที่ และหมวดหมู่ พร้อมบันทึกลง Google Sheets
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenImport && (
            <button
              onClick={onOpenImport}
              title="นำเข้าไฟล์สต็อกสินค้าจาก Excel / CSV"
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-sm font-semibold shadow-2xs transition cursor-pointer shrink-0"
            >
              <Upload className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">นำเข้าสต็อก (Import)</span>
              <span className="sm:hidden">นำเข้า</span>
            </button>
          )}

          <button
            onClick={() => exportProductsToCSV(filteredProducts)}
            title="ส่งออกรายการสินค้าที่แสดงอยู่เป็นไฟล์ CSV"
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-sm font-semibold shadow-xs transition cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">ส่งออก CSV ({filteredProducts.length})</span>
            <span className="sm:hidden">CSV ({filteredProducts.length})</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-sm font-semibold shadow-sm shadow-emerald-600/30 transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มสินค้าใหม่</span>
          </button>
        </div>
      </div>

      {/* Quick Status Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setStockStatusFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            stockStatusFilter === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <span>ทั้งหมด</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/50">
            {statusCounts.all}
          </span>
        </button>

        <button
          onClick={() => setStockStatusFilter('IN_STOCK')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            stockStatusFilter === 'IN_STOCK'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>พร้อมขาย (ปกติ)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
            {statusCounts.inStock}
          </span>
        </button>

        <button
          onClick={() => setStockStatusFilter('LOW_STOCK')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            stockStatusFilter === 'LOW_STOCK'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white hover:bg-amber-50 text-amber-700 border border-amber-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span>ใกล้หมด (ต่ำกว่าขั้นต่ำ)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800">
            {statusCounts.lowStock}
          </span>
        </button>

        <button
          onClick={() => setStockStatusFilter('OUT_OF_STOCK')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            stockStatusFilter === 'OUT_OF_STOCK'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white hover:bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span>สินค้าหมดสต็อก</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-800">
            {statusCounts.outOfStock}
          </span>
        </button>

        <button
          onClick={() => setStockStatusFilter('FOCUS')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            stockStatusFilter === 'FOCUS'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-white hover:bg-amber-50 text-amber-800 border border-amber-300'
          }`}
        >
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>สินค้าโฟกัสพิเศษ</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800">
            {statusCounts.focus}
          </span>
        </button>

        {isFilterActive && (
          <button
            onClick={handleResetFilters}
            className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 flex items-center gap-1 transition cursor-pointer ml-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>ล้างตัวกรองทั้งหมด</span>
          </button>
        )}
      </div>

      {/* Main Filter & Search Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, SKU, หมวดหมู่, หมายเหตุ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition"
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

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition text-slate-700 cursor-pointer"
            >
              <option value="ALL">หมวดหมู่ทั้งหมด ({categoriesInUse.length})</option>
              {categoriesInUse.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Field */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition text-slate-700 cursor-pointer font-medium"
            >
              <option value="sku">เรียงตาม: รหัส SKU (น้อย → มาก)</option>
              <option value="name">เรียงตาม: ชื่อสินค้า</option>
              <option value="quantity">เรียงตาม: จำนวนคงเหลือ</option>
              <option value="date">เรียงตาม: วันที่อัปเดตล่าสุด</option>
            </select>
          </div>

          {/* Sort Order & Toggle Advanced Filters */}
          <div className="flex gap-2">
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              title={`สลับลำดับ (${sortOrder === 'asc' ? 'น้อยไปมาก' : 'มากไปน้อย'})`}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <ArrowUpDown className="w-4 h-4 text-slate-500" />
              <span>{sortOrder === 'asc' ? 'น้อย → มาก' : 'มาก → น้อย'}</span>
            </button>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                showAdvancedFilters || startDate || endDate
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-600'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>กรองช่วงวันที่</span>
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Filters (Date Range) */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-100 animate-in fade-in duration-150">
            {/* Date Range on Last Updated */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  กรองตามช่วงวันที่อัปเดตสต็อก
                </span>
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    onClick={() => handleDatePreset('TODAY')}
                    className={`px-2 py-0.5 rounded-md ${datePreset === 'TODAY' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                  >
                    วันนี้
                  </button>
                  <button
                    onClick={() => handleDatePreset('WEEK')}
                    className={`px-2 py-0.5 rounded-md ${datePreset === 'WEEK' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                  >
                    7 วัน
                  </button>
                  <button
                    onClick={() => handleDatePreset('MONTH')}
                    className={`px-2 py-0.5 rounded-md ${datePreset === 'MONTH' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                  >
                    30 วัน
                  </button>
                  <button
                    onClick={() => handleDatePreset('ALL')}
                    className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-600"
                  >
                    ล้าง
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">ตั้งแต่วันที่</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setDatePreset('CUSTOM');
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">ถึงวันที่</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setDatePreset('CUSTOM');
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Product List: Desktop Table + Mobile Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">โฟกัส</th>
                <th
                  onClick={() => {
                    if (sortBy === 'sku') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('sku');
                      setSortOrder('asc');
                    }
                  }}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition select-none"
                  title="คลิกเพื่อเรียงตามรหัส SKU"
                >
                  <div className="flex items-center gap-1.5">
                    <span>รหัส SKU</span>
                    {sortBy === 'sku' && (
                      <span className="text-emerald-600 font-bold">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (sortBy === 'name') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('name');
                      setSortOrder('asc');
                    }
                  }}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition select-none"
                  title="คลิกเพื่อเรียงตามชื่อสินค้า"
                >
                  <div className="flex items-center gap-1.5">
                    <span>ชื่อสินค้า</span>
                    {sortBy === 'name' && (
                      <span className="text-emerald-600 font-bold">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-4">หมวดหมู่</th>
                <th
                  onClick={() => {
                    if (sortBy === 'quantity') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('quantity');
                      setSortOrder('asc');
                    }
                  }}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition select-none"
                  title="คลิกเพื่อเรียงตามจำนวนคงเหลือ"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>คงเหลือ</span>
                    {sortBy === 'quantity' && (
                      <span className="text-emerald-600 font-bold">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-4 text-right">จุดเตือนขั้นต่ำ</th>
                <th className="py-3 px-4 text-center">สถานะ</th>
                <th
                  onClick={() => {
                    if (sortBy === 'date') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('date');
                      setSortOrder('desc');
                    }
                  }}
                  className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition select-none"
                  title="คลิกเพื่อเรียงตามวันที่อัปเดต"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>อัปเดตล่าสุด</span>
                    {sortBy === 'date' && (
                      <span className="text-emerald-600 font-bold">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-4 text-center w-24">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {sortedProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">ไม่พบรายการสินค้าตรงตามเงื่อนไขการค้นหาและตัวกรอง</p>
                    {isFilterActive && (
                      <button
                        onClick={handleResetFilters}
                        className="mt-2 text-xs text-emerald-600 hover:underline font-semibold"
                      >
                        กดที่นี่เพื่อล้างตัวกรองทั้งหมด
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                sortedProducts.map((p) => {
                  const isOutOfStock = p.quantity <= 0;
                  const isLowStock = p.quantity > 0 && p.quantity <= p.minStock;

                  return (
                    <tr key={p.sku} className="hover:bg-slate-50/80 transition group">
                      {/* Focus Star */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onToggleFocus(p.sku)}
                          title={p.isFocus ? 'คลิกเพื่อยกเลิกการโฟกัส' : 'คลิกเพื่อตั้งเป็นสินค้าโฟกัสพิเศษ'}
                          className="p-1 rounded-lg hover:bg-amber-50 transition cursor-pointer text-slate-300 hover:text-amber-500"
                        >
                          <Star
                            className={`w-5 h-5 transition ${
                              p.isFocus ? 'text-amber-400 fill-amber-400' : ''
                            }`}
                          />
                        </button>
                      </td>

                      {/* SKU */}
                      <td className="py-3 px-4 font-mono font-semibold text-xs text-slate-700">
                        {p.sku}
                      </td>

                      {/* Name & Note */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 line-clamp-1">{p.name}</div>
                        {p.note && (
                          <div className="text-xs text-slate-400 line-clamp-1">{p.note}</div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600">
                          {p.category.split(' ')[0]}
                        </span>
                      </td>

                      {/* Quantity & Unit */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono font-bold text-slate-900 text-base">
                          {p.quantity.toLocaleString('th-TH')}
                        </span>
                        <span className="text-xs text-slate-400 ml-1">{p.unit.split(' ')[0]}</span>
                      </td>

                      {/* Min Stock Alert */}
                      <td className="py-3 px-4 text-right font-mono text-slate-500 text-xs">
                        {p.minStock} {p.unit.split(' ')[0]}
                      </td>

                      {/* Stock Status Badge */}
                      <td className="py-3 px-4 text-center">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                            หมดสต็อก
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                            ใกล้หมด (≤{p.minStock})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            ปกติ
                          </span>
                        )}
                      </td>

                      {/* Last Updated */}
                      <td className="py-3 px-4 text-center font-mono text-xs text-slate-400">
                        {p.lastUpdated ? p.lastUpdated.slice(0, 10) : '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            title="แก้ไขข้อมูลสินค้า"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmSKU(p.sku)}
                            title="ลบสินค้าออกจากระบบ"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile / Tablet Cards View */}
        <div className="lg:hidden divide-y divide-slate-100">
          {sortedProducts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 p-4">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p className="font-medium">ไม่พบรายการสินค้าตรงตามเงื่อนไข</p>
              {isFilterActive && (
                <button
                  onClick={handleResetFilters}
                  className="mt-2 text-xs text-emerald-600 hover:underline font-semibold"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              )}
            </div>
          ) : (
            sortedProducts.map((p) => {
              const isOutOfStock = p.quantity <= 0;
              const isLowStock = p.quantity > 0 && p.quantity <= p.minStock;

              return (
                <div key={p.sku} className="p-4 space-y-2.5 hover:bg-slate-50 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onToggleFocus(p.sku)}
                        className="p-1 text-slate-300 hover:text-amber-500"
                      >
                        <Star
                          className={`w-5 h-5 ${p.isFocus ? 'text-amber-400 fill-amber-400' : ''}`}
                        />
                      </button>
                      <div>
                        <span className="font-mono text-xs font-semibold text-slate-500">
                          {p.sku}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">{p.name}</h4>
                      </div>
                    </div>

                    {/* Stock Status Badge */}
                    <div>
                      {isOutOfStock ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          หมด
                        </span>
                      ) : isLowStock ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          ใกล้หมด
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ปกติ
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">คงเหลือปัจจุบัน</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {p.quantity} {p.unit.split(' ')[0]}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">เกณฑ์เตือนขั้นต่ำ</span>
                      <span className="font-mono font-semibold text-slate-700 text-sm">
                        {p.minStock} {p.unit.split(' ')[0]}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400 truncate max-w-[180px]">
                      หมวด: {p.category.split(' ')[0]}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>แก้ไข</span>
                      </button>
                      <button
                        onClick={() => setDeleteConfirmSKU(p.sku)}
                        className="px-2.5 py-1 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>ลบ</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {(isAddModalOpen || editingProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-lg">
                {editingProduct ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าใหม่ลงสต็อก'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingProduct(null);
                  resetForm();
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={editingProduct ? handleSaveEdit : handleSaveAdd}
              className="p-6 space-y-4 overflow-y-auto"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* SKU */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    รหัสสินค้า (SKU) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingProduct}
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="เช่น SKU-001 หรือ บาร์โค้ด"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none uppercase font-mono disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อสินค้า <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="ชื่อเรียกสินค้า"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">หมวดหมู่</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none bg-white"
                  >
                    {DEFAULT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">หน่วยนับ</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none bg-white"
                  >
                    {DEFAULT_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    จำนวนคงเหลือปัจจุบัน <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none font-mono font-bold"
                  />
                </div>

                {/* Min Stock Alert */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    จุดเตือนสต็อกขั้นต่ำ (ชิ้น)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                    placeholder="10"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">หมายเหตุ / คำอธิบายเพิ่มเติม</label>
                <textarea
                  rows={2}
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="เช่น รหัสช่องเก็บ, นำเข้าจากที่ไหน, สเปคสินค้า..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                />
              </div>

              {/* Focus Item Checkbox */}
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <div>
                    <p className="text-xs font-bold text-amber-900">ตั้งเป็นสินค้าโฟกัสพิเศษ</p>
                    <p className="text-[11px] text-amber-700">แสดงในหน้าสินค้าโฟกัสเพื่อติดตามสต็อกอย่างใกล้ชิด</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isFocus}
                  onChange={(e) => setFormData({ ...formData, isFocus: e.target.checked })}
                  className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingProduct(null);
                    resetForm();
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? 'กำลังบันทึกลง Google Sheets...' : editingProduct ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deleting Product */}
      <ConfirmModal
        isOpen={!!deleteConfirmSKU}
        title="ยืนยันการลบสินค้า"
        message={`คุณแน่ใจหรือไม่ว่าต้องการลบสินค้ารหัส ${deleteConfirmSKU} ออกจากระบบและ Google Sheet? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        variant="danger"
        confirmLabel="ยืนยันการลบ"
        cancelLabel="ยกเลิก"
        isLoading={isSubmitting}
        details={
          productToDelete
            ? [
                { label: 'รหัสสินค้า (SKU)', value: productToDelete.sku },
                { label: 'ชื่อสินค้า', value: productToDelete.name },
                { label: 'จำนวนคงเหลือ', value: `${productToDelete.quantity} ${productToDelete.unit}` },
              ]
            : undefined
        }
        onConfirm={handleDeleteExecute}
        onCancel={() => setDeleteConfirmSKU(null)}
      />
    </div>
  );
};
