import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeFoot, type FootAnalysis } from "@/lib/foot-analysis.functions";
import { PRODUCTS, type Product } from "@/lib/products-data";
import guideFront from "@/assets/guide-front.png";
import guideSide from "@/assets/guide-side.png";
import guideHeel from "@/assets/guide-heel.png";
import guideMistakes from "@/assets/guide-mistakes.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "발 사진으로 축구화 찾기" },
      { name: "description", content: "AI 발 분석과 전문 설문으로 내 발에 딱 맞는 축구화를 추천해드려요." },
    ],
  }),
  component: App,
});

const GREEN = "#0F6E56";
const GREEN_LIGHT = "#E1F5EE";

type Profile = {
  place?: "school" | "turf" | "natural" | "mixed";
  shoeSizeMm?: number;
  shoeFitFeel?: "tight" | "loose" | "ok";
  instepHeight?: "low" | "normal" | "high";
  position?: "fw" | "mf" | "df" | "gk" | "any";
  playFeel?: "speed" | "control" | "allround";
  injury?: "none" | "ankle" | "metatarsal" | "knee";
  budget?: number;
};

function placeToGround(p?: string): string {
  if (p === "natural") return "FG";
  if (p === "school" || p === "turf") return "AG";
  return "AG";
}
function fitFeelToWidth(f?: string): "넓음" | "보통" | "좁음" {
  if (f === "tight") return "넓음";
  if (f === "loose") return "좁음";
  return "보통";
}

type FinalProfile = {
  groundType: string;
  fitWidth: "넓음" | "보통" | "좁음";
  playStyle: string;
  budgetMaxKrw: number;
};

function buildFinalProfile(p: Profile, ai: FootAnalysis | null): FinalProfile {
  const aiWidth = ai?.footWidth;
  const surveyWidth = fitFeelToWidth(p.shoeFitFeel);
  const fitWidth = aiWidth && aiWidth !== "보통" ? aiWidth : surveyWidth;
  const playStyle =
    p.playFeel === "speed" ? "스피드"
    : p.playFeel === "control" ? "터치_컨트롤"
    : "올라운드";
  return {
    groundType: placeToGround(p.place),
    fitWidth,
    playStyle,
    budgetMaxKrw: p.budget ?? 200000,
  };
}

type ResultItem = { label: string; product: Product | null; reason: string; overBudget: boolean };

function recommend(fp: FinalProfile, ai: FootAnalysis | null): ResultItem[] {
  const safe = PRODUCTS.filter(
    (p) => p.gender !== "주니어용" && p.groundTypes.includes(fp.groundType),
  );
  const budget = safe.filter((p) => p.priceKrw <= fp.budgetMaxKrw * 1.1);

  const fitTarget = fp.fitWidth;
  const fitPool = budget.filter((p) => p.fitWidth === fitTarget);
  const fit = (fitPool.length > 0 ? fitPool : budget.filter((p) => p.fitWidth !== (fitTarget === "넓음" ? "좁음" : "넓음")))
    .sort((a, b) => b.priceKrw - a.priceKrw)[0] ?? null;
  const fitReason = ai
    ? `AI가 발을 분석한 결과 발볼이 '${ai.footWidth}'으로 보여요. 이에 맞춰 발볼 ${fit?.fitWidth ?? "보통"} 모델을 골랐어요.`
    : `평소 신발 착화감을 기반으로 발볼 ${fit?.fitWidth ?? "보통"} 모델을 골랐어요.`;

  const styleMatch = budget.filter((p) => p.styleTag === fp.playStyle).sort((a, b) => a.priceKrw - b.priceKrw)[0];
  const styleFallback = safe.filter((p) => p.styleTag === fp.playStyle).sort((a, b) => a.priceKrw - b.priceKrw)[0];
  const style = styleMatch ?? styleFallback ?? null;
  const styleOver = !styleMatch && !!styleFallback;
  const styleReason = style
    ? `${fp.playStyle === "스피드" ? "빠른 플레이" : fp.playStyle === "터치_컨트롤" ? "볼 컨트롤" : "안정적인 올라운드"} 스타일에 맞췄어요.${styleOver ? " 다만 예산을 살짝 넘어요." : ""}`
    : "스타일 조건에 맞는 제품을 찾지 못했어요.";

  const balCandidates = budget.filter((p) => p.fitWidth !== (fitTarget === "넓음" ? "좁음" : fitTarget === "좁음" ? "넓음" : "좁음"));
  const bal = balCandidates.sort((a, b) => {
    const sa = a.styleTag === fp.playStyle ? 0 : 1;
    const sb = b.styleTag === fp.playStyle ? 0 : 1;
    if (sa !== sb) return sa - sb;
    return a.priceKrw - b.priceKrw;
  })[0] ?? null;
  const balReason = bal
    ? `발볼 편안함과 스타일을 모두 적당히 챙긴 균형형이에요.`
    : "절충안을 찾지 못했어요.";

  return [
    { label: "핏 우선", product: fit, reason: fitReason, overBudget: false },
    { label: "스타일 우선", product: style, reason: styleReason, overBudget: styleOver },
    { label: "절충안", product: bal, reason: balReason, overBudget: false },
  ];
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= current ? GREEN : "#E5E2D9" }} />
      ))}
    </div>
  );
}

