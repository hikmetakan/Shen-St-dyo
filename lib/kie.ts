export interface GenerationResult {
  imageUrl?: string;
  text?: string;
  prompt?: string;
  error?: string;
  solution?: string;
}

function handleError(error: any): GenerationResult {
  console.error("Kie API Error:", error);
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  if (lower.includes("401") || lower.includes("unauthorized") || lower.includes("api key")) {
    return {
      error: "API Anahtarı Hatası",
      solution: "Vercel/sunucu ayarlarından KIE_AI_API_KEY değişkenini kontrol edin.",
    };
  }
  if (lower.includes("429") || lower.includes("quota") || lower.includes("too many")) {
    return {
      error: "İstek limiti aşıldı (429).",
      solution: "Kota doldu. Lütfen biraz bekleyip tekrar deneyin.",
    };
  }
  if (lower.includes("fetch") || lower.includes("network") || lower.includes("econnrefused")) {
    return {
      error: "Ağ bağlantısı hatası.",
      solution: "İnternet bağlantınızı kontrol edin.",
    };
  }
  if (lower.includes("aborted") || lower.includes("abort")) {
    return { error: "İşlem durduruldu.", solution: "" };
  }
  return {
    error: `Beklenmedik bir hata oluştu: ${msg}`,
    solution: "Lütfen sayfayı yenileyip tekrar deneyin.",
  };
}

// -----------------------------------------------------------------------
// Prompt geliştirme: Kie AI'nın Gemini 3 Pro endpoint'i üzerinden
// -----------------------------------------------------------------------
export async function enhanceImagePrompt(
  base64Image: string,
  mimeType: string,
  simplePrompt: string,
  signal?: AbortSignal
): Promise<GenerationResult> {
  try {
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const body = {
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Görevin: Bir "Prompt Engineer" ve "Profesyonel Fotoğrafçı" gibi davran.
Görseldeki ürünü dikkatlice analiz et ve kullanıcının şu isteğini mükemmel bir görsel üretim komutuna dönüştür: "${simplePrompt}".

TALİMATLAR:
1. Ürünün materyalini, rengini, dokusunu, varsa marka logolarını detaylıca betimle.
2. Işıklandırmayı profesyonelce kurgula (örn: "dramatik sinematik ışık", "yumuşak stüdyo ışığı").
3. Kamera detayları ekle ("85mm lens, f/1.8, son derece keskin odak, 8k çözünürlük").
4. Ürünün çevreyle veya zeminle olan etkileşimini inandırıcı şekilde anlat.
5. Sadece TÜRKÇE yanıt ver. Açıklama veya giriş cümlesi kullanma, doğrudan promptu yaz.`,
            },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
      stream: false,
    };

    const response = await fetch("/api/kieChat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || data?.msg || `HTTP ${response.status}`);
    }

    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("Yanıt boş geldi.");

    return { prompt: text };
  } catch (error: any) {
    if (error?.name === "AbortError") return { error: "İşlem durduruldu.", solution: "" };
    return handleError(error);
  }
}

// -----------------------------------------------------------------------
// Görsel üretimi: nano-banana-2 (Kie Market API)
// -----------------------------------------------------------------------
export async function generateProductImage(
  preProcessedImageBase64: string,
  prompt: string,
  aspectRatio: string,
  resolution: string,
  signal?: AbortSignal
): Promise<GenerationResult> {
  try {
    const createResponse = await fetch("/api/createTask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "nano-banana-2",
        input: {
          prompt,
          image_input: [preProcessedImageBase64],
          aspect_ratio: aspectRatio,
          resolution,
        },
      }),
      signal,
    });

    const createData = await createResponse.json();

    if (createData.code !== 0 || !createData.data?.taskId) {
      const msg = createData.msg || "Task oluşturulamadı.";
      throw new Error(msg);
    }

    const taskId = createData.data.taskId;
    const maxAttempts = 90; // 3 dakika

    for (let i = 0; i < maxAttempts; i++) {
      if (signal?.aborted) throw new DOMException("Durduruldu", "AbortError");

      await new Promise((r) => setTimeout(r, 2000));

      const detailResponse = await fetch("/api/getTaskDetail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
        signal,
      });

      const detailData = await detailResponse.json();

      if (detailData.code !== 0) {
        throw new Error(detailData.msg || "Task detayı alınamadı.");
      }

      const status = detailData.data?.status;

      if (status === "success" && detailData.data?.results?.[0]?.url) {
        const imageUrl = detailData.data.results[0].url;
        // URL'den base64'e çevir
        const imgRes = await fetch(imageUrl);
        const blob = await imgRes.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(",")[1];
            resolve({ imageUrl: base64 });
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      if (status === "failed") {
        throw new Error(detailData.data?.error || "Görsel üretimi başarısız oldu.");
      }
    }

    throw new Error("İşlem zaman aşımına uğradı.");
  } catch (error: any) {
    if (error?.name === "AbortError") return { error: "Durduruldu.", solution: "" };
    return handleError(error);
  }
}

// -----------------------------------------------------------------------
// Ürün açıklaması: Kie AI'nın Gemini 3 Pro endpoint'i üzerinden
// -----------------------------------------------------------------------
export async function generateProductDescription(
  base64Image: string | null,
  mimeType: string,
  productDetails: string,
  signal?: AbortSignal
): Promise<GenerationResult> {
  try {
    const systemPrompt = `Görevin: SSA (Safety Solutions For All) markası için çalışan profesyonel bir metin yazarı olarak, ${
      base64Image ? "yüklenen ürün görselini analiz ederek ve " : ""
    }verilen detaylara dayanarak dikkat çekici bir ürün açıklaması yazmak.

ÜRÜN/MÜŞTERİ DETAYLARI: ${productDetails || "Belirtilmedi"}

MARKA DİLİ VE ÖRNEKLER:
Marka dili profesyonel, güven veren, teknik detayları kullanıcının konfor/koruma faydasıyla birleştiren bir dildir.

TALİMATLAR VE ÇIKTI FORMATI:
Her zaman EXACTLY (tam olarak) şu formatta Türkçe çıktı vermelisin:

**Spot Başlıklar**
1. [Spot Başlık 1]
2. [Spot Başlık 2]
3. [Spot Başlık 3]
4. [Spot Başlık 4]
5. [Spot Başlık 5]

**Alt Başlıklar**
1. [Alt Başlık 1 - Ürünü detaylıca tanıtan, faydasını anlatan uzun bir cümle]
2. [Alt Başlık 2]
3. [Alt Başlık 3]
4. [Alt Başlık 4]
5. [Alt Başlık 5]

**Instagram Açıklamaları**
1. [Instagram Açıklaması 1 - Emojili ve hashtagli]
2. [Instagram Açıklaması 2 - Emojili ve hashtagli]

Ekstra sohbet veya giriş/çıkış cümleleri kullanma, sadece istenen formatı ver.`;

    const userContent: any[] = [{ type: "text", text: systemPrompt }];

    if (base64Image) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${base64Image}` },
      });
    }

    const body = {
      messages: [{ role: "user", content: userContent }],
      stream: false,
    };

    const response = await fetch("/api/kieChat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || data?.msg || `HTTP ${response.status}`);
    }

    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("Yanıt boş geldi.");

    return { text };
  } catch (error: any) {
    if (error?.name === "AbortError") return { error: "İşlem durduruldu.", solution: "" };
    return handleError(error);
  }
}
