import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useRef, useEffect } from "react";
import { analyzeFoot, type FootAnalysis } from "@/lib/foot-analysis.functions";
import { PRODUCTS, type Product } from "@/lib/products-data";
import guideFront from "@/assets/guide-front.png";
import guideSide from "@/assets/guide-side.png";
import guideHeel from "@/assets/guide-heel.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FootFit — 내 발에 맞는 축구화" },
      { name: "description", content: "발 사진 3장으로 발볼·발등·아치를 분석해 딱 맞는 축구화를 추천해드려요." },
    ],
  }),
  component: App,
});

// ── Design tokens ────────────────────────────────────────────────
const G    = "#0F6E56";
const GL   = "#E8F4F0";
const INK  = "#0F0F0F";
const SUB  = "#6B6B65";
const HINT = "#B0B0A8";
const LINE = "#EBEBEB";
const BG   = "#FFFFFF";
const BG2  = "#F6F5F2";

// ── Types ────────────────────────────────────────────────────────
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

type FinalProfile = {
  groundType: string;
  fitWidth: "넓음" | "보통" | "좁음";
  playStyle: string;
  budgetMaxKrw: number;
};

type ResultItem = { label: string; product: Product | null; reason: string; overBudget: boolean };

function placeToGround(p?: string): string {
  if (p === "natural") return "FG";
  return "AG";
}
function fitFeelToWidth(f?: string): "넓음" | "보통" | "좁음" {
  if (f === "tight") return "넓음";
  if (f === "loose") return "좁음";
  return "보통";
}
function buildFinalProfile(p: Profile, ai: FootAnalysis | null): FinalProfile {
  const aiWidth = ai?.footWidth;
  const surveyWidth = fitFeelToWidth(p.shoeFitFeel);
  const fitWidth = aiWidth && aiWidth !== "보통" ? aiWidth : surveyWidth;
  const playStyle = p.playFeel === "speed" ? "스피드" : p.playFeel === "control" ? "터치_컨트롤" : "올라운드";
  return { groundType: placeToGround(p.place), fitWidth, playStyle, budgetMaxKrw: p.budget ?? 200000 };
}

function recommend(fp: FinalProfile, ai: FootAnalysis | null): ResultItem[] {
  const safe = PRODUCTS.filter((p) => p.gender !== "주니어용" && p.groundTypes.includes(fp.groundType));
  const budget = safe.filter((p) => p.priceKrw <= fp.budgetMaxKrw * 1.1);
  const fitTarget = fp.fitWidth;
  const fitPool = budget.filter((p) => p.fitWidth === fitTarget);
  const fit = (fitPool.length > 0 ? fitPool : budget.filter((p) => p.fitWidth !== (fitTarget === "넓음" ? "좁음" : "넓음")))
    .sort((a, b) => b.priceKrw - a.priceKrw)[0] ?? null;
  const fitReason = ai
    ? `AI 분석 결과 발볼이 '${ai.footWidth}'으로 확인됐어요. 발볼 ${fit?.fitWidth ?? "보통"} 모델을 골랐어요.`
    : `착화감 기반으로 발볼 ${fit?.fitWidth ?? "보통"} 모델을 골랐어요.`;
  const styleMatch = budget.filter((p) => p.styleTag === fp.playStyle).sort((a, b) => a.priceKrw - b.priceKrw)[0];
  const styleFallback = safe.filter((p) => p.styleTag === fp.playStyle).sort((a, b) => a.priceKrw - b.priceKrw)[0];
  const style = styleMatch ?? styleFallback ?? null;
  const styleOver = !styleMatch && !!styleFallback;
  const styleReason = style
    ? `${fp.playStyle === "스피드" ? "빠른 플레이" : fp.playStyle === "터치_컨트롤" ? "볼 컨트롤" : "올라운드"} 스타일에 맞췄어요.${styleOver ? " 예산을 살짝 넘어요." : ""}`
    : "스타일 조건에 맞는 제품을 찾지 못했어요.";
  const bal = budget.filter((p) => p.fitWidth !== (fitTarget === "넓음" ? "좁음" : fitTarget === "좁음" ? "넓음" : "좁음"))
    .sort((a, b) => { const sa = a.styleTag === fp.playStyle ? 0 : 1; const sb = b.styleTag === fp.playStyle ? 0 : 1; return sa !== sb ? sa - sb : a.priceKrw - b.priceKrw; })[0] ?? null;
  return [
    { label: "핏 우선", product: fit, reason: fitReason, overBudget: false },
    { label: "스타일 우선", product: style, reason: styleReason, overBudget: styleOver },
    { label: "절충안", product: bal, reason: "발볼 편안함과 스타일을 균형 있게 챙겼어요.", overBudget: false },
  ];
}

