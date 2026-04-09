"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  ImageIcon,
  Download,
  Trash2,
  Loader2,
  SaveAll,
  Sparkles,
  AlertCircle,
  Instagram,
  Moon,
  Sun,
  Palette,
  History,
  Maximize2,
  Zap,
  Eye,
  FileText,
  Copy,
  ArrowLeft,
  X,
  CheckCircle2,
  Monitor,
  Clock,
  Coins,
  Edit3,
  Image as ImageIcon2
} from "lucide-react";
import JSZip from "jszip";
import {
  enhanceImagePrompt,
  generateProductImage,
  generateProductDescription,
  enhanceEditPrompt,
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
  { label: "1K", value: "1K", desc: "Hızlı" },
  { label: "2K", value: "2K", desc: "Dengeli" },
  { label: "4K", value: "4K", desc: "Yüksek" },
];

const DB_NAME = "ShenStudioDBv2";
const STORE_NAME = "history";

// --- Canvas blur-fill outpainting ---
const prepareImageForOutpainting = (
  base64Str: string,
  targetRatioStr: string
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const [rW, rH] = targetRatioStr.split(":").map(Number);
      const ratio = rW / rH;
      const MAX_DIM = 1024;
      let targetWidth: number, targetHeight: number;
      if (rW > rH) {
        targetWidth = MAX_DIM;
        targetHeight = Math.round(MAX_DIM / ratio);
      } else {
        targetHeight = MAX_DIM;
        targetWidth = Math.round(MAX_DIM * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d")!;

      const scaleCover = Math.max(
        targetWidth / img.width,
        targetHeight / img.height
      );
      const coverW = img.width * scaleCover;
      const coverH = img.height * scaleCover;
      ctx.filter = "blur(40px)";
      ctx.drawImage(
        img,
        (targetWidth - coverW) / 2,
        (targetHeight - coverH) / 2,
        coverW,
        coverH
      );
      ctx.filter = "none";
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      const padding = Math.min(targetWidth, targetHeight) * 0.1;
      const scaleContain = Math.min(
        (targetWidth - padding * 2) / img.width,
        (targetHeight - padding * 2) / img.height
      );
      const drawW = img.width * scaleContain;
      const drawH = img.height * scaleContain;
      ctx.drawImage(
        img,
        (targetWidth - drawW) / 2,
        (targetHeight - drawH) / 2,
        drawW,
        drawH
      );
      resolve(canvas.toDataURL("image/jpeg", 0.95));
    };
    img.src = base64Str;
  });
};

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
          req.result.sort((a: any, b: any) => b.id - a.id).slice(0, 12)
        );
    });
  } catch {
    return [];
  }
};