type ChecklistItem = { ok: boolean; text: string };

function PhotoUploadStep({
  stepIndex, totalSteps, title, subtitle, exampleSrc, exampleCaption, checklist, onNext, onBack,
}: {
  stepIndex: number; totalSteps: number; title: string; subtitle: string;
  exampleSrc: string; exampleCaption: string;
  checklist: ChecklistItem[];
  onNext: (preview: string | null) => void; onBack?: () => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreview((ev.target?.result as string) ?? null);
    reader.readAsDataURL(file);
  }, []);

  return (
    <div>
      <ProgressBar current={stepIndex} total={totalSteps} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        {onBack && (
          <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", padding: 0 }}>←</button>
        )}
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h2>
      </div>

      {/* 예시 사진 */}
      <div style={{ background: GREEN_LIGHT, borderRadius: 12, padding: 12, marginBottom: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ width: 96, flexShrink: 0, borderRadius: 8, background: "#fff", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={exampleSrc} alt="예시" style={{ width: "100%", height: "auto", display: "block", objectFit: "contain" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: GREEN, margin: "0 0 4px 0", letterSpacing: 0.3 }}>📸 이렇게 찍어주세요</p>
          <p style={{ fontSize: 12, color: "#1A4A3D", margin: 0, lineHeight: 1.5 }}>{exampleCaption}</p>
        </div>
      </div>

      <div
        onClick={() => inputRef.current && inputRef.current.click()}
        style={{ borderRadius: 12, border: preview ? "1px solid #E5E2D9" : "1.5px dashed #C9C5B8", height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16, cursor: "pointer", overflow: "hidden", background: preview ? "transparent" : "#FAF9F5" }}
      >
        {preview ? (
          <img src={preview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <>
            <div style={{ fontSize: 32 }}>📷</div>
            <div style={{ fontSize: 13, color: "#6B6A65", textAlign: "center", padding: "0 16px" }}>{subtitle}</div>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />

      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px 0", display: "flex", flexDirection: "column", gap: 8 }}>
        {checklist.map((item, i) => (
          <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ width: 18, height: 18, borderRadius: 9, background: item.ok ? GREEN_LIGHT : "#FCE6E6", color: item.ok ? GREEN : "#B23636", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>
              {item.ok ? "✓" : "✕"}
            </span>
            <span style={{ fontSize: 13, color: "#3A3A36", lineHeight: 1.5 }}>{item.text}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => onNext(preview)}
        disabled={!preview}
        style={{ width: "100%", background: preview ? "#1A1A18" : "#D3D1C7", color: "#fff", border: "none", height: 46, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: preview ? "pointer" : "not-allowed" }}
      >
        {preview ? "다음으로" : "사진을 먼저 올려주세요"}
      </button>
    </div>
  );
}

type VisualOption = { value: string | number; emoji: string; label: string; hint?: string };

function VisualSurveyQuestion({
  title, question, helper, options, onAnswer, onBack, current, total,
}: {
  title: string; question: string; helper?: string; options: VisualOption[];
  onAnswer: (v: string | number) => void; onBack?: () => void;
  current: number; total: number;
}) {
  return (
    <div>
      <ProgressBar current={current} total={total} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        {onBack && (
          <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", padding: 0 }}>←</button>
        )}
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: GREEN }}>{title}</h2>
      </div>
      <p style={{ fontSize: 17, fontWeight: 700, color: "#1A1A18", margin: "0 0 6px 0", lineHeight: 1.45 }}>{question}</p>
      {helper && <p style={{ fontSize: 12, color: "#6B6A65", margin: "0 0 14px 0", lineHeight: 1.5 }}>{helper}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={() => onAnswer(opt.value)}
            style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", textAlign: "left", padding: "14px 12px", borderRadius: 12, border: "1.5px solid #E5E2D9", background: "#fff", cursor: "pointer", gap: 6, minHeight: 96 }}
          >
            <span style={{ fontSize: 26 }}>{opt.emoji}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A18", lineHeight: 1.35 }}>{opt.label}</span>
            {opt.hint && <span style={{ fontSize: 11, color: "#9B9A95" }}>{opt.hint}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function NumberSurveyQuestion({
  title, question, helper, placeholder, suffix, min, max, onAnswer, onBack, current, total,
}: {
  title: string; question: string; helper?: string; placeholder: string; suffix: string;
  min: number; max: number;
  onAnswer: (v: number) => void; onBack?: () => void;
  current: number; total: number;
}) {
  const [val, setVal] = useState<string>("");
  const num = Number(val);
  const valid = val !== "" && Number.isFinite(num) && num >= min && num <= max;
  return (
    <div>
      <ProgressBar current={current} total={total} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        {onBack && (
          <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", padding: 0 }}>←</button>
        )}
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: GREEN }}>{title}</h2>
      </div>
      <p style={{ fontSize: 17, fontWeight: 700, color: "#1A1A18", margin: "0 0 6px 0", lineHeight: 1.45 }}>{question}</p>
      {helper && <p style={{ fontSize: 12, color: "#6B6A65", margin: "0 0 18px 0", lineHeight: 1.5 }}>{helper}</p>}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, border: "1.5px solid #E5E2D9", borderRadius: 12, padding: "12px 16px" }}>
        <input
          type="number"
          inputMode="numeric"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={placeholder}
          style={{ flex: 1, border: "none", outline: "none", fontSize: 22, fontWeight: 700, color: "#1A1A18", background: "transparent", minWidth: 0 }}
        />
        <span style={{ fontSize: 15, fontWeight: 600, color: "#6B6A65" }}>{suffix}</span>
      </div>
      <button
        onClick={() => valid && onAnswer(num)}
        disabled={!valid}
        style={{ width: "100%", background: valid ? "#1A1A18" : "#D3D1C7", color: "#fff", border: "none", height: 46, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: valid ? "pointer" : "not-allowed" }}
      >
        다음
      </button>
    </div>
  );
}

function AnalyzingStep({ progress, message }: { progress: number; message: string }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: 48, height: 48, border: `3px solid ${GREEN_LIGHT}`, borderTopColor: GREEN, borderRadius: "50%", margin: "0 auto 20px", animation: "spin 0.9s linear infinite" }} />
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px 0" }}>{message}</h2>
      <p style={{ fontSize: 13, color: "#6B6A65", margin: 0 }}>AI가 발 사진을 분석하고 있어요 · {progress}%</p>
    </div>
  );
}

function FootAnalysisCard({ ai, profile }: { ai: FootAnalysis; profile: Profile }) {
  return (
    <div style={{ background: GREEN_LIGHT, borderRadius: 12, padding: 14, marginBottom: 16 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: GREEN, margin: "0 0 8px 0", letterSpacing: 0.3 }}>🦶 AI 발 분석 결과</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <Chip label={`발볼 ${ai.footWidth}`} />
        <Chip label={`아치 ${ai.archHeight}`} />
        <Chip label={`뒤꿈치 ${ai.heelWidth}`} />
        {profile.shoeSizeMm && <Chip label={`착화 ${profile.shoeSizeMm}mm`} />}
      </div>
      <p style={{ fontSize: 13, color: "#1A4A3D", margin: 0, lineHeight: 1.6 }}>{ai.summary}</p>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span style={{ background: "#fff", color: GREEN, fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 999 }}>
      {label}
    </span>
  );
}

function ResultCard({ result }: { result: ResultItem }) {
  const { label, product, reason, overBudget } = result;
  const badgeColor = label === "핏 우선"
    ? { bg: GREEN_LIGHT, text: GREEN }
    : overBudget
      ? { bg: "#FAEEDA", text: "#854F0B" }
      : { bg: "#F1EFE8", text: "#5F5E5A" };

  return (
    <div style={{ border: "1px solid #E5E2D9", borderRadius: 12, padding: 16, marginBottom: 12, background: "#fff" }}>
      <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 999, background: badgeColor.bg, color: badgeColor.text, fontSize: 12, fontWeight: 600, marginBottom: 10 }}>
        {label}{overBudget ? " · 예산 초과" : ""}
      </span>
      {product ? (
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#1A1A18", margin: "0 0 6px 0", lineHeight: 1.4 }}>{product.modelName}</p>
          <p style={{ fontSize: 12, color: "#6B6A65", margin: "0 0 6px 0" }}>발볼 {product.fitWidth} · {product.silo} · {product.upperMaterial}</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: GREEN, margin: "0 0 10px 0" }}>{product.priceKrw.toLocaleString()}원</p>
          <p style={{ fontSize: 13, color: "#3A3A36", margin: "0 0 10px 0", lineHeight: 1.6 }}>{reason}</p>

          <div style={{ background: "#FAF9F5", borderRadius: 8, padding: 10, marginBottom: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#6B6A65", margin: "0 0 4px 0", letterSpacing: 0.3 }}>💬 구매자 리뷰</p>
            <p style={{ fontSize: 12, color: "#3A3A36", margin: "0 0 6px 0", lineHeight: 1.55, fontStyle: "italic" }}>"{product.reviewSnippet}"</p>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {product.reviewKeywords.map((k, i) => (
                <span key={i} style={{ fontSize: 10, background: "#fff", color: "#6B6A65", padding: "2px 6px", borderRadius: 4, border: "1px solid #E5E2D9" }}>#{k}</span>
              ))}
            </div>
          </div>

          <a
            href={product.lowestPriceUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "block", width: "100%", boxSizing: "border-box", background: GREEN, color: "#fff", textAlign: "center", textDecoration: "none", padding: "12px 0", borderRadius: 8, fontSize: 13, fontWeight: 600 }}
          >
            {product.lowestPriceShop} 보러가기 →
          </a>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "#6B6A65", margin: 0, lineHeight: 1.6 }}>{reason}</p>
      )}
    </div>
  );
}