function computeFitScore(product: Product, fp: FinalProfile): { total: number; metrics: [string, number][] } {
  const groundScore = product.groundTypes.includes(fp.groundType) ? 100 : 20;
  const fitScore    = product.fitWidth === fp.fitWidth ? 100 : product.fitWidth === "보통" ? 58 : 22;
  const styleScore  = product.styleTag === fp.playStyle ? 100 : product.styleTag === "올라운드" ? 62 : 38;
  const budgetScore = product.priceKrw <= fp.budgetMaxKrw
    ? 100 : Math.max(0, Math.round(100 - ((product.priceKrw - fp.budgetMaxKrw) / fp.budgetMaxKrw) * 100));
  const total = Math.round(groundScore * 0.30 + fitScore * 0.35 + styleScore * 0.20 + budgetScore * 0.15);
  return { total, metrics: [["발볼 핏", fitScore], ["구장 매칭", groundScore], ["플레이 스타일", styleScore], ["예산 범위", budgetScore]] };
}

// ── Global CSS ───────────────────────────────────────────────────
const CSS = `
  @keyframes scanDown {
    0%  { top:0%;  opacity:1; }
    48% { top:90%; opacity:1; }
    50% { top:90%; opacity:0; }
    52% { top:0%;  opacity:0; }
    54% { top:0%;  opacity:1; }
    100%{ top:90%; opacity:1; }
  }
  @keyframes spin { to { transform:rotate(360deg); } }
  .ff-h { font-family:'Big Shoulders Display',sans-serif; }
  .ff-m { font-family:'IBM Plex Mono',monospace; }
  .ff-btn:active { transform:scale(0.98); }
  .ff-opt:hover { border-color:${G} !important; }
`;

// ── Shared ───────────────────────────────────────────────────────
function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ height: 2, background: LINE, borderRadius: 1, marginBottom: 32 }}>
      <div style={{ height: "100%", width: `${((current + 1) / total) * 100}%`, background: G, borderRadius: 1, transition: "width 0.35s ease" }} />
    </div>
  );
}
function BackBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 22, color: INK, marginBottom: 24, display: "block" }}>←</button>;
}

// ── Photo upload ─────────────────────────────────────────────────
type ChecklistItem = { ok: boolean; text: string };

function PhotoUploadStep({ stepIndex, totalSteps, title, subtitle, exampleSrc, checklist, onNext, onBack }: {
  stepIndex: number; totalSteps: number; title: string; subtitle: string;
  exampleSrc: string; checklist: ChecklistItem[];
  onNext: (p: string | null) => void; onBack?: () => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => setPreview((ev.target?.result as string) ?? null);
    r.readAsDataURL(f);
  }, []);

  return (
    <div>
      <ProgressBar current={stepIndex} total={totalSteps} />
      {onBack && <BackBtn onClick={onBack} />}
      <p style={{ fontSize: 12, fontWeight: 600, color: G, margin: "0 0 6px", letterSpacing: 0.3 }}>{title}</p>
      <h2 className="ff-h" style={{ fontSize: 28, fontWeight: 700, color: INK, margin: "0 0 24px", lineHeight: 1.15, whiteSpace: "pre-line" }}>{subtitle}</h2>

      <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 16, position: "relative" }}>
        <img src={exampleSrc} alt="촬영 예시" style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(0,0,0,0.55)", borderRadius: 6, padding: "4px 8px" }}>
          <span style={{ color: "#fff", fontSize: 11, fontWeight: 500 }}>예시 사진</span>
        </div>
      </div>

      <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 6 }}>
        {checklist.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ color: item.ok ? G : "#E05555", fontSize: 13, flexShrink: 0 }}>{item.ok ? "✓" : "✕"}</span>
            <span style={{ fontSize: 13, color: item.ok ? INK : "#E05555", lineHeight: 1.45 }}>{item.text}</span>
          </div>
        ))}
      </div>

      <div
        onClick={() => inputRef.current?.click()}
        style={{ borderRadius: 12, border: `1.5px dashed ${preview ? G : LINE}`, height: 140, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 24, cursor: "pointer", overflow: "hidden", background: preview ? BG : BG2 }}
      >
        {preview
          ? <img src={preview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <><span style={{ fontSize: 24 }}>📷</span><span style={{ fontSize: 13, color: SUB }}>탭해서 사진 선택</span></>
        }
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />

      <button className="ff-btn" onClick={() => onNext(preview)} disabled={!preview}
        style={{ width: "100%", background: preview ? INK : LINE, color: preview ? "#fff" : HINT, border: "none", height: 52, borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: preview ? "pointer" : "not-allowed" }}>
        {preview ? "다음으로" : "사진을 먼저 올려주세요"}
      </button>
    </div>
  );
}

