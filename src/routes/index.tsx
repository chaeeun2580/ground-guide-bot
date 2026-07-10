import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useRef, useEffect } from "react";
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
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginLeft: 4 }}>
          <button
            type="button"
            onClick={() => {
              const base = val === "" ? 0 : num;
              const next = Math.min(max, base + 5);
              setVal(String(next));
            }}
            style={{ width: 36, height: 28, border: "1px solid #E5E2D9", borderRadius: 6, background: "#fff", fontSize: 14, color: GREEN, cursor: "pointer" }}
          >
            +5
          </button>
          <button
            type="button"
            onClick={() => {
              const base = val === "" ? 0 : num;
              const next = Math.max(min, base - 5);
              setVal(String(next));
            }}
            style={{ width: 36, height: 28, border: "1px solid #E5E2D9", borderRadius: 6, background: "#fff", fontSize: 14, color: "#B23636", cursor: "pointer" }}
          >
            -5
          </button>
        </div>
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

const SCAN_STEPS = [
  "발볼 너비 확인 중...",
  "발가락 형태 분석 중...",
  "아치 곡선 확인 중...",
  "발 특징 종합 중...",
];

function AnalyzingStep({ progress, message, photoSrc }: { progress: number; message: string; photoSrc?: string | null }) {
  const [scanStep, setScanStep] = useState(0);

  useEffect(() => {
    if (!photoSrc) return;
    const interval = setInterval(() => {
      setScanStep((s) => (s + 1) % SCAN_STEPS.length);
    }, 900);
    return () => clearInterval(interval);
  }, [photoSrc]);

  if (photoSrc) {
    return (
      <div>
        <style>{`
          @keyframes scanDown {
            0%   { top: 0%; opacity: 1; }
            48%  { top: 92%; opacity: 1; }
            50%  { top: 92%; opacity: 0; }
            52%  { top: 0%; opacity: 0; }
            54%  { top: 0%; opacity: 1; }
            100% { top: 92%; opacity: 1; }
          }
        `}</style>
        <div style={{ position: "relative", width: "100%", borderRadius: 12, overflow: "hidden", marginBottom: 16, background: "#000" }}>
          <img src={photoSrc} alt="발 분석 중" style={{ width: "100%", display: "block", maxHeight: 300, objectFit: "cover", opacity: 0.85 }} />
          {/* 스캔 라인 */}
          <div style={{
            position: "absolute", left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, transparent 0%, ${GREEN} 20%, #00ffcc 50%, ${GREEN} 80%, transparent 100%)`,
            boxShadow: `0 0 10px 2px ${GREEN}, 0 0 24px 4px rgba(15,110,86,0.5)`,
            animation: "scanDown 1.8s ease-in-out infinite",
            top: 0,
          }} />
          {/* 코너 마커 */}
          {[{t:8,l:8},{t:8,r:8},{b:8,l:8},{b:8,r:8}].map((pos, i) => (
            <div key={i} style={{
              position: "absolute", width: 16, height: 16,
              borderTop: i < 2 ? `2px solid ${GREEN}` : "none",
              borderBottom: i >= 2 ? `2px solid ${GREEN}` : "none",
              borderLeft: i % 2 === 0 ? `2px solid ${GREEN}` : "none",
              borderRight: i % 2 === 1 ? `2px solid ${GREEN}` : "none",
              top: pos.t, bottom: (pos as any).b, left: (pos as any).l, right: (pos as any).r,
            }} />
          ))}
          {/* 분석 중 텍스트 오버레이 */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
            padding: "20px 12px 12px",
          }}>
            <p style={{ color: "#00ffcc", fontSize: 12, fontWeight: 700, margin: 0, letterSpacing: 0.5 }}>
              ▶ {SCAN_STEPS[scanStep]}
            </p>
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px 0", color: "#1A1A18" }}>{message}</h2>
          <div style={{ height: 4, borderRadius: 2, background: "#E5E2D9", overflow: "hidden" }}>
            <div style={{ height: "100%", background: GREEN, width: `${progress}%`, transition: "width 0.4s ease" }} />
          </div>
          <p style={{ fontSize: 11, color: "#9B9A95", margin: "6px 0 0 0" }}>{progress}%</p>
        </div>
      </div>
    );
  }

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
    setAnalyzeMsg("발볼 너비 확인 중...");

    let ai: FootAnalysis | null = null;
    try {
      if (photos.front) {
        setProgress(30);
        setAnalyzeMsg("발가락 형태 분석 중...");
        ai = await analyzeFoot({
          frontImage: photos.front,
          sideImage: photos.side,
          heelImage: photos.heel,
        });
        setProgress(65);
        setAnalyzeMsg("아치 곡선 확인 중...");
        await new Promise((r) => setTimeout(r, 600));
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
          <div style={{ fontFamily: "'Inter', sans-serif", background: "#F3ECE0", minHeight: "100vh", paddingBottom: 100, margin: "-20px", borderRadius: 16 }}>
            <style>{`
              .spec-num { font-family: 'IBM Plex Mono', monospace; font-size: 38px; font-weight: 700; line-height: 1; color: transparent; -webkit-text-stroke: 1.4px #A9683C; min-width: 44px; }
              .eyebrow { font-family: 'IBM Plex Mono', monospace; }
              .headline { font-family: 'Big Shoulders Display', sans-serif; }
              .mono { font-family: 'IBM Plex Mono', monospace; }
            `}</style>

            {/* 태그 고리 */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, paddingTop: 28 }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid #948A7A", background: "#F3ECE0" }} />
              <div style={{ width: 1, height: 20, background: "#948A7A" }} />
            </div>

            {/* 히어로 */}
            <div style={{ padding: "0 28px 32px", textAlign: "center" }}>
              <span className="eyebrow" style={{ display: "inline-block", fontSize: 11, letterSpacing: "0.18em", color: "#7C4C2A", border: "1px solid #A9683C", padding: "5px 12px", borderRadius: 2, margin: "16px 0 20px" }}>
                FOOT SPEC ANALYSIS
              </span>
              <h1 className="headline" style={{ fontSize: "clamp(34px, 8vw, 48px)", lineHeight: 1.08, fontWeight: 800, color: "#17130F", letterSpacing: "0.005em", margin: "0 0 18px 0" }}>
                축구화 사기 전에<br />발부터 재보세요
              </h1>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: "#4A4137", maxWidth: 340, margin: "0 auto" }}>
                발 사진 <strong style={{ color: "#7C4C2A", fontWeight: 600 }}>3장</strong>이면 발볼·발등·아치를 읽고<br />1,120개 제품 중 딱 맞는 걸 골라드려요.
              </p>
            </div>

            {/* 발 도해 */}
            <div style={{ padding: "0 28px 8px" }}>
              <div style={{ border: "1px solid #948A7A", borderRadius: 4, padding: "20px 12px 24px", background: "linear-gradient(180deg, rgba(255,255,255,0.35), transparent)", position: "relative" }}>
                <span className="mono" style={{ position: "absolute", top: 8, left: 12, fontSize: 9, letterSpacing: "0.1em", color: "#948A7A" }}>FOOT SPEC / 발 형태 분석</span>
                <svg viewBox="0 0 300 420" style={{ display: "block", margin: "18px auto 0", width: 160, height: "auto", overflow: "visible" }}>
                  <path fill="none" stroke="#17130F" strokeWidth="2" d="M150,18 C192,18 212,58 206,112 C201,158 222,196 227,250 C233,312 212,372 170,398 C138,418 88,418 62,392 C36,366 32,320 44,268 C55,220 39,168 50,116 C60,66 102,18 150,18 Z" />
                  <line stroke="#A9683C" strokeWidth="1.4" strokeDasharray="4 4" x1="20" y1="110" x2="280" y2="110" />
                  <line stroke="#A9683C" strokeWidth="1.4" strokeDasharray="4 4" x1="20" y1="230" x2="280" y2="230" />
                  <line stroke="#A9683C" strokeWidth="1.4" strokeDasharray="4 4" x1="20" y1="340" x2="280" y2="340" />
                  <text fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#241D17" x="20" y="102">발볼 WIDTH</text>
                  <text fontFamily="IBM Plex Mono, monospace" fontSize="11" fontWeight="600" fill="#7C4C2A" x="210" y="102">측정중</text>
                  <text fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#241D17" x="20" y="222">발등 HEIGHT</text>
                  <text fontFamily="IBM Plex Mono, monospace" fontSize="11" fontWeight="600" fill="#7C4C2A" x="210" y="222">측정중</text>
                  <text fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#241D17" x="20" y="332">아치 TYPE</text>
                  <text fontFamily="IBM Plex Mono, monospace" fontSize="11" fontWeight="600" fill="#7C4C2A" x="210" y="332">측정중</text>
                </svg>
              </div>
            </div>

            {/* 스펙 리스트 */}
            <div style={{ padding: "0 28px", marginTop: 36, borderTop: "1px dashed #948A7A" }}>
              {[
                { n: "01", title: "발볼·발등·아치 자동 분석", desc: "발 사진 3장으로 측정 — 줄자 없이도 정확하게" },
                { n: "02", title: "1,120개 실제 제품 매칭", desc: "다나와 실시간 최저가 기준으로 비교" },
                { n: "03", title: "3가지 추천 + 이유 설명", desc: "핏·스타일·절충안, 왜 맞는지까지 알려드려요" },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 18, alignItems: "flex-start", padding: "22px 0", borderBottom: i < 2 ? "1px dashed #948A7A" : "none" }}>
                  <span className="spec-num">{s.n}</span>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: "#17130F" }}>{s.title}</h3>
                    <p style={{ fontSize: 13, color: "#6B6053", lineHeight: 1.5 }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 후기 */}
            <div style={{ padding: "0 28px", marginTop: 36 }}>
              <div style={{ borderTop: "1px dashed #948A7A", paddingTop: 24 }}>
                <span className="headline" style={{ fontSize: 54, color: "#A9683C", opacity: 0.55, lineHeight: 0.5, display: "block", marginBottom: 6 }}>"</span>
                <p style={{ fontSize: 15, lineHeight: 1.6, fontStyle: "italic", color: "#241D17" }}>발볼이 넓어서 항상 고민이었는데, 추천받은 거 바로 샀어요. 진짜 딱 맞아요.</p>
                <span className="mono" style={{ display: "block", marginTop: 12, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#948A7A" }}>27세 · 주 2회 풋살</span>
              </div>
            </div>

            {/* 하단 고정 CTA */}
            <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "#17130F", borderTop: "1px solid #A9683C", padding: "14px 20px 18px", textAlign: "center", zIndex: 40 }}>
              <p className="mono" style={{ fontSize: 10, color: "#948A7A", letterSpacing: "0.08em", marginBottom: 10 }}>평균 3분 · 무료</p>
              <button
                onClick={() => setStep("photo-front")}
                style={{ width: "100%", maxWidth: 480, background: "#A9683C", color: "#F3ECE0", border: "none", borderRadius: 3, padding: "15px 0", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: "0.01em", cursor: "pointer" }}
              >
                내 발 분석하기 →
              </button>
            </div>
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

        {step === "analyzing" && <AnalyzingStep progress={progress} message={analyzeMsg} photoSrc={photos.front} />}

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
