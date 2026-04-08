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
} from "lucide-react";
import JSZip from "jszip";
import {
  enhanceImagePrompt,
  generateProductImage,
  generateProductDescription,
} from "@/lib/kie";

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

const DB_NAME = "ShenStudioDBv1";
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

export default function App() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"image" | "description" | null>(
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setIsMounted(true);
    getHistoryDB().then(setHistory);
  }, []);

  if (!isMounted) return <div className="h-screen bg-slate-50 dark:bg-[#0B0F1A]" />;

  const handleImageUpload = (file: File | undefined) => {
    if (!file) return;
    setOriginalMimeType(file.type);
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
      setGeneratedImages(Array(4).fill(null));
      setErrorMessages(Array(4).fill(""));
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

  const generateVariation = async (index: number, signal: AbortSignal) => {
    setLoadingStates((p) => { const n = [...p]; n[index] = true; return n; });
    setErrorMessages((p) => { const n = [...p]; n[index] = ""; return n; });
    setErrorSolutions((p) => { const n = [...p]; n[index] = ""; return n; });

    try {
      if (!selectedImage) throw new Error("Görsel eksik.");
      const preProcessed = await prepareImageForOutpainting(selectedImage, aspectRatio.value);
      const base64Data = preProcessed.split(",")[1];

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

    const newHistory = { id: Date.now(), image: selectedImage, prompt: simplePrompt };
    saveToDB(newHistory);
    setHistory((prev) => [newHistory, ...prev].slice(0, 12));

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
    const ta = document.createElement("textarea");
    ta.value = generatedDescription;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {}
    document.body.removeChild(ta);
  };

  const getFileName = (index: number) => {
    const p = simplePrompt.toLowerCase();
    let name = "urun";
    if (p.includes("ayakkabı")) name = "ayakkabi";
    else if (p.includes("kazak")) name = "kazak";
    else if (p.includes("gözlük")) name = "gozluk";
    else if (p.includes("eldiven")) name = "eldiven";
    else if (p.includes("tişört") || p.includes("tshirt")) name = "tisort";
    else if (p.includes("pantolon")) name = "pantolon";
    else if (p.includes("çanta")) name = "canta";
    else {
      const fw = simplePrompt.split(" ")[0].replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]/g, "");
      if (fw) name = fw.toLowerCase();
    }
    return `${name}_varyasyon_${index + 1}.jpg`;
  };

  const handleSingleDownload = (base64: string, i: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const bytes = atob(base64);
    const arr = new Uint8Array(bytes.length);
    for (let j = 0; j < bytes.length; j++) arr[j] = bytes.charCodeAt(j);
    const blob = new Blob([arr], { type: "image/jpeg" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = getFileName(i);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
    <div
      className={`${
        isDarkMode ? "dark" : ""
      } min-h-screen bg-slate-50 dark:bg-[#0B0F1A] flex flex-col font-sans transition-colors duration-500`}
    >
      {/* HEADER */}
      <header className="px-6 py-4 bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-[#1F2937] flex justify-between items-center z-20 shadow-sm sticky top-0">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2.5 rounded-2xl shadow-lg shadow-amber-400/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-black dark:text-white tracking-tighter leading-none">
            SHEN STÜDYO
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="#"
            className="hidden sm:flex bg-slate-100 dark:bg-[#1F2937] px-4 py-2 rounded-xl text-xs font-bold dark:text-white items-center gap-2 hover:bg-[#EAB308] hover:text-white transition-all"
          >
            <Instagram className="w-4 h-4" /> @shenajans
          </a>
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2.5 bg-slate-100 dark:bg-[#1F2937] rounded-xl"
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-yellow-500" />
            ) : (
              <Moon className="w-5 h-5 text-[#EAB308]" />
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {activeTab === null ? (
          /* ANA EKRAN */
          <div className="flex-1 flex items-center justify-center p-4 lg:p-6">
            <div className="max-w-3xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => setActiveTab("image")}
                className="flex flex-col items-center justify-center gap-4 p-8 lg:p-12 bg-white dark:bg-[#111827] rounded-[2rem] border border-slate-200 dark:border-[#1F2937] hover:border-amber-400 dark:hover:border-amber-400 transition-all shadow-xl hover:shadow-amber-400/20 group"
              >
                <div className="bg-amber-50 dark:bg-amber-900/30 p-6 rounded-full group-hover:scale-110 transition-transform">
                  <Palette className="w-12 h-12 text-amber-500 dark:text-amber-300" />
                </div>
                <h2 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">
                  Görsel Oluşturma
                </h2>
                <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 text-center font-medium">
                  Ürün fotoğraflarınızı profesyonel stüdyo kalitesinde kampanya görsellerine dönüştürün.
                </p>
              </button>

              <button
                onClick={() => setActiveTab("description")}
                className="flex flex-col items-center justify-center gap-4 p-8 lg:p-12 bg-white dark:bg-[#111827] rounded-[2rem] border border-slate-200 dark:border-[#1F2937] hover:border-amber-400 dark:hover:border-amber-400 transition-all shadow-xl hover:shadow-amber-400/20 group"
              >
                <div className="bg-amber-50 dark:bg-amber-900/30 p-6 rounded-full group-hover:scale-110 transition-transform">
                  <FileText className="w-12 h-12 text-amber-500 dark:text-amber-300" />
                </div>
                <h2 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">
                  Açıklama Üret
                </h2>
                <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 text-center font-medium">
                  Ürünleriniz için SEO uyumlu, dikkat çekici başlıklar ve Instagram metinleri oluşturun.
                </p>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* SIDEBAR */}
            <aside className="w-full lg:w-[420px] bg-white dark:bg-[#111827] border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-[#1F2937] flex flex-col shrink-0 lg:h-full">
              {/* Tab menüsü */}
              <div className="flex p-4 border-b border-slate-100 dark:border-[#1F2937] shrink-0 gap-2">
                <button
                  onClick={() => setActiveTab(null)}
                  className="px-3 flex items-center justify-center text-slate-400 hover:text-amber-500 transition-colors bg-slate-50 dark:bg-[#1F2937]/50 rounded-xl"
                  title="Ana Ekrana Dön"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setActiveTab("image")}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all font-bold text-xs ${
                    activeTab === "image"
                      ? "bg-amber-50 dark:bg-amber-900/30 text-amber-500 dark:text-amber-300 shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <Palette className="w-5 h-5" />
                  Görsel Oluşturma
                </button>
                <button
                  onClick={() => setActiveTab("description")}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all font-bold text-xs ${
                    activeTab === "description"
                      ? "bg-amber-50 dark:bg-amber-900/30 text-amber-500 dark:text-amber-300 shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  Açıklama Üret
                </button>
              </div>

              <div className="flex-1 lg:overflow-y-auto p-4 lg:p-6 space-y-6 lg:space-y-8">
                {/* Görsel yükleme */}
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="bg-slate-100 dark:bg-[#1F2937] w-5 h-5 rounded flex items-center justify-center text-[10px]">
                      1
                    </span>{" "}
                    Ürün Yükle
                  </h3>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`group relative h-40 rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center ${
                      selectedImage
                        ? "border-amber-400 bg-amber-50/30"
                        : "border-slate-200 dark:border-[#1F2937] hover:border-amber-300"
                    }`}
                  >
                    {selectedImage ? (
                      <div className="relative h-full w-full p-4">
                        <img
                          src={selectedImage}
                          className="h-full w-full object-contain"
                          alt="Source"
                        />
                        <div className="absolute top-2 right-2 bg-amber-500 text-white p-1.5 rounded-full shadow-lg">
                          <Eye className="w-4 h-4" />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-4">
                        <Upload className="w-10 h-10 text-slate-300 mx-auto mb-2 group-hover:text-amber-400 transition-colors" />
                        <p className="text-xs font-bold text-slate-400 uppercase">
                          Referans Ürün Yükle
                        </p>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      hidden
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e.target.files?.[0])}
                    />
                  </div>
                </section>

                {/* GÖRSEL OLUŞTURMA TAB */}
                {activeTab === "image" && (
                  <>
                    <section className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <span className="bg-slate-100 dark:bg-[#1F2937] w-5 h-5 rounded flex items-center justify-center text-[10px]">
                            2
                          </span>{" "}
                          Kampanya Tasarımı
                        </h3>
                        <button
                          type="button"
                          onClick={convertToProfessionalPrompt}
                          disabled={isConvertingPrompt || !simplePrompt || !selectedImage}
                          className="text-[10px] font-black text-amber-500 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/40 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 transition-all disabled:opacity-30 flex items-center gap-2"
                        >
                          {isConvertingPrompt ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Zap className="w-3 h-3" />
                          )}
                          ÜRÜNÜ ANALİZ ET
                        </button>
                      </div>
                      <textarea
                        value={simplePrompt}
                        onChange={(e) => {
                          setSimplePrompt(e.target.value);
                          setPromptError(null);
                        }}
                        placeholder="Basitçe anlat: 'İşçinin elinde mavi iş eldiveni, arka planda kaynak kıvılcımları'..."
                        className={`w-full h-36 p-4 rounded-2xl bg-slate-50 dark:bg-[#0B0F1A] border ${
                          promptError
                            ? "border-red-400 dark:border-red-500"
                            : "border-slate-200 dark:border-[#1F2937]"
                        } text-sm focus:ring-2 focus:ring-amber-400 outline-none transition-all dark:text-white font-medium`}
                      />
                      {promptError && (
                        <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/30 flex items-start gap-3">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase leading-none mb-1">
                              {promptError.message}
                            </p>
                            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium leading-tight italic">
                              {promptError.solution}
                            </p>
                          </div>
                        </div>
                      )}
                    </section>

                    {/* Ayarlar */}
                    <section className="space-y-4 bg-slate-50 dark:bg-[#0B0F1A]/50 p-4 rounded-2xl border border-slate-100 dark:border-[#1F2937]">
                      {/* Aspect ratio */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Maximize2 className="w-3 h-3" /> Çıktı Oranı
                        </label>
                        <select
                          value={aspectRatio.value}
                          onChange={(e) =>
                            setAspectRatio(
                              ASPECT_RATIOS.find((a) => a.value === e.target.value) ||
                                ASPECT_RATIOS[0]
                            )
                          }
                          className="w-full p-3 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] rounded-xl text-xs font-bold dark:text-white outline-none cursor-pointer focus:border-amber-400 transition-colors shadow-sm"
                        >
                          {ASPECT_RATIOS.map((a) => (
                            <option key={a.value} value={a.value}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Çözünürlük */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Monitor className="w-3 h-3" /> Çözünürlük
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {RESOLUTIONS.map((r) => (
                            <button
                              key={r.value}
                              type="button"
                              onClick={() => setResolution(r)}
                              className={`py-2.5 rounded-xl text-xs font-black transition-all flex flex-col items-center gap-0.5 ${
                                resolution.value === r.value
                                  ? "bg-amber-500 text-white shadow-lg shadow-amber-400/30"
                                  : "bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1F2937] text-slate-600 dark:text-slate-300 hover:border-amber-300"
                              }`}
                            >
                              <span className="text-sm">{r.label}</span>
                              <span className="text-[9px] opacity-70 font-normal">
                                {r.desc}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </section>
                  </>
                )}

                {/* AÇIKLAMA TAB */}
                {activeTab === "description" && (
                  <section className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <span className="bg-slate-100 dark:bg-[#1F2937] w-5 h-5 rounded flex items-center justify-center text-[10px]">
                        2
                      </span>{" "}
                      Ürün Bilgileri
                    </h3>
                    <textarea
                      value={productDetails}
                      onChange={(e) => setProductDetails(e.target.value)}
                      placeholder="Ürünün adı, temel özellikleri, kimlere hitap ettiği gibi bilgileri buraya yazın..."
                      className="w-full h-48 p-4 rounded-2xl bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#1F2937] text-sm focus:ring-2 focus:ring-amber-400 outline-none transition-all dark:text-white font-medium"
                    />
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Not: Görsel yüklediyseniz yapay zeka ürünün görünümünü de metne dahil edecektir.
                    </p>
                  </section>
                )}
              </div>

              {/* Alt buton alanı */}
              <div className="p-4 lg:p-6 border-t border-slate-100 dark:border-[#1F2937] bg-white dark:bg-[#111827] shrink-0 space-y-3">
                {activeTab === "image" ? (
                  <>
                    <button
                      type="button"
                      onClick={handleGenerateNext}
                      disabled={
                        !selectedImage ||
                        loadingStates.some((s) => s) ||
                        !generatedImages.includes(null)
                      }
                      className="w-full py-4 bg-[#EAB308] hover:bg-[#ca8a04] text-white rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-3 shadow-lg shadow-[#FBBF24]/20 transition-all disabled:opacity-50 active:scale-95"
                    >
                      {loadingStates.some((s) => s) ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Sparkles className="w-5 h-5" />
                      )}
                      {generatedImages.includes(null)
                        ? generatedImages[0] === null
                          ? "İLK GÖRSELİ OLUŞTUR"
                          : "YENİ VARYASYON OLUŞTUR"
                        : "TÜM KARELER DOLU"}
                    </button>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={downloadAll}
                        disabled={!generatedImages.some((img) => img)}
                        className="flex-1 py-3 bg-white dark:bg-[#1F2937] border border-slate-200 dark:border-[#1F2937] rounded-2xl text-xs font-bold flex items-center justify-center gap-2 dark:text-white hover:bg-slate-50 transition-all shadow-sm disabled:opacity-40"
                      >
                        <SaveAll className="w-4 h-4 text-amber-400" /> TOPLU İNDİR
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedImage(null);
                          setGeneratedImages(Array(4).fill(null));
                          setSimplePrompt("");
                        }}
                        className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl hover:bg-red-100 transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleGenerateDescription}
                    disabled={isGeneratingDescription}
                    className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-3 shadow-lg shadow-amber-400/20 transition-all disabled:opacity-50 active:scale-95"
                  >
                    {isGeneratingDescription ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                    SEO UYUMLU AÇIKLAMA YAZ
                  </button>
                )}
              </div>
            </aside>

            {/* ANA ÇIKTI ALANI */}
            <div className="flex-1 p-4 lg:p-8 lg:overflow-y-auto">
              {activeTab === "image" ? (
                <div className="max-w-7xl mx-auto space-y-8">
                  <div className="flex justify-between items-end bg-white dark:bg-[#111827] p-6 rounded-3xl border border-slate-200 dark:border-[#1F2937] shadow-sm">
                    <div className="space-y-2">
                      <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">
                        STÜDYO ÇIKTILARI
                      </h2>
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest flex items-center gap-1.5 bg-slate-100 dark:bg-[#1F2937] px-2 py-1 rounded-md">
                          <Maximize2 className="w-3 h-3 text-slate-400" />{" "}
                          {aspectRatio.name}
                        </p>
                        <p className="text-amber-600 font-bold uppercase text-[10px] tracking-widest flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md">
                          <Monitor className="w-3 h-3" /> {resolution.label}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`grid ${
                      aspectRatio.value === "16:9"
                        ? "grid-cols-1 md:grid-cols-2"
                        : "grid-cols-2 lg:grid-cols-4"
                    } gap-6`}
                  >
                    {generatedImages.map((img, i) => (
                      <div
                        key={i}
                        className={`relative group rounded-[2rem] overflow-hidden border border-slate-200 dark:border-[#1F2937] bg-white dark:bg-[#111827] shadow-xl transition-all hover:translate-y-[-4px] ${aspectRatio.class}`}
                      >
                        {loadingStates[i] ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/95 dark:bg-[#0B0F1A]/95 backdrop-blur-md z-10 text-center px-4">
                            <div className="relative">
                              <Loader2 className="w-14 h-14 text-amber-400 animate-spin" />
                              <Sparkles className="w-6 h-6 text-amber-300 absolute -top-1 -right-1 animate-pulse" />
                            </div>
                            <p className="mt-4 text-[11px] font-black text-amber-500 dark:text-amber-300 tracking-widest uppercase">
                              Kare {i + 1} İşleniyor...
                            </p>
                            <span className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tighter italic">
                              {resolution.label} Kalitesinde Üretiliyor
                            </span>
                          </div>
                        ) : errorMessages[i] ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-red-50 dark:bg-red-950/20 overflow-y-auto">
                            <AlertCircle className="w-8 h-8 text-red-500 mb-3 shrink-0" />
                            <p className="text-[11px] font-black text-red-600 dark:text-red-400 uppercase leading-none mb-2">
                              {errorMessages[i]}
                            </p>
                            {errorSolutions[i] && (
                              <p className="text-[10px] font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic border-t border-red-100 dark:border-red-900/50 pt-2">
                                {errorSolutions[i]}
                              </p>
                            )}
                            <button
                              onClick={() =>
                                generateVariation(
                                  i,
                                  abortControllerRef.current?.signal ||
                                    new AbortController().signal
                                )
                              }
                              className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-xl text-[10px] font-black hover:bg-red-200 transition-colors"
                            >
                              TEKRAR DENE
                            </button>
                          </div>
                        ) : img ? (
                          <>
                            <img
                              src={`data:image/jpeg;base64,${img}`}
                              className="w-full h-full object-cover cursor-pointer"
                              alt="Result"
                              onClick={() =>
                                setFullScreenImage({
                                  index: i,
                                  src: `data:image/jpeg;base64,${img}`,
                                })
                              }
                            />
                            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-4 pointer-events-none">
                              <button
                                type="button"
                                onClick={(e) => handleSingleDownload(img, i, e)}
                                className="bg-white text-slate-900 p-4 rounded-full hover:scale-110 transition-transform shadow-2xl pointer-events-auto"
                              >
                                <Download className="w-6 h-6" />
                              </button>
                              <span className="text-white text-[10px] font-black tracking-widest uppercase">
                                GÖRSELİ KAYDET
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-100 dark:text-slate-800 border-4 border-dashed border-slate-50 dark:border-[#1F2937] m-4 rounded-[1.5rem]">
                            <ImageIcon className="w-16 h-16 opacity-10" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Arşiv */}
                  {history.length > 0 && (
                    <section className="pt-12 space-y-6">
                      <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <History className="w-4 h-4" /> ARŞİV
                      </h3>
                      <div className="flex gap-4 overflow-x-auto pb-6">
                        {history.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => {
                              setSelectedImage(item.image);
                              setSimplePrompt(item.prompt);
                            }}
                            className="flex-shrink-0 w-28 h-28 rounded-[1.5rem] border border-slate-200 dark:border-[#1F2937] overflow-hidden cursor-pointer hover:border-amber-400 transition-all shadow-sm opacity-60 hover:opacity-100"
                          >
                            <img
                              src={item.image}
                              className="w-full h-full object-cover"
                              alt="Past"
                            />
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              ) : (
                /* AÇIKLAMA ÇIKTISI */
                <div className="max-w-4xl mx-auto h-full flex flex-col">
                  <div className="flex-1 bg-white dark:bg-[#111827] rounded-[2rem] border border-slate-200 dark:border-[#1F2937] shadow-sm p-8 flex flex-col relative">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">
                        Ürün Açıklaması
                      </h2>
                      {generatedDescription && (
                        <button
                          onClick={handleCopyDescription}
                          className="bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 px-4 py-2 rounded-xl hover:bg-amber-100 transition-colors flex items-center gap-2 font-bold text-sm"
                        >
                          {isCopied ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                          {isCopied ? "Kopyalandı" : "Kopyala"}
                        </button>
                      )}
                    </div>

                    {isGeneratingDescription ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-amber-400 dark:text-amber-300">
                        <Loader2 className="w-12 h-12 animate-spin mb-4" />
                        <p className="font-bold tracking-widest uppercase text-xs">
                          Açıklama Üretiliyor...
                        </p>
                      </div>
                    ) : descriptionError ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-red-50/50 dark:bg-red-950/10 rounded-2xl border border-red-100 dark:border-red-900/30">
                        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                        <h3 className="text-lg font-black text-red-600 dark:text-red-400 uppercase tracking-tighter mb-2">
                          {descriptionError.message}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-6">
                          {descriptionError.solution}
                        </p>
                        <button
                          onClick={handleGenerateDescription}
                          className="px-8 py-3 bg-red-500 text-white rounded-2xl font-black text-sm hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                        >
                          TEKRAR DENE
                        </button>
                      </div>
                    ) : (
                      <textarea
                        className="flex-1 w-full bg-slate-50 dark:bg-[#0B0F1A] border border-slate-200 dark:border-[#1F2937] rounded-2xl p-6 text-sm md:text-base dark:text-slate-200 outline-none resize-none focus:border-amber-400 transition-colors leading-relaxed"
                        value={generatedDescription}
                        onChange={(e) => setGeneratedDescription(e.target.value)}
                        placeholder="Oluşturulan SEO uyumlu ürün metinleri burada görünecektir. İsterseniz buradan düzenleme yapıp kopyalayabilirsiniz."
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* FULL SCREEN MODAL */}
      {fullScreenImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 md:p-8 backdrop-blur-sm">
          <button
            onClick={() => setFullScreenImage(null)}
            className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="relative max-w-5xl w-full h-full flex items-center justify-center">
            <img
              src={fullScreenImage.src}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              alt="Full Screen"
            />
          </div>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
            <button
              onClick={(e) =>
                handleSingleDownload(
                  generatedImages[fullScreenImage.index]!,
                  fullScreenImage.index,
                  e
                )
              }
              className="bg-white text-slate-900 px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 hover:scale-105 transition-transform shadow-xl"
            >
              <Download className="w-5 h-5" /> İNDİR
            </button>
          </div>
        </div>
      )}

      <footer className="p-3 bg-white dark:bg-[#0B0F1A] border-t border-slate-200 dark:border-slate-900 text-[10px] text-center text-slate-400 font-bold uppercase tracking-[0.2em]">
        SHEN STÜDYO v2 · Powered by Kie AI
      </footer>
    </div>
  );
}

