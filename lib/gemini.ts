import { GoogleGenAI } from "@google/genai";

let aiInstance: any = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("NEXT_PUBLIC_GEMINI_API_KEY is not set. Gemini API calls will fail.");
    }
    aiInstance = new GoogleGenAI({ apiKey: apiKey || "" });
  }
  return aiInstance;
}

export interface GenerationResult {
  imageUrl?: string;
  text?: string;
  error?: string;
  solution?: string;
  type?: 'rate-limit' | 'safety' | 'invalid-key' | 'network' | 'unknown' | 'empty';
  isRateLimit?: boolean;
}

function handleError(error: any): GenerationResult {
  console.error("Gemini API Error:", error);
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  let type: GenerationResult['type'] = 'unknown';
  let message = "Beklenmedik bir hata oluştu.";
  let solution = "Lütfen sayfayı yenileyip tekrar deneyin.";

  const lowerError = errorMessage.toLowerCase();

  if (lowerError.includes('429') || lowerError.includes('quota') || lowerError.includes('too many requests')) {
    type = 'rate-limit';
    message = "İşlem limiti aşıldı (429).";
    solution = "Ücretsiz kullanım kotasına ulaşıldı. Lütfen 1 dakika bekleyip tekrar deneyin.";
  } else if (lowerError.includes('safety') || lowerError.includes('blocked') || lowerError.includes('candidate') || lowerError.includes('finishreason')) {
    type = 'safety';
    message = "Güvenlik filtresi engeli.";
    solution = "Görsel veya metin içeriği güvenlik politikalarına takıldı. Lütfen daha uygun bir açıklama veya farklı bir görsel deneyin.";
  } else if (lowerError.includes('api key') || lowerError.includes('unauthorized') || lowerError.includes('invalid')) {
    type = 'invalid-key';
    message = "API anahtarı hatası.";
    solution = "API anahtarı geçersiz veya yetkisiz. Lütfen sistem ayarlarını kontrol edin.";
  } else if (lowerError.includes('fetch') || lowerError.includes('network') || lowerError.includes('failed to fetch')) {
    type = 'network';
    message = "Ağ bağlantısı hatası.";
    solution = "İnternet bağlantınızı kontrol edin. VPN kullanıyorsanız kapatmayı deneyebilirsiniz.";
  } else if (lowerError.includes('aborted') || lowerError.includes('iptal')) {
    type = 'network';
    message = "İşlem durduruldu.";
    solution = "İşlem kullanıcı veya sistem tarafından iptal edildi.";
  } else if (lowerError.includes('model') && lowerError.includes('overloaded')) {
    type = 'rate-limit';
    message = "Model şu an çok yoğun.";
    solution = "Yapay zeka sunucuları şu an yoğunluk yaşıyor. Birkaç saniye sonra tekrar deneyin.";
  }

  return { 
    error: message,
    solution,
    type,
    isRateLimit: type === 'rate-limit'
  };
}

export const fetchWithRetry = async <T>(apiCall: () => Promise<T>, signal?: AbortSignal): Promise<T> => {
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < 6; i++) {
    if (signal?.aborted) throw new DOMException("İptal edildi", "AbortError");
    try { 
      return await apiCall(); 
    } catch (error: any) {
      if (error.name === 'AbortError') throw error;
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Don't retry on safety or invalid key errors
      if (errorMessage.toLowerCase().includes('safety') || 
          errorMessage.toLowerCase().includes('api key') || 
          errorMessage.toLowerCase().includes('unauthorized')) {
        throw error;
      }

      if (i === 5) throw error;
      await new Promise(res => setTimeout(res, delays[i]));
    }
  }
  throw new Error("Maksimum deneme sayısına ulaşıldı.");
};

export async function enhanceImagePrompt(
  base64Image: string,
  mimeType: string,
  simplePrompt: string,
  signal?: AbortSignal
): Promise<{ prompt?: string; error?: string; solution?: string; type?: GenerationResult['type']; isRateLimit?: boolean }> {
  try {
    const apiCall = async () => {
      const promptText = `Görevin: Bir "Prompt Engineer" ve "Profesyonel Fotoğrafçı" gibi davran. 
Görseldeki ürünü dikkatlice analiz et ve kullanıcının şu isteğini mükemmel bir görsel üretim komutuna dönüştür: "${simplePrompt}".

TALİMATLAR:
1. Ürünün materyalini, rengini, dokusunu, varsa marka logolarını detaylıca betimle.
2. Işıklandırmayı profesyonelce kurgula (örn: "dramatik sinematik ışık", "yumuşak stüdyo ışığı").
3. Kamera detayları ekle ("85mm lens, f/1.8, son derece keskin odak, 8k çözünürlük").
4. Ürünün çevreyle veya zeminle olan etkileşimini inandırıcı şekilde anlat.
5. Sadece TÜRKÇE yanıt ver. Açıklama veya giriş cümlesi kullanma, doğrudan promptu yaz.`;

      const response = await getAI().models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { data: base64Image, mimeType } },
            { text: promptText }
          ]
        }
      });

      if (!response.text) {
        if (response.candidates?.[0]?.finishReason === 'SAFETY') {
          throw new Error("SAFETY: İçerik güvenlik nedeniyle engellendi.");
        }
        throw new Error("Metin üretilemedi.");
      }

      return response.text;
    };

    const text = await fetchWithRetry(apiCall, signal);
    return { prompt: text };
  } catch (error) {
    return handleError(error);
  }
}