const FRONT_CHECKLIST: ChecklistItem[] = [
  { ok: true, text: "A4 용지 위에 맨발로 올라가서 위에서 수직으로" },
  { ok: true, text: "발가락~뒤꿈치까지 전체가 프레임 안에" },
  { ok: false, text: "양말·스타킹 착용, 비스듬한 각도는 분석 정확도가 떨어져요" },
];
const SIDE_CHECKLIST: ChecklistItem[] = [
  { ok: true, text: "발과 수평으로, 발등 높이와 아치 곡선이 보이게" },
  { ok: true, text: "발 옆모습 전체가 프레임 안에" },
];
const HEEL_CHECKLIST: ChecklistItem[] = [
  { ok: true, text: "뒤에서 수평으로, 뒤꿈치 중심이 정중앙에" },
  { ok: true, text: "발목·아킬레스건도 같이 보이게" },
];

type SurveyStep =
  | { kind: "visual"; key: keyof Profile; title: string; question: string; helper?: string; options: VisualOption[] }
  | { kind: "number"; key: keyof Profile; title: string; question: string; helper?: string; placeholder: string; suffix: string; min: number; max: number };

const SURVEY_STEPS: SurveyStep[] = [
  { kind: "visual", key: "place", title: "1. 경기 환경", question: "주로 어떤 구장에서 뛰시나요?", helper: "구장 표면에 따라 스터드 종류(AG/FG/MG)가 달라져요.", options: [
    { value: "school", emoji: "🏫", label: "학교 운동장", hint: "인조잔디 · AG" },
    { value: "turf", emoji: "⚽", label: "풋살장", hint: "인조잔디 · AG" },
    { value: "natural", emoji: "🌱", label: "천연 잔디", hint: "FG 전용" },
    { value: "mixed", emoji: "🔀", label: "여러 구장", hint: "MG/멀티" },
  ]},
  { kind: "number", key: "shoeSizeMm", title: "2. 실측 사이즈", question: "평소 운동화 사이즈를 알려주세요", helper: "mm 단위로 입력하세요. (예: 265, 270) 한국 표준 풋 라스트와 매칭에 사용돼요.", placeholder: "265", suffix: "mm", min: 200, max: 320 },
  { kind: "visual", key: "shoeFitFeel", title: "3. 발볼 자가진단", question: "평소 운동화 신을 때 발 앞쪽이 어떤가요?", helper: "축구화는 운동화보다 핏이 좁아 발볼 판단이 중요해요.", options: [
    { value: "tight", emoji: "😣", label: "꽉 끼고 답답", hint: "발볼 넓을 가능성" },
    { value: "ok", emoji: "😊", label: "딱 맞게 편함", hint: "표준 발볼" },
    { value: "loose", emoji: "🫥", label: "헐렁한 편", hint: "발볼 좁을 가능성" },
  ]},
  { kind: "visual", key: "instepHeight", title: "4. 발등 높이", question: "신발 끈을 매면 발등이 어떤가요?", helper: "발등 높이는 슈탕(혀)과 어퍼 텐션에 영향을 줘요.", options: [
    { value: "low", emoji: "📏", label: "끈을 꽉 조여야", hint: "발등 낮음" },
    { value: "normal", emoji: "👟", label: "평범하게 매도 됨", hint: "발등 보통" },
    { value: "high", emoji: "🏔️", label: "끈을 풀어줘야", hint: "발등 높음" },
  ]},
  { kind: "visual", key: "position", title: "5. 포지션", question: "주 포지션은 무엇인가요?", helper: "포지션에 따라 필요한 어퍼 마감과 스터드 패턴이 달라요.", options: [
    { value: "fw", emoji: "⚡", label: "공격수", hint: "스피드/슈팅" },
    { value: "mf", emoji: "🎯", label: "미드필더", hint: "터치/패스" },
    { value: "df", emoji: "🛡️", label: "수비수", hint: "안정/태클" },
    { value: "gk", emoji: "🧤", label: "골키퍼", hint: "그립/스텝" },
  ]},
  { kind: "visual", key: "playFeel", title: "6. 플레이 성향", question: "어떤 플레이를 가장 자주 하시나요?", options: [
    { value: "speed", emoji: "💨", label: "치고 달리기", hint: "스피드 실루엣" },
    { value: "control", emoji: "🎯", label: "볼 컨트롤·패스", hint: "터치 실루엣" },
    { value: "allround", emoji: "🛡️", label: "전천후·안정", hint: "올라운드" },
  ]},
  { kind: "visual", key: "injury", title: "7. 부상 이력", question: "최근 1년 내 발/발목 부상이 있었나요?", helper: "부상 부위에 따라 권장 스터드와 쿠셔닝이 달라져요.", options: [
    { value: "none", emoji: "✅", label: "없음" },
    { value: "ankle", emoji: "🦴", label: "발목 염좌" },
    { value: "metatarsal", emoji: "🦶", label: "중족골 통증" },
    { value: "knee", emoji: "🦵", label: "무릎 통증" },
  ]},
  { kind: "visual", key: "budget", title: "8. 예산", question: "축구화에 얼마까지 쓸 수 있나요?", options: [
    { value: 50000, emoji: "💰", label: "5만원 이하" },
    { value: 100000, emoji: "💵", label: "10만원까지" },
    { value: 200000, emoji: "💳", label: "20만원까지" },
    { value: 500000, emoji: "✨", label: "프리미엄 OK" },
  ]},
];

