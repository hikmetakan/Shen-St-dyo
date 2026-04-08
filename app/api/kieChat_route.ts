import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const KIE_AI_API_KEY = process.env.KIE_AI_API_KEY;
const KIE_CHAT_URL = "https://api.kie.ai/gemini-3-pro/v1/chat/completions";

export async function POST(request: Request) {
  if (!KIE_AI_API_KEY) {
    return NextResponse.json(
      { error: { message: "KIE_AI_API_KEY yapılandırılmamış." } },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    const response = await fetch(KIE_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KIE_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("kieChat proxy error:", error.message);
    return NextResponse.json(
      { error: { message: "Sunucu hatası: " + error.message } },
      { status: 500 }
    );
  }
}
