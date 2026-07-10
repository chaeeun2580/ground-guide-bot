import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";

function stripDataUrl(dataUrl: string): { base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    const type = match[1];
    const mediaType =
      type === "image/png" ? "image/png" :
      type === "image/webp" ? "image/webp" :
      "image/jpeg";
    return { base64: match[2], mediaType };
  }
  return { base64: dataUrl, mediaType: "image/jpeg" };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { frontImage, sideImage, heelImage } = req.body ?? {};
  if (!frontImage) return res.status(400).json({ error: "frontImage is required" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Missing GEMINI_API_KEY" });

  const gemini = createOpenAICompatible({
    name: "gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  const frontData  = stripDataUrl(frontImage);
  const sideData   = sideImage  ? stripDataUrl(sideImage)  : null;
  const heelData   = heelImage  ? stripDataUrl(heelImage)  : null;

  const imageParts: { type: "image"; image: string; mediaType: "image/jpeg" | "image/png" | "image/webp" }[] = [
    { type: "image", image: frontData.base64, mediaType: frontData.mediaType },
    ...(sideData ? [{ type: "image" as const, image: sideData.base64, mediaType: sideData.mediaType }] : []),
    ...(heelData ? [{ type: "image" as const, image: heelData.base64, mediaType: heelData.mediaType }] : []),
  ];

  const prompt = `당신은 축구화 피팅 전문가입니다. 제공된 발 사진을 보고 축구화 추천을 위한 발 형태 분석을 합니다.

사진 설명:
- 첫 번째 사진: 정면 (발볼 너비, 발가락 형태 확인용)
- 두 번째 사진(있을 경우): 측면 (아치 높이, 발등 높이 확인용)
- 세 번째 사진(있을 경우): 뒤꿈치 (뒤꿈치 너비, 발목 형태 확인용)

분석 기준:
1. footWidth (발볼 너비):
   - "넓음": 정면 사진에서 발볼이 발 전체 길이의 42% 이상, 또는 발가락이 많이 퍼져있거나 엄지/소지 발가락 외연이 넓게 보일 때
   - "좁음": 발볼이 38% 미만으로 좁거나 발가락이 촘촘하고 세장형일 때
   - "보통": 38~42% 범위, 판단이 애매할 때

2. archHeight (아치 높이):
   - 측면 사진 기준. 발바닥 안쪽이 크게 올라와있으면 "높음", 거의 바닥에 닿으면 "낮음", 중간이면 "보통"
   - 측면 사진이 없으면 정면에서 발 안쪽 형태로 추정

3. heelWidth (뒤꿈치 너비):
   - 뒤꿈치 사진 기준. 뒤꿈치 좌우 폭이 넓으면 "넓음", 좁으면 "좁음", 중간이면 "보통"
   - 사진이 없으면 전반적인 발 형태에서 추정

4. summary:
   - 2~3문장, 친근한 말투
   - 발의 특징을 구체적으로 언급 (예: "발볼이 넓은 편이라 일반 축구화는 발 앞부분이 압박될 수 있어요")
   - 어떤 축구화 핏이 맞을지 언급 (예: "와이드핏 또는 발볼 넓은 라스트 모델을 추천해요")

중요: 이미지가 흐리거나 각도가 좋지 않아도 최선을 다해 분석하세요. 확신이 없어도 "보통"으로 defaulting하기보다 관찰한 것을 바탕으로 판단하세요.

다음 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요:
{
  "footWidth": "넓음" 또는 "보통" 또는 "좁음",
  "archHeight": "낮음" 또는 "보통" 또는 "높음",
  "heelWidth": "좁음" 또는 "보통" 또는 "넓음",
  "summary": "한국어 2~3문장"
}`;

  const tryAnalyze = async (model: string) => {
    const { text } = await generateText({
      model: gemini(model),
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          ...imageParts,
        ],
      }],
      maxTokens: 400,
    });
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in response");
    return JSON.parse(match[0]);
  };

  try {
    let parsed: { footWidth: string; archHeight: string; heelWidth: string; summary: string } | null = null;

    // Try gemini-2.0-flash first, fallback to gemini-1.5-flash
    try {
      parsed = await tryAnalyze("gemini-2.0-flash");
    } catch {
      parsed = await tryAnalyze("gemini-1.5-flash");
    }

    if (!parsed) throw new Error("Parse failed");

    const valid = (v: string, options: string[]) => options.includes(v) ? v : options[1];

    return res.status(200).json({
      footWidth:  valid(parsed.footWidth,  ["넓음", "보통", "좁음"]),
      archHeight: valid(parsed.archHeight, ["낮음", "보통", "높음"]),
      heelWidth:  valid(parsed.heelWidth,  ["좁음", "보통", "넓음"]),
      summary: parsed.summary ?? "발 사진을 분석했어요.",
    });
  } catch (err) {
    console.error("foot analysis error:", err);
    return res.status(200).json({
      footWidth: "보통",
      archHeight: "보통",
      heelWidth: "보통",
      summary: "사진 분석 중 오류가 발생했어요. 설문 결과를 기반으로 추천드릴게요.",
    });
  }
}