type Step = "intro" | "photo-front" | "photo-side" | "photo-heel" | "survey" | "analyzing" | "results";

function App() {
  const [step, setStep] = useState<Step>("intro");
  const [profile, setProfile] = useState<Profile>({});
  const [surveyIndex, setSurveyIndex] = useState(0);
  const [photos, setPhotos] = useState<{ front: string | null; side: string | null; heel: string | null }>({ front: null, side: null, heel: null });
  const [aiResult, setAiResult] = useState<FootAnalysis | null>(null);
  const [results, setResults] = useState<ResultItem[] | null>(null);
  const [progress, setProgress] = useState(0);
  const [analyzeMsg, setAnalyzeMsg] = useState("발 사진을 보내고 있어요");

  const callAnalyze = useServerFn(analyzeFoot);

  const handleSurveyAnswer = (key: keyof Profile, value: string | number) => {
    const updated = { ...profile, [key]: value } as Profile;
    setProfile(updated);
    if (surveyIndex + 1 < SURVEY_STEPS.length) {
      setSurveyIndex(surveyIndex + 1);
    } else {
      runAnalysis(updated);
    }
  };

  const runAnalysis = async (finalProfile: Profile) => {
    setStep("analyzing");
    setProgress(10);
    setAnalyzeMsg("AI에게 발 사진 전송 중");

    let ai: FootAnalysis | null = null;
    try {
      if (photos.front) {
        setProgress(35);
        setAnalyzeMsg("AI가 발 모양을 보고 있어요");
        ai = await callAnalyze({
          data: {
            frontImage: photos.front,
            sideImage: photos.side,
            heelImage: photos.heel,
          },
        });
      }
    } catch (err) {
      console.error("analyze failed", err);
    }
    setAiResult(ai);
    setProgress(80);
    setAnalyzeMsg("딱 맞는 축구화 찾는 중");

    const fp = buildFinalProfile(finalProfile, ai);
    const r = recommend(fp, ai);
    setProgress(100);
    setTimeout(() => {
      setResults(r);
      setStep("results");
    }, 600);
  };

  const restart = () => {
    setStep("intro");
    setProfile({});
    setSurveyIndex(0);
    setPhotos({ front: null, side: null, heel: null });
    setAiResult(null);
    setResults(null);
    setProgress(0);
  };

  const groundLabel =
    profile.place === "natural" ? "천연잔디"
    : profile.place === "school" ? "학교 운동장"
    : profile.place === "turf" ? "풋살장"
    : "여러 구장";

  const current = SURVEY_STEPS[surveyIndex];

  return (
    <div style={{ minHeight: "100vh", background: "#FAF9F5", padding: "20px 16px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#1A1A18" }}>
      <div style={{ maxWidth: 420, margin: "0 auto", background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
        {step === "intro" && (
          <div style={{ textAlign: "center", padding: "24px 4px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 10px 0" }}>발 사진으로 축구화 찾기</h1>
            <p style={{ fontSize: 14, color: "#6B6A65", margin: "0 0 6px 0", lineHeight: 1.6 }}>
              AI 발 분석 + 전문 설문 8개로<br/>내 발에 딱 맞는 축구화를 찾아드려요
            </p>
            <p style={{ fontSize: 12, color: "#9B9A95", margin: "0 0 20px 0" }}>실제 다나와 가격·리뷰 기반</p>

            <div style={{ background: "#FFF4F4", border: "1px solid #F5D6D6", borderRadius: 12, padding: 12, marginBottom: 20, textAlign: "left" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#B23636", margin: "0 0 8px 0" }}>❌ 이런 사진은 분석이 어려워요</p>
              <img src={guideMistakes} alt="흔한 촬영 실수 예시" style={{ width: "100%", borderRadius: 8, display: "block" }} />
              <p style={{ fontSize: 11, color: "#6B6A65", margin: "8px 0 0 0", lineHeight: 1.5 }}>각도 기울임 · 일부 잘림 · 너무 어두움 · 흔들림 · 필터 사용 · 양말 착용은 피해주세요.</p>
            </div>

            <button onClick={() => setStep("photo-front")} style={{ width: "100%", background: "#1A1A18", color: "#fff", border: "none", height: 46, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              시작하기
            </button>
          </div>
        )}

        {step === "photo-front" && (
          <PhotoUploadStep
            stepIndex={0} totalSteps={3}
            title="1/3 정면 사진"
            subtitle="A4 위에 맨발 · 위에서 수직 촬영"
            exampleSrc={guideFront}
            exampleCaption="발 전체 형태와 발볼 너비를 확인해요. A4 용지 위에 맨발로 올라가서 위에서 수직으로 찍어주세요."
            checklist={FRONT_CHECKLIST}
            onNext={(p) => { setPhotos((prev) => ({ ...prev, front: p })); setStep("photo-side"); }}
            onBack={() => setStep("intro")}
          />
        )}
        {step === "photo-side" && (
          <PhotoUploadStep
            stepIndex={1} totalSteps={3}
            title="2/3 측면 사진"
            subtitle="발과 수평으로 옆에서"
            exampleSrc={guideSide}
            exampleCaption="발등 높이와 아치 곡선을 확인해요. 카메라를 발과 수평으로 맞춰 옆에서 찍어주세요."
            checklist={SIDE_CHECKLIST}
            onNext={(p) => { setPhotos((prev) => ({ ...prev, side: p })); setStep("photo-heel"); }}
            onBack={() => setStep("photo-front")}
          />
        )}
        {step === "photo-heel" && (
          <PhotoUploadStep
            stepIndex={2} totalSteps={3}
            title="3/3 뒤꿈치 사진"
            subtitle="뒤에서 수평으로"
            exampleSrc={guideHeel}
            exampleCaption="뒤꿈치 너비와 발목 형태를 확인해요. 뒤꿈치 중심이 정중앙에 오도록 찍어주세요."
            checklist={HEEL_CHECKLIST}
            onNext={(p) => { setPhotos((prev) => ({ ...prev, heel: p })); setStep("survey"); }}
            onBack={() => setStep("photo-side")}
          />
        )}

        {step === "survey" && current && (
          current.kind === "visual" ? (
            <VisualSurveyQuestion
              current={surveyIndex}
              total={SURVEY_STEPS.length}
              title={current.title}
              question={current.question}
              helper={current.helper}
              options={current.options}
              onAnswer={(val) => handleSurveyAnswer(current.key, val)}
              onBack={surveyIndex > 0 ? () => setSurveyIndex(surveyIndex - 1) : () => setStep("photo-heel")}
            />
          ) : (
            <NumberSurveyQuestion
              current={surveyIndex}
              total={SURVEY_STEPS.length}
              title={current.title}
              question={current.question}
              helper={current.helper}
              placeholder={current.placeholder}
              suffix={current.suffix}
              min={current.min}
              max={current.max}
              onAnswer={(val) => handleSurveyAnswer(current.key, val)}
              onBack={surveyIndex > 0 ? () => setSurveyIndex(surveyIndex - 1) : () => setStep("photo-heel")}
            />
          )
        )}

        {step === "analyzing" && <AnalyzingStep progress={progress} message={analyzeMsg} />}

        {step === "results" && results && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px 0" }}>이런 축구화를 추천해요</h2>
            <p style={{ fontSize: 13, color: "#6B6A65", margin: "0 0 16px 0" }}>{groundLabel} · 사이즈 {profile.shoeSizeMm ?? "-"}mm 기준</p>
            {aiResult && <FootAnalysisCard ai={aiResult} profile={profile} />}
            {results.map((r, i) => <ResultCard key={i} result={r} />)}
            <button onClick={restart} style={{ width: "100%", marginTop: 12, background: "transparent", color: "#6B6A65", border: "1px solid #E5E2D9", height: 44, borderRadius: 8, fontSize: 14, cursor: "pointer" }}>
              처음부터 다시하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
