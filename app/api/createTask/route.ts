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
