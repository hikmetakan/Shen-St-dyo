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

    if ((createData.code !== 0 && createData.code !== 200) || !createData.data?.taskId) {
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

      if (detailData.code !== 0 && detailData.code !== 200) {
        throw new Error(detailData.msg || "Task detayı alınamadı.");
      }

      const status = detailData.data?.state || detailData.data?.status;

      if (status === "success") {
        let imageUrl = null;
        if (detailData.data?.resultJson) {
          try {
            const parsed = JSON.parse(detailData.data.resultJson);
            imageUrl = parsed.resultUrls?.[0] || parsed.results?.[0]?.url;
          } catch(e) {}
        } else if (detailData.data?.results?.[0]?.url) {
          imageUrl = detailData.data.results[0].url;
        }

        if (imageUrl) {
          // CORS by-pass: Vercel üzerinden görseli indir ve base64 al
          const imgRes = await fetch(`/api/proxyImage?url=${encodeURIComponent(imageUrl)}`);
          if (!imgRes.ok) throw new Error("Görsel proxy sunucusuna alınamadı.");
          const proxyData = await imgRes.json();
          if (proxyData.error) throw new Error(proxyData.error);
          return { imageUrl: proxyData.base64 };
        }
      }

      if (status === "fail" || status === "failed") {
        throw new Error(detailData.data?.failMsg || detailData.data?.error || "Görsel üretimi başarısız oldu.");
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
  brand: "shen" | "ssa" | "gulser" = "shen",
  signal?: AbortSignal
): Promise<GenerationResult> {
  try {
    const brandConfig = brand === "ssa" 
      ? {
          name: "SSA (Safety Solutions For All)",
          voice: "profesyonel, güven veren, teknik detayları kullanıcının konfor/koruma faydasıyla birleştiren bir dil",
        }
      : brand === "gulser"
      ? {
          name: "Gülser Fabrics",
          voice: "luxury fashion brand voice, confident, minimal, editorial. No casual language.",
        }
      : {
          name: "Shen Stüdyo",
          voice: "modern, yaratıcı, yapay zeka odaklı, estetik ve profesyonel fotoğrafçılık vurgulayan bir dil",
        };

    const isGulser = brand === "gulser";

    const systemPrompt = isGulser 
      ? `GÜLSER FABRICS – AI DESCRIPTION GENERATOR PROMPT
You are a senior textile marketing copywriter and luxury fashion brand strategist for Gülser Fabrics. 
Your job is to transform raw fabric technical specifications into high-end, emotionally engaging, B2B luxury textile product descriptions.
You do NOT simply describe fabrics. You position them as premium materials used by global fashion houses.

INPUT: Name, Color code, Weave type, Width, Weight (gsm), Composition.

OUTPUT REQUIREMENTS:
1. Start with a powerful, short headline (2–6 words) - Must feel like fashion editorial language. No repetition of product name.
2. Introduce the fabric name as a “hero product”.
3. Translate technical specs into luxury language.
4. Always include usage scenarios and design intention.
5. Tone: Luxury fashion brand voice, confident, minimal, editorial. No casual language. No bullet point specs.
6. Style rules: Avoid repeating adjectives. Must feel different every time.
7. End with a short positioning line.
8. Hashtags: Always include 4–6 relevant hashtags. Must include #GulserFabric + collection/season tag.

Müşteri Detayları: ${productDetails || "Belirtilmedi"}
Lütfen sadece bu markanın dilinde ve formatında, Türkçe yanıt ver.`
      : `Görevin: ${brandConfig.name} markası için çalışan profesyonel bir metin yazarı olarak, ${
      base64Image ? "yüklenen ürün görselini analiz ederek ve " : ""
    }verilen detaylara dayanarak dikkat çekici bir ürün açıklaması yazmak.
 
  ÜRÜN/MÜŞTERİ DETAYLARI: ${productDetails || "Belirtilmedi"}
  
  MARKA DİLİ VE ÖRNEKLER:
  Marka dili ${brandConfig.voice}. 
  
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

// -----------------------------------------------------------------------
// Görsel Düzenleme: Flux Image-to-Image (Kie Market API)
// -----------------------------------------------------------------------
export async function generateEditImage(
  mainImageBase64: string,
  refImageBase64: string | null,
  prompt: string,
  aspectRatio: string,
  resolution: string,
  signal?: AbortSignal
): Promise<GenerationResult> {
  try {
    const images = [mainImageBase64];
    if (refImageBase64) images.push(refImageBase64);

    const createResponse = await fetch("/api/createTask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "flux-i2i", // Flux Image-to-Image model
        input: {
          image_input: images,
          prompt: prompt,
          aspect_ratio: aspectRatio,
          resolution: resolution,
          strength: 0.75, // Flux I2I strength default
        },
      }),
      signal,
    });

    const createData = await createResponse.json();
    if ((createData.code !== 0 && createData.code !== 200) || !createData.data?.taskId) {
      throw new Error(createData.msg || "Düzenleme başlatılamadı.");
    }

    const taskId = createData.data.taskId;
    const maxAttempts = 60;

    for (let i = 0; i < maxAttempts; i++) {
      if (signal?.aborted) throw new DOMException("Durduruldu", "AbortError");
      await new Promise((r) => setTimeout(r, 3000));

      const detailResponse = await fetch("/api/getTaskDetail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
        signal,
      });

      const detailData = await detailResponse.json();
      const status = detailData.data?.state || detailData.data?.status;

      if (status === "success") {
        let imageUrl = null;
        if (detailData.data?.resultJson) {
          try {
            const parsed = JSON.parse(detailData.data.resultJson);
            imageUrl = parsed.resultUrls?.[0] || parsed.results?.[0]?.url;
          } catch(e) {}
        } else if (detailData.data?.results?.[0]?.url) {
          imageUrl = detailData.data.results[0].url;
        }

        if (imageUrl) {
          const imgRes = await fetch(`/api/proxyImage?url=${encodeURIComponent(imageUrl)}`);
          const proxyData = await imgRes.json();
          return { imageUrl: proxyData.base64 };
        }
      }

      if (status === "fail" || status === "failed") {
        throw new Error(detailData.data?.failMsg || "Düzenleme başarısız.");
      }
    }

    throw new Error("Zaman aşımı.");
  } catch (error: any) {
    return handleError(error);
  }
}

// -----------------------------------------------------------------------
// Görsel Düzenleme Promptu: Gemini Vision logic
// -----------------------------------------------------------------------
export async function enhanceEditPrompt(
  mainImageBase64: string,
  refImageBase64: string | null,
  userPrompt: string,
  signal?: AbortSignal
): Promise<GenerationResult> {
  try {
    const mainDataUrl = `data:image/jpeg;base64,${mainImageBase64}`;
    
    const content: any[] = [
      {
        type: "text",
        text: `Sen profesyonel bir yapay zeka görsel düzenleme uzmanısın. Kullanıcı sana düzenlenecek bir ana görsel, ${refImageBase64 ? "bir referans görsel" : ""} ve basit bir istek sundu. 
Görevin, kullanıcının isteğini anlayıp, Image-to-Image inpainting yapay zeka modellerinin anlayacağı, İngilizce, detayları koruyan, yüksek kaliteli ve çok net bir 'image editing prompt' oluşturmaktır.

Kullanıcının İsteği: "${userPrompt}"

TALİMATLAR:
1. Sadece İngilizce prompt üret.
2. Teknik terimler kullan (masterpiece, high resolution, seamless integration).
3. Ana görseldeki detayları koru.
4. Doğrudan promptu yaz, açıklama yapma.`,
      },
      {
        type: "image_url",
        image_url: { url: mainDataUrl },
      },
    ];

    if (refImageBase64) {
      content.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${refImageBase64}` },
      });
    }

    const response = await fetch("/api/kieChat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content }],
        stream: false,
      }),
      signal,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || data?.msg || `HTTP ${response.status}`);

    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("Yanıt boş geldi.");

    return { prompt: text };
  } catch (error: any) {
    if (error?.name === "AbortError") return { error: "İşlem durduruldu.", solution: "" };
    return handleError(error);
  }
}
