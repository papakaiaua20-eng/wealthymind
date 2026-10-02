import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertTriangle,
  Download,
  Boxes,
  Plus,
  RefreshCw,
  FileText,
  Star,
  Layers,
  ArrowRight,
  Sliders,
  Table,
  Check,
  RotateCcw,
} from 'lucide-react';
import { Product } from '../types/inventory';
import {
  parseFileBufferToSheets,
  findHeaderRowIndex,
  detectColumnMapping,
  processImportRows,
  ParsedImportRow,
  ColumnMapping,
  downloadSampleStockTemplate,
  parseCSV,
} from '../utils/csvImport';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingProducts: Product[];
  onBatchImport: (
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
  ) => Promise<void>;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  existingProducts,
  onBatchImport,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pasteContent, setPasteContent] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);

  // Sheets data from file or pasted text
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [sheetsMap, setSheetsMap] = useState<Record<string, string[][]>>({});

  // Configuration for active sheet
  const [headerRowIdx, setHeaderRowIdx] = useState<number>(0);
  const [customMapping, setCustomMapping] = useState<ColumnMapping>({
    nameIndex: 0,
    quantityIndex: -1,
    skuIndex: -1,
    categoryIndex: -1,
    unitIndex: -1,
    minStockIndex: -1,
    focusIndex: -1,
    noteIndex: -1,
  });

  const [showMappingConfig, setShowMappingConfig] = useState(false);

  // User requested: "เอาข้อมูลไปแทน" -> default to 'replace'
  const [importMode, setImportMode] = useState<'merge' | 'append' | 'replace'>('replace');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active raw rows for the current sheet
  const activeRawRows = useMemo(() => {
    return sheetsMap[selectedSheet] || [];
  }, [sheetsMap, selectedSheet]);

  // Derive available columns from header row
  const availableColumns = useMemo(() => {
    if (activeRawRows.length === 0) return [];

    if (headerRowIdx === -1) {
      // No headers: use Column 1, Column 2, etc.
      const maxCols = Math.max(...activeRawRows.slice(0, 10).map((r) => r.length), 1);
      return Array.from({ length: maxCols }, (_, i) => ({
        index: i,
        label: `คอลัมน์ ${i + 1}`,
      }));
    }

    const headerRow = activeRawRows[headerRowIdx] || [];
    return headerRow.map((colName, idx) => ({
      index: idx,
      label: colName.trim() ? `${colName.trim()} (คอลัมน์ ${idx + 1})` : `คอลัมน์ ${idx + 1}`,
    }));
  }, [activeRawRows, headerRowIdx]);

  // Derive data rows after the header row
  const activeDataRows = useMemo(() => {
    if (activeRawRows.length === 0) return [];
    if (headerRowIdx === -1) return activeRawRows;
    return activeRawRows.slice(headerRowIdx + 1);
  }, [activeRawRows, headerRowIdx]);

  // Headers string array for raw display
  const activeHeaders = useMemo(() => {
    if (headerRowIdx >= 0 && activeRawRows[headerRowIdx]) {
      return activeRawRows[headerRowIdx];
    }
    return availableColumns.map((c) => c.label);
  }, [activeRawRows, headerRowIdx, availableColumns]);

  // Process rows with current mapping
  const parsedResult = useMemo(() => {
    if (activeDataRows.length === 0) return null;
    return processImportRows(activeDataRows, activeHeaders, customMapping, existingProducts);
  }, [activeDataRows, activeHeaders, customMapping, existingProducts]);

  if (!isOpen) return null;

  // Handle uploaded file
  const handleFileProcess = async (file: File) => {
    try {
      setFileName(file.name);
      const buffer = await file.arrayBuffer();
      const { sheetNames: names, sheets } = parseFileBufferToSheets(buffer, file.name);

      if (names.length === 0 || !sheets[names[0]] || sheets[names[0]].length === 0) {
        alert('ไฟล์ที่เลือกไม่มีข้อมูลหรือตารางว่างเปล่า');
        return;
      }

      setSheetNames(names);
      setSelectedSheet(names[0]);
      setSheetsMap(sheets);

      // Auto-detect header row and column mapping for first sheet
      const firstSheetRows = sheets[names[0]];
      const detectedHeaderIdx = findHeaderRowIndex(firstSheetRows);
      setHeaderRowIdx(detectedHeaderIdx);

      const headerRow = detectedHeaderIdx >= 0 ? firstSheetRows[detectedHeaderIdx] : [];
      const dataRows = detectedHeaderIdx >= 0 ? firstSheetRows.slice(detectedHeaderIdx + 1) : firstSheetRows;
      const detectedMapping = detectColumnMapping(headerRow, dataRows);
      setCustomMapping(detectedMapping);

      // If nameIndex is not found or valid items = 0, automatically expand column mapping section
      if (detectedMapping.nameIndex < 0) {
        setShowMappingConfig(true);
      }
    } catch (err: any) {
      alert(`ไม่สามารถเปิดไฟล์ได้: ${err.message || 'รูปแบบไฟล์ไม่ถูกต้อง'}`);
    }
  };

  // When switching sheets
  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    const rows = sheetsMap[sheetName] || [];
    const detectedHeaderIdx = findHeaderRowIndex(rows);
    setHeaderRowIdx(detectedHeaderIdx);

    const headerRow = detectedHeaderIdx >= 0 ? rows[detectedHeaderIdx] : [];
    const dataRows = detectedHeaderIdx >= 0 ? rows.slice(detectedHeaderIdx + 1) : rows;
    const detectedMapping = detectColumnMapping(headerRow, dataRows);
    setCustomMapping(detectedMapping);
  };

  // When changing header row index
  const handleHeaderRowChange = (newHeaderIdx: number) => {
    setHeaderRowIdx(newHeaderIdx);
    const headerRow = newHeaderIdx >= 0 ? activeRawRows[newHeaderIdx] : [];
    const dataRows = newHeaderIdx >= 0 ? activeRawRows.slice(newHeaderIdx + 1) : activeRawRows;
    const detectedMapping = detectColumnMapping(headerRow, dataRows);
    setCustomMapping(detectedMapping);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handlePasteProcess = () => {
    if (!pasteContent.trim()) return;
    const rows = parseCSV(pasteContent);
    if (rows.length === 0) {
      alert('ไม่พบข้อความที่เป็นตาราง');
      return;
    }

    setFileName('ข้อมูลจากการวาง (Pasted Table)');
    setSheetNames(['Sheet1']);
    setSelectedSheet('Sheet1');
    setSheetsMap({ Sheet1: rows });

    const detectedHeaderIdx = findHeaderRowIndex(rows);
    setHeaderRowIdx(detectedHeaderIdx);

    const headerRow = detectedHeaderIdx >= 0 ? rows[detectedHeaderIdx] : [];
    const dataRows = detectedHeaderIdx >= 0 ? rows.slice(detectedHeaderIdx + 1) : rows;
    const detectedMapping = detectColumnMapping(headerRow, dataRows);
    setCustomMapping(detectedMapping);

    if (detectedMapping.nameIndex < 0) {
      setShowMappingConfig(true);
    }
  };

  const handleReset = () => {
    setFileName(null);
    setSheetNames([]);
    setSelectedSheet('');
    setSheetsMap({});
    setPasteContent('');
    setShowMappingConfig(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExecuteImport = async () => {
    if (!parsedResult || parsedResult.totalValid === 0) return;

    try {
      setIsSubmitting(true);
      const itemsToImport = parsedResult.parsedRows.map((r) => r.product);
      await onBatchImport(itemsToImport, importMode);
      handleReset();
      onClose();
    } catch (err: any) {
      alert(`การนำเข้าไม่สำเร็จ: ${err.message || 'เกิดข้อผิดพลาด'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20 shadow-inner">
              <Upload className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold">นำเข้าไฟล์สต็อกสินค้า (Import Stock)</h3>
              <p className="text-xs text-emerald-200/90 mt-0.5">
                รองรับไฟล์ Excel (.xlsx, .xls) และไฟล์ CSV ทุกรูปแบบ พร้อมระบบตรวจจับคอลัมน์อัตโนมัติ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadSampleStockTemplate}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-md transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ดาวน์โหลดแม่แบบ Excel/CSV</span>
            </button>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {!fileName ? (
            <div className="space-y-4">
              {/* Method Switcher */}
              <div className="flex items-center justify-center">
                <div className="bg-slate-100 p-1 rounded-2xl flex items-center text-xs font-bold text-slate-600">
                  <button
                    onClick={() => setActiveTab('upload')}
                    className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'upload' ? 'bg-white text-emerald-700 shadow-xs' : 'hover:text-slate-900'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>อัปโหลดไฟล์ (.xlsx / .xls / .csv)</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('paste')}
                    className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'paste' ? 'bg-white text-emerald-700 shadow-xs' : 'hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>วางข้อความตารางจาก Excel</span>
                  </button>
                </div>
              </div>

              {activeTab === 'upload' ? (
                /* Drag and drop zone */
                <label
                  htmlFor="stock-file-picker"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 select-none ${
                    isDragging
                      ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]'
                      : 'border-slate-200 hover:border-emerald-400 bg-slate-50/60 hover:bg-emerald-50/20'
                  }`}
                >
                  <input
                    id="stock-file-picker"
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.xlsm,.xlsb,.csv,.tsv,.txt"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileProcess(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shadow-xs pointer-events-none">
                    <FileSpreadsheet className="w-8 h-8" />
                  </div>
                  <div className="pointer-events-none">
                    <p className="font-bold text-slate-800 text-sm">
                      ลากไฟล์ Excel หรือ CSV มาวางที่นี่ หรือ{' '}
                      <span className="text-emerald-600 underline">คลิกเพื่อเลือกไฟล์</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      รองรับไฟล์ .XLSX, .XLS, .CSV จาก Microsoft Excel, Google Sheets, ERP หรือโปรแกรมสต็อกเดิม
                    </p>
                  </div>
                </label>
              ) : (
                /* Paste text box */
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-slate-700">วางตารางข้อมูลที่คัดลอกจาก Excel หรือ Google Sheets:</label>
                    <span className="text-slate-400">ระบบจะตรวจจับคอลัมน์ให้อัตโนมัติ</span>
                  </div>
                  <textarea
                    rows={8}
                    value={pasteContent}
                    onChange={(e) => setPasteContent(e.target.value)}
                    placeholder="วางข้อมูลที่ Copy มาจาก Excel เช่น:&#10;ชื่อสินค้า	หมวดหมู่	หน่วยนับ	จำนวนคงเหลือ	จุดเตือนขั้นต่ำ&#10;กาแฟกระป๋อง	เครื่องดื่ม	กระป๋อง	120	20&#10;ขนมปังเนย	อาหาร	ห่อ	45	10"
                    className="w-full p-3 font-mono text-xs border border-slate-200 rounded-2xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-slate-50"
                  />
                  <button
                    onClick={handlePasteProcess}
                    disabled={!pasteContent.trim()}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>ตรวจสอบข้อมูลและแสดงตัวอย่าง</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Template Download Hint */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-800">ต้องการดูตัวอย่างคอลัมน์ที่แนะนำ?</p>
                  <p className="text-slate-500">
                    ดาวน์โหลดแม่แบบตัวอย่างเพื่อดูรูปแบบหัวตาราง หรือใช้ไฟล์สต็อกเดิมที่มีอยู่ได้ทันที
                  </p>
                </div>
                <button
                  onClick={downloadSampleStockTemplate}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>ดาวน์โหลดแม่แบบ CSV</span>
                </button>
              </div>
            </div>
          ) : (
            /* PREVIEW AND IMPORT OPTIONS */
            <div className="space-y-5">
              {/* File Info & Quick Stats */}
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-600 text-white shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm truncate max-w-xs">{fileName}</h4>
                      {sheetNames.length > 1 && (
                        <select
                          value={selectedSheet}
                          onChange={(e) => handleSheetChange(e.target.value)}
                          className="px-2 py-0.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-800"
                        >
                          {sheetNames.map((s) => (
                            <option key={s} value={s}>
                              ชีต: {s}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <p className="text-xs text-emerald-800 mt-0.5 font-medium">
                      ตรวจพบสินค้าทั้งหมด{' '}
                      <span className="font-bold text-emerald-950 text-sm">
                        {parsedResult ? parsedResult.totalValid : 0}
                      </span>{' '}
                      รายการ{' '}
                      {parsedResult && parsedResult.totalValid > 0 && (
                        <span className="text-slate-600">
                          (ใหม่ {parsedResult.totalNew} รายการ, อัปเดต {parsedResult.totalUpdates} รายการ)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setShowMappingConfig(!showMappingConfig)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                      showMappingConfig
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{showMappingConfig ? 'ซ่อนการตั้งค่าคอลัมน์' : 'ปรับแต่งคอลัมน์ / แถวหัวตาราง'}</span>
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    เปลี่ยนไฟล์
                  </button>
                </div>
              </div>

              {/* Alert if 0 items found */}
              {parsedResult && parsedResult.totalValid === 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">
                      ตรวจพบสินค้า 0 รายการ: กรุณาตรวจสอบว่าคอลัมน์ใดในไฟล์คือ "ชื่อสินค้า"
                    </p>
                    <p className="text-amber-800">
                      ระบบได้เปิดส่วนตั้งค่าคอลัมน์ด้านล่างให้ท่านแล้ว โปรดเลือก "คอลัมน์ชื่อสินค้า"
                      และ "แถวที่เป็นหัวตาราง" ให้ตรงกับไฟล์ของท่าน
                    </p>
                  </div>
                </div>
              )}

              {/* Column & Header Row Mapping Panel */}
              {(showMappingConfig || (parsedResult && parsedResult.totalValid === 0)) && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-slate-600" />
                      <span className="font-bold text-slate-800">
                        การจับคู่คอลัมน์และแถวหัวตาราง (Column & Header Configuration)
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      เปลี่ยนคอลัมน์เพื่อให้ระบบดึงข้อมูลได้ถูกต้อง
                    </span>
                  </div>

                  {/* Header Row Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        แถวที่เป็นหัวตาราง (Header Row):
                      </label>
                      <select
                        value={headerRowIdx}
                        onChange={(e) => handleHeaderRowChange(Number(e.target.value))}
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value={-1}>ไม่มีหัวตาราง (ข้อมูลเริ่มตั้งแต่แถวที่ 1)</option>
                        {activeRawRows.slice(0, 15).map((row, idx) => (
                          <option key={idx} value={idx}>
                            แถวที่ {idx + 1}: {row.filter(Boolean).slice(0, 3).join(', ') || '(แถวว่าง)'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Product Name Column (Required) */}
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        <span className="text-rose-600 font-bold">*</span> คอลัมน์ชื่อสินค้า (รายการ / รายละเอียด):
                      </label>
                      <select
                        value={customMapping.nameIndex}
                        onChange={(e) =>
                          setCustomMapping({ ...customMapping, nameIndex: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-white border-2 border-emerald-500 rounded-xl text-xs font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value={-1}>-- เลือกคอลัมน์ชื่อสินค้า --</option>
                        {availableColumns.map((col) => (
                          <option key={col.index} value={col.index}>
                            {col.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity Column */}
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        คอลัมน์จำนวนคงเหลือ (ยกยอด / คงเหลือ):
                      </label>
                      <select
                        value={customMapping.quantityIndex}
                        onChange={(e) =>
                          setCustomMapping({ ...customMapping, quantityIndex: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value={-1}>-- ไม่ระบุ (ยอดตั้งต้นเป็น 0) --</option>
                        {availableColumns.map((col) => (
                          <option key={col.index} value={col.index}>
                            {col.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* SKU Column */}
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        คอลัมน์รหัสสินค้า (ลำดับ SKU / รหัส):
                      </label>
                      <select
                        value={customMapping.skuIndex}
                        onChange={(e) =>
                          setCustomMapping({ ...customMapping, skuIndex: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value={-1}>-- ไม่ระบุ (ระบบจะรันให้อัตโนมัติ) --</option>
                        {availableColumns.map((col) => (
                          <option key={col.index} value={col.index}>
                            {col.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Category Column */}
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">คอลัมน์หมวดหมู่:</label>
                      <select
                        value={customMapping.categoryIndex}
                        onChange={(e) =>
                          setCustomMapping({ ...customMapping, categoryIndex: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value={-1}>-- ทั่วไป (General) --</option>
                        {availableColumns.map((col) => (
                          <option key={col.index} value={col.index}>
                            {col.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Unit Column */}
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">คอลัมน์หน่วยนับ:</label>
                      <select
                        value={customMapping.unitIndex}
                        onChange={(e) =>
                          setCustomMapping({ ...customMapping, unitIndex: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value={-1}>-- ชิ้น (Piece) --</option>
                        {availableColumns.map((col) => (
                          <option key={col.index} value={col.index}>
                            {col.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Min Stock Column */}
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">คอลัมน์จุดเตือนขั้นต่ำ:</label>
                      <select
                        value={customMapping.minStockIndex}
                        onChange={(e) =>
                          setCustomMapping({ ...customMapping, minStockIndex: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value={-1}>-- ค่าเริ่มต้น (10) --</option>
                        {availableColumns.map((col) => (
                          <option key={col.index} value={col.index}>
                            {col.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Focus Column */}
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">คอลัมน์สินค้าโฟกัส:</label>
                      <select
                        value={customMapping.focusIndex}
                        onChange={(e) =>
                          setCustomMapping({ ...customMapping, focusIndex: Number(e.target.value) })
                        }
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value={-1}>-- ไม่ระบุ --</option>
                        {availableColumns.map((col) => (
                          <option key={col.index} value={col.index}>
                            {col.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Import Mode Options (User explicitly asked to replace data: "เอาข้อมูลไปแทน") */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 block">
                    เลือกรูปแบบการนำเข้าข้อมูลเข้าสู่ระบบ:
                  </label>
                  <span className="text-[11px] text-rose-600 font-semibold">
                    *ตามที่เลือก: แทนที่ข้อมูลเดิมทั้งหมดด้วยข้อมูลจากไฟล์นี้
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Replace All (Primary selected by user request) */}
                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      importMode === 'replace'
                        ? 'bg-rose-50/70 border-rose-500 ring-2 ring-rose-500/30'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-700 text-xs flex items-center gap-1.5">
                          {importMode === 'replace' && <Check className="w-3.5 h-3.5" />}
                          ล้างสต็อกและแทนที่ (แนะนำ)
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full font-bold">
                          Replace All
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">
                        ลบรายการสินค้าเดิมทั้งหมด และใช้ข้อมูลสินค้าจากไฟล์นี้เป็นสต็อกใหม่ทั้งหมด
                      </p>
                    </div>
                  </button>

                  {/* Merge */}
                  <button
                    type="button"
                    onClick={() => setImportMode('merge')}
                    className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      importMode === 'merge'
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          {importMode === 'merge' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                          ผสานข้อมูล
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                          Merge
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        อัปเดตยอดคงเหลือสินค้าที่มีอยู่แล้ว และเพิ่มสินค้าตัวใหม่ที่ยังไม่มี
                      </p>
                    </div>
                  </button>

                  {/* Append New Only */}
                  <button
                    type="button"
                    onClick={() => setImportMode('append')}
                    className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      importMode === 'append'
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          {importMode === 'append' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                          เพิ่มเฉพาะรายการใหม่
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full font-bold">
                          New Only
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        นำเข้าเฉพาะสินค้าใหม่ โดยไม่แตะต้องยอดสินค้าเดิมในระบบ
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Data Preview Table */}
              {parsedResult && parsedResult.parsedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">
                      ตัวอย่างรายการสินค้าที่จะถูกนำเข้า ({parsedResult.parsedRows.length} รายการ):
                    </span>
                    <span className="text-[11px] text-slate-500">
                      *รหัส SKU จะสร้างให้อัตโนมัติหากไฟล์ไม่มีรหัส
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200 shadow-2xs">
                        <tr>
                          <th className="p-2.5 w-10 text-center">#</th>
                          <th className="p-2.5">รหัส SKU</th>
                          <th className="p-2.5">ชื่อสินค้า</th>
                          <th className="p-2.5">หมวดหมู่</th>
                          <th className="p-2.5 text-right">จำนวนคงเหลือ</th>
                          <th className="p-2.5 text-right">จุดเตือนขั้นต่ำ</th>
                          <th className="p-2.5 text-center">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedResult.parsedRows.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50/80">
                            <td className="p-2.5 text-center font-mono text-slate-400">{i + 1}</td>
                            <td className="p-2.5 font-mono font-bold text-slate-700">{r.product.sku}</td>
                            <td className="p-2.5 font-semibold text-slate-900">
                              <div className="flex items-center gap-1.5">
                                {r.product.isFocus && (
                                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                                )}
                                <span>{r.product.name}</span>
                              </div>
                            </td>
                            <td className="p-2.5 text-slate-500">{r.product.category.split(' ')[0]}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                              {r.product.quantity.toLocaleString('th-TH')} {r.product.unit.split(' ')[0]}
                            </td>
                            <td className="p-2.5 text-right font-mono text-slate-500">
                              {r.product.minStock} {r.product.unit.split(' ')[0]}
                            </td>
                            <td className="p-2.5 text-center">
                              {importMode === 'replace' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                  แทนที่
                                </span>
                              ) : r.isNew ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  สินค้าใหม่
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                  อัปเดตเดิม
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer font-medium"
          >
            ยกเลิก
          </button>

          {parsedResult && parsedResult.totalValid > 0 && (
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={isSubmitting}
              className={`px-6 py-2.5 rounded-xl font-bold shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50 text-white ${
                importMode === 'replace'
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึกและซิงค์ข้อมูล...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {importMode === 'replace'
                      ? `ยืนยันนำเข้า ${parsedResult.totalValid} รายการ (แทนที่สต็อกเดิมทั้งหมด)`
                      : `ยืนยันการนำเข้า ${parsedResult.totalValid} รายการ`}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
