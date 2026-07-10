import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { frontImage, sideImage, heelImage } = req.body;

  if (!frontImage) {
    return res.status(400).json({ error: "frontImage is required" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
  }

  const gemini = createOpenAICompatible({
    name: "gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  const imageParts = [
    { type: "image" as const, image: frontImage, mediaType: "image/jpeg" as const },
    ...(sideImage ? [{ type: "image" as const, image: sideImage, mediaType: "image/jpeg" as const }] : []),
    ...(heelImage ? [{ type: "image" as const, image: heelImage, mediaType: "image/jpeg" as const }] : []),
  ];

  const prompt = `당신은 발 모양 분석 전문가입니다. 사용자의 발 사진(정면/옆면/뒤꿈치)을 보고 축구화 추천을 위한 분석을 합니다.

다음 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요:

{
  "footWidth": "좁음" | "보통" | "넓음",
  "archHeight": "낮음" | "보통" | "높음",
  "heelWidth": "좁음" | "보통" | "넓음",
  "summary": "한국어로 2~3문장, 친근한 말투로 발 특징과 어떤 축구화가 맞을지 요약"
}

판단 기준:
- footWidth: 정면 사진에서 발볼(가장 넓은 부분)이 발 길이 대비 약 38% 미만이면 좁음, 38~42% 보통, 42% 초과면 넓음
- archHeight: 옆면 사진에서 발바닥 아치(곡선) 정도 — 거의 평평하면 낮음, 자연스러우면 보통, 깊으면 높음
- heelWidth: 뒤꿈치 사진에서 뒤꿈치 너비

사진이 불충분하면 가장 보수적인 "보통"으로 판단하세요.`;

  try {
    const { text } = await generateText({
      model: gemini("gemini-2.0-flash"),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            ...imageParts,
          ],
        },
      ],
    });

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("JSON 응답을 찾지 못했어요");
    const parsed = JSON.parse(match[0]);

    return res.status(200).json({
      footWidth: parsed.footWidth ?? "보통",
      archHeight: parsed.archHeight ?? "보통",
      heelWidth: parsed.heelWidth ?? "보통",
      summary: parsed.summary ?? "발 사진을 분석했어요.",
    });
  } catch (err) {
    console.error("foot analysis error:", err);
    return res.status(200).json({
      footWidth: "보통",
      archHeight: "보통",
      heelWidth: "보통",
      summary: "사진 분석 중 일부 정보를 정확히 파악하지 못해 평균값으로 추정했어요. 설문 결과를 기반으로 추천드릴게요.",
    });
  }
}
