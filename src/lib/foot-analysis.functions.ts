export type FootAnalysis = {
  footWidth: "좁음" | "보통" | "넓음";
  archHeight: "낮음" | "보통" | "높음";
  heelWidth: "좁음" | "보통" | "넓음";
  summary: string;
};

export async function analyzeFoot(input: {
  frontImage: string;
  sideImage?: string | null;
  heelImage?: string | null;
}): Promise<FootAnalysis> {
  try {
    const res = await fetch("/api/analyze-foot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("analyzeFoot error:", err);
    return {
      footWidth: "보통",
      archHeight: "보통",
      heelWidth: "보통",
      summary: "사진 분석 중 일부 정보를 정확히 파악하지 못해 평균값으로 추정했어요. 설문 결과를 기반으로 추천드릴게요.",
    };
  }
}
