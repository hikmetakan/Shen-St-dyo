import { NextResponse } from "next/server";
import axios from "axios";

export const dynamic = "force-dynamic";

const KIE_AI_API_KEY = process.env.KIE_AI_API_KEY;
const KIE_AI_BASE_URL = "https://api.kie.ai";

export async function POST(request: Request) {
  if (!KIE_AI_API_KEY) {
    return NextResponse.json(
      { code: 500, msg: "KIE_AI_API_KEY yapılandırılmamış." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    // resolution alanı gelmezse varsayılan 1K
    if (body.input && !body.input.resolution) {
      body.input.resolution = "1K";
    }

    // Kie AI (nano-banana-2) expects "File URL after upload, not file content".
    // We proxy Base64 into temporary URLs securely here.
    if (body.input && body.input.image_input && Array.isArray(body.input.image_input)) {
      for (let i = 0; i < body.input.image_input.length; i++) {
        let imgStr = body.input.image_input[i];
        if (imgStr && imgStr.startsWith("data:image/")) {
          try {
            const base64Data = imgStr.split(",")[1];
            const buffer = Buffer.from(base64Data, "base64");
            const mimeMatch = imgStr.match(/^data:(image\/\w+);base64,/);
            const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
            const fileExt = mimeType.split("/")[1] || "jpg";
            
            const blob = new Blob([buffer], { type: mimeType });
            let publicUrl = null;

            // Ilk deneme: tmpfiles.org
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
            } catch (err) {
              console.error("tmpfiles.org upload failed, trying fallback...", err);
            }

            // Ikinci deneme (Fallback): catbox.moe
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
              if (textOutput && textOutput.startsWith("http")) {
                publicUrl = textOutput;
              }
            }

            if (publicUrl) {
              body.input.image_input[i] = publicUrl;
              console.log("Buffered local base64 to remote URL:", publicUrl);
            } else {
              throw new Error("Tüm resim yükleme servisleri zaman aşımına uğradı.");
            }
          } catch (uploadError: any) {
            console.error("Temp image buffer upload failed, returning fallback error", uploadError.message);
            return NextResponse.json({ code: 500, msg: "Görsel yüklemesi başarısız oldu. Ağ çakışması veya Timeout." }, { status: 500 });
          }
        }
      }
    }

    const response = await axios.post(
      `${KIE_AI_BASE_URL}/api/v1/jobs/createTask`,
      body,
      {
        headers: {
          Authorization: `Bearer ${KIE_AI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error("createTask error:", error.response?.data || error.message);
    return NextResponse.json(
      error.response?.data || { code: 500, msg: "Sunucu hatası." },
      { status: error.response?.status || 500 }
    );
  }
}