export default function StudioPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"image" | "description" | "edit" | null>(
    null
  );

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [originalMimeType, setOriginalMimeType] = useState("image/png");
  const [simplePrompt, setSimplePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[0]);
  const [resolution, setResolution] = useState(RESOLUTIONS[0]);

  // Description
  const [productDetails, setProductDetails] = useState("");
  const [generatedDescription, setGeneratedDescription] = useState("");
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [descriptionError, setDescriptionError] = useState<{
    message: string;
    solution: string;
  } | null>(null);

  // Edit Tab State
  const [editMainImage, setEditMainImage] = useState<string | null>(null);
  const [editRefImage, setEditRefImage] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [isConvertingEditPrompt, setIsConvertingEditPrompt] = useState(false);
  const [editPromptError, setEditPromptError] = useState<{ message: string; solution: string } | null>(null);

  // Image generation
  const [generatedImages, setGeneratedImages] = useState<(string | null)[]>(
    Array(4).fill(null)
  );
  const [loadingStates, setLoadingStates] = useState<boolean[]>(
    Array(4).fill(false)
  );
  const [errorMessages, setErrorMessages] = useState<string[]>(
    Array(4).fill("")
  );
  const [errorSolutions, setErrorSolutions] = useState<string[]>(
    Array(4).fill("")
  );
  const [promptError, setPromptError] = useState<{
    message: string;
    solution: string;
  } | null>(null);
  const [isConvertingPrompt, setIsConvertingPrompt] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [fullScreenImage, setFullScreenImage] = useState<{
    index: number;
    src: string;
  } | null>(null);

  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);
  const [generationTimes, setGenerationTimes] = useState<(number | null)[]>(Array(4).fill(null));

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editMainInputRef = useRef<HTMLInputElement>(null);
  const editRefInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchCredits = async () => {
    try {
      const res = await fetch("/api/getCredits");
      const data = await res.json();
      if (data.code === 200) setRemainingCredits(data.data);
    } catch {}
  };

  useEffect(() => {
    setIsMounted(true);
    getHistoryDB().then(setHistory);
    fetchCredits();

    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');

    const saved = localStorage.getItem("shen_last_session");
    if (saved) {
      try {
        const { images, prompt, selected, ratio, res } = JSON.parse(saved);
        setGeneratedImages(images);
        setSimplePrompt(prompt);
        setSelectedImage(selected);
        if (ratio) setAspectRatio(ratio);
        if (res) setResolution(res);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem("shen_last_session", JSON.stringify({
      images: generatedImages,
      prompt: simplePrompt,
      selected: selectedImage,
      ratio: aspectRatio,
      res: resolution
    }));
  }, [generatedImages, simplePrompt, selectedImage, aspectRatio, resolution, isMounted]);

  if (!isMounted) return <div className="h-screen bg-slate-50 dark:bg-[#0B0F1A]" />;

  const handleImageUpload = (file: File | undefined, target: 'main' | 'editMain' | 'editRef') => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      if (target === 'main') {
        setOriginalMimeType(file.type);
        setSelectedImage(res);
        setGeneratedImages(Array(4).fill(null));
        setErrorMessages(Array(4).fill(""));
      } else if (target === 'editMain') {
        setEditMainImage(res);
      } else if (target === 'editRef') {
        setEditRefImage(res);
      }
    };
    reader.readAsDataURL(file);
  };

  const convertToProfessionalPrompt = async () => {
    if (!simplePrompt.trim() || !selectedImage) return;
    setIsConvertingPrompt(true);
    setPromptError(null);
    try {
      const base64 = selectedImage.split(",")[1];
      const res = await enhanceImagePrompt(base64, originalMimeType, simplePrompt);
      if (res.prompt) setSimplePrompt(res.prompt);
      else if (res.error) setPromptError({ message: res.error, solution: res.solution || "" });
    } catch {
      setPromptError({ message: "Analiz hatası.", solution: "Lütfen tekrar deneyin." });
    } finally {
      setIsConvertingPrompt(false);
    }
  };

  const handleEnhanceEditPrompt = async () => {
    if (!editMainImage || !editPrompt.trim()) return;
    setIsConvertingEditPrompt(true);
    setEditPromptError(null);
    try {
      const mainB64 = editMainImage.split(",")[1];
      const refB64 = editRefImage ? editRefImage.split(",")[1] : null;
      const res = await enhanceEditPrompt(mainB64, refB64, editPrompt);
      if (res.prompt) setEditPrompt(res.prompt);
      else if (res.error) setEditPromptError({ message: res.error, solution: res.solution || "" });
    } catch {
      setEditPromptError({ message: "Analiz hatası.", solution: "Lütfen tekrar deneyin." });
    } finally {
      setIsConvertingEditPrompt(false);
    }
  };

  const generateVariation = async (index: number, signal: AbortSignal) => {
    setLoadingStates((p) => { const n = [...p]; n[index] = true; return n; });
    setErrorMessages((p) => { const n = [...p]; n[index] = ""; return n; });
    setErrorSolutions((p) => { const n = [...p]; n[index] = ""; return n; });

    const startTime = Date.now();
    try {
      if (!selectedImage) throw new Error("Görsel eksik.");
      const preProcessed = await prepareImageForOutpainting(selectedImage, aspectRatio.value);
      const base64Data = preProcessed;

      const res = await generateProductImage(
        base64Data,
        simplePrompt,
        aspectRatio.value,
        resolution.value,
        signal
      );

      if (res.error) {
        setErrorMessages((p) => { const n = [...p]; n[index] = res.error!; return n; });
        setErrorSolutions((p) => { const n = [...p]; n[index] = res.solution || ""; return n; });
        return;
      }
      if (res.imageUrl) {
        setGeneratedImages((p) => { const n = [...p]; n[index] = res.imageUrl!; return n; });
        const endTime = Date.now();
        const duration = Math.round((endTime - startTime) / 1000);
        setGenerationTimes((p) => { const n = [...p]; n[index] = duration; return n; });
        fetchCredits();
      }
    } catch (err: any) {
      setErrorMessages((p) => {
        const n = [...p];
        n[index] = err.name === "AbortError" ? "Durduruldu." : "Sistem hatası.";
        return n;
      });
      setErrorSolutions((p) => {
        const n = [...p];
        n[index] = err.name === "AbortError" ? "" : "Lütfen tekrar deneyin.";
        return n;
      });
    } finally {
      setLoadingStates((p) => { const n = [...p]; n[index] = false; return n; });
    }
  };

  const handleGenerateNext = async () => {
    if (!selectedImage) return;
    const nextIndex = generatedImages.findIndex((img) => img === null);
    if (nextIndex === -1) return;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    const newHistory = { 
      id: Date.now(), 
      image: selectedImage, 
      prompt: simplePrompt,
      generatedImages: [...generatedImages],
    };
    saveToDB(newHistory);
    setHistory((prev) => [newHistory, ...prev].slice(0, 50));

    await generateVariation(nextIndex, abortControllerRef.current.signal);
  };

  const handleGenerateDescription = async () => {
    setIsGeneratingDescription(true);
    setGeneratedDescription("");
    setDescriptionError(null);
    try {
      const base64 = selectedImage ? selectedImage.split(",")[1] : null;
      const res = await generateProductDescription(base64, originalMimeType, productDetails);
      if (res.error) setDescriptionError({ message: res.error, solution: res.solution || "" });
      else if (res.text) setGeneratedDescription(res.text);
    } catch {
      setDescriptionError({ message: "Beklenmedik bir hata.", solution: "Lütfen tekrar deneyin." });
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleCopyDescription = () => {
    navigator.clipboard.writeText(generatedDescription);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const getFileName = (index: number) => {
    return `shen_studyo_varyasyon_${index + 1}.jpg`;
  };

  const handleSingleDownload = (base64: string, i: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const link = document.createElement("a");
    link.href = `data:image/jpeg;base64,${base64}`;
    link.download = getFileName(i);
    link.click();
  };

  const downloadAll = async (e: React.MouseEvent) => {
    e.preventDefault();
    const zip = new JSZip();
    generatedImages.forEach((img, i) => {
      if (img) zip.file(getFileName(i), img, { base64: true });
    });
    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = "shen_studyo_paket.zip";
    link.click();
  };

  return (
    <div className={`${isDarkMode ? "dark" : ""} min-h-screen bg-slate-50 dark:bg-[#0B0F1A] flex flex-col font-sans transition-colors duration-500`}>
      {/* HEADER */}
      <header className="px-6 py-4 bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-[#1F2937] flex justify-between items-center z-20 shadow-sm sticky top-0">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2.5 rounded-2xl shadow-lg shadow-amber-400/20 cursor-pointer" onClick={() => setActiveTab(null)}>
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-black dark:text-white tracking-tighter leading-none cursor-pointer" onClick={() => setActiveTab(null)}>
            SHEN STÜDYO
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {remainingCredits !== null && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl">
              <Coins className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-black text-amber-600 dark:text-amber-300">
                {remainingCredits} KREDİ
              </span>
            </div>
          )}
          <div className="hidden sm:flex items-center gap-2">
            <UserButton afterSignOutUrl="/" />
          </div>
          <button type="button" onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 bg-slate-100 dark:bg-[#1F2937] rounded-xl">
            {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-[#EAB308]" />}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {activeTab === null ? (
          <div className="flex-1 flex items-center justify-center p-4 lg:p-6">
            <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-3 gap-6">
              <button onClick={() => setActiveTab("image")} className="flex flex-col items-center justify-center gap-4 p-8 bg-white dark:bg-[#111827] rounded-[2rem] border border-slate-200 dark:border-[#1F2937] hover:border-amber-400 transition-all shadow-xl group">
                <div className="bg-amber-50 dark:bg-amber-900/30 p-6 rounded-full group-hover:scale-110 transition-transform">
                  <Palette className="w-10 h-10 text-amber-500" />
                </div>
                <h2 className="text-xl font-black dark:text-white uppercase tracking-tighter">Görsel Oluşturma</h2>
                <p className="text-xs text-slate-500 text-center">Profesyonel kampanya görselleri.</p>
              </button>
              <button onClick={() => setActiveTab("edit")} className="flex flex-col items-center justify-center gap-4 p-8 bg-white dark:bg-[#111827] rounded-[2rem] border border-slate-200 dark:border-[#1F2937] hover:border-amber-400 transition-all shadow-xl group">
                <div className="bg-amber-50 dark:bg-amber-900/30 p-6 rounded-full group-hover:scale-110 transition-transform">
                  <Edit3 className="w-10 h-10 text-amber-500" />
                </div>
                <h2 className="text-xl font-black dark:text-white uppercase tracking-tighter">Görsel Düzenleme</h2>
                <p className="text-xs text-slate-500 text-center">Referansla ürün düzenle.</p>
              </button>
              <button onClick={() => setActiveTab("description")} className="flex flex-col items-center justify-center gap-4 p-8 bg-white dark:bg-[#111827] rounded-[2rem] border border-slate-200 dark:border-[#1F2937] hover:border-amber-400 transition-all shadow-xl group">
                <div className="bg-amber-50 dark:bg-amber-900/30 p-6 rounded-full group-hover:scale-110 transition-transform">
                  <FileText className="w-10 h-10 text-amber-500" />
                </div>
                <h2 className="text-xl font-black dark:text-white uppercase tracking-tighter">Açıklama Üret</h2>
                <p className="text-xs text-slate-500 text-center">SEO uyumlu metinler.</p>
              </button>
            </div>
          </div>
        ) : (
          <>
            <aside className="w-full lg:w-[420px] bg-white dark:bg-[#111827] border-b lg:border-r border-slate-200 dark:border-[#1F2937] flex flex-col shrink-0">
              <div className="flex p-4 border-b border-slate-100 dark:border-[#1F2937] shrink-0 gap-2">
                <button onClick={() => setActiveTab(null)} className="px-3 flex items-center justify-center text-slate-400 hover:text-amber-500 bg-slate-50 dark:bg-[#1F2937]/50 rounded-xl" title="Ana Ekrana Dön">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button onClick={() => setActiveTab("image")} className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all font-bold text-[10px] ${activeTab === "image" ? "bg-amber-50 dark:bg-amber-900/30 text-amber-500" : "text-slate-500"}`}>
                  <Palette className="w-4 h-4" /> Görsel
                </button>
                <button onClick={() => setActiveTab("edit")} className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all font-bold text-[10px] ${activeTab === "edit" ? "bg-amber-50 dark:bg-amber-900/30 text-amber-500" : "text-slate-500"}`}>
                  <Edit3 className="w-4 h-4" /> Düzenle
                </button>
                <button onClick={() => setActiveTab("description")} className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all font-bold text-[10px] ${activeTab === "description" ? "bg-amber-50 dark:bg-amber-900/30 text-amber-500" : "text-slate-500"}`}>
                  <FileText className="w-4 h-4" /> Açıklama
                </button>
              </div>

              <div className="flex-1 lg:overflow-y-auto p-4 lg:p-6 space-y-6">
                {activeTab === "image" && (
                  <>
                    <section className="space-y-4">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                        <span className="bg-slate-100 dark:bg-[#1F2937] w-5 h-5 rounded flex items-center justify-center">1</span> Ürün Yükle
                      </h3>
                      <div onClick={() => fileInputRef.current?.click()} className={`h-40 rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center ${selectedImage ? "border-amber-400 bg-amber-50/30" : "border-slate-200 dark:border-[#1F2937]"}`}>
                        {selectedImage ? <img src={selectedImage} className="h-full w-full object-contain p-4" alt="Source" /> : <div className="text-center"><Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" /><p className="text-[10px] font-bold text-slate-400">Görsel Seç</p></div>}
                        <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e) => handleImageUpload(e.target.files?.[0], 'main')} />
                      </div>
                    </section>
                    <section className="space-y-4">
                      <div className="flex justify-between items-center px-1">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <span className="bg-slate-100 dark:bg-[#1F2937] w-5 h-5 rounded flex items-center justify-center">2</span> Kampanya Tasarımı
                        </h3>
                        <button type="button" onClick={convertToProfessionalPrompt} disabled={isConvertingPrompt || !simplePrompt || !selectedImage} className="text-[9px] font-black text-amber-500 border border-amber-200 dark:border-amber-800 px-2 py-1 rounded-lg">
                          {isConvertingPrompt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                        </button>
                      </div>
                      <textarea value={simplePrompt} onChange={(e) => setSimplePrompt(e.target.value)} placeholder="Ürünü ve ortamı betimleyin..." className="w-full h-32 p-4 rounded-2xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#1F2937] text-sm focus:ring-2 focus:ring-amber-400 outline-none transition-all dark:text-white" />
                    </section>
                    <section className="space-y-3 bg-slate-50 dark:bg-[#0B0F1A]/50 p-4 rounded-2xl border border-slate-100 dark:border-[#1F2937]">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><Maximize2 className="w-3 h-3" /> Oran</label>
                        <select value={aspectRatio.value} onChange={(e) => setAspectRatio(ASPECT_RATIOS.find(a => a.value === e.target.value) || ASPECT_RATIOS[0])} className="w-full p-2 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-xl text-xs font-bold dark:text-white outline-none">
                          {ASPECT_RATIOS.map(a => <option key={a.value} value={a.value}>{a.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><Monitor className="w-3 h-3" /> Çözünürlük</label>
                        <div className="grid grid-cols-3 gap-2">
                          {RESOLUTIONS.map(r => (
                            <button key={r.value} onClick={() => setResolution(r)} className={`py-2 rounded-xl text-[10px] font-black transition-all ${resolution.value === r.value ? "bg-amber-500 text-white shadow-lg shadow-amber-400/30" : "bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] dark:text-slate-300"}`}>
                              {r.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </section>
                  </>
                )}

                {activeTab === "edit" && (
                  <div className="space-y-6">
                    <section className="space-y-4">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="bg-slate-100 dark:bg-[#1F2937] w-5 h-5 rounded flex items-center justify-center">1</span> Düzenlenecek Görsel
                      </h3>
                      <div onClick={() => editMainInputRef.current?.click()} className="h-32 rounded-3xl border-2 border-dashed border-slate-200 dark:border-[#1F2937] flex items-center justify-center cursor-pointer transition-all hover:border-amber-400 overflow-hidden">
                        {editMainImage ? <img src={editMainImage} className="w-full h-full object-contain p-2" /> : <div className="text-center"><Upload className="w-6 h-6 text-slate-300 mx-auto" /><p className="text-[9px] text-slate-400">Ana Görsel</p></div>}
                        <input type="file" ref={editMainInputRef} hidden accept="image/*" onChange={(e) => handleImageUpload(e.target.files?.[0], 'editMain')} />
                      </div>
                    </section>
                    <section className="space-y-4">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="bg-slate-100 dark:bg-[#1F2937] w-5 h-5 rounded flex items-center justify-center">2</span> Referans Görsel (Opsiyonel)
                      </h3>
                      <div onClick={() => editRefInputRef.current?.click()} className="h-32 rounded-3xl border-2 border-dashed border-slate-200 dark:border-[#1F2937] flex items-center justify-center cursor-pointer transition-all hover:border-amber-400 overflow-hidden">
                        {editRefImage ? <img src={editRefImage} className="w-full h-full object-contain p-2" /> : <div className="text-center"><Upload className="w-6 h-6 text-slate-300 mx-auto" /><p className="text-[9px] text-slate-400">Logo/Detay</p></div>}
                        <input type="file" ref={editRefInputRef} hidden accept="image/*" onChange={(e) => handleImageUpload(e.target.files?.[0], 'editRef')} />
                      </div>
                    </section>
                    <section className="space-y-4">
                      <div className="flex justify-between items-center px-1">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3 Değişiklik İsteği</h3>
                        <button type="button" onClick={handleEnhanceEditPrompt} disabled={isConvertingEditPrompt || !editPrompt || !editMainImage} className="text-[9px] font-black text-amber-500 border border-amber-200 dark:border-amber-800 px-2 py-1 rounded-lg flex items-center gap-1">
                          {isConvertingEditPrompt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                          PROMPTU GELİŞTİR
                        </button>
                      </div>
                      <textarea value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} placeholder="Neyi değiştirmek istersiniz? Örn: 'Arka planı plaj yap'." className="w-full h-24 p-4 rounded-2xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#1F2937] text-sm focus:ring-2 focus:ring-amber-400 outline-none transition-all dark:text-white" />
                    </section>
                  </div>
                )}

                {activeTab === "description" && (
                  <section className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <span className="bg-slate-100 dark:bg-[#1F2937] w-5 h-5 rounded flex items-center justify-center">2</span> Ürün Bilgileri
                    </h3>
                    <textarea value={productDetails} onChange={(e) => setProductDetails(e.target.value)} placeholder="Ürün özellikleri..." className="w-full h-48 p-4 rounded-2xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#1F2937] text-sm focus:ring-2 focus:ring-amber-400 outline-none dark:text-white" />
                  </section>
                )}
              </div>

              <div className="p-4 lg:p-6 border-t border-slate-100 dark:border-[#1F2937] bg-white dark:bg-[#111827] shrink-0 space-y-3">
                {activeTab === "image" ? (
                  <>
                    <button type="button" onClick={handleGenerateNext} disabled={!selectedImage || loadingStates.some(s => s) || !generatedImages.includes(null)} className="w-full py-4 bg-[#EAB308] hover:bg-[#ca8a04] text-white rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-3 shadow-lg disabled:opacity-50">
                      {loadingStates.some(s => s) ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                      {generatedImages.includes(null) ? "OLUŞTUR" : "KARELER DOLU"}
                    </button>
                    <div className="flex gap-3">
                      <button onClick={downloadAll} disabled={!generatedImages.some(img => img)} className="flex-1 py-3 bg-white dark:bg-[#1F2937] border border-slate-200 dark:border-[#1F2937] rounded-2xl text-xs font-bold flex items-center justify-center gap-2 dark:text-white disabled:opacity-40">
                        <SaveAll className="w-4 h-4 text-amber-400" /> İNDİR
                      </button>
                      <button onClick={() => { setSelectedImage(null); setGeneratedImages(Array(4).fill(null)); setSimplePrompt(""); }} className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </>
                ) : activeTab === "edit" ? (
                  <button type="button" className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-3 shadow-lg">
                    <Edit3 className="w-5 h-5" /> DÜZENLEMEYİ UYGULA
                  </button>
                ) : (
                  <button type="button" onClick={handleGenerateDescription} disabled={isGeneratingDescription} className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-3 shadow-lg disabled:opacity-50">
                    {isGeneratingDescription ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />} SEO METNİ ÜRET
                  </button>
                )}
              </div>
            </aside>

            <div className="flex-1 p-4 lg:p-8 lg:overflow-y-auto">
              {activeTab === "image" ? (
                <div className="max-w-7xl mx-auto space-y-8">
                  <div className="flex justify-between items-end bg-white dark:bg-[#111827] p-6 rounded-3xl border border-slate-200 dark:border-[#1F2937] shadow-sm">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">STÜDYO ÇIKTILARI</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{aspectRatio.name} • {resolution.label}</p>
                    </div>
                  </div>
                  <div className={`grid ${aspectRatio.value === "16:9" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-2 lg:grid-cols-4"} gap-6`}>
                    {generatedImages.map((img, i) => (
                      <div key={i} className={`relative group rounded-[2rem] overflow-hidden border border-slate-200 dark:border-[#1F2937] bg-white dark:bg-[#111827] shadow-xl ${aspectRatio.class}`}>
                        {loadingStates[i] ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/90 dark:bg-[#0B0F1A]/90 backdrop-blur-md z-10">
                            <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
                            <p className="mt-2 text-[10px] font-black text-amber-500 uppercase">Üretiliyor...</p>
                          </div>
                        ) : errorMessages[i] ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-red-50 dark:bg-red-950/20">
                            <AlertCircle className="w-6 h-6 text-red-500 mb-2" />
                            <p className="text-[10px] font-black text-red-600 uppercase">{errorMessages[i]}</p>
                            <button onClick={() => generateVariation(i, new AbortController().signal)} className="mt-3 text-[9px] font-black text-red-500 underline">TEKRAR</button>
                          </div>
                        ) : img ? (
                          <>
                            <img src={`data:image/jpeg;base64,${img}`} className="w-full h-full object-cover cursor-pointer" alt="Result" onClick={() => setFullScreenImage({ index: i, src: `data:image/jpeg;base64,${img}` })} />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-2 pointer-events-none">
                              <button onClick={(e) => handleSingleDownload(img, i, e)} className="bg-white p-3 rounded-full pointer-events-auto shadow-2xl"><Download className="w-5 h-5 text-slate-900" /></button>
                              {generationTimes[i] && <span className="text-white text-[9px] font-bold">{generationTimes[i]} SN</span>}
                            </div>
                          </>
                        ) : <div className="absolute inset-0 flex items-center justify-center opacity-5"><ImageIcon2 className="w-20 h-20" /></div>}
                      </div>
                    ))}
                  </div>
                  {history.length > 0 && (
                    <section className="pt-8 space-y-4">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><History className="w-4 h-4" /> ARŞİV</h3>
                      <div className="flex gap-4 overflow-x-auto pb-4">
                        {history.map((item) => (
                          <div key={item.id} className="group relative shrink-0">
                            <div onClick={() => { setSelectedImage(item.image); setSimplePrompt(item.prompt || ""); if (item.generatedImages) setGeneratedImages(item.generatedImages); }} className="w-24 h-24 rounded-2xl border border-slate-200 dark:border-[#1F2937] overflow-hidden cursor-pointer hover:border-amber-400 opacity-80 hover:opacity-100 transition-all shadow-sm">
                              <img src={item.image} className="w-full h-full object-cover" />
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); deleteFromDB(item.id); getHistoryDB().then(setHistory); }} className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              ) : activeTab === "edit" ? (
                <div className="max-w-4xl mx-auto space-y-8">
                  <div className="bg-white dark:bg-[#111827] p-8 rounded-[2rem] border border-slate-200 dark:border-[#1F2937] shadow-xl">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase mb-6">Görsel Düzenleme Önizleme</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ana Görsel</p>
                        <div className="aspect-square bg-slate-50 dark:bg-[#0B0F1A] rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden">
                          {editMainImage ? <img src={editMainImage} className="w-full h-full object-contain" /> : <ImageIcon2 className="w-12 h-12 text-slate-200" />}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Düzenlenmiş Sonuç</p>
                        <div className="aspect-square bg-slate-50 dark:bg-[#0B0F1A] rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-center border-dashed">
                          <div className="text-center opacity-20">
                            <Sparkles className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                            <p className="text-[10px] font-black uppercase">Sonuç Henüz Üretilmedi</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto h-full flex flex-col">
                  <div className="flex-1 bg-white dark:bg-[#111827] rounded-[2.5rem] border border-slate-200 dark:border-[#1F2937] shadow-xl p-8 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">İçerik Editörü</h2>
                      {generatedDescription && (
                        <button onClick={handleCopyDescription} className="bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-xs">
                          {isCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {isCopied ? "Kopyalandı" : "Kopyala"}
                        </button>
                      )}
                    </div>
                    {isGeneratingDescription ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-amber-500"><Loader2 className="w-10 h-10 animate-spin mb-3" /><p className="font-bold text-[10px] uppercase">Yazılıyor...</p></div>
                    ) : (
                      <textarea className="flex-1 w-full bg-slate-50 dark:bg-[#0B0F1A] border-none rounded-2xl p-6 text-sm dark:text-slate-200 outline-none resize-none focus:ring-1 focus:ring-amber-200" value={generatedDescription} onChange={(e) => setGeneratedDescription(e.target.value)} placeholder="Üretilen SEO metinleri burada görünecektir..." />
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {fullScreenImage && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-8 backdrop-blur-md">
          <button onClick={() => setFullScreenImage(null)} className="absolute top-8 right-8 text-white p-2 hover:bg-white/10 rounded-full transition-all"><X className="w-8 h-8" /></button>
          <img src={fullScreenImage.src} className="max-w-full max-h-full object-contain shadow-2xl" alt="Full" />
        </div>
      )}

      <footer className="py-2 bg-white dark:bg-[#0B0F1A] border-t border-slate-100 dark:border-slate-900 text-[9px] text-center text-slate-400 font-black uppercase tracking-[0.3em] shrink-0">
        SHEN STÜDYO v2
      </footer>
    </div>
  );
}
