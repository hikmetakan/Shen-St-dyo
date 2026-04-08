import { NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const KIE_AI_API_KEY = process.env.KIE_AI_API_KEY;
const KIE_AI_BASE_URL = "https://api.kie.ai";

export async function POST(request: Request) {
  if (!KIE_AI_API_KEY) {
    return NextResponse.json({ code: 500, msg: "KIE_AI_API_KEY is not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const response = await axios.post(`${KIE_AI_BASE_URL}/api/v1/jobs/createTask`, body, {
      headers: {
        "Authorization": `Bearer ${KIE_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error("Error creating task:", error.response?.data || error.message);
    return NextResponse.json(error.response?.data || { code: 500, msg: "Internal Server Error" }, { status: error.response?.status || 500 });
  }
}
