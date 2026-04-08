import { NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const KIE_AI_API_KEY = process.env.KIE_AI_API_KEY;
const KIE_AI_BASE_URL = "https://api.kie.ai";

export async function GET() {
  if (!KIE_AI_API_KEY) {
    return NextResponse.json({ error: "API Key is missing" }, { status: 500 });
  }

  try {
    const response = await axios.get(`${KIE_AI_BASE_URL}/api/v1/chat/credit`, {
      headers: {
        "Authorization": `Bearer ${KIE_AI_API_KEY}`,
      },
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error("Error fetching credits:", error.response?.data || error.message);
    return NextResponse.json(
      error.response?.data || { code: 500, msg: "Failed to fetch credits" },
      { status: error.response?.status || 500 }
    );
  }
}
