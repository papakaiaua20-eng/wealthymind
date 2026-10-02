/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
} from './services/firebaseAuth';
import {
  findOrCreateSpreadsheet,
  fetchProductsFromSheet,
  fetchTransactionsFromSheet,
  syncProductsToSheet,
  appendTransactionToSheet,
  INITIAL_DEMO_PRODUCTS,
  INITIAL_DEMO_TRANSACTIONS,
  getSavedSpreadsheetId,
} from './services/googleSheetsService';
import { Product, StockTransaction } from './types/inventory';
import { Navbar, TabType } from './components/Navbar';
import { ProductsTab } from './components/ProductsTab';
import { StockOutTab } from './components/StockOutTab';
import { StockInTab } from './components/StockInTab';
import { BalanceReportTab } from './components/BalanceReportTab';
import { FocusItemsTab } from './components/FocusItemsTab';
import { DailyDashboardTab } from './components/DailyDashboardTab';
import { ExportModal } from './components/ExportModal';
import { ImportModal } from './components/ImportModal';
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  Info,
  ShieldCheck,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [spreadsheetInfo, setSpreadsheetInfo] = useState<{
    id: string;
    name: string;
    url: string;
  } | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // Helper to guarantee 100% unique SKUs and IDs across products
  const ensureUniqueProducts = (list: Product[]): Product[] => {
    const skuCount = new Map<string, number>();
    return list.map((p, idx) => {
      const rawSku = (p.sku || '').trim() || `SKU-${idx + 1}`;
      const lower = rawSku.toLowerCase();
      let uniqueSku = rawSku;
      if (skuCount.has(lower)) {
        const count = skuCount.get(lower)! + 1;
        skuCount.set(lower, count);
        uniqueSku = `${rawSku}-${count}`;
      } else {
        skuCount.set(lower, 1);
      }
      return {
        ...p,
        sku: uniqueSku,
        id: p.id || `P-${idx + 1}-${uniqueSku}`,
      };
    });
  };

  // Core Data States
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('local_stock_products');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return ensureUniqueProducts(parsed);
        }
      } catch {}
    }
    return ensureUniqueProducts(INITIAL_DEMO_PRODUCTS);
  });

  const [transactions, setTransactions] = useState<StockTransaction[]>(() => {
    const saved = localStorage.getItem('local_stock_transactions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_DEMO_TRANSACTIONS;
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showNotification = (
    message: string,
    type: 'success' | 'error' | 'info' = 'info'
  ) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 5000);
  };

  // Save to local backup whenever data changes
  useEffect(() => {
    localStorage.setItem('local_stock_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('local_stock_transactions', JSON.stringify(transactions));
  }, [transactions]);

  // Sync data with Google Sheets
  const syncWithGoogleSheets = useCallback(
    async (token: string, sheetId?: string) => {
      try {
        setIsSyncing(true);
        let currentSheet = spreadsheetInfo;

        if (!currentSheet || sheetId) {
          const sheet = await findOrCreateSpreadsheet(token);
          setSpreadsheetInfo(sheet);
          currentSheet = sheet;
        }

        if (currentSheet) {
          // Fetch products from sheet
          const sheetProducts = await fetchProductsFromSheet(currentSheet.id, token);
          if (sheetProducts && sheetProducts.length > 0) {
            setProducts(ensureUniqueProducts(sheetProducts));
          } else if (products.length > 0) {
            // First time sheet empty, push current products
            await syncProductsToSheet(currentSheet.id, products, token);
          }

          // Fetch transactions from sheet
          const sheetTx = await fetchTransactionsFromSheet(currentSheet.id, token);
          if (sheetTx && sheetTx.length > 0) {
            setTransactions(sheetTx);
          }

          showNotification('ซิงค์ข้อมูลกับ Google Sheets สำเร็จเรียบร้อย', 'success');
        }
      } catch (err: any) {
        console.error('Google Sheets sync error:', err);
        showNotification(`การซิงค์ชีตขัดข้อง: ${err.message}`, 'error');
      } finally {
        setIsSyncing(false);
      }
    },
    [spreadsheetInfo, products]
  );

  // Initialize Auth on app load
  useEffect(() => {
    const unsubscribe = initAuth(
      async (loggedInUser, token) => {
        setUser(loggedInUser);
        await syncWithGoogleSheets(token);
      },
      () => {
        setUser(null);
      }
    );
    return () => unsubscribe();
  }, [syncWithGoogleSheets]);

  // Handle Google Login
  const handleLogin = async () => {
    try {
      setIsSyncing(true);
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        await syncWithGoogleSheets(res.accessToken);
        showNotification(
          `ยินดีต้อนรับคุณ ${res.user.displayName || 'ผู้ใช้งาน'} เชื่อมต่อ Google Sheets เรียบร้อย`,
          'success'
        );
      }
    } catch (err: any) {
      console.error('Login error:', err);
      showNotification(`ไม่สามารถเข้าสู่ระบบได้: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setSpreadsheetInfo(null);
      showNotification('ออกจากระบบเรียบร้อย', 'info');
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  // Manual Refresh / Sync button
  const handleManualSync = async () => {
    const token = await getAccessToken();
    if (token) {
      await syncWithGoogleSheets(token);
    } else {
      showNotification('กำลังอยู่ในโหมดทดลองใช้งาน กรุณาเข้าสู่ระบบ Google เพื่อเชื่อมต่อชีตจริง', 'info');
    }
  };

  // Product Actions
  const handleAddProduct = async (newProd: Omit<Product, 'id' | 'lastUpdated'>) => {
    const product: Product = {
      ...newProd,
      id: `P-${Date.now()}`,
      lastUpdated: new Date().toISOString(),
    };

    const updated = [product, ...products];
    setProducts(updated);

    // Sync to sheet if authenticated
    const token = await getAccessToken();
    if (token && spreadsheetInfo) {
      await syncProductsToSheet(spreadsheetInfo.id, updated, token);
    }
    showNotification(`เพิ่มสินค้า "${product.name}" สำเร็จ`, 'success');
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    const updated = products.map((p) => (p.sku === updatedProduct.sku ? updatedProduct : p));
    setProducts(updated);

    const token = await getAccessToken();
    if (token && spreadsheetInfo) {
      await syncProductsToSheet(spreadsheetInfo.id, updated, token);
    }
    showNotification(`อัปเดตข้อมูลสินค้า "${updatedProduct.name}" สำเร็จ`, 'success');
  };

  const handleDeleteProduct = async (sku: string) => {
    const target = products.find((p) => p.sku === sku);
    const updated = products.filter((p) => p.sku !== sku);
    setProducts(updated);

    const token = await getAccessToken();
    if (token && spreadsheetInfo) {
      await syncProductsToSheet(spreadsheetInfo.id, updated, token);
    }
    showNotification(`ลบสินค้า "${target?.name || sku}" สำเร็จ`, 'success');
  };

  const handleToggleFocus = async (sku: string) => {
    const updated = products.map((p) => (p.sku === sku ? { ...p, isFocus: !p.isFocus } : p));
    setProducts(updated);

    const token = await getAccessToken();
    if (token && spreadsheetInfo) {
      await syncProductsToSheet(spreadsheetInfo.id, updated, token);
    }
    const item = updated.find((p) => p.sku === sku);
    showNotification(
      item?.isFocus
        ? `เพิ่ม "${item?.name}" ในรายการสินค้าโฟกัสแล้ว`
        : `นำ "${item?.name}" ออกจากรายการโฟกัสแล้ว`,
      'info'
    );
  };

  // Batch Import Products from CSV/Excel
  const handleBatchImport = async (
    items: {
      sku: string;
      name: string;
      category: string;
      unit: string;
      quantity: number;
      minStock: number;
      isFocus: boolean;
      note: string;
    }[],
    mode: 'merge' | 'append' | 'replace'
  ) => {
    let finalProducts: Product[] = [];
    const timestamp = new Date().toISOString();

    if (mode === 'replace') {
      finalProducts = items.map((item, idx) => ({
        id: `P-${Date.now()}-${idx + 1}`,
        sku: item.sku,
        name: item.name,
        category: item.category,
        unit: item.unit,
        costPrice: 0,
        sellingPrice: 0,
        quantity: item.quantity,
        minStock: item.minStock,
        isFocus: item.isFocus,
        note: item.note,
        lastUpdated: timestamp,
      }));
    } else if (mode === 'append') {
      const existingSkuSet = new Set(products.map((p) => p.sku.toLowerCase()));
      const existingNameSet = new Set(products.map((p) => p.name.toLowerCase()));

      const newItems = items
        .filter(
          (item) =>
            !existingSkuSet.has(item.sku.toLowerCase()) &&
            !existingNameSet.has(item.name.toLowerCase())
        )
        .map((item, idx) => ({
          id: `P-${Date.now()}-${idx + 1}`,
          sku: item.sku,
          name: item.name,
          category: item.category,
          unit: item.unit,
          costPrice: 0,
          sellingPrice: 0,
          quantity: item.quantity,
          minStock: item.minStock,
          isFocus: item.isFocus,
          note: item.note,
          lastUpdated: timestamp,
        }));

      finalProducts = [...newItems, ...products];
    } else {
      // 'merge' (default)
      const productMapBySku = new Map<string, Product>();
      const productMapByName = new Map<string, Product>();
      products.forEach((p) => {
        productMapBySku.set(p.sku.toLowerCase(), { ...p });
        productMapByName.set(p.name.toLowerCase(), { ...p });
      });

      const updatedExistingSkus = new Set<string>();
      const newItems: Product[] = [];

      items.forEach((item, idx) => {
        const existing =
          productMapBySku.get(item.sku.toLowerCase()) ||
          productMapByName.get(item.name.toLowerCase());

        if (existing) {
          updatedExistingSkus.add(existing.sku.toLowerCase());
          existing.name = item.name;
          existing.category = item.category || existing.category;
          existing.unit = item.unit || existing.unit;
          existing.quantity = item.quantity;
          existing.minStock = item.minStock;
          existing.isFocus = item.isFocus || existing.isFocus;
          existing.note = item.note || existing.note;
          existing.lastUpdated = timestamp;
        } else {
          newItems.push({
            id: `P-${Date.now()}-${idx + 1}`,
            sku: item.sku,
            name: item.name,
            category: item.category,
            unit: item.unit,
            costPrice: 0,
            sellingPrice: 0,
            quantity: item.quantity,
            minStock: item.minStock,
            isFocus: item.isFocus,
            note: item.note,
            lastUpdated: timestamp,
          });
        }
      });

      // Preserve unmodified products
      const unmodified = products.filter(
        (p) => !updatedExistingSkus.has(p.sku.toLowerCase())
      );
      const modifiedList = Array.from(productMapBySku.values()).filter((p) =>
        updatedExistingSkus.has(p.sku.toLowerCase())
      );

      finalProducts = [...newItems, ...modifiedList, ...unmodified];
    }

    const uniqueFinal = ensureUniqueProducts(finalProducts);
    setProducts(uniqueFinal);

    // Sync to Google Sheets if connected
    const token = await getAccessToken();
    if (token && spreadsheetInfo) {
      await syncProductsToSheet(spreadsheetInfo.id, uniqueFinal, token);
    }

    showNotification(
      `นำเข้าข้อมูลสต็อกสินค้าสำเร็จ ${items.length} รายการ (แบบ ${
        mode === 'replace' ? 'แทนที่ทั้งหมด' : mode === 'append' ? 'เพิ่มเฉพาะใหม่' : 'ผสานยอด'
      })`,
      'success'
    );
  };

  // Stock Out Action
  const handleStockOut = async (txData: {
    sku: string;
    productName: string;
    quantity: number;
    unitPrice?: number;
    totalPrice?: number;
    reasonOrSource: string;
    documentNo: string;
    dateTime: string;
    note: string;
  }) => {
    const targetProduct = products.find((p) => p.sku === txData.sku);
    if (!targetProduct) return;

    const newTx: StockTransaction = {
      id: `TX-OUT-${Date.now().toString().slice(-6)}`,
      dateTime: txData.dateTime,
      type: 'OUT',
      sku: txData.sku,
      productName: txData.productName,
      quantity: txData.quantity,
      unitPrice: 0,
      totalPrice: 0,
      reasonOrSource: txData.reasonOrSource,
      documentNo: txData.documentNo,
      note: txData.note,
      recordedBy: user?.displayName || 'ผู้ใช้งาน',
    };

    // Update product quantity
    const updatedProducts = products.map((p) =>
      p.sku === txData.sku
        ? {
            ...p,
            quantity: Math.max(0, p.quantity - txData.quantity),
            lastUpdated: new Date().toISOString(),
          }
        : p
    );

    setProducts(updatedProducts);
    setTransactions([newTx, ...transactions]);

    // Save to Google Sheets
    const token = await getAccessToken();
    if (token && spreadsheetInfo) {
      await Promise.all([
        appendTransactionToSheet(spreadsheetInfo.id, newTx, token),
        syncProductsToSheet(spreadsheetInfo.id, updatedProducts, token),
      ]);
    }
  };

  // Stock In Action
  const handleStockIn = async (txData: {
    sku: string;
    productName: string;
    quantity: number;
    unitPrice?: number;
    totalPrice?: number;
    reasonOrSource: string;
    documentNo: string;
    dateTime: string;
    note: string;
  }) => {
    const targetProduct = products.find((p) => p.sku === txData.sku);
    if (!targetProduct) return;

    const newTx: StockTransaction = {
      id: `TX-IN-${Date.now().toString().slice(-6)}`,
      dateTime: txData.dateTime,
      type: 'IN',
      sku: txData.sku,
      productName: txData.productName,
      quantity: txData.quantity,
      unitPrice: 0,
      totalPrice: 0,
      reasonOrSource: txData.reasonOrSource,
      documentNo: txData.documentNo,
      note: txData.note,
      recordedBy: user?.displayName || 'ผู้ใช้งาน',
    };

    // Update product quantity
    const updatedProducts = products.map((p) =>
      p.sku === txData.sku
        ? {
            ...p,
            quantity: p.quantity + txData.quantity,
            lastUpdated: new Date().toISOString(),
          }
        : p
    );

    setProducts(updatedProducts);
    setTransactions([newTx, ...transactions]);

    // Save to Google Sheets
    const token = await getAccessToken();
    if (token && spreadsheetInfo) {
      await Promise.all([
        appendTransactionToSheet(spreadsheetInfo.id, newTx, token),
        syncProductsToSheet(spreadsheetInfo.id, updatedProducts, token),
      ]);
    }
  };

  // Quick Adjust (from Focus Tab)
  const handleQuickAdjust = async (sku: string, diffQty: number, type: 'IN' | 'OUT') => {
    const target = products.find((p) => p.sku === sku);
    if (!target) return;

    if (type === 'OUT') {
      await handleStockOut({
        sku,
        productName: target.name,
        quantity: diffQty,
        reasonOrSource: 'ตัดสต็อกด่วน (สินค้าโฟกัส)',
        documentNo: 'QUICK-OUT',
        dateTime: new Date().toISOString(),
        note: 'บันทึกด่วนจากหน้าสินค้าโฟกัส',
      });
    } else {
      await handleStockIn({
        sku,
        productName: target.name,
        quantity: diffQty,
        reasonOrSource: 'รับเข้าสต็อกด่วน (สินค้าโฟกัส)',
        documentNo: 'QUICK-IN',
        dateTime: new Date().toISOString(),
        note: 'บันทึกด่วนจากหน้าสินค้าโฟกัส',
      });
    }
    showNotification(`ปรับยอดสินค้า "${target.name}" เรียบร้อย`, 'success');
  };

  // Counts for badges
  const focusCount = products.filter((p) => p.isFocus).length;
  const lowStockCount = products.filter((p) => p.quantity <= p.minStock).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Kanit',sans-serif] text-slate-800 pb-20 md:pb-10">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        spreadsheetInfo={spreadsheetInfo}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onSync={handleManualSync}
        onOpenExport={() => setIsExportModalOpen(true)}
        isSyncing={isSyncing}
        focusCount={focusCount}
        lowStockCount={lowStockCount}
      />

      {/* Offline / Connect Google Sheets Prompt Banner if not logged in */}
      {!user && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white px-4 py-3 shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-white/20">
                <FileSpreadsheet className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-bold">โหมดทดลองใช้งาน (Demo Mode):</span>{' '}
                <span className="text-emerald-100">
                  เข้าสู่ระบบ Google เพื่อสร้างและเชื่อมต่อ Google Sheets สต็อกสินค้าของคุณเองแบบเรียลไทม์
                </span>
              </div>
            </div>
            <button
              onClick={handleLogin}
              className="px-4 py-1.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>เชื่อมต่อ Google Sheets เดี๋ยวนี้</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-top-4 duration-200">
          <div
            className={`p-4 rounded-2xl shadow-xl border flex items-center gap-3 text-xs sm:text-sm font-semibold max-w-md ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : notification.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-indigo-50 border-indigo-200 text-indigo-900'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : notification.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-indigo-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'products' && (
          <ProductsTab
            products={products}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onToggleFocus={handleToggleFocus}
            onOpenImport={() => setIsImportModalOpen(true)}
            isSyncing={isSyncing}
          />
        )}

        {activeTab === 'stock-out' && (
          <StockOutTab
            products={products}
            recentTransactions={transactions}
            onStockOut={handleStockOut}
            isSyncing={isSyncing}
          />
        )}

        {activeTab === 'stock-in' && (
          <StockInTab
            products={products}
            recentTransactions={transactions}
            onStockIn={handleStockIn}
            isSyncing={isSyncing}
          />
        )}

        {activeTab === 'balance' && (
          <BalanceReportTab
            products={products}
            spreadsheetUrl={spreadsheetInfo?.url}
          />
        )}

        {activeTab === 'focus' && (
          <FocusItemsTab
            products={products}
            transactions={transactions}
            onToggleFocus={handleToggleFocus}
            onQuickAdjust={handleQuickAdjust}
            onNavigateToTab={setActiveTab}
            isSyncing={isSyncing}
          />
        )}

        {activeTab === 'dashboard' && (
          <DailyDashboardTab
            transactions={transactions}
            products={products}
          />
        )}
      </main>

      {/* Footer info */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-slate-400">
        <p>
          ระบบจัดการสต็อกสินค้า (Smart Stock Manager) • บันทึกและดึงข้อมูลผ่าน Google Sheets API
          {spreadsheetInfo && (
            <>
              {' '}•{' '}
              <a
                href={spreadsheetInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 hover:underline font-medium"
              >
                ชีต: {spreadsheetInfo.name} ↗
              </a>
            </>
          )}
        </p>
      </footer>
      {/* Export & Backup Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        products={products}
        transactions={transactions}
      />

      {/* Import Stock Modal */}
      {isImportModalOpen && (
        <ImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          existingProducts={products}
          onBatchImport={handleBatchImport}
        />
      )}
    </div>
  );
}