// ── Survey components ────────────────────────────────────────────
type VisualOption = { value: string | number; label: string; hint?: string };

function VisualSurveyQuestion({ title, question, helper, options, onAnswer, onBack, current, total }: {
  title: string; question: string; helper?: string; options: VisualOption[];
  onAnswer: (v: string | number) => void; onBack?: () => void; current: number; total: number;
}) {
  return (
    <div>
      <ProgressBar current={current} total={total} />
      {onBack && <BackBtn onClick={onBack} />}
      <p style={{ fontSize: 12, fontWeight: 600, color: G, margin: "0 0 6px", letterSpacing: 0.3 }}>{title}</p>
      <h2 className="ff-h" style={{ fontSize: 26, fontWeight: 700, color: INK, margin: "0 0 8px", lineHeight: 1.2 }}>{question}</h2>
      {helper && <p style={{ fontSize: 13, color: SUB, margin: "0 0 24px", lineHeight: 1.55 }}>{helper}</p>}
      {!helper && <div style={{ marginBottom: 24 }} />}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {options.map((opt, i) => (
          <button key={i} className="ff-opt ff-btn" onClick={() => onAnswer(opt.value)}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", border: `1px solid ${LINE}`, borderRadius: 12, background: BG, cursor: "pointer", transition: "border-color 0.15s" }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: INK }}>{opt.label}</span>
            {opt.hint && <span style={{ fontSize: 12, color: HINT }}>{opt.hint}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function NumberSurveyQuestion({ title, question, helper, placeholder, suffix, min, max, onAnswer, onBack, current, total }: {
  title: string; question: string; helper?: string; placeholder: string; suffix: string;
  min: number; max: number; onAnswer: (v: number) => void; onBack?: () => void; current: number; total: number;
}) {
  const [val, setVal] = useState("");
  const num = Number(val);
  const valid = val !== "" && Number.isFinite(num) && num >= min && num <= max;
  return (
    <div>
      <ProgressBar current={current} total={total} />
      {onBack && <BackBtn onClick={onBack} />}
      <p style={{ fontSize: 12, fontWeight: 600, color: G, margin: "0 0 6px", letterSpacing: 0.3 }}>{title}</p>
      <h2 className="ff-h" style={{ fontSize: 26, fontWeight: 700, color: INK, margin: "0 0 8px", lineHeight: 1.2 }}>{question}</h2>
      {helper && <p style={{ fontSize: 13, color: SUB, margin: "0 0 24px", lineHeight: 1.55 }}>{helper}</p>}
      {!helper && <div style={{ marginBottom: 24 }} />}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, border: `1px solid ${valid ? G : LINE}`, borderRadius: 12, padding: "14px 16px", transition: "border-color 0.2s" }}>
        <input type="number" inputMode="numeric" value={val} onChange={(e) => setVal(e.target.value)} placeholder={placeholder}
          style={{ flex: 1, border: "none", outline: "none", fontSize: 28, fontWeight: 700, color: INK, background: "transparent", minWidth: 0 }} />
        <span style={{ fontSize: 15, fontWeight: 600, color: SUB }}>{suffix}</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <button type="button" onClick={() => setVal(String(Math.min(max, (val === "" ? 0 : num) + 5)))}
            style={{ width: 40, height: 32, border: `1px solid ${LINE}`, borderRadius: 8, background: BG, fontSize: 13, color: G, cursor: "pointer", fontWeight: 600 }}>+5</button>
          <button type="button" onClick={() => setVal(String(Math.max(min, (val === "" ? 0 : num) - 5)))}
            style={{ width: 40, height: 32, border: `1px solid ${LINE}`, borderRadius: 8, background: BG, fontSize: 13, color: "#E05555", cursor: "pointer", fontWeight: 600 }}>-5</button>
        </div>
      </div>
      <button className="ff-btn" onClick={() => valid && onAnswer(num)} disabled={!valid}
        style={{ width: "100%", background: valid ? INK : LINE, color: valid ? "#fff" : HINT, border: "none", height: 52, borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: valid ? "pointer" : "not-allowed" }}>
        다음
      </button>
    </div>
  );
}

// ── Analyzing ────────────────────────────────────────────────────
const SCAN_STEPS = ["발볼 너비 확인 중...", "발가락 형태 분석 중...", "아치 곡선 확인 중...", "발 특징 종합 중..."];

function AnalyzingStep({ progress, message, photoSrc }: { progress: number; message: string; photoSrc?: string | null }) {
  const [scanStep, setScanStep] = useState(0);
  useEffect(() => {
    if (!photoSrc) return;
    const id = setInterval(() => setScanStep((s) => (s + 1) % SCAN_STEPS.length), 900);
    return () => clearInterval(id);
  }, [photoSrc]);

  if (photoSrc) {
    return (
      <div>
        <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", marginBottom: 24 }}>
          <img src={photoSrc} alt="발 분석 중" style={{ width: "100%", display: "block", maxHeight: 320, objectFit: "cover" }} />
          <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent 0%, ${G} 20%, #00FFCC 50%, ${G} 80%, transparent 100%)`, boxShadow: `0 0 12px 2px ${G}`, animation: "scanDown 1.8s ease-in-out infinite", top: 0 }} />
          {[{t:8,l:8,bt:true,bl:true},{t:8,r:8,bt:true,br:true},{b:8,l:8,bb:true,bl:true},{b:8,r:8,bb:true,br:true}].map((p,i) => (
            <div key={i} style={{ position:"absolute", width:18, height:18, top:(p as any).t, bottom:(p as any).b, left:(p as any).l, right:(p as any).r, borderTop:(p as any).bt?`2px solid ${G}`:"none", borderBottom:(p as any).bb?`2px solid ${G}`:"none", borderLeft:(p as any).bl?`2px solid ${G}`:"none", borderRight:(p as any).br?`2px solid ${G}`:"none" }} />
          ))}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)", padding: "32px 16px 14px" }}>
            <p className="ff-m" style={{ color: "#00FFCC", fontSize: 12, margin: 0 }}>▶ {SCAN_STEPS[scanStep]}</p>
          </div>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: INK, margin: "0 0 12px" }}>{message}</h2>
        <div style={{ height: 4, borderRadius: 2, background: LINE, overflow: "hidden" }}>
          <div style={{ height: "100%", background: G, width: `${progress}%`, transition: "width 0.4s ease", borderRadius: 2 }} />
        </div>
        <p className="ff-m" style={{ fontSize: 11, color: HINT, margin: "6px 0 0", textAlign: "right" }}>{progress}%</p>
      </div>
    );
  }
  return (
    <div style={{ textAlign: "center", padding: "64px 0" }}>
      <div style={{ width: 44, height: 44, border: `2.5px solid ${LINE}`, borderTopColor: G, borderRadius: "50%", margin: "0 auto 20px", animation: "spin 0.9s linear infinite" }} />
      <h2 style={{ fontSize: 18, fontWeight: 700, color: INK, margin: "0 0 6px" }}>{message}</h2>
      <p style={{ fontSize: 13, color: SUB, margin: 0 }}>잠시만요 · {progress}%</p>
    </div>
  );
}

// ── Result card ──────────────────────────────────────────────────
function FootAnalysisCard({ ai, profile }: { ai: FootAnalysis; profile: Profile }) {
  return (
    <div style={{ background: GL, borderRadius: 14, padding: "16px 20px", marginBottom: 24 }}>
      <p className="ff-m" style={{ fontSize: 11, fontWeight: 500, color: G, margin: "0 0 10px", letterSpacing: 0.4 }}>AI 발 분석 결과</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        {[`발볼 ${ai.footWidth}`, `아치 ${ai.archHeight}`, `뒤꿈치 ${ai.heelWidth}`, profile.shoeSizeMm ? `${profile.shoeSizeMm}mm` : null].filter(Boolean).map((t, i) => (
          <span key={i} style={{ background: "#fff", color: G, fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 100 }}>{t}</span>
        ))}
      </div>
      <p style={{ fontSize: 13, color: "#1A4A3D", margin: 0, lineHeight: 1.6 }}>{ai.summary}</p>
    </div>
  );
}

function ResultCard({ result, fp }: { result: ResultItem; fp: FinalProfile }) {
  const { label, product, reason, overBudget } = result;
  if (!product) return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 16, padding: 20, marginBottom: 12 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: HINT, display: "block", marginBottom: 8 }}>{label}</span>
      <p style={{ fontSize: 13, color: SUB, margin: 0 }}>{reason}</p>
    </div>
  );

  const { total, metrics } = computeFitScore(product, fp);
  const isTop = label === "핏 우선";

  return (
    <div style={{ border: `1px solid ${isTop ? G : LINE}`, borderRadius: 16, overflow: "hidden", marginBottom: 12, background: BG }}>
      <div style={{ background: isTop ? G : BG2, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: isTop ? "#fff" : SUB }}>{label}{overBudget ? " · 예산 초과" : ""}</span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
          <span className="ff-h" style={{ fontSize: 26, fontWeight: 800, color: isTop ? "#fff" : INK, lineHeight: 1 }}>{total}</span>
          <span style={{ fontSize: 13, color: isTop ? "rgba(255,255,255,0.7)" : SUB }}>%</span>
        </div>
      </div>
      <div style={{ padding: "16px 20px" }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: INK, margin: "0 0 4px", lineHeight: 1.35 }}>{product.modelName}</h3>
        <p style={{ fontSize: 12, color: SUB, margin: "0 0 8px" }}>발볼 {product.fitWidth} · {product.silo} · {product.upperMaterial}</p>
        <p className="ff-h" style={{ fontSize: 24, fontWeight: 800, color: isTop ? G : INK, margin: "0 0 12px" }}>{product.priceKrw.toLocaleString()}원</p>
        <p style={{ fontSize: 13, color: SUB, margin: "0 0 16px", lineHeight: 1.6 }}>{reason}</p>

        {/* Fit metrics */}
        <div style={{ marginBottom: 20 }}>
          {metrics.map(([name, val]) => (
            <div key={name} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: SUB }}>{name}</span>
                <span className="ff-m" style={{ fontSize: 11, color: INK, fontWeight: 600 }}>{val}%</span>
              </div>
              <div style={{ height: 4, background: LINE, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${val}%`, background: val >= 80 ? G : val >= 50 ? "#88C8B0" : "#D0D0C8", borderRadius: 2, transition: "width 0.6s ease" }} />
              </div>
            </div>
          ))}
        </div>

        <a href={product.lowestPriceUrl} target="_blank" rel="noopener noreferrer"
          style={{ display: "block", background: isTop ? G : INK, color: "#fff", textAlign: "center", textDecoration: "none", padding: "14px 0", borderRadius: 10, fontSize: 14, fontWeight: 700 }}>
          {product.lowestPriceShop} 최저가 보기 →
        </a>
      </div>
    </div>
  );
}

// ── Survey data ──────────────────────────────────────────────────
const FRONT_CL: ChecklistItem[] = [
  { ok: true,  text: "A4 위에 맨발 · 위에서 수직으로" },
  { ok: true,  text: "발가락~뒤꿈치 전체가 보이게" },
  { ok: false, text: "양말 착용 · 비스듬한 각도는 피해주세요" },
];
const SIDE_CL: ChecklistItem[] = [
  { ok: true,  text: "발과 수평으로 · 발등 높이가 보이게" },
  { ok: false, text: "너무 가깝거나 흔들린 사진은 피해주세요" },
];
const HEEL_CL: ChecklistItem[] = [
  { ok: true, text: "뒤에서 수평으로 · 뒤꿈치 중심이 정중앙" },
  { ok: true, text: "발목·아킬레스건도 같이 보이게" },
];

type SurveyStep =
  | { kind: "visual"; key: keyof Profile; title: string; question: string; helper?: string; options: VisualOption[] }
  | { kind: "number"; key: keyof Profile; title: string; question: string; helper?: string; placeholder: string; suffix: string; min: number; max: number };

const SURVEY_STEPS: SurveyStep[] = [
  { kind: "visual", key: "place", title: "구장 환경 · 1/8", question: "주로 어디서 뛰시나요?", helper: "구장 표면에 따라 스터드 종류가 달라져요.", options: [
    { value: "school", label: "학교 운동장", hint: "AG" },
    { value: "turf",   label: "풋살장", hint: "AG" },
    { value: "natural",label: "천연 잔디", hint: "FG" },
    { value: "mixed",  label: "여러 구장", hint: "MG" },
  ]},
  { kind: "number", key: "shoeSizeMm", title: "사이즈 · 2/8", question: "평소 운동화 사이즈는?", helper: "mm 단위로 입력해주세요 (예: 265)", placeholder: "265", suffix: "mm", min: 200, max: 320 },
  { kind: "visual", key: "shoeFitFeel", title: "발볼 자가진단 · 3/8", question: "운동화 신을 때 발 앞쪽이 어떤가요?", options: [
    { value: "tight", label: "꽉 끼고 답답해요", hint: "발볼 넓음" },
    { value: "ok",    label: "딱 맞게 편해요",   hint: "표준" },
    { value: "loose", label: "헐렁한 편이에요",  hint: "발볼 좁음" },
  ]},
  { kind: "visual", key: "instepHeight", title: "발등 높이 · 4/8", question: "신발 끈 매면 발등이 어떤가요?", options: [
    { value: "low",    label: "꽉 조여야 편해요",    hint: "발등 낮음" },
    { value: "normal", label: "평범하게 매도 돼요",   hint: "보통" },
    { value: "high",   label: "끈을 풀어야 편해요",   hint: "발등 높음" },
  ]},
  { kind: "visual", key: "position", title: "포지션 · 5/8", question: "주 포지션은 무엇인가요?", options: [
    { value: "fw", label: "공격수", hint: "스피드/슈팅" },
    { value: "mf", label: "미드필더", hint: "터치/패스" },
    { value: "df", label: "수비수", hint: "안정/태클" },
    { value: "gk", label: "골키퍼", hint: "그립/스텝" },
  ]},
  { kind: "visual", key: "playFeel", title: "플레이 성향 · 6/8", question: "어떤 플레이를 가장 자주 하세요?", options: [
    { value: "speed",    label: "치고 달리기",    hint: "스피드" },
    { value: "control",  label: "볼 컨트롤·패스", hint: "터치" },
    { value: "allround", label: "전천후·안정",    hint: "올라운드" },
  ]},
  { kind: "visual", key: "injury", title: "부상 이력 · 7/8", question: "최근 1년 내 부상이 있었나요?", options: [
    { value: "none",        label: "없음" },
    { value: "ankle",       label: "발목 염좌" },
    { value: "metatarsal",  label: "중족골 통증" },
    { value: "knee",        label: "무릎 통증" },
  ]},
  { kind: "visual", key: "budget", title: "예산 · 8/8", question: "축구화에 얼마까지 쓸 수 있나요?", options: [
    { value: 50000,  label: "5만원 이하" },
    { value: 100000, label: "10만원까지" },
    { value: 200000, label: "20만원까지" },
    { value: 500000, label: "금액 무관" },
  ]},
];

// ── App ──────────────────────────────────────────────────────────
type Step = "intro" | "photo-front" | "photo-side" | "photo-heel" | "survey" | "analyzing" | "results";

function App() {
  const [step, setStep] = useState<Step>("intro");
  const [profile, setProfile] = useState<Profile>({});
  const [surveyIndex, setSurveyIndex] = useState(0);
  const [photos, setPhotos] = useState<{ front: string | null; side: string | null; heel: string | null }>({ front: null, side: null, heel: null });
  const [aiResult, setAiResult] = useState<FootAnalysis | null>(null);
  const [results, setResults] = useState<ResultItem[] | null>(null);
  const [progress, setProgress] = useState(0);
  const [analyzeMsg, setAnalyzeMsg] = useState("");
  const [fp, setFp] = useState<FinalProfile | null>(null);

  const handleSurveyAnswer = (key: keyof Profile, value: string | number) => {
    const updated = { ...profile, [key]: value } as Profile;
    setProfile(updated);
    if (surveyIndex + 1 < SURVEY_STEPS.length) setSurveyIndex(surveyIndex + 1);
    else runAnalysis(updated);
  };

  const runAnalysis = async (finalProfile: Profile) => {
    setStep("analyzing"); setProgress(10); setAnalyzeMsg("발볼 너비 확인 중...");
    let ai: FootAnalysis | null = null;
    try {
      if (photos.front) {
        setProgress(30); setAnalyzeMsg("발가락 형태 분석 중...");
        ai = await analyzeFoot({ frontImage: photos.front, sideImage: photos.side, heelImage: photos.heel });
        setProgress(65); setAnalyzeMsg("아치 곡선 확인 중...");
        await new Promise((r) => setTimeout(r, 600));
      }
    } catch (err) { console.error(err); }
    setAiResult(ai); setProgress(80); setAnalyzeMsg("딱 맞는 축구화 찾는 중");
    const finalFp = buildFinalProfile(finalProfile, ai);
    setFp(finalFp);
    const r = recommend(finalFp, ai);
    setProgress(100);
    setTimeout(() => { setResults(r); setStep("results"); }, 600);
  };

  const restart = () => {
    setStep("intro"); setProfile({}); setSurveyIndex(0);
    setPhotos({ front: null, side: null, heel: null });
    setAiResult(null); setResults(null); setProgress(0); setFp(null);
  };

  const groundLabel = profile.place === "natural" ? "천연잔디" : profile.place === "school" ? "학교 운동장" : profile.place === "turf" ? "풋살장" : "여러 구장";
  const current = SURVEY_STEPS[surveyIndex];

  return (
    <div style={{ minHeight: "100vh", background: BG2, fontFamily: "-apple-system, 'Inter', sans-serif", color: INK }}>
      <style>{CSS}</style>
      <div style={{ maxWidth: 430, margin: "0 auto", background: BG, minHeight: "100vh" }}>

        {/* ── INTRO ── */}
        {step === "intro" && (
          <div style={{ paddingBottom: 100 }}>
            {/* Dark hero */}
            <div style={{ background: INK, padding: "48px 24px 40px" }}>
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  {[["발볼", "넓음"], ["아치", "보통"], ["뒤꿈치", "보통"]].map(([k, v]) => (
                    <div key={k} style={{ flex: 1, background: "rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                      <p className="ff-m" style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", margin: "0 0 4px", letterSpacing: 0.5 }}>{k}</p>
                      <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: 0 }}>{v}</p>
                    </div>
                  ))}
                </div>
                <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>추천 제품</span>
                    <span className="ff-m" style={{ fontSize: 11, fontWeight: 600, color: "#00FFAA" }}>발 적합도 94%</span>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: "0 0 2px" }}>미즈노 알파3 엘리트 AS</p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>89,900원 · 다나와 최저가</p>
                </div>
              </div>
              <h1 className="ff-h" style={{ fontSize: 46, fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1.0, letterSpacing: "-0.01em" }}>
                축구화 사기 전에<br />발부터<br />재보세요.
              </h1>
            </div>

            {/* Features */}
            <div style={{ padding: "32px 24px 0" }}>
              <p style={{ fontSize: 15, color: SUB, margin: "0 0 32px", lineHeight: 1.65 }}>
                발 사진 <strong style={{ color: G, fontWeight: 600 }}>3장</strong>이면 발볼·발등·아치를 읽고 1,120개 제품 중 딱 맞는 걸 골라드려요.
              </p>
              <div style={{ borderTop: `1px solid ${LINE}` }}>
                {[
                  ["01", "발볼·발등·아치 자동 분석", "줄자 없이 발 사진 3장으로 측정"],
                  ["02", "1,120개 실제 제품 매칭", "다나와 실시간 최저가 기준"],
                  ["03", "3가지 추천 + 이유 설명", "핏·스타일·절충안으로 비교"],
                ].map(([n, title, desc]) => (
                  <div key={n} style={{ display: "flex", gap: 16, padding: "20px 0", borderBottom: `1px solid ${LINE}`, alignItems: "flex-start" }}>
                    <span className="ff-m" style={{ fontSize: 13, fontWeight: 600, color: G, minWidth: 28, paddingTop: 2 }}>{n}</span>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 600, color: INK, margin: "0 0 2px" }}>{title}</p>
                      <p style={{ fontSize: 13, color: SUB, margin: 0 }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ paddingTop: 28, marginTop: 4 }}>
                <p style={{ fontSize: 15, color: INK, lineHeight: 1.65, margin: "0 0 8px", fontStyle: "italic" }}>
                  "발볼이 넓어서 항상 고민이었는데, 추천받은 거 바로 샀어요. 진짜 딱 맞아요."
                </p>
                <p className="ff-m" style={{ fontSize: 11, color: HINT, margin: 0, letterSpacing: 0.5 }}>— 27세 · 주 2회 풋살</p>
              </div>
            </div>

            {/* Sticky CTA */}
            <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, padding: "16px 24px 28px", background: "rgba(255,255,255,0.96)", borderTop: `1px solid ${LINE}`, zIndex: 40, boxSizing: "border-box" }}>
              <button className="ff-btn" onClick={() => setStep("photo-front")}
                style={{ width: "100%", background: G, color: "#fff", border: "none", height: 54, borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
                내 발 분석하기 →
              </button>
              <p className="ff-m" style={{ textAlign: "center", fontSize: 11, color: HINT, margin: "10px 0 0", letterSpacing: 0.4 }}>평균 3분 · 무료</p>
            </div>
          </div>
        )}

        {/* ── PHOTO STEPS ── */}
        {step === "photo-front" && <div style={{ padding: 24 }}><PhotoUploadStep stepIndex={0} totalSteps={3} title="1 / 3 · 정면 사진" subtitle={"발 전체가 보이게\n위에서 찍어주세요"} exampleSrc={guideFront} checklist={FRONT_CL} onNext={(p) => { setPhotos((prev) => ({ ...prev, front: p })); setStep("photo-side"); }} onBack={() => setStep("intro")} /></div>}
        {step === "photo-side" && <div style={{ padding: 24 }}><PhotoUploadStep stepIndex={1} totalSteps={3} title="2 / 3 · 측면 사진" subtitle={"발등 높이와 아치가\n보이게 옆에서 찍어주세요"} exampleSrc={guideSide} checklist={SIDE_CL} onNext={(p) => { setPhotos((prev) => ({ ...prev, side: p })); setStep("photo-heel"); }} onBack={() => setStep("photo-front")} /></div>}
        {step === "photo-heel" && <div style={{ padding: 24 }}><PhotoUploadStep stepIndex={2} totalSteps={3} title="3 / 3 · 뒤꿈치 사진" subtitle={"뒤꿈치 중심이\n정중앙에 오게 찍어주세요"} exampleSrc={guideHeel} checklist={HEEL_CL} onNext={(p) => { setPhotos((prev) => ({ ...prev, heel: p })); setStep("survey"); }} onBack={() => setStep("photo-side")} /></div>}

        {/* ── SURVEY ── */}
        {step === "survey" && current && (
          <div style={{ padding: 24 }}>
            {current.kind === "visual"
              ? <VisualSurveyQuestion current={surveyIndex} total={SURVEY_STEPS.length} title={current.title} question={current.question} helper={current.helper} options={current.options} onAnswer={(val) => handleSurveyAnswer(current.key, val)} onBack={surveyIndex > 0 ? () => setSurveyIndex(surveyIndex - 1) : () => setStep("photo-heel")} />
              : <NumberSurveyQuestion current={surveyIndex} total={SURVEY_STEPS.length} title={current.title} question={current.question} helper={current.helper} placeholder={current.placeholder} suffix={current.suffix} min={current.min} max={current.max} onAnswer={(val) => handleSurveyAnswer(current.key, val)} onBack={surveyIndex > 0 ? () => setSurveyIndex(surveyIndex - 1) : () => setStep("photo-heel")} />
            }
          </div>
        )}

        {/* ── ANALYZING ── */}
        {step === "analyzing" && <div style={{ padding: 24 }}><AnalyzingStep progress={progress} message={analyzeMsg} photoSrc={photos.front} /></div>}

        {/* ── RESULTS ── */}
        {step === "results" && results && fp && (
          <div style={{ padding: 24, paddingBottom: 48 }}>
            {aiResult && <FootAnalysisCard ai={aiResult} profile={profile} />}
            <h2 className="ff-h" style={{ fontSize: 30, fontWeight: 800, color: INK, margin: "0 0 4px", lineHeight: 1.15 }}>이런 축구화를 추천해요</h2>
            <p style={{ fontSize: 13, color: SUB, margin: "0 0 24px" }}>{groundLabel} · {profile.shoeSizeMm ?? "-"}mm 기준</p>
            {results.map((r, i) => <ResultCard key={i} result={r} fp={fp} />)}
            <button className="ff-btn" onClick={restart}
              style={{ width: "100%", marginTop: 16, background: "transparent", color: SUB, border: `1px solid ${LINE}`, height: 48, borderRadius: 10, fontSize: 14, cursor: "pointer" }}>
              처음부터 다시하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
