import React, { useState } from 'react';
import {
  Star,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Package,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Product, StockTransaction } from '../types/inventory';
import { ConfirmModal } from './ConfirmModal';

interface FocusItemsTabProps {
  products: Product[];
  transactions: StockTransaction[];
  onToggleFocus: (sku: string) => Promise<void>;
  onQuickAdjust: (sku: string, diffQty: number, type: 'IN' | 'OUT') => Promise<void>;
  onNavigateToTab: (tab: any) => void;
  isSyncing: boolean;
}

export const FocusItemsTab: React.FC<FocusItemsTabProps> = ({
  products,
  transactions,
  onToggleFocus,
  onQuickAdjust,
  onNavigateToTab,
  isSyncing,
}) => {
  const [quickAdjustModal, setQuickAdjustModal] = useState<{
    sku: string;
    productName: string;
    diffQty: number;
    type: 'IN' | 'OUT';
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const focusProducts = products.filter((p) => p.isFocus);

  // Calculate 7-day velocity / consumption for each focus product
  const sevenDaysAgo = Date.now() - 7 * 86400000;
  const recentOuts = transactions.filter(
    (tx) => tx.type === 'OUT' && new Date(tx.dateTime).getTime() >= sevenDaysAgo
  );

  const getProductMetrics = (p: Product) => {
    const outs = recentOuts.filter((tx) => tx.sku === p.sku);
    const totalOut7Days = outs.reduce((sum, tx) => sum + tx.quantity, 0);
    const dailyRate = totalOut7Days / 7;
    const daysRemaining = dailyRate > 0 ? Math.floor(p.quantity / dailyRate) : null;
    const healthPercent = Math.min(100, Math.round((p.quantity / (p.minStock * 2 || 20)) * 100));

    return {
      totalOut7Days,
      dailyRate: dailyRate.toFixed(1),
      daysRemaining,
      healthPercent,
    };
  };

  const handleQuickAdjustConfirm = async () => {
    if (!quickAdjustModal) return;
    try {
      setIsSubmitting(true);
      await onQuickAdjust(
        quickAdjustModal.sku,
        quickAdjustModal.diffQty,
        quickAdjustModal.type
      );
      setQuickAdjustModal(null);
    } catch (err: any) {
      alert(`ปรับปรุงสต็อกไม่สำเร็จ: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6 rounded-2xl shadow-md shadow-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-xs">
              <Star className="w-5 h-5 text-white fill-white" />
            </div>
            <h2 className="text-xl font-bold">สินค้าที่โฟกัสเป็นพิเศษ (Special Focus Items)</h2>
          </div>
          <p className="text-xs text-amber-100 mt-1">
            รายการสินค้าขายดี สินค้าราคาสูง หรือสินค้าที่ต้องเฝ้าระวังไม่ให้ขาดสต็อกเป็นพิเศษ
          </p>
        </div>

        <button
          onClick={() => onNavigateToTab('products')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-amber-800 hover:bg-amber-50 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่ม/จัดการสินค้าโฟกัส</span>
        </button>
      </div>

      {focusProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <Star className="w-16 h-16 mx-auto mb-3 text-slate-200 fill-slate-100" />
          <h3 className="text-base font-bold text-slate-800">ยังไม่มีสินค้าที่ตั้งเป็นโฟกัสพิเศษ</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            คุณสามารถกดไอคอนดาว ⭐ ที่หน้า "จัดการสต็อก" เพื่อเลือกสินค้าที่ต้องการเฝ้าระวังมาแสดงในหน้านี้
          </p>
          <button
            onClick={() => onNavigateToTab('products')}
            className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
          >
            ไปยังหน้าจัดการสต็อก
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {focusProducts.map((p, idx) => {
            const metrics = getProductMetrics(p);
            const isCritical = p.quantity <= 0;
            const isWarning = p.quantity > 0 && p.quantity <= p.minStock;

            return (
              <div
                key={p.id ? `${p.id}` : `${p.sku}-${idx}`}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition p-5 flex flex-col justify-between relative overflow-hidden"
              >
                {/* Top status line */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 ${
                    isCritical
                      ? 'bg-rose-500'
                      : isWarning
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                />

                <div>
                  {/* Top Bar inside Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-mono text-xs font-bold text-amber-600 block">
                        {p.sku}
                      </span>
                      <h3 className="font-bold text-slate-900 text-base line-clamp-1 mt-0.5">
                        {p.name}
                      </h3>
                      <span className="text-[11px] text-slate-400 block truncate">
                        หมวด: {p.category.split(' ')[0]}
                      </span>
                    </div>

                    <button
                      onClick={() => onToggleFocus(p.sku)}
                      title="ยกเลิกการโฟกัส"
                      className="p-1 text-amber-400 hover:text-slate-300 transition"
                    >
                      <Star className="w-5 h-5 fill-amber-400" />
                    </button>
                  </div>

                  {/* Stock Level Display */}
                  <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-medium text-slate-500 block">คงเหลือปัจจุบัน</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span
                          className={`font-mono font-bold text-2xl ${
                            isCritical
                              ? 'text-rose-600'
                              : isWarning
                              ? 'text-amber-600'
                              : 'text-slate-900'
                          }`}
                        >
                          {p.quantity.toLocaleString('th-TH')}
                        </span>
                        <span className="text-xs text-slate-500">{p.unit.split(' ')[0]}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-medium text-slate-400 block">เกณฑ์ขั้นต่ำ</span>
                      <span className="font-mono font-semibold text-slate-700 text-sm">
                        {p.minStock} {p.unit.split(' ')[0]}
                      </span>
                    </div>
                  </div>

                  {/* Health Progress Bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>ระดับความปลอดภัยของสต็อก</span>
                      <span className="font-mono font-semibold">{metrics.healthPercent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isCritical
                            ? 'bg-rose-500 w-2'
                            : isWarning
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.max(5, metrics.healthPercent)}%` }}
                      />
                    </div>
                  </div>

                  {/* Consumption Stats */}
                  <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-amber-50/50 rounded-xl border border-amber-100/60">
                      <span className="text-amber-800 text-[10px] block font-medium">ออกเฉลี่ยต่อวัน (7 วัน)</span>
                      <span className="font-mono font-bold text-amber-900 text-sm">
                        ~{metrics.dailyRate} {p.unit.split(' ')[0]}
                      </span>
                    </div>

                    <div className="p-2.5 bg-indigo-50/50 rounded-xl border border-indigo-100/60">
                      <span className="text-indigo-800 text-[10px] block font-medium">คาดว่าจะพอขายได้</span>
                      <span className="font-mono font-bold text-indigo-900 text-sm">
                        {metrics.daysRemaining !== null
                          ? metrics.daysRemaining > 0
                            ? `~${metrics.daysRemaining} วัน`
                            : 'หมดแล้ว!'
                          : 'ข้อมูลไม่พอ'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="mt-5 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between gap-2">
                    {/* Quick Out */}
                    <button
                      onClick={() =>
                        setQuickAdjustModal({
                          sku: p.sku,
                          productName: p.name,
                          diffQty: 1,
                          type: 'OUT',
                        })
                      }
                      title="ตัดสต็อกออกด่วน 1 ชิ้น"
                      className="flex-1 py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>ตัดออก (-1)</span>
                    </button>

                    {/* Quick In */}
                    <button
                      onClick={() =>
                        setQuickAdjustModal({
                          sku: p.sku,
                          productName: p.name,
                          diffQty: 5,
                          type: 'IN',
                        })
                      }
                      title="รับเข้าสต็อกด่วน 5 ชิ้น"
                      className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      <span>เติมเข้า (+5)</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Quick Adjust */}
      <ConfirmModal
        isOpen={!!quickAdjustModal}
        title={
          quickAdjustModal?.type === 'OUT'
            ? 'ยืนยันการตัดสต็อกด่วน'
            : 'ยืนยันการรับเข้าสต็อกด่วน'
        }
        message={`ต้องการบันทึกรายการสต็อกด่วนสำหรับ "${quickAdjustModal?.productName}" (${quickAdjustModal?.sku}) ลง Google Sheets หรือไม่?`}
        variant={quickAdjustModal?.type === 'OUT' ? 'danger' : 'primary'}
        confirmLabel="ยืนยันบันทึก"
        cancelLabel="ยกเลิก"
        isLoading={isSubmitting}
        details={
          quickAdjustModal
            ? [
                { label: 'รหัสสินค้า', value: quickAdjustModal.sku },
                { label: 'ชื่อสินค้า', value: quickAdjustModal.productName },
                {
                  label: 'รายการ',
                  value: `${quickAdjustModal.type === 'OUT' ? 'ตัดออก' : 'รับเข้า'} ${quickAdjustModal.diffQty} ชิ้น`,
                },
              ]
            : undefined
        }
        onConfirm={handleQuickAdjustConfirm}
        onCancel={() => setQuickAdjustModal(null)}
      />
    </div>
  );
};
