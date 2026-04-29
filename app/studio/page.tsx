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
  ArrowRight,
  X,
  CheckCircle2,
  Copy,
  Maximize2,
  ChevronRight,
  Eye,
  Activity,
  Maximize
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
import Link from "next/link";

// --- SABİTLER ---
const ASPECT_RATIOS = [
  { name: "Portre 1080x1440", value: "3:4", class: "aspect-[3/4]" },
  { name: "Yatay 1920x1080", value: "16:9", class: "aspect-[16/9]" },
  { name: "Kare 1080x1080", value: "1:1", class: "aspect-square" },
  { name: "Dikey 1080x1920", value: "9:16", class: "aspect-[9/16]" },
];

const RESOLUTIONS = [
  { label: "1K", value: "1K", desc: "8 Kredi" },
  { label: "2K", value: "2K", desc: "12 Kredi" },
  { label: "4K", value: "4K", desc: "18 Kredi" },
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

// --- IMAGE COMPRESSION HELPER ---
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
    };
  });
};

const NavTab = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick} 
    className={`flex items-center gap-2 px-6 py-2 rounded-full transition-all font-black text-[10px] tracking-widest uppercase ${active ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20" : "text-slate-400 hover:text-white hover:bg-slate-800/50"}`}
  >
    {icon} {label}
  </button>
);

