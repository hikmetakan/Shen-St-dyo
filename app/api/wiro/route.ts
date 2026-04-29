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
        image_input: body.images,
        prompt: body.prompt || "Copy the fabric folding, movement, and lighting exactly from the first image and apply it to the fabric in the second image. Do not change the texture or color of the second fabric.",
        aspect_ratio: "1:1",
        resolution: "1K"
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

        const status = detailRes.data?.data?.status;
        if (status === "end" || status === "success") {
            const outputs = detailRes.data.data.outputs;
            let imageUrl = null;
            if (outputs && outputs.length > 0) {
                imageUrl = outputs[0].url || outputs[0].value;
            } else if (detailRes.data.data.results && detailRes.data.data.results.length > 0) {
                imageUrl = detailRes.data.data.results[0].url;
            } else if (detailRes.data.data.debugoutput) {
                const debugStr = detailRes.data.data.debugoutput;
                const match = debugStr.match(/https?:\/\/[^\s"'\]]+/);
                if (match) imageUrl = match[0];
            }

            if (imageUrl) {
                // Return via proxyImage endpoint to bypass CORS if needed
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
    if (error.response?.data) {
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
