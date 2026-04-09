"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, 
  Upload, 
  RefreshCw, 
  Download, 
  Image as ImageIcon, 
  Monitor,
  Sun,
  Moon,
  Edit3,
  FileText,
  Trash2,
  AlertCircle,
  Grid,
  Video,
  SaveAll,
  Coins,
  ArrowLeft,
  X,
  CheckCircle2,
  Copy,
  History,
  Maximize2,
  Zap,
  Layout,
  Settings,
  User,
  LogOut,
  ChevronRight
} from "lucide-react";
import JSZip from "jszip";
import {
  enhanceImagePrompt,
  generateProductImage,
  generateProductDescription,
  enhanceEditPrompt,
  generateEditImage
} from "@/lib/kie";
import { UserButton } from "@clerk/nextjs";

// --- SABİTLER ---
const ASPECT_RATIOS = [
  { name: "Portre 1080x1440", value: "3:4", class: "aspect-[3/4]" },
  { name: "Yatay 1920x1080", value: "16:9", class: "aspect-[16/9]" },
  { name: "Kare 1080x1080", value: "1:1", class: "aspect-square" },
  { name: "Dikey 1080x1920", value: "9:16", class: "aspect-[9/16]" },
];

const RESOLUTIONS = [
  { label: "1K", value: "1K", desc: "1 Kredi" },
  { label: "2K", value: "2K", desc: "2 Kredi" },
  { label: "4K", value: "4K", desc: "4 Kredi" },
];

const DB_NAME = "ShenStudioDBv2";
const STORE_NAME = "history";
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

// --- IndexedDB helpers ---
const initDB = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject("IndexedDB yok");
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME))
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    req.onsuccess = (e: any) => resolve(e.target.result);
    req.onerror = () => reject("DB Hatası");
  });

const deleteFromDB = async (id: number) => {
  try {
    const db = await initDB();
    db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(id);
  } catch {}
};

const saveToDB = async (item: any) => {
  try {
    const db = await initDB();
    db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(item);
  } catch {}
};

const getHistoryDB = async (): Promise<any[]> => {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const req = db
        .transaction(STORE_NAME, "readonly")
        .objectStore(STORE_NAME)
        .getAll();
      req.onsuccess = () =>
        resolve(
          req.result.sort((a: any, b: any) => b.id - a.id)
        );
    });
  } catch {
    return [];
  }
};

const TabButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick} 
    className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-xs ${active ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-[#1F2937]"}`}
  >
    {icon} {label}
  </button>
);

export default function StudioPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"generate" | "edit" | "description" | "gallery" | "video">("generate");

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [originalMimeType, setOriginalMimeType] = useState("image/png");
  const [simplePrompt, setSimplePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[2]); // Square default
  const [resolution, setResolution] = useState(RESOLUTIONS[0]);

  const [productDetails, setProductDetails] = useState("");
  const [brand, setBrand] = useState<"shen" | "ssa">("shen");
  const [generatedDescription, setGeneratedDescription] = useState("");
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  const [editMainImage, setEditMainImage] = useState<string | null>(null);
  const [editRefImage, setEditRefImage] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);

  const [generatedImages, setGeneratedImages] = useState<(string | null)[]>(Array(4).fill(null));
  const [loadingStates, setLoadingStates] = useState<boolean[]>(Array(4).fill(false));
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedHistoryItems, setSelectedHistoryItems] = useState<number[]>([]);
  const [fullScreenImage, setFullScreenImage] = useState<{ index: number; src: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editMainInputRef = useRef<HTMLInputElement>(null);
  const editRefInputRef = useRef<HTMLInputElement>(null);

  const handleVideoTab = () => {
    alert("Video Oluşturma özelliği çok yakında Shen Stüdyo'da!");
  };

  useEffect(() => {
    setIsMounted(true);
    fetchHistory();
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, []);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const fetchHistory = async () => {
    const data = await getHistoryDB();
    const now = Date.now();
    
    // Auto-delete items older than 14 days
    const oldItems = data.filter(item => (now - item.id) > FOURTEEN_DAYS_MS);
    for (const item of oldItems) {
      await deleteFromDB(item.id);
    }
    
    const validItems = data.filter(item => (now - item.id) <= FOURTEEN_DAYS_MS);
    setHistory(validItems);
  };

  const handleImageUpload = (file: File | undefined, target: 'main' | 'editMain' | 'editRef') => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      if (target === 'main') {
        setOriginalMimeType(file.type);
        setSelectedImage(res);
      } else if (target === 'editMain') {
        setEditMainImage(res);
      } else if (target === 'editRef') {
        setEditRefImage(res);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateNext = async () => {
    if (!selectedImage) return;
    const nextIndex = generatedImages.findIndex((img) => img === null);
    if (nextIndex === -1) return;
    
    setLoadingStates((p) => { const n = [...p]; n[nextIndex] = true; return n; });
    try {
      const res = await generateProductImage(selectedImage, simplePrompt, aspectRatio.value, resolution.value);
      if (res.imageUrl) {
        setGeneratedImages((p) => { const n = [...p]; n[nextIndex] = res.imageUrl!; return n; });
        const newHistory = { id: Date.now(), image: res.imageUrl, prompt: simplePrompt };
        await saveToDB(newHistory);
        fetchHistory();
      }
    } finally {
      setLoadingStates((p) => { const n = [...p]; n[nextIndex] = false; return n; });
    }
  };

  const handleApplyEdit = async () => {
    if (!editMainImage || !editPrompt) return;
    setEditLoading(true);
    try {
      const res = await generateEditImage(editMainImage, editRefImage, editPrompt, aspectRatio.value, resolution.value);
      if (res.imageUrl) {
        setResultImage(res.imageUrl);
        const newHistory = { id: Date.now(), image: res.imageUrl, prompt: editPrompt };
        await saveToDB(newHistory);
        fetchHistory();
      }
    } finally {
      setEditLoading(false);
    }
  };

  const handleGenerateDescription = async () => {
    setIsGeneratingDescription(true);
    const res = await generateProductDescription(selectedImage?.split(",")[1] || null, "image/jpeg", productDetails, brand);
    if (res.text) setGeneratedDescription(res.text);
    setIsGeneratingDescription(false);
  };

  const handleCopyDescription = () => {
    navigator.clipboard.writeText(generatedDescription);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const downloadAll = async () => {
    const zip = new JSZip();
    generatedImages.forEach((img, i) => {
      if (img) zip.file(`shen_studyo_${i + 1}.jpg`, img, { base64: true });
    });
    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = "shen_studyo_paket.zip";
    link.click();
  };

  const handleDeleteHistory = async (id: number) => {
    await deleteFromDB(id);
    fetchHistory();
  };

  const handleDeleteSelected = async () => {
    for (const id of selectedHistoryItems) await deleteFromDB(id);
    setSelectedHistoryItems([]);
    fetchHistory();
  };

  const toggleHistorySelection = (id: number) => {
    setSelectedHistoryItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  if (!isMounted) return null;

  return (
    <div className={`${isDarkMode ? "dark" : ""} min-h-screen bg-slate-50 dark:bg-[#0B0F1A] flex flex-col font-sans transition-colors duration-500`}>
      <header className="px-6 py-4 bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-[#1F2937] flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2.5 rounded-2xl shadow-lg shadow-amber-400/20"><Sparkles className="w-6 h-6 text-white" /></div>
          <h1 className="text-xl font-black dark:text-white tracking-tighter uppercase">SHEN STÜDYO</h1>
        </div>
        <div className="flex items-center gap-4">
          <UserButton afterSignOutUrl="/" />
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 bg-slate-100 dark:bg-[#1F2937] rounded-xl">
            {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-[#EAB308]" />}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-full lg:w-[380px] bg-white dark:bg-[#111827] border-b lg:border-r border-slate-200 dark:border-[#1F2937] flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100 dark:border-[#1F2937] flex flex-col gap-2">
            <TabButton active={activeTab === "generate"} onClick={() => setActiveTab("generate")} icon={<Sparkles className="w-5 h-5" />} label="GÖRSEL OLUŞTUR" />
            <TabButton active={activeTab === "edit"} onClick={() => setActiveTab("edit")} icon={<Edit3 className="w-5 h-5" />} label="GÖRSEL DÜZENLE" />
            <TabButton active={activeTab === "description"} onClick={() => setActiveTab("description")} icon={<FileText className="w-5 h-5" />} label="AÇIKLAMA ÜRET" />
            <TabButton active={activeTab === "gallery"} onClick={() => setActiveTab("gallery")} icon={<Grid className="w-5 h-5" />} label="GALERİM" />
            <TabButton active={activeTab === "video"} onClick={handleVideoTab} icon={<Video className="w-5 h-5 text-amber-500" />} label="VİDEO (YAKINDA)" />
          </div>

          <div className="flex-1 lg:overflow-y-auto p-6 space-y-8">
            {activeTab === "generate" && (
              <>
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                    <span className="bg-slate-100 dark:bg-[#1F2937] w-5 h-5 rounded flex items-center justify-center text-slate-500">1</span> Ürün Yükle
                  </h3>
                  <div onClick={() => fileInputRef.current?.click()} className={`h-48 rounded-[2.5rem] border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center ${selectedImage ? "border-amber-400 bg-amber-50/10" : "border-slate-200 dark:border-[#1F2937] dark:bg-[#0B0F1A]"}`}>
                    {selectedImage ? <img src={selectedImage} className="h-full w-full object-contain p-4" /> : <div className="text-center opacity-40"><Upload className="w-8 h-8 mx-auto mb-2" /><p className="text-[10px] font-black uppercase">Görsel Seç</p></div>}
                    <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e) => handleImageUpload(e.target.files?.[0], 'main')} />
                  </div>
                </section>
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                    <span className="bg-slate-100 dark:bg-[#1F2937] w-5 h-5 rounded flex items-center justify-center text-slate-500">2</span> Kampanya Tasarımı
                  </h3>
                  <textarea value={simplePrompt} onChange={(e) => setSimplePrompt(e.target.value)} placeholder="Ürünü ve ortamı betimleyin..." className="w-full h-32 p-5 rounded-[2rem] bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#1F2937] text-sm focus:ring-2 focus:ring-amber-400 outline-none transition-all dark:text-white" />
                </section>
                <section className="space-y-4 bg-slate-50 dark:bg-[#0B0F1A]/50 p-6 rounded-[2rem] border border-slate-100 dark:border-[#1F2937]">
                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><Monitor className="w-3 h-3" /> Çözünürlük</label>
                      <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                        {RESOLUTIONS.map((res) => (
                          <button key={res.value} type="button" onClick={() => setResolution(res)} className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all ${resolution.value === res.value ? "bg-amber-500 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}>
                            <span className="text-[10px] font-black uppercase">{res.label}</span>
                            <span className={`text-[8px] font-bold ${resolution.value === res.value ? "text-white/70" : "text-slate-400"}`}>{res.desc}</span>
                          </button>
                        ))}
                      </div>
                   </div>
                </section>
                <button onClick={handleGenerateNext} disabled={!selectedImage || loadingStates.some(s => s)} className="w-full py-5 bg-amber-500 hover:bg-amber-600 text-white rounded-[2rem] font-black text-sm flex items-center justify-center gap-3 shadow-xl transition-all disabled:opacity-50">
                   {loadingStates.some(s => s) ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} YENİ VARYASYON ÜRET
                </button>
              </>
            )}

            {activeTab === "edit" && (
              <div className="space-y-6">
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                    <span className="bg-slate-100 dark:bg-[#1F2937] w-5 h-5 rounded flex items-center justify-center text-slate-500">1</span> Düzenlenecek Görsel
                  </h3>
                  <div onClick={() => editMainInputRef.current?.click()} className="h-32 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-[#1F2937] flex items-center justify-center cursor-pointer transition-all hover:border-amber-400 overflow-hidden dark:bg-[#0B0F1A]">
                    {editMainImage ? <img src={editMainImage} className="w-full h-full object-contain p-2" /> : <div className="text-center opacity-40"><Upload className="w-6 h-6 mx-auto mb-1" /><p className="text-[9px] font-black uppercase">Ana Görsel</p></div>}
                    <input type="file" ref={editMainInputRef} hidden accept="image/*" onChange={(e) => handleImageUpload(e.target.files?.[0], 'editMain')} />
                  </div>
                </section>
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                    <span className="bg-slate-100 dark:bg-[#1F2937] w-5 h-5 rounded flex items-center justify-center text-slate-500">2</span> Referans (Logo/Detay)
                  </h3>
                  <div onClick={() => editRefInputRef.current?.click()} className="h-32 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-[#1F2937] flex items-center justify-center cursor-pointer transition-all hover:border-amber-400 overflow-hidden dark:bg-[#0B0F1A]">
                    {editRefImage ? <img src={editRefImage} className="w-full h-full object-contain p-2" /> : <div className="text-center opacity-40"><Upload className="w-6 h-6 mx-auto mb-1" /><p className="text-[9px] font-black uppercase">Logo veya Detay</p></div>}
                    <input type="file" ref={editRefInputRef} hidden accept="image/*" onChange={(e) => handleImageUpload(e.target.files?.[0], 'editRef')} />
                  </div>
                </section>
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">3 Değişiklik İsteği</h3>
                  <textarea value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} placeholder="Neyi değiştirmek istersiniz? Örn: 'Arka planı plaj yap'." className="w-full h-32 p-5 rounded-[2rem] bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#1F2937] text-sm focus:ring-2 focus:ring-amber-400 outline-none transition-all dark:text-white" />
                </section>
                <button onClick={handleApplyEdit} disabled={editLoading || !editMainImage || !editPrompt} className="w-full py-5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-[2rem] font-black text-sm flex items-center justify-center gap-3 shadow-xl transition-all">
                  {editLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Edit3 className="w-5 h-5" />} DÜZENLEMEYİ UYGULA
                </button>
              </div>
            )}

            {activeTab === "description" && (
              <div className="space-y-6">
                <section className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">MARKA SEÇİMİ</label>
                  <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <button onClick={() => setBrand("shen")} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${brand === "shen" ? "bg-amber-500 text-white shadow-lg" : "text-slate-500"}`}>SHEN STÜDYO</button>
                    <button onClick={() => setBrand("ssa")} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${brand === "ssa" ? "bg-blue-600 text-white shadow-lg" : "text-slate-500"}`}>SSA</button>
                  </div>
                </section>
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ürün Bilgileri</h3>
                  <textarea value={productDetails} onChange={(e) => setProductDetails(e.target.value)} placeholder="Ürün özelliklerini buraya yazın..." className="w-full h-40 p-5 rounded-[2rem] bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#1F2937] text-sm focus:ring-2 focus:ring-amber-400 outline-none transition-all dark:text-white" />
                </section>
                <button onClick={handleGenerateDescription} disabled={isGeneratingDescription} className="w-full py-5 bg-amber-500 hover:bg-amber-600 text-white rounded-[2rem] font-black text-sm flex items-center justify-center gap-3 shadow-xl disabled:opacity-50 transition-all">
                  {isGeneratingDescription ? <RefreshCw className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />} SEO METNİ ÜRET
                </button>
              </div>
            )}

            {activeTab === "gallery" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 text-amber-500">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Görseller 14 gün saklanır</span>
                  </div>
                  {selectedHistoryItems.length > 0 && (
                    <button onClick={handleDeleteSelected} className="text-[9px] font-black text-red-500 uppercase tracking-widest">SİL ({selectedHistoryItems.length})</button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {history.map(item => (
                    <div key={item.id} className={`group relative aspect-square rounded-[1.5rem] overflow-hidden border-2 transition-all ${selectedHistoryItems.includes(item.id) ? "border-amber-500 scale-[0.98]" : "border-transparent bg-slate-50 dark:bg-[#0B0F1A]"}`}>
                      <img src={item.image} className="w-full h-full object-cover cursor-pointer" onClick={() => toggleHistorySelection(item.id)} />
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => handleDeleteHistory(item.id)} className="p-2 bg-red-500/80 text-white rounded-lg"><Trash2 className="w-3 h-3" /></button>
                        <a href={item.image} download={`shen-${item.id}.jpg`} className="p-2 bg-amber-500/80 text-white rounded-lg"><Download className="w-3 h-3" /></a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* MAIN VIEWER */}
        <div className="flex-1 p-8 lg:overflow-y-auto">
          {activeTab === "generate" && (
            <div className="max-w-7xl mx-auto space-y-8">
              <div className="flex justify-between items-end bg-white dark:bg-[#111827] p-8 rounded-[2.5rem] border border-slate-200 dark:border-[#1F2937] shadow-xl">
                <div className="space-y-1">
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">STÜDYO ÇIKTILARI</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{aspectRatio.name} • {resolution.label}</p>
                </div>
                {generatedImages.some(img => img) && (
                   <button onClick={downloadAll} className="bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 px-6 py-3 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all hover:scale-105 shadow-lg">
                      <SaveAll className="w-4 h-4" /> TÜMÜNÜ İNDİR
                   </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {generatedImages.map((img, i) => (
                  <div key={i} className={`relative group rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-[#1F2937] bg-white dark:bg-[#111827] shadow-2xl transition-all hover:scale-[1.02] ${aspectRatio.class}`}>
                    {loadingStates[i] ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/90 dark:bg-[#0B0F1A]/90 backdrop-blur-md z-10">
                        <RefreshCw className="w-10 h-10 text-amber-400 animate-spin" />
                        <p className="mt-2 text-[10px] font-black text-amber-500 uppercase tracking-widest">Üretiliyor...</p>
                      </div>
                    ) : img ? (
                      <>
                        <img src={img} className="w-full h-full object-cover cursor-pointer" onClick={() => setFullScreenImage({ index: i, src: img })} />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3">
                           <a href={img} download={`shen-out-${i}.jpg`} className="bg-white p-4 rounded-full shadow-2xl scale-0 group-hover:scale-100 transition-all duration-300"><Download className="w-6 h-6 text-slate-900" /></a>
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center opacity-5"><ImageIcon className="w-24 h-24" /></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "edit" && (
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="bg-white dark:bg-[#111827] p-10 rounded-[3rem] border border-slate-200 dark:border-[#1F2937] shadow-2xl">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase mb-8">DÜZENLEME ÖNİZLEME</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Orijinal Görsel</p>
                    <div className="aspect-square bg-slate-50 dark:bg-[#0B0F1A] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden">
                      {editMainImage ? <img src={editMainImage} className="w-full h-full object-contain" /> : <ImageIcon className="w-16 h-16 text-slate-200" />}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Düzenlenmiş Sonuç</p>
                    <div className="aspect-square bg-slate-50 dark:bg-[#0B0F1A] rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center">
                      {resultImage ? <img src={resultImage} className="w-full h-full object-contain" /> : <div className="text-center opacity-10"><Sparkles className="w-20 h-20 mx-auto" /></div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(activeTab === "description" || activeTab === "gallery") && (
            <div className="max-w-3xl mx-auto h-full flex flex-col">
               {activeTab === "description" ? (
                  <div className="flex-1 bg-white dark:bg-[#111827] rounded-[3rem] border border-slate-200 dark:border-[#1F2937] shadow-2xl p-10 flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">SEO İÇERİK EDİTÖRÜ</h2>
                      {generatedDescription && (
                        <button onClick={handleCopyDescription} className="bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 px-6 py-3 rounded-2xl flex items-center gap-3 font-black text-xs uppercase transition-all hover:scale-105">
                          {isCopied ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />} {isCopied ? "Kopyalandı" : "Kopyala"}
                        </button>
                      )}
                    </div>
                    <textarea readOnly value={generatedDescription} placeholder="Üretilen metin burada görünecek..." className="flex-1 w-full bg-slate-50 dark:bg-[#0B0F1A] border-none rounded-3xl p-8 text-sm dark:text-slate-200 outline-none resize-none font-medium leading-relaxed" />
                  </div>
               ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-20">
                     <Grid className="w-32 h-32 mb-4" />
                     <p className="text-xl font-black uppercase tracking-widest">Görsel seçimi yapın</p>
                  </div>
               )}
            </div>
          )}
        </div>
      </main>

      {fullScreenImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-8 backdrop-blur-2xl">
          <button onClick={() => setFullScreenImage(null)} className="absolute top-8 right-8 text-white p-3 hover:bg-white/10 rounded-full transition-all"><X className="w-10 h-10" /></button>
          <img src={fullScreenImage.src} className="max-w-full max-h-full object-contain shadow-2xl rounded-2xl" />
        </div>
      )}

      <footer className="py-3 bg-white dark:bg-[#0B0F1A] border-t border-slate-100 dark:border-slate-900 text-[10px] text-center text-slate-400 font-black uppercase tracking-[0.4em] shrink-0">
        SHEN STÜDYO © 2026
      </footer>
    </div>
  );
}
