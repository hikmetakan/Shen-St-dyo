import { NextResponse } from "next/server";
import axios from "axios";

export const dynamic = "force-dynamic";

const WIRO_API_KEY = process.env.WIRO_API_KEY;
const WIRO_BASE_URL = "https://api.wiro.ai/v1";

export async function POST(request: Request) {
  if (!WIRO_API_KEY) {
    return NextResponse.json(
      { code: 500, msg: "WIRO_API_KEY yapılandırılmamış. Lütfen Vercel üzerinden ekleyin." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    // Proxy local base64 into remote URLs securely
    if (body.images && Array.isArray(body.images)) {
      for (let i = 0; i < body.images.length; i++) {
        let imgStr = body.images[i];
        const isDataUrl = imgStr && imgStr.startsWith("data:image/");
        const isPureBase64 = imgStr && !imgStr.includes(",") && imgStr.length > 100;

        if (isDataUrl || isPureBase64) {
          try {
            let base64Data = isDataUrl ? imgStr.split(",")[1] : imgStr;
            let mimeType = "image/jpeg";
            if (isDataUrl) {
              const mimeMatch = imgStr.match(/^data:(image\/\w+);base64,/);
              if (mimeMatch) mimeType = mimeMatch[1];
            }
            const buffer = Buffer.from(base64Data, "base64");
            const fileExt = mimeType.split("/")[1] || "jpg";
            const blob = new Blob([buffer], { type: mimeType });
            let publicUrl = null;

            try {
              const form = new FormData();
              form.append("file", blob, `upload.${fileExt}`);
              const uploadRes = await fetch("https://tmpfiles.org/api/v1/upload", {
                method: "POST",
                body: form,
                signal: AbortSignal.timeout(8000)
              });
              const data = await uploadRes.json();
              if (data?.data?.url) {
                publicUrl = data.data.url.replace("tmpfiles.org/", "tmpfiles.org/dl/").replace("http://", "https://");
              }
            } catch (err) {}

            if (!publicUrl) {
              const fallbackForm = new FormData();
              fallbackForm.append("reqtype", "fileupload");
              fallbackForm.append("fileToUpload", blob, `upload.${fileExt}`);
              const fallbackRes = await fetch("https://catbox.moe/user/api.php", {
                method: "POST",
                body: fallbackForm,
                signal: AbortSignal.timeout(10000)
              });
              const textOutput = await fallbackRes.text();
              if (textOutput && textOutput.startsWith("http")) publicUrl = textOutput;
            }

            if (publicUrl) {
              body.images[i] = publicUrl;
            } else {
              throw new Error("Resim yükleme servisi zaman aşımına uğradı.");
            }
          } catch (err) {
            return NextResponse.json({ code: 500, msg: "Görsel yüklemesi başarısız oldu." }, { status: 500 });
          }
        }
      }
    }

    // Prepare payload for Nano banana 2 on Wiro AI
    const payload = {
        inputImage: body.images,
        prompt: body.prompt || "Copy the fabric folding, movement, and lighting exactly from the first image and apply it to the fabric in the second image. Do not change the texture or color of the second fabric.",
        aspectRatio: "1:1",
        resolution: body.resolution || "1K"
    };

    const runRes = await axios.post(`${WIRO_BASE_URL}/Run/google/nano-banana-2`, payload, {
        headers: {
            "x-api-key": WIRO_API_KEY,
            "Content-Type": "application/json"
        }
    });

    if (!runRes.data.result) {
        let errMsg = "Wiro AI Görevi başlatılamadı.";
        if (runRes.data.errors && runRes.data.errors.length > 0) {
            const errObj = runRes.data.errors[0];
            errMsg = typeof errObj === 'string' ? errObj : JSON.stringify(errObj);
        }
        return NextResponse.json({ code: 500, msg: errMsg }, { status: 500 });
    }

    const taskId = runRes.data.taskid;

    // Wait for the task to finish by polling /Task/Detail
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const detailRes = await axios.post(`${WIRO_BASE_URL}/Task/Detail`, { taskid: taskId }, {
            headers: {
                "x-api-key": WIRO_API_KEY,
                "Content-Type": "application/json"
            }
        });

        const status = detailRes.data?.data?.status || detailRes.data?.data?.state;
        const tasklist = detailRes.data?.data?.tasklist;
        const isCompleted = status === "end" || status === "success" || (tasklist && tasklist.length > 0 && tasklist[0].pexit === "0");
        
        if (isCompleted) {
            let imageUrl = null;
            
            // Wiro API şeması bazen farklı olabiliyor, güvenli bir şekilde URL bulalım
            const findUrl = (obj: any): string | null => {
                if (typeof obj === 'string') {
                    if (obj.startsWith('http') && (obj.includes('wiro.ai') || obj.includes('.png') || obj.includes('.jpg') || obj.includes('.webp'))) {
                        return obj;
                    }
                } else if (Array.isArray(obj)) {
                    for (let item of obj) {
                        const res = findUrl(item);
                        if (res) return res;
                    }
                } else if (obj !== null && typeof obj === 'object') {
                    // check specific keys first to prioritize actual outputs
                    if (obj.url && typeof obj.url === 'string') return obj.url;
                    if (obj.value && typeof obj.value === 'string' && obj.value.startsWith('http')) return obj.value;
                    
                    for (let key of Object.keys(obj)) {
                        const res = findUrl(obj[key]);
                        if (res) return res;
                    }
                }
                return null;
            };

            const outputs = detailRes.data?.data?.outputs || detailRes.data?.data?.results || detailRes.data?.data?.tasklist;
            imageUrl = findUrl(outputs) || findUrl(detailRes.data?.data);

            if (detailRes.data?.data?.debugoutput && !imageUrl) {
                const match = detailRes.data.data.debugoutput.match(/https?:\/\/[^\s"'\]]+/);
                if (match) imageUrl = match[0];
            }

            if (imageUrl) {
                return NextResponse.json({ code: 200, data: { imageUrl } });
            }
        }
        if (status === "fail" || status === "error") {
            let detailErr = detailRes.data?.data?.error || "Wiro AI Görevi başarısız oldu.";
            detailErr = typeof detailErr === 'string' ? detailErr : JSON.stringify(detailErr);
            return NextResponse.json({ code: 500, msg: detailErr }, { status: 500 });
        }
    }

    return NextResponse.json({ code: 500, msg: "Wiro AI işlem zaman aşımına uğradı." }, { status: 500 });

  } catch (error: any) {
    console.error("Wiro AI Error:", error.response?.data || error.message);
    
    let errMsg = "Sunucu hatası.";
    if (error.response?.status === 401) {
        errMsg = "Wiro AI Yetkisiz erişim. API anahtarınız (WIRO_API_KEY) hatalı veya eksik.";
    } else if (error.response?.status === 403) {
        errMsg = "Wiro AI Erişim reddedildi. Bu modeli kullanma yetkiniz yok veya anahtar geçersiz.";
    } else if (error.response?.status === 429) {
        errMsg = "Wiro AI Rate limit aşıldı. Lütfen biraz bekleyip tekrar deneyin.";
    } else if (error.response?.data) {
        const responseData = error.response.data;
        if (responseData.errors && responseData.errors.length > 0) {
            errMsg = typeof responseData.errors[0] === 'string' ? responseData.errors[0] : JSON.stringify(responseData.errors[0]);
        } else if (responseData.message) {
            errMsg = responseData.message;
        } else {
            errMsg = typeof responseData === 'string' ? responseData : JSON.stringify(responseData);
        }
    } else if (error.message) {
        errMsg = error.message;
    }

    return NextResponse.json(
      { code: 500, msg: errMsg },
      { status: 500 }
    );
  }
}
