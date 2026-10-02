import React from 'react';
import {
  Boxes,
  ArrowUpRight,
  ArrowDownLeft,
  ClipboardList,
  Star,
  BarChart3,
  RefreshCw,
  ExternalLink,
  LogOut,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Download,
  Database,
  Upload,
} from 'lucide-react';
import { User } from 'firebase/auth';

export type TabType = 'products' | 'stock-out' | 'stock-in' | 'balance' | 'focus' | 'dashboard';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  user: User | null;
  spreadsheetInfo: { id: string; name: string; url: string } | null;
  onLogin: () => void;
  onLogout: () => void;
  onSync: () => void;
  onOpenExport: () => void;
  isSyncing: boolean;
  focusCount: number;
  lowStockCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  user,
  spreadsheetInfo,
  onLogin,
  onLogout,
  onSync,
  onOpenExport,
  isSyncing,
  focusCount,
  lowStockCount,
}) => {
  const tabs = [
    {
      id: 'dashboard' as TabType,
      label: 'แดชบอร์ดรายวัน',
      icon: <BarChart3 className="w-4 h-4 text-indigo-500" />,
    },
    {
      id: 'products' as TabType,
      label: 'จัดการสต็อก',
      icon: <Boxes className="w-4 h-4 text-emerald-600" />,
    },
    {
      id: 'stock-out' as TabType,
      label: 'ตัดสต็อกสินค้า',
      icon: <ArrowUpRight className="w-4 h-4 text-rose-500" />,
    },
    {
      id: 'stock-in' as TabType,
      label: 'รับเข้าสินค้า',
      icon: <ArrowDownLeft className="w-4 h-4 text-emerald-500" />,
    },
    {
      id: 'balance' as TabType,
      label: 'รายงานคงเหลือ',
      icon: <ClipboardList className="w-4 h-4 text-blue-500" />,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'focus' as TabType,
      label: 'สินค้าโฟกัสพิเศษ',
      icon: <Star className="w-4 h-4 text-amber-500 fill-amber-500" />,
      badge: focusCount > 0 ? focusCount : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Top Banner & Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate tracking-tight">
                  ระบบจัดการสต็อกสินค้า
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Google Sheets Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">
                Smart Stock Inventory System • เก็บข้อมูลบน Google Sheets แบบเรียลไทม์
              </p>
            </div>
          </div>

          {/* Right actions: Google Sheets badge, Sync, User Profile */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Google Sheets Link Badge */}
            {spreadsheetInfo && (
              <a
                href={spreadsheetInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                title="คลิกเพื่อเปิดดูและแก้ไขใน Google Sheets โดยตรง"
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="truncate max-w-[140px]">{spreadsheetInfo.name}</span>
                <ExternalLink className="w-3.5 h-3.5 ml-0.5 text-emerald-600" />
              </a>
            )}

            {/* Sync Button */}
            <button
              onClick={onSync}
              disabled={isSyncing}
              title="ซิงค์ข้อมูลกับ Google Sheets"
              className="p-2 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 transition cursor-pointer flex items-center gap-1.5 text-xs font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ข้อมูล'}</span>
            </button>

            {/* Export & Backup Button */}
            <button
              onClick={onOpenExport}
              title="ส่งออกไฟล์ CSV และสำรองข้อมูลสต็อกทั้งหมด"
              className="px-3 py-2 rounded-xl text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow-xs"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">สำรอง/ส่งออก CSV</span>
            </button>

            {/* User Profile / Login Button */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="flex items-center gap-2">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                  <div className="hidden xl:block text-left">
                    <p className="text-xs font-semibold text-slate-800 truncate max-w-[120px]">
                      {user.displayName || user.email?.split('@')[0]}
                    </p>
                    <p className="text-[10px] text-emerald-600 font-medium">เข้าสู่ระบบแล้ว</p>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  title="ออกจากระบบ"
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onLogin}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 shadow-xs transition cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.13z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                  />
                </svg>
                <span>เข้าสู่ระบบ Google</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation (Desktop & Tablet) */}
        <div className="hidden md:flex items-center space-x-1 border-t border-slate-100 py-1.5 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${tab.badgeColor}`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 flex justify-around items-center shadow-lg">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-medium transition cursor-pointer relative ${
                isActive ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-emerald-50 text-emerald-700' : ''}`}>
                {tab.icon}
              </div>
              <span className="scale-90 tracking-tight">{tab.label.split(' ')[0]}</span>
              {tab.badge !== undefined && (
                <span className="absolute top-0 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