export async function generateProductImage(
  preProcessedImageBase64: string,
  enhancedPrompt: string,
  aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
  signal?: AbortSignal
): Promise<GenerationResult> {
  try {
    const apiCall = async () => {
      const technicalPrompt = `
TASK: You are an elite retoucher. Your job is to seamlessly integrate the main object from the provided image into a new environment.
CRITICAL RULE: DO NOT CHANGE THE CENTRAL OBJECT. Preserve its shape, logos, text, texture, and colors exactly as they appear. 
Only replace the blurry or semi-transparent background areas.

INTEGRATION: Place this object realistically in the environment described, ensuring it fits naturally with the surroundings.

NEW SCENE DESCRIPTION: ${enhancedPrompt}

STYLE: Photorealistic, 8k, award-winning commercial photography, hyper-detailed, sharp focus.
VARIATION SEED: ${Math.floor(Math.random() * 10000)}
`;

      const response = await getAI().models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [
            { inlineData: { data: preProcessedImageBase64, mimeType: 'image/jpeg' } },
            { text: technicalPrompt }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any
          }
        }
      });

      const candidate = response.candidates?.[0];
      if (candidate?.finishReason === 'SAFETY') {
        throw new Error("SAFETY: Görsel üretimi güvenlik filtresine takıldı.");
      }

      for (const part of candidate?.content?.parts || []) {
        if (part.inlineData) {
          return part.inlineData.data;
        }
      }
      throw new Error("Görsel verisi alınamadı.");
    };

    const base64 = await fetchWithRetry(apiCall, signal);
    return { imageUrl: base64 }; 
  } catch (error) {
    return handleError(error);
  }
}

export async function generateProductDescription(
  base64Image: string | null,
  mimeType: string,
  productDetails: string,
  signal?: AbortSignal
): Promise<GenerationResult> {
  try {
    const apiCall = async () => {
      const parts: any[] = [
        { text: `Görevin: SSA (Safety Solutions For All) markası için çalışan profesyonel bir metin yazarı olarak, ${base64Image ? 'yüklenen ürün görselini analiz ederek ve ' : ''}verilen detaylara dayanarak dikkat çekici bir ürün açıklaması yazmak.
            
ÜRÜN/MÜŞTERİ DETAYLARI: ${productDetails || 'Belirtilmedi'}

MARKA DİLİ VE ÖRNEKLER:
Marka dili profesyonel, güven veren, teknik detayları (örn: SoftPad teknolojisi, 1.00 mm avuç kalınlığı) kullanıcının konfor/koruma faydasıyla birleştiren bir dildir.
Örnek Instagram metinleri:
- "6X1 gözlük, koruma gözlüğünün fonksiyonelliğini tam koruma avantajıyla birleştirir. SoftPad teknolojisine sahip ayarlanabilir saplar ve elastik bant sayesinde kişiselleştirilebilir, hızlı değiştirilebilir ve maksimum konfor sağlar. Dahili kauçuk tasarımı, damlalara, spreylere ve büyük toz parçacıklarına karşı güvenilir koruma sunar. #ssa #safetysolutionsforall #Univet"
- "MaxiCut® Ultra DT™ with AD-APT® 52-3445, kesilmeye karşı güçlü koruma sunarken ince ve esnek yapısıyla gün boyu konfor sağlar. Kuru çalışma ortamları için geliştirilen bu özel eldiven, AD-APT® teknolojisi sayesinde ellerin daha serin ve kuru kalmasına yardımcı olur. Daha ince. Daha konforlu. Daha dayanıklı. #ssa #safetysolutionsforall #atg"
- "Zorlu çalışma ortamlarında güvenlik ve konfor artık tek bir ayakkabıda buluşuyor. COMBO-X 110, profesyonellerin aradığı dayanıklılığı ve rahatlığı sağlar. PU/PU dış taban, güçlü zemin tutuşu sunarken, 1.8 mm süet mikrofiber saya dayanıklılığı ve hafifliği bir arada sunar. %50 daha hafif fiberglass burun ve ESD özelliği, maksimum güvenlik sağlarken, hava alabilir tekstil astar gün boyu nefes alabilir konfor sunar. #ssa #safetysolutionsforall #swolx"

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
2. [Alt Başlık 2 - Ürünü detaylıca tanıtan, faydasını anlatan uzun bir cümle]
3. [Alt Başlık 3 - Ürünü detaylıca tanıtan, faydasını anlatan uzun bir cümle]
4. [Alt Başlık 4 - Ürünü detaylıca tanıtan, faydasını anlatan uzun bir cümle]
5. [Alt Başlık 5 - Ürünü detaylıca tanıtan, faydasını anlatan uzun bir cümle]

**Instagram Açıklamaları**
1. [Instagram Açıklaması 1 - Emojili ve hashtagli]
2. [Instagram Açıklaması 2 - Emojili ve hashtagli]

Ekstra sohbet veya giriş/çıkış cümleleri kullanma, sadece istenen formatı ver.` }
      ];

      if (base64Image) {
        parts.unshift({ inlineData: { data: base64Image, mimeType } });
      }

      const response = await getAI().models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts }
      });

      if (!response.text) {
        if (response.candidates?.[0]?.finishReason === 'SAFETY') {
          throw new Error("SAFETY: Metin üretimi güvenlik filtresine takıldı.");
        }
        throw new Error("Açıklama üretilemedi.");
      }

      return response.text;
    };

    const text = await fetchWithRetry(apiCall, signal);
    return { text };
  } catch (error) {
    return handleError(error);
  }
}
