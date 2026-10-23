import { NextResponse, NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import z from "zod";
import { env } from "@/lib/env";

// Server-only — NEVER prefix these with NEXT_PUBLIC_, or they'd ship to the browser.
const requestSchema = z.object({
  periodLabel: z.string().min(1).max(50),
  startDate: z.string(),
  endDate: z.string(),
  currency: z.string(),
  locale: z.string(),
  totals: z.object({
    customers: z.number(),
    items: z.number(),
    discount: z.number(),
    revenue: z.number(),
  }),
  salesByCategory: z.array(
    z.object({
      category: z.string(),
      unitsSold: z.number(),
      discount: z.number(),
      revenue: z.number(),
      share: z.number(),
    }),
  ),
});
const AI_API_KEY = env.AI_API_KEY;
const AI_MODEL = env.AI_MODEL;

const SYSTEM_PROMPT = `You are a financial analyst assistant for a small retail business.
You will be given aggregated sales data (never raw customer or invoice records) as JSON.
The figures are on a cash basis: they count only invoices that were paid, in the period the money arrived.
Write a concise, plain-English summary (3-5 short paragraphs or bullet points) covering:
- How the period performed overall: revenue, how many customers paid, and the average spend per customer
- Which categories carry the period, and how concentrated revenue is in the top one or two
- Anything that stands out: a category with high units but low revenue, or an unusually large discount share
Only reference numbers that are actually present in the data, and never invent a month-by-month trend — the data is one period, not a series.
Be direct, skip filler and disclaimers.`;

/**
 * VERY BASIC in-memory rate limit — resets on server restart and does
 * NOT work correctly across multiple server instances/serverless cold
 * starts. Fine for a single-instance demo; swap for Redis/Upstash-backed
 * limiting before this handles real traffic.
 */

const requestLog = new Map<string, number[]>();

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;
function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(key) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  recent.push(now);
  requestLog.set(key, recent);
  return recent.length > MAX_REQUESTS_PER_WINDOW;
}

export async function POST(request: NextRequest) {
  // const clientKey =
  //   request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
  //   request.headers.get("x-real-ip") ??
  //   "unknown";

  // if (isRateLimited(clientKey)) {
  //   return NextResponse.json(
  //     { error: "Too many insight requests. Please try again in a minute." },
  //     { status: 429 },
  //   );
  // }

  if (!AI_API_KEY) {
    return NextResponse.json(
      {
        error: "AI_API_KEY is not configured!",
      },
      { status: 500 },
    );
  }

  const json = await request.json();
  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 },
    );
  }
  const getUserContext =
    parsed.data.locale === "en"
      ? "English"
      : "Khmer Language With Understandable Context";

  const userPrompt = `Analyze the reporting period "${parsed.data.periodLabel}". Here is the aggregated data:\n\n${JSON.stringify(parsed.data, null, 2)} in ${getUserContext}`;
  // console.log("user prompt:", userPrompt);

  try {
    const ai = new GoogleGenAI({
      apiKey: AI_API_KEY,
    });
    const streamResult = await ai.models.generateContentStream({
      model: AI_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.3,
      },
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamResult) {
            if (chunk.text) {
              controller.enqueue(encoder.encode(chunk.text));
            }
          }
          controller.close();
        } catch (err) {
          // Once the stream has started, we can no longer send a JSON
          // error response — the client just sees the stream end. Log
          // it server-side at minimum.
          console.error("Error while streaming from AI provider:", err);
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });

    // const insight = response.text?.trim();

    // if (!insight) {
    //   return NextResponse.json(
    //     { error: "The AI provider returned an empty response." },
    //     { status: 502 },
    //   );
    // }
    // return NextResponse.json({ insight });
  } catch (err) {
    console.error("Failed to reach AI provider:", err);
    return NextResponse.json(
      { error: "Failed to reach the AI provider." },
      { status: 502 },
    );
  }
}