export default function StudioPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"generate" | "edit" | "description" | "gallery" | "video" | "gulser">("generate");

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [originalMimeType, setOriginalMimeType] = useState("image/png");
  const [simplePrompt, setSimplePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[2]); // Square default
  const [resolution, setResolution] = useState(RESOLUTIONS[0]);

  const [productDetails, setProductDetails] = useState("");
  const [brand, setBrand] = useState<"ssa" | "gulser">("ssa");
  const [credits, setCredits] = useState<number | null>(null);
  const [generatedDescription, setGeneratedDescription] = useState("");
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  const [editMainImage, setEditMainImage] = useState<string | null>(null);
  const [editRefImage, setEditRefImage] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);

  // --- GULSER STUDYO STATES ---
  const GULSER_REFS = [
    "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=500&q=80",
    "https://images.unsplash.com/photo-1584282855160-b6f120c156f3?auto=format&fit=crop&w=500&q=80",
    "https://images.unsplash.com/photo-1598402484557-0104764850fa?auto=format&fit=crop&w=500&q=80"
  ];
  const [selectedGulserRef, setSelectedGulserRef] = useState<number>(0);
  const [gulserFabricImage, setGulserFabricImage] = useState<string | null>(null);
  const [isGulserLoading, setIsGulserLoading] = useState(false);
  const [gulserResultImage, setGulserResultImage] = useState<string | null>(null);

  const [generatedImages, setGeneratedImages] = useState<(string | null)[]>(Array(4).fill(null));
  const [loadingStates, setLoadingStates] = useState<boolean[]>(Array(4).fill(false));
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<{ index: number; src: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editMainInputRef = useRef<HTMLInputElement>(null);
  const editRefInputRef = useRef<HTMLInputElement>(null);
  const gulserFabricInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
    fetchHistory();
    fetchCredits();
  }, []);

  const fetchCredits = async () => {
    try {
      const res = await fetch("/api/getCredits");
      const data = await res.json();
      if (data.code === 0 || data.code === 200) {
        setCredits(data.data?.credit ?? 0);
      }
    } catch {}
  };

  const fetchHistory = async () => {
    const data = await getHistoryDB();
    const now = Date.now();
    // Auto-delete logic
    const oldItems = data.filter(item => (now - item.id) > FOURTEEN_DAYS_MS);
    for (const item of oldItems) await deleteFromDB(item.id);
    const validItems = data.filter(item => (now - item.id) <= FOURTEEN_DAYS_MS);
    setHistory(validItems);
  };

  const handleImageUpload = async (file: File | undefined, target: 'main' | 'editMain' | 'editRef' | 'gulserFabric') => {
    if (!file) return;
    
    let base64;
    if (file.size > 2 * 1024 * 1024) {
      base64 = await compressImage(file);
    } else {
      base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    if (target === 'main') {
      setOriginalMimeType(file.type);
      setSelectedImage(base64);
    } else if (target === 'editMain') {
      setEditMainImage(base64);
    } else if (target === 'editRef') {
      setEditRefImage(base64);
    } else if (target === 'gulserFabric') {
      setGulserFabricImage(base64);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;
    setIsAnalyzing(true);
    try {
      const res = await enhanceImagePrompt(selectedImage.split(",")[1], originalMimeType, simplePrompt);
      if (res.prompt) setSimplePrompt(res.prompt);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateNext = async () => {
    if (!selectedImage) return;
    const nextIndex = generatedImages.findIndex((img) => img === null);
    if (nextIndex === -1) return;
    
    setLoadingStates((p) => { const n = [...p]; n[nextIndex] = true; return n; });
    try {
      const res = await generateProductImage(selectedImage.split(",")[1], simplePrompt, aspectRatio.value, resolution.value);
      if (res.imageUrl) {
        setGeneratedImages((p) => { const n = [...p]; n[nextIndex] = res.imageUrl!; return n; });
        await saveToDB({ id: Date.now(), image: res.imageUrl, prompt: simplePrompt, type: "generated" });
        fetchHistory();
        fetchCredits(); // Update balance
      }
    } finally {
      setLoadingStates((p) => { const n = [...p]; n[nextIndex] = false; return n; });
    }
  };

  const handleApplyEdit = async () => {
    if (!editMainImage || !editPrompt) return;
    setEditLoading(true);
    try {
      const res = await generateEditImage(editMainImage.split(",")[1], editRefImage?.split(",")[1] || null, editPrompt, aspectRatio.value, resolution.value);
      if (res.imageUrl) {
        setResultImage(res.imageUrl);
        await saveToDB({ id: Date.now(), image: res.imageUrl, prompt: editPrompt, type: "edit" });
        fetchHistory();
        fetchCredits(); // Update balance
      }
    } finally {
      setEditLoading(false);
    }
  };

  const handleEnhanceEditPrompt = async () => {
    if (!editMainImage || !editPrompt) return;
    setEditLoading(true);
    try {
      const res = await enhanceEditPrompt(editMainImage.split(",")[1], editRefImage?.split(",")[1] || null, editPrompt);
      if (res.prompt) setEditPrompt(res.prompt);
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

  const handleGulserGenerate = async () => {
    if (!gulserFabricImage) return;
    setIsGulserLoading(true);
    setGulserResultImage(null);
    try {
      const res = await fetch("/api/wiro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: [GULSER_REFS[selectedGulserRef], gulserFabricImage]
        })
      });
      const data = await res.json();
      
      if (data.code === 200 && data.data?.imageUrl) {
        // Wiro'dan gelen görseli CORS proxy üzerinden alıp gösteriyoruz
        const imgRes = await fetch(`/api/proxyImage?url=${encodeURIComponent(data.data.imageUrl)}`);
        const proxyData = await imgRes.json();
        if (proxyData.base64) {
          setGulserResultImage(proxyData.base64);
          await saveToDB({ id: Date.now(), image: proxyData.base64, prompt: "Gülser Kumaş Hareketi Aktarımı", type: "gulser" });
          fetchHistory();
          fetchCredits();
        }
      } else {
        alert("Wiro API Hatası: " + (data.msg || "Bilinmeyen hata"));
      }
    } catch (e: any) {
      alert("Bir hata oluştu: " + e.message);
    } finally {
      setIsGulserLoading(false);
    }
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

  if (!isMounted) return null;

  return (
    <div className={`min-h-screen bg-[#060910] text-slate-100 flex flex-col font-sans selection:bg-amber-500/30`}>
      {/* HEADER WITH INTEGRATED NAVBAR */}
      <header className="px-6 py-4 bg-[#0B0F1A] border-b border-slate-800/60 flex flex-col gap-6 sticky top-0 z-50 backdrop-blur-xl bg-opacity-80">
        <div className="flex justify-between items-center max-w-7xl mx-auto w-full">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="bg-amber-500 p-2.5 rounded-2xl shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-all"><Sparkles className="w-6 h-6 text-slate-950" /></div>
            <h1 className="text-xl font-black tracking-tighter uppercase">SHEN STÜDYO</h1>
          </Link>
          <div className="flex items-center gap-4">
            {credits !== null && (
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-full">
                <Activity className="w-3 h-3 text-amber-500" />
                <span className="text-[10px] font-black tracking-widest text-slate-300 uppercase">Kredi: {credits}</span>
              </div>
            )}
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 max-w-7xl mx-auto w-full overflow-x-auto no-scrollbar pb-1">
          <NavTab active={activeTab === "generate"} onClick={() => setActiveTab("generate")} icon={<Sparkles className="w-4 h-4" />} label="GÖRSEL OLUŞTURMA" />
          <NavTab active={activeTab === "edit"} onClick={() => setActiveTab("edit")} icon={<Edit3 className="w-4 h-4" />} label="GÖRSEL DÜZENLEME" />
          <NavTab active={activeTab === "description"} onClick={() => setActiveTab("description")} icon={<FileText className="w-4 h-4" />} label="AÇIKLAMA ÜRET" />
          <NavTab active={activeTab === "gulser"} onClick={() => setActiveTab("gulser")} icon={<Sun className="w-4 h-4" />} label="GÜLSER STÜDYO" />
          <NavTab active={activeTab === "gallery"} onClick={() => setActiveTab("gallery")} icon={<Grid className="w-4 h-4" />} label="GALERİ" />
          <NavTab active={activeTab === "video"} onClick={() => alert("Yakında! Video oluşturma özelliği çok yakında Shen Stüdyo'da!")} icon={<Video className="w-4 h-4" />} label="VİDEO OLUŞTURMA" />
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 lg:p-10 flex flex-col gap-8">
        {/* CONTROL PANEL */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* LEFT: SETTINGS (4 cols) */}
          <div className="lg:col-span-4 space-y-8 animate-in fade-in slide-in-from-left duration-700">
            {activeTab === "generate" && (
              <>
                <div className="bg-[#0B0F1A] border border-slate-800/50 rounded-[2.5rem] p-8 space-y-8 shadow-2xl">
                   <div className="space-y-4">
                      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4"><Upload className="w-3 h-3 text-amber-500" /> Ürün Yükle</h3>
                      <div onClick={() => fileInputRef.current?.click()} className={`group h-48 rounded-[2rem] border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden bg-[#060910] ${selectedImage ? "border-amber-500/50" : "border-slate-800 hover:border-amber-500/30"}`}>
                        {selectedImage ? <img src={selectedImage} className="h-full w-full object-contain p-4" /> : <div className="text-center opacity-30 group-hover:opacity-60 transition-all"><Upload className="w-10 h-10 mx-auto mb-3" /><p className="text-[9px] font-black uppercase">Görsel Seç</p></div>}
                        <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e) => handleImageUpload(e.target.files?.[0], 'main')} />
                      </div>
                      {selectedImage && (
                        <button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                          {isAnalyzing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3 text-amber-500" />} Ürünü Analiz Et
                        </button>
                      )}
                   </div>

                   <div className="space-y-4">
                      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Sparkles className="w-3 h-3 text-amber-500" /> Betimleme</h3>
                      <textarea value={simplePrompt} onChange={(e) => setSimplePrompt(e.target.value)} placeholder="Ürünü ve ortamı profesyonelce betimleyin..." className="w-full h-32 p-6 rounded-[2rem] bg-[#060910] border border-slate-800 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all outline-none text-sm font-medium leading-relaxed" />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><Maximize className="w-2.5 h-2.5" /> Çıktı Oranı</label>
                        <select value={aspectRatio.value} onChange={(e) => setAspectRatio(ASPECT_RATIOS.find(r => r.value === e.target.value) || ASPECT_RATIOS[2])} className="w-full bg-[#060910] border border-slate-800 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none">
                          {ASPECT_RATIOS.map(r => <option key={r.value} value={r.value}>{r.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><Monitor className="w-2.5 h-2.5" /> Çözünürlük</label>
                        <select value={resolution.value} onChange={(e) => setResolution(RESOLUTIONS.find(r => r.value === e.target.value) || RESOLUTIONS[0])} className="w-full bg-[#060910] border border-slate-800 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none">
                          {RESOLUTIONS.map(r => <option key={r.value} value={r.value}>{r.label} ({r.desc})</option>)}
                        </select>
                      </div>
                   </div>

                   <button onClick={handleGenerateNext} disabled={!selectedImage || loadingStates.some(s => s)} className="w-full py-5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-[2.5rem] font-black text-xs tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-amber-500/10 transition-all disabled:opacity-20 uppercase">
                      {loadingStates.some(s => s) ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} Varyasyon Üret
                   </button>
                </div>
              </>
            )}

            {activeTab === "edit" && (
              <div className="bg-[#0B0F1A] border border-slate-800/50 rounded-[2.5rem] p-8 space-y-8 shadow-2xl">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><ImageIcon className="w-3 h-3 text-amber-500" /> Görsel Seçimi</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div onClick={() => editMainInputRef.current?.click()} className="h-40 rounded-3xl border-2 border-dashed border-slate-800 hover:border-amber-500/30 bg-[#060910] flex items-center justify-center cursor-pointer transition-all overflow-hidden relative group">
                      {editMainImage ? <img src={editMainImage} className="w-full h-full object-contain p-2" /> : <div className="text-center opacity-30 group-hover:opacity-60"><Upload className="w-8 h-8 mx-auto mb-2" /><p className="text-[8px] font-black uppercase">Ana Görsel</p></div>}
                      <input type="file" ref={editMainInputRef} hidden accept="image/*" onChange={(e) => handleImageUpload(e.target.files?.[0], 'editMain')} />
                    </div>
                    <div onClick={() => editRefInputRef.current?.click()} className="h-40 rounded-3xl border-2 border-dashed border-slate-800 hover:border-amber-500/30 bg-[#060910] flex items-center justify-center cursor-pointer transition-all overflow-hidden relative group">
                      {editRefImage ? <img src={editRefImage} className="w-full h-full object-contain p-2" /> : <div className="text-center opacity-30 group-hover:opacity-60"><Upload className="w-8 h-8 mx-auto mb-2" /><p className="text-[8px] font-black uppercase">Logo/Detay</p></div>}
                      <input type="file" ref={editRefInputRef} hidden accept="image/*" onChange={(e) => handleImageUpload(e.target.files?.[0], 'editRef')} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Edit3 className="w-3 h-3 text-amber-500" /> Düzenleme İsteği</h3>
                  <textarea value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} placeholder="Neyi değiştirmek istersiniz? Örn: 'Arka planı plaj ve palmiye yap'." className="w-full h-32 p-6 rounded-[2rem] bg-[#060910] border border-slate-800 focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm font-medium" />
                  <button onClick={handleEnhanceEditPrompt} disabled={editLoading || !editMainImage || !editPrompt} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Promptu Geliştir
                  </button>
                </div>

                <button onClick={handleApplyEdit} disabled={editLoading || !editMainImage || !editPrompt} className="w-full py-5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-[2.5rem] font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 shadow-xl transition-all disabled:opacity-20">
                  {editLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Edit3 className="w-5 h-5" />} Düzenlemeyi Uygula
                </button>
              </div>
            )}

            {activeTab === "description" && (
              <div className="bg-[#0B0F1A] border border-slate-800/50 rounded-[2.5rem] p-8 space-y-8 shadow-2xl">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Marka Seçimi</h3>
                  <div className="flex bg-[#060910] p-1.5 rounded-2xl border border-slate-800">
                    <button onClick={() => setBrand("ssa")} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${brand === "ssa" ? "bg-amber-500 text-slate-950" : "text-slate-500"}`}>SSA</button>
                    <button onClick={() => setBrand("gulser")} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${brand === "gulser" ? "bg-rose-600 text-white" : "text-slate-500"}`}>Gülser Fabrics</button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ürün Özellikleri</h3>
                  <textarea value={productDetails} onChange={(e) => setProductDetails(e.target.value)} placeholder="Ürünün kumaşı, modeli, rengi vb. detayları yazın..." className="w-full h-48 p-6 rounded-[2rem] bg-[#060910] border border-slate-800 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium" />
                </div>

                <button onClick={handleGenerateDescription} disabled={isGeneratingDescription} className="w-full py-5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-[2.5rem] font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 transition-all">
                  {isGeneratingDescription ? <RefreshCw className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />} SEO Metni Üret
                </button>
              </div>
            )}

            {activeTab === "gulser" && (
              <div className="bg-[#0B0F1A] border border-slate-800/50 rounded-[2.5rem] p-8 space-y-8 shadow-2xl">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Sun className="w-3 h-3 text-amber-500" /> Referans Hareket Seçimi</h3>
                  <p className="text-xs text-slate-400">1. Görseldeki kumaş kıvrılma hareketini ve ışığı seçin.</p>
                  <div className="grid grid-cols-3 gap-3">
                    {GULSER_REFS.map((refImg, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setSelectedGulserRef(idx)} 
                        className={`aspect-square rounded-2xl overflow-hidden cursor-pointer border-2 transition-all ${selectedGulserRef === idx ? "border-amber-500 shadow-lg shadow-amber-500/20 scale-105" : "border-slate-800 hover:border-amber-500/50"}`}
                      >
                        <img src={refImg} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Upload className="w-3 h-3 text-amber-500" /> Kumaş Ekle (2. Görsel)</h3>
                  <p className="text-xs text-slate-400">Dokusunu ve desenini koruyacağınız kumaşı yükleyin.</p>
                  <div onClick={() => gulserFabricInputRef.current?.click()} className="h-40 rounded-3xl border-2 border-dashed border-slate-800 hover:border-amber-500/30 bg-[#060910] flex items-center justify-center cursor-pointer transition-all overflow-hidden relative group">
                    {gulserFabricImage ? <img src={gulserFabricImage} className="w-full h-full object-contain p-2" /> : <div className="text-center opacity-30 group-hover:opacity-60"><Upload className="w-8 h-8 mx-auto mb-2" /><p className="text-[8px] font-black uppercase">Kumaş Yükle</p></div>}
                    <input type="file" ref={gulserFabricInputRef} hidden accept="image/*" onChange={(e) => handleImageUpload(e.target.files?.[0], 'gulserFabric')} />
                  </div>
                </div>

                <button onClick={handleGulserGenerate} disabled={isGulserLoading || !gulserFabricImage} className="w-full py-5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-[2.5rem] font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 shadow-xl transition-all disabled:opacity-20">
                  {isGulserLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} Dokuyu ve Hareketi Birleştir
                </button>
              </div>
            )}
          </div>

          {/* RIGHT: RESULTS (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-8 animate-in fade-in slide-in-from-right duration-1000">
             {(activeTab === "generate" || activeTab === "edit" || activeTab === "gulser") && (
                <div className="flex-1 bg-[#0B0F1A]/30 border border-slate-800/40 rounded-[3rem] p-10 backdrop-blur-sm relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />
                   
                   <div className="flex justify-between items-center mb-10 relative z-10">
                      <div className="space-y-1">
                        <h2 className="text-2xl font-black tracking-tighter uppercase leading-none">Çıktı Önizleme</h2>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">{activeTab === "edit" ? "Düzenleme Modu" : activeTab === "gulser" ? "Gülser Stüdyo Aktarımı" : (aspectRatio.name + " • " + resolution.label)}</p>
                      </div>
                      {generatedImages.some(img => img) && activeTab === "generate" && (
                         <button onClick={downloadAll} className="bg-slate-800/80 hover:bg-slate-700 text-white px-6 py-3 rounded-2xl flex items-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all">
                            <SaveAll className="w-4 h-4 text-amber-500" /> Paket Olarak İndir
                         </button>
                      )}
                   </div>

                   {activeTab === "generate" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        {generatedImages.map((img, i) => (
                          <div key={i} className={`relative group rounded-[2rem] overflow-hidden border border-slate-800/50 bg-[#060910]/50 shadow-2xl transition-all hover:border-amber-500/30 ${aspectRatio.class}`}>
                            {loadingStates[i] ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B0F1A]/80 backdrop-blur-md z-11">
                                <RefreshCw className="w-10 h-10 text-amber-500 animate-spin" />
                                <p className="mt-4 text-[9px] font-black text-amber-500 uppercase tracking-[0.3em]">Sanata Dönüşüyor...</p>
                              </div>
                            ) : img ? (
                              <>
                                <img src={img} className="w-full h-full object-cover cursor-pointer" onClick={() => setFullScreenImage({ index: i, src: img })} />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-4">
                                   <a href={img} download={`shen-output-${i}.jpg`} className="bg-white/10 hover:bg-white/20 p-4 rounded-full backdrop-blur-md"><Download className="w-6 h-6 text-white" /></a>
                                   <button onClick={() => setFullScreenImage({ index: i, src: img })} className="bg-white/10 hover:bg-white/20 p-4 rounded-full backdrop-blur-md"><Maximize2 className="w-6 h-6 text-white" /></button>
                                </div>
                              </>
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03]"><Sparkles className="w-32 h-32" /></div>
                            )}
                          </div>
                        ))}
                      </div>
                   ) : activeTab === "edit" ? (
                      <div className="flex flex-col md:flex-row gap-8 h-full min-h-[400px]">
                        <div className="flex-1 space-y-3">
                           <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Orijinal</p>
                           <div className="aspect-square bg-[#060910] rounded-3xl border border-slate-800/50 overflow-hidden flex items-center justify-center p-4">
                              {editMainImage ? <img src={editMainImage} className="w-full h-full object-contain" /> : <ImageIcon className="w-12 h-12 text-slate-800" />}
                           </div>
                        </div>
                        <div className="flex-1 space-y-3">
                           <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Yeni Görünüm</p>
                           <div className="aspect-square bg-[#060910] rounded-3xl border-2 border-dashed border-slate-800 flex items-center justify-center overflow-hidden relative">
                              {editLoading && (
                                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                                   <RefreshCw className="w-10 h-10 text-amber-500 animate-spin" />
                                   <p className="mt-4 text-[8px] font-black uppercase tracking-widest">Düzenleniyor...</p>
                                </div>
                              )}
                              {resultImage ? <img src={resultImage} className="w-full h-full object-contain p-2" /> : <div className="text-center opacity-[0.02]"><Sparkles className="w-32 h-32" /></div>}
                           </div>
                        </div>
                      </div>
                   ) : (
                      <div className="flex flex-col md:flex-row gap-8 h-full min-h-[400px]">
                        <div className="flex-1 space-y-3">
                           <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Seçilen Referans</p>
                           <div className="aspect-square bg-[#060910] rounded-3xl border border-slate-800/50 overflow-hidden flex items-center justify-center p-4">
                              <img src={GULSER_REFS[selectedGulserRef]} className="w-full h-full object-contain" />
                           </div>
                        </div>
                        <div className="flex-1 space-y-3">
                           <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Sonuç</p>
                           <div className="aspect-square bg-[#060910] rounded-3xl border-2 border-dashed border-slate-800 flex items-center justify-center overflow-hidden relative group">
                              {isGulserLoading && (
                                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                                   <RefreshCw className="w-10 h-10 text-amber-500 animate-spin" />
                                   <p className="mt-4 text-[8px] font-black uppercase tracking-widest">Birleştiriliyor...</p>
                                </div>
                              )}
                              {gulserResultImage ? (
                                <>
                                  <img src={gulserResultImage} className="w-full h-full object-contain p-2" />
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-4 z-20">
                                    <button onClick={() => setFullScreenImage({ index: 0, src: gulserResultImage })} className="bg-white/10 hover:bg-white/20 p-4 rounded-full backdrop-blur-md"><Maximize2 className="w-6 h-6 text-white" /></button>
                                  </div>
                                </>
                              ) : <div className="text-center opacity-[0.02]"><Sparkles className="w-32 h-32" /></div>}
                           </div>
                        </div>
                      </div>
                   )}
                </div>
             )}

             {activeTab === "description" && (
                <div className="flex-1 bg-[#0B0F1A]/30 border border-slate-800/40 rounded-[3rem] p-10 flex flex-col gap-8 shadow-2xl">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-black uppercase tracking-tighter">SEO İçerik Paneli</h2>
                    {generatedDescription && (
                      <button onClick={handleCopyDescription} className="bg-amber-500 text-slate-950 px-8 py-3 rounded-full flex items-center gap-3 font-black text-[10px] uppercase transition-all hover:scale-105 shadow-lg">
                        {isCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {isCopied ? "Kopyalandı" : "Panoya Kopyala"}
                      </button>
                    )}
                  </div>
                  <div className="flex-1 bg-[#060910]/80 p-10 rounded-[2.5rem] border border-slate-800 shadow-inner overflow-hidden relative group">
                    <textarea readOnly value={generatedDescription} placeholder="Üretilen metin burada profesyonel bir düzende görünecek..." className="w-full h-full bg-transparent border-none outline-none resize-none text-slate-300 text-sm font-medium leading-loose" />
                    {!generatedDescription && <div className="absolute inset-0 flex flex-col items-center justify-center opacity-[0.03] pointer-events-none"><FileText className="w-48 h-48" /></div>}
                  </div>
                </div>
             )}

             {activeTab === "gallery" && (
                <div className="flex-1 space-y-8 h-full">
                  <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-[2rem] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-amber-500 p-2 rounded-xl"><AlertCircle className="w-5 h-5 text-slate-950" /></div>
                      <span className="text-xs font-black uppercase tracking-widest text-amber-500/80">Oluşturulan Görseller 14 gün sonra otomatik silinecektir.</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-20">
                    {history.map(item => (
                      <div key={item.id} className="group relative aspect-square rounded-[2rem] overflow-hidden border border-slate-800 bg-[#0B0F1A] hover:border-amber-500/40 transition-all shadow-xl">
                        <img src={item.image} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3">
                           <div className="flex gap-2">
                              <button onClick={() => setFullScreenImage({ index: 0, src: item.image })} className="p-3 bg-white text-slate-950 rounded-xl hover:scale-110 transition-all shadow-lg"><Eye className="w-5 h-5" /></button>
                              <a href={item.image} download={`shen-out-${item.id}.jpg`} className="p-3 bg-amber-500 text-slate-950 rounded-xl hover:scale-110 transition-all shadow-lg"><Download className="w-5 h-5" /></a>
                           </div>
                           <button onClick={() => handleDeleteHistory(item.id)} className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /> Sil</button>
                        </div>
                      </div>
                    ))}
                    {history.length === 0 && (
                       <div className="col-span-full h-64 flex flex-col items-center justify-center opacity-10 grayscale">
                          <Grid className="w-16 h-16 mb-4" />
                          <p className="text-sm font-black uppercase tracking-widest">Galeri Henüz Boş</p>
                       </div>
                    )}
                  </div>
                </div>
             )}
          </div>
        </div>
      </main>

      {/* FULLSCREEN PREVIEW */}
      {fullScreenImage && (
        <div className="fixed inset-0 z-[100] bg-black/98 flex items-center justify-center p-8 backdrop-blur-3xl animate-in fade-in duration-300">
          <button onClick={() => setFullScreenImage(null)} className="absolute top-10 right-10 text-white p-4 hover:bg-white/10 rounded-full transition-all border border-white/10"><X className="w-8 h-8" /></button>
          <img src={fullScreenImage.src} className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-3xl border border-white/5" />
          <div className="absolute bottom-10 flex gap-4">
             <a href={fullScreenImage.src} download="shen-full.jpg" className="px-10 py-5 bg-amber-500 text-slate-950 rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex items-center gap-3 hover:scale-105 transition-all"><Download className="w-5 h-5" /> Görseli İndir</a>
          </div>
        </div>
      )}

      <footer className="py-6 bg-[#060910] border-t border-slate-900/50 text-[10px] text-center text-slate-600 font-bold uppercase tracking-[0.5em] shrink-0 mt-auto">
        SHEN AJANS © 2026 • TÜM HAKLARI SAKLIDIR
      </footer>
    </div>
  );
}
