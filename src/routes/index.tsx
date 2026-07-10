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

// ── Size/fit knowledge base (silo-level) ─────────────────────────
const SILO_FIT: Record<string, { note: string; adj: string }> = {
  "머큐리얼":      { note: "발볼이 좁은 라스트예요.", adj: "발볼 넓은 분은 +5mm 추천" },
  "모렐리아 네오": { note: "천연가죽이라 길들이면 늘어나요.", adj: "평소 사이즈로 구매하세요" },
  "모렐리아":      { note: "천연가죽이라 길들이면 늘어나요.", adj: "평소 사이즈로 구매하세요" },
  "티엠포":        { note: "발볼이 넉넉해요.", adj: "평소 사이즈로 구매하세요" },
  "팬텀":          { note: "발볼이 평균적이에요.", adj: "평소 사이즈로 구매하세요" },
  "코파":          { note: "천연가죽이라 길들이면 늘어나요.", adj: "평소 사이즈 또는 -5mm 가능" },
  "퓨처":          { note: "발볼이 넉넉한 핏이에요.", adj: "평소 사이즈로 구매하세요" },
  "킹":            { note: "클래식한 가죽 핏이에요.", adj: "평소 사이즈로 구매하세요" },
  "알파":          { note: "한국 발형에 잘 맞아요.", adj: "평소 사이즈로 구매하세요" },
  "모나르시다 네오":{ note: "발볼이 넉넉한 편이에요.", adj: "평소 사이즈로 구매하세요" },
  "모나르시다":    { note: "발볼이 넉넉해요.", adj: "평소 사이즈로 구매하세요" },
  "F50":           { note: "발볼이 좁은 라스트예요.", adj: "발볼 넓은 분은 +5mm 추천" },
  "엑스":          { note: "발볼이 좁고 타이트해요.", adj: "+5mm 추천" },
  "엑스 크레이지패스트": { note: "발볼이 좁은 편이에요.", adj: "+5mm 추천" },
  "울트라":        { note: "발볼이 보통이에요.", adj: "평소 사이즈로 구매하세요" },
};

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
    .sort((a, b) => {
      const sa = a.styleTag === fp.playStyle ? 0 : 1;
      const sb = b.styleTag === fp.playStyle ? 0 : 1;
      return sa !== sb ? sa - sb : a.priceKrw - b.priceKrw;
    })[0] ?? null;
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

// ── CSS ──────────────────────────────────────────────────────────
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
  @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
  @keyframes heroFade { 0%,100%{opacity:1;transform:translateY(0)} 45%{opacity:0;transform:translateY(-6px)} 55%{opacity:0;transform:translateY(6px)} }
  @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
  .ff-h { font-family:'Big Shoulders Display',sans-serif; }
  .ff-m { font-family:'IBM Plex Mono',monospace; }
  .ff-btn:active { transform:scale(0.98); }
  .ff-opt { transition: border-color 0.15s, background 0.15s; }
  .ff-opt:active { transform:scale(0.99); }
  .hero-val { animation: heroFade 3s ease-in-out infinite; }
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
  return <button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 22, color: INK, marginBottom: 24, display: "block", lineHeight: 1 }}>←</button>;
}

// 스크롤해서 뷰포트에 들어오면 카드가 살아나는 reveal 래퍼
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } });
    }, { threshold: 0.2, rootMargin: "0px 0px -40px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      opacity: shown ? 1 : 0,
      transform: shown ? "translateY(0) scale(1)" : "translateY(22px) scale(0.98)",
      transition: `opacity 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
    }}>
      {children}
    </div>
  );
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
      <h2 className="ff-h" style={{ fontSize: 28, fontWeight: 700, color: INK, margin: "0 0 20px", lineHeight: 1.15, whiteSpace: "pre-line" }}>{subtitle}</h2>

      {/* Example photo - full, unclipped */}
      <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 14, position: "relative", background: BG2 }}>
        <img src={exampleSrc} alt="촬영 예시" style={{ width: "100%", display: "block", maxHeight: 260, objectFit: "contain" }} />
        <div style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(0,0,0,0.55)", borderRadius: 6, padding: "3px 8px" }}>
          <span style={{ color: "#fff", fontSize: 11, fontWeight: 500 }}>예시 사진</span>
        </div>
      </div>

      <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 5 }}>
        {checklist.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ color: item.ok ? G : "#E05555", fontSize: 13, flexShrink: 0 }}>{item.ok ? "✓" : "✕"}</span>
            <span style={{ fontSize: 13, color: item.ok ? INK : "#E05555", lineHeight: 1.45 }}>{item.text}</span>
          </div>
        ))}
      </div>

      <div onClick={() => inputRef.current?.click()}
        style={{ borderRadius: 12, border: `1.5px dashed ${preview ? G : LINE}`, minHeight: 120, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 24, cursor: "pointer", overflow: "hidden", background: BG2 }}>
        {preview
          ? <img src={preview} alt="preview" style={{ width: "100%", maxHeight: 280, display: "block", objectFit: "contain" }} />
          : <><span style={{ fontSize: 22 }}>📷</span><span style={{ fontSize: 13, color: SUB }}>탭해서 사진 선택</span></>
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

// ── Foot scan step (AI runs here, 3 photos cycle) ─────────────────
const SCAN_INFO = [
  { key: "front" as const, label: "정면 사진 분석 중...", step: "발볼 너비 측정 중" },
  { key: "side"  as const, label: "측면 사진 분석 중...", step: "발등 높이 확인 중" },
  { key: "heel"  as const, label: "뒤꿈치 사진 분석 중...", step: "아치 형태 분석 중" },
];

function FootScanStep({ photos, onComplete }: {
  photos: { front: string | null; side: string | null; heel: string | null };
  onComplete: (ai: FootAnalysis | null) => void;
}) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const [apiDone, setApiDone] = useState(false);
  const [minTimeDone, setMinTimeDone] = useState(false);
  const aiRef = useRef<FootAnalysis | null>(null);
  const available = SCAN_INFO.filter(p => photos[p.key] !== null);

  // 사진별 1.8s 순환 — 최소 1회전 보장
  useEffect(() => {
    const PER_PHOTO = 1800;
    const id = setInterval(() => setPhotoIdx(i => (i + 1) % available.length), PER_PHOTO);
    // 최소 시간: 사진 수 × PER_PHOTO + 여유 0.5s
    const minId = setTimeout(() => setMinTimeDone(true), available.length * PER_PHOTO + 500);
    return () => { clearInterval(id); clearTimeout(minId); };
  }, [available.length]);

  // AI 분석 실행
  useEffect(() => {
    (async () => {
      try {
        if (photos.front) {
          aiRef.current = await analyzeFoot({ frontImage: photos.front, sideImage: photos.side, heelImage: photos.heel });
        }
      } catch { /* fallback */ }
      setApiDone(true);
    })();
  }, []);

  // API 완료 AND 최소 시간 모두 충족 시 다음 단계
  useEffect(() => {
    if (!apiDone || !minTimeDone) return;
    const id = setTimeout(() => onComplete(aiRef.current), 400);
    return () => clearTimeout(id);
  }, [apiDone, minTimeDone]);

  const cur = available[photoIdx % available.length];
  const src = cur ? photos[cur.key] : null;
  const progressPct = Math.round(((photoIdx + 1) / available.length) * 70 + (apiDone ? 30 : 0));

  return (
    <div style={{ padding: 24 }}>
      {/* 단계 표시 */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20 }}>
        {available.map((info, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: i <= photoIdx % available.length ? G : LINE, transition: "background 0.4s" }} />
            <span className="ff-m" style={{ fontSize: 9, color: i <= photoIdx % available.length ? G : HINT, letterSpacing: 0.3 }}>
              {info.key === "front" ? "정면" : info.key === "side" ? "측면" : "뒤꿈치"}
            </span>
          </div>
        ))}
      </div>

      {src && (
        <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", marginBottom: 24 }}>
          <img key={src} src={src} alt="발 분석 중" style={{ width: "100%", display: "block", maxHeight: 320, objectFit: "cover", animation: "fadeIn 0.4s ease" }} />
          <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent 0%,${G} 20%,#00FFCC 50%,${G} 80%,transparent 100%)`, boxShadow: `0 0 12px 2px ${G}`, animation: "scanDown 1.8s ease-in-out infinite", top: 0 }} />
          {[[true,true,false,false],[true,false,false,true],[false,true,true,false],[false,false,true,true]].map(([bt,bl,bb,br],i) => (
            <div key={i} style={{ position:"absolute", width:18, height:18, top:bt||!bb?8:undefined, bottom:bb?8:undefined, left:bl||!br?8:undefined, right:br?8:undefined, borderTop:bt?`2px solid ${G}`:"none", borderBottom:bb?`2px solid ${G}`:"none", borderLeft:bl?`2px solid ${G}`:"none", borderRight:br?`2px solid ${G}`:"none" }} />
          ))}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)", padding: "32px 16px 14px" }}>
            <p className="ff-m" style={{ color: "#00FFCC", fontSize: 12, margin: 0, animation: "pulse 1.2s ease-in-out infinite" }}>▶ {cur?.step}</p>
          </div>
        </div>
      )}

      <h2 style={{ fontSize: 18, fontWeight: 700, color: INK, margin: "0 0 4px" }}>발 사진 {available.length}장을 분석하고 있어요</h2>
      <p style={{ fontSize: 13, color: SUB, margin: "0 0 16px" }}>{cur?.label}</p>
      <div style={{ height: 4, borderRadius: 2, background: LINE, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progressPct}%`, background: G, borderRadius: 2, transition: "width 1.5s ease" }} />
      </div>
      <p className="ff-m" style={{ fontSize: 11, color: HINT, margin: "6px 0 0", textAlign: "right" }}>{progressPct}%</p>
    </div>
  );
}

// ── Survey components ────────────────────────────────────────────
type VisualOption = { value: string | number; label: string; hint?: string };

function VisualSurveyQuestion({ title, question, helper, options, onAnswer, onBack, current, total, aiHint }: {
  title: string; question: string; helper?: string; options: VisualOption[];
  onAnswer: (v: string | number) => void; onBack?: () => void;
  current: number; total: number; aiHint?: string;
}) {
  const [selected, setSelected] = useState<string | number | null>(null);

  return (
    <div>
      <ProgressBar current={current} total={total} />
      {onBack && <BackBtn onClick={onBack} />}
      <p style={{ fontSize: 12, fontWeight: 600, color: G, margin: "0 0 6px", letterSpacing: 0.3 }}>{title}</p>
      <h2 className="ff-h" style={{ fontSize: 26, fontWeight: 700, color: INK, margin: "0 0 8px", lineHeight: 1.2 }}>{question}</h2>
      {helper && <p style={{ fontSize: 13, color: SUB, margin: "0 0 16px", lineHeight: 1.55 }}>{helper}</p>}
      {aiHint && (
        <div style={{ background: GL, borderRadius: 8, padding: "8px 12px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: G }}>AI 감지</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: G }}>{aiHint}</span>
        </div>
      )}
      {!helper && !aiHint && <div style={{ marginBottom: 20 }} />}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {options.map((opt) => (
          <button key={String(opt.value)} className="ff-opt" onClick={() => setSelected(opt.value)}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", border: selected === opt.value ? `2px solid ${G}` : `1px solid ${LINE}`, borderRadius: 12, background: selected === opt.value ? GL : BG, cursor: "pointer", textAlign: "left" }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: selected === opt.value ? G : INK }}>{opt.label}</span>
            {opt.hint && <span style={{ fontSize: 12, color: selected === opt.value ? G : HINT }}>{opt.hint}</span>}
          </button>
        ))}
      </div>
      <button className="ff-btn" onClick={() => selected !== null && onAnswer(selected)} disabled={selected === null}
        style={{ width: "100%", background: selected !== null ? INK : LINE, color: selected !== null ? "#fff" : HINT, border: "none", height: 52, borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: selected !== null ? "pointer" : "not-allowed" }}>
        다음
      </button>
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

// ── Result components ────────────────────────────────────────────
function FootAnalysisCard({ ai, profile }: { ai: FootAnalysis; profile: Profile }) {
  return (
    <div style={{ background: GL, borderRadius: 14, padding: "16px 20px", marginBottom: 24, animation: "fadeIn 0.4s ease" }}>
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
  const siloFit = SILO_FIT[product.silo] ?? null;

  return (
    <div style={{ border: `1px solid ${isTop ? G : LINE}`, borderRadius: 16, overflow: "hidden", marginBottom: 12, background: BG, animation: "fadeIn 0.4s ease" }}>
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
        <p className="ff-h" style={{ fontSize: 24, fontWeight: 800, color: isTop ? G : INK, margin: "0 0 10px" }}>{product.priceKrw.toLocaleString()}원</p>

        {/* Size fit note */}
        {siloFit && (
          <div style={{ background: BG2, borderRadius: 8, padding: "10px 12px", marginBottom: 12, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span className="ff-m" style={{ fontSize: 10, color: G, flexShrink: 0, paddingTop: 2 }}>사이즈</span>
            <div>
              <p style={{ fontSize: 12, color: INK, margin: "0 0 1px", fontWeight: 600 }}>{siloFit.note}</p>
              <p style={{ fontSize: 12, color: SUB, margin: 0 }}>{siloFit.adj}</p>
            </div>
          </div>
        )}

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

// ── Intro screen (animated hero) ─────────────────────────────────
const NEON = "#00FFAA";

const HERO_STATES = [
  { cards: [{ k:"발볼", v:"넓음" }, { k:"아치", v:"보통" }, { k:"뒤꿈치", v:"보통" }], score: "94", label: "Perfect Match", shoe: "미즈노 알파3 엘리트 AS", price: "89,900원", brand: "MIZUNO" },
  { cards: [{ k:"발볼", v:"좁음" }, { k:"아치", v:"높음" }, { k:"뒤꿈치", v:"좁음" }], score: "97", label: "Best Match", shoe: "나이키 줌 머큐리얼 베이퍼 16", price: "229,000원", brand: "NIKE" },
  { cards: [{ k:"발볼", v:"보통" }, { k:"아치", v:"낮음" }, { k:"뒤꿈치", v:"보통" }], score: "91", label: "Great Match", shoe: "아디다스 코파 퓨어.1 AG", price: "159,000원", brand: "ADIDAS" },
];

const REVIEWS = [
  { text: "발볼이 넓어서 항상 고민이었는데, 추천받은 거 바로 샀어요. 진짜 딱 맞아요.", info: "27세 · 주 2회 풋살", shoe: "미즈노 알파3 엘리트 AS", rating: 5 },
  { text: "머큐리얼 원래 꽉 낀다 했는데 한 사이즈 크게 사라고 알려줘서 딱 맞게 샀습니다.", info: "32세 · 학교 운동장", shoe: "나이키 머큐리얼 베이퍼 16", rating: 5 },
  { text: "발 사진 찍는 거 처음엔 어색했는데 결과가 생각보다 훨씬 정확해요. 아치 분석이 특히 맞았음.", info: "19세 · 주 3회 풋살", shoe: "아디다스 코파 퓨어 AG", rating: 5 },
  { text: "AG/FG 구분도 해줘서 좋았어요. 천연잔디 쓰는데 FG 추천해줘서 부상 걱정 없이 씀.", info: "24세 · 천연잔디 주 1회", shoe: "미즈노 모렐리아 네오 4", rating: 4 },
  { text: "발등이 높은 편인데 끈 조절 팁까지 같이 알려줘서 신을 때 아프지 않아요.", info: "29세 · 풋살장 주 1회", shoe: "아디다스 F50 엘리트 AG", rating: 5 },
  { text: "예산 맞춰서 세 켤레 비교해준 게 좋았어요. 고민 없이 바로 결정했습니다.", info: "22세 · 여러 구장", shoe: "나이키 팬텀 GX2 아카데미", rating: 5 },
];

function Stars({ n }: { n: number }) {
  return (
    <span style={{ letterSpacing: 1.5, fontSize: 12, color: "#FFB020" }}>
      {"★".repeat(n)}{"☆".repeat(5 - n)}
    </span>
  );
}

function IntroScreen({ onStart }: { onStart: () => void }) {
  const [heroIdx, setHeroIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [logoKo, setLogoKo] = useState(false);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [reviewVisible, setReviewVisible] = useState(true);

  // Hero card cycling
  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setHeroIdx(i => (i + 1) % HERO_STATES.length); setVisible(true); }, 350);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  // Logo EN/KR alternating
  useEffect(() => {
    const id = setInterval(() => setLogoKo(v => !v), 2800);
    return () => clearInterval(id);
  }, []);

  // Review cycling
  useEffect(() => {
    const id = setInterval(() => {
      setReviewVisible(false);
      setTimeout(() => { setReviewIdx(i => (i + 1) % REVIEWS.length); setReviewVisible(true); }, 300);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const h = HERO_STATES[heroIdx];
  const rev = REVIEWS[reviewIdx];

  return (
    <div style={{ minHeight: "100vh", background: "#111111" }}>
      {/* ── Dark hero ── */}
      <div style={{ background: "#111111", padding: "0 24px 48px" }}>

        {/* Logo — alternates EN/KR */}
        <div style={{ display: "flex", alignItems: "center", padding: "22px 0 36px" }}>
          <span className="ff-h" style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", transition: "opacity 0.4s", opacity: 1 }}>
            {logoKo ? "풋핏" : "FootFit"}
          </span>
          <span style={{ marginLeft: 6, width: 6, height: 6, borderRadius: 3, background: NEON, display: "inline-block" }} />
        </div>

        {/* Animated analysis preview */}
        <div style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(-6px)", transition: "opacity 0.3s ease, transform 0.3s ease", marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {h.cards.map(({ k, v }) => (
              <div key={k} style={{ flex: 1, background: "#1c1c1c", borderRadius: 12, padding: "14px 8px", textAlign: "center", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="ff-m" style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", margin: "0 0 6px", letterSpacing: 0.6 }}>{k}</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 }}>{v}</p>
              </div>
            ))}
          </div>

          <div style={{ background: "#181818", borderRadius: 14, padding: "16px 18px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                <p className="ff-m" style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", margin: "0 0 3px", letterSpacing: 0.6 }}>{h.brand}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: "0 0 2px", lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.shoe}</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>{h.price}</p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p className="ff-h" style={{ fontSize: 38, fontWeight: 800, color: NEON, margin: 0, lineHeight: 1 }}>{h.score}<span style={{ fontSize: 18 }}>%</span></p>
                <p className="ff-m" style={{ fontSize: 9, color: NEON, margin: "2px 0 0", letterSpacing: 0.4, opacity: 0.65 }}>{h.label}</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {[parseInt(h.score), parseInt(h.score)-3, parseInt(h.score)-7, parseInt(h.score)-1].map((v, i) => (
                <div key={i} style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${v}%`, background: v >= 90 ? NEON : G, borderRadius: 2, transition: "width 0.6s ease" }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: "0 0 10px", lineHeight: 1.3, letterSpacing: "-0.02em" }}>
          내 발에 맞는 축구화를<br />찾아드립니다.
        </h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", margin: "0 0 28px", lineHeight: 1.6 }}>
          발 사진 3장 · AI 분석 · 실시간 최저가
        </p>

        {/* CTA — neon color */}
        <button className="ff-btn" onClick={onStart}
          style={{ width: "100%", background: NEON, color: "#0a0a0a", border: "none", height: 56, borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: "pointer", letterSpacing: "-0.01em" }}>
          발 분석 시작하기 →
        </button>
      </div>

      {/* ── Gradient bridge dark→white (부드럽게 여러 단계로) ── */}
      <div style={{ height: 110, background: "linear-gradient(to bottom, #111111 0%, #2b2b2b 22%, #6b6b6b 55%, #e9e9e9 82%, #ffffff 100%)" }} />

      {/* ── White content ── */}
      <div style={{ background: BG, padding: "0 24px 80px" }}>

        {/* Feature list */}
        <div style={{ borderTop: `1px solid ${LINE}` }}>
          {[
            ["01", "발볼·발등·아치 자동 분석", "줄자 없이 발 사진 3장으로 측정"],
            ["02", "1,120개 실제 제품 매칭",   "다나와 실시간 최저가 기준"],
            ["03", "3가지 추천 + 이유 설명",   "핏·스타일·절충안으로 비교"],
          ].map(([n, title, desc], i) => (
            <Reveal key={n} delay={i * 90}>
              <div style={{ display: "flex", gap: 16, padding: "20px 0", borderBottom: `1px solid ${LINE}`, alignItems: "flex-start" }}>
                <span className="ff-m" style={{ fontSize: 13, fontWeight: 600, color: G, minWidth: 28, paddingTop: 2 }}>{n}</span>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: INK, margin: "0 0 2px" }}>{title}</p>
                  <p style={{ fontSize: 13, color: SUB, margin: 0 }}>{desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Reviews section — cycling */}
        <div style={{ marginTop: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Stars n={5} />
            <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>4.9</span>
            <span style={{ fontSize: 12, color: SUB }}>실사용자 후기</span>
          </div>
          <p className="ff-m" style={{ fontSize: 11, color: HINT, letterSpacing: 0.5, marginBottom: 16 }}>USER REVIEWS</p>

          {/* Cycling review */}
          <div style={{ opacity: reviewVisible ? 1 : 0, transform: reviewVisible ? "translateY(0)" : "translateY(6px)", transition: "opacity 0.3s ease, transform 0.3s ease", marginBottom: 16 }}>
            <div style={{ background: BG2, borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <Stars n={rev.rating} />
                <span style={{ fontSize: 10, fontWeight: 600, color: G, background: GL, padding: "3px 8px", borderRadius: 100 }}>✓ 실구매 인증</span>
              </div>
              <p style={{ fontSize: 15, color: INK, lineHeight: 1.65, margin: "0 0 12px", fontStyle: "italic" }}>
                "{rev.text}"
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: SUB }}>{rev.info}</span>
                <span style={{ fontSize: 11, background: GL, color: G, padding: "3px 8px", borderRadius: 100, fontWeight: 600 }}>{rev.shoe.split(" ").slice(0, 2).join(" ")}</span>
              </div>
            </div>
          </div>

          {/* Review dots */}
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 24 }}>
            {REVIEWS.map((_, i) => (
              <div key={i} style={{ width: i === reviewIdx ? 16 : 6, height: 6, borderRadius: 3, background: i === reviewIdx ? G : LINE, transition: "all 0.3s ease" }} />
            ))}
          </div>

          {/* Static mini reviews — scroll reveal */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {REVIEWS.slice(1).map((r, i) => (
              <Reveal key={i} delay={i * 70}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 0", borderTop: `1px solid ${LINE}` }}>
                  <div style={{ width: 32, height: 32, borderRadius: 16, background: GL, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 13 }}>🦶</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <Stars n={r.rating} />
                      <span style={{ fontSize: 9, fontWeight: 600, color: G }}>✓ 인증</span>
                    </div>
                    <p style={{ fontSize: 13, color: INK, lineHeight: 1.5, margin: "0 0 4px" }}>"{r.text.slice(0, 45)}..."</p>
                    <span style={{ fontSize: 11, color: SUB }}>{r.info}</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Survey data ──────────────────────────────────────────────────
const FRONT_CL: ChecklistItem[] = [
  { ok: true,  text: "맨발로, 위에서 수직으로 촬영" },
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

type SurveyStepDef =
  | { kind: "visual"; key: keyof Profile; title: string; question: string; helper?: string; options: VisualOption[]; aiHintKey?: "footWidth" }
  | { kind: "number"; key: keyof Profile; title: string; question: string; helper?: string; placeholder: string; suffix: string; min: number; max: number };

const SURVEY_STEPS: SurveyStepDef[] = [
  { kind: "visual", key: "place", title: "구장 환경 · 1/8", question: "주로 어디서 뛰시나요?", helper: "구장 표면에 따라 스터드 종류가 달라져요.", options: [
    { value: "school", label: "학교 운동장", hint: "AG" },
    { value: "turf",   label: "풋살장", hint: "AG" },
    { value: "natural",label: "천연 잔디", hint: "FG" },
    { value: "mixed",  label: "여러 구장", hint: "MG" },
  ]},
  { kind: "number", key: "shoeSizeMm", title: "사이즈 · 2/8", question: "평소 운동화 사이즈는?", helper: "mm 단위로 입력해주세요 (예: 265)", placeholder: "265", suffix: "mm", min: 200, max: 320 },
  { kind: "visual", key: "shoeFitFeel", title: "발볼 자가진단 · 3/8", question: "운동화 신을 때 발 앞쪽이 어떤가요?", aiHintKey: "footWidth", options: [
    { value: "tight", label: "꽉 끼고 답답해요", hint: "발볼 넓음" },
    { value: "ok",    label: "딱 맞게 편해요",   hint: "표준" },
    { value: "loose", label: "헐렁한 편이에요",  hint: "발볼 좁음" },
  ]},
  { kind: "visual", key: "instepHeight", title: "발등 높이 · 4/8", question: "신발 끈 매면 발등이 어떤가요?", options: [
    { value: "low",    label: "꽉 조여야 편해요",  hint: "발등 낮음" },
    { value: "normal", label: "평범하게 매도 돼요", hint: "보통" },
    { value: "high",   label: "끈을 풀어야 편해요", hint: "발등 높음" },
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
    { value: "none",       label: "없음" },
    { value: "ankle",      label: "발목 염좌" },
    { value: "metatarsal", label: "중족골 통증" },
    { value: "knee",       label: "무릎 통증" },
  ]},
  { kind: "visual", key: "budget", title: "예산 · 8/8", question: "축구화에 얼마까지 쓸 수 있나요?", options: [
    { value: 50000,  label: "5만원 이하" },
    { value: 100000, label: "10만원까지" },
    { value: 200000, label: "20만원까지" },
    { value: 500000, label: "금액 무관" },
  ]},
];

// ── App ──────────────────────────────────────────────────────────
type Step = "intro" | "photo-front" | "photo-side" | "photo-heel" | "foot-scan" | "survey" | "results";

function App() {
  const [step, setStep] = useState<Step>("intro");
  const [profile, setProfile] = useState<Profile>({});
  const [surveyIndex, setSurveyIndex] = useState(0);
  const [photos, setPhotos] = useState<{ front: string | null; side: string | null; heel: string | null }>({ front: null, side: null, heel: null });
  const [aiResult, setAiResult] = useState<FootAnalysis | null>(null);
  const [results, setResults] = useState<ResultItem[] | null>(null);
  const [fp, setFp] = useState<FinalProfile | null>(null);

  const handleSurveyAnswer = (key: keyof Profile, value: string | number) => {
    const updated = { ...profile, [key]: value } as Profile;
    setProfile(updated);
    if (surveyIndex + 1 < SURVEY_STEPS.length) {
      setSurveyIndex(surveyIndex + 1);
    } else {
      // All survey done → generate results
      const finalFp = buildFinalProfile(updated, aiResult);
      setFp(finalFp);
      setResults(recommend(finalFp, aiResult));
      setStep("results");
    }
  };

  const handleScanComplete = (ai: FootAnalysis | null) => {
    setAiResult(ai);
    setStep("survey");
  };

  const restart = () => {
    setStep("intro"); setProfile({}); setSurveyIndex(0);
    setPhotos({ front: null, side: null, heel: null });
    setAiResult(null); setResults(null); setFp(null);
  };

  const groundLabel = profile.place === "natural" ? "천연잔디" : profile.place === "school" ? "학교 운동장" : profile.place === "turf" ? "풋살장" : "여러 구장";
  const current = SURVEY_STEPS[surveyIndex];

  // AI hint for foot width question
  const aiHint = (s: SurveyStepDef) =>
    s.kind === "visual" && s.aiHintKey === "footWidth" && aiResult?.footWidth
      ? `발볼 ${aiResult.footWidth}`
      : undefined;

  return (
    <div style={{ minHeight: "100vh", background: BG2, fontFamily: "-apple-system, 'Inter', sans-serif", color: INK }}>
      <style>{CSS}</style>
      <div style={{ maxWidth: 430, margin: "0 auto", background: BG, minHeight: "100vh" }}>

        {/* ── INTRO ── */}
        {step === "intro" && <IntroScreen onStart={() => setStep("photo-front")} />}

        {/* ── PHOTO STEPS ── */}
        {step === "photo-front" && (
          <div style={{ padding: 24 }}>
            <PhotoUploadStep stepIndex={0} totalSteps={3} title="1 / 3 · 정면 사진" subtitle={"발 전체가 보이게\n위에서 찍어주세요"} exampleSrc={guideFront} checklist={FRONT_CL}
              onNext={(p) => { setPhotos((prev) => ({ ...prev, front: p })); setStep("photo-side"); }} onBack={() => setStep("intro")} />
          </div>
        )}
        {step === "photo-side" && (
          <div style={{ padding: 24 }}>
            <PhotoUploadStep stepIndex={1} totalSteps={3} title="2 / 3 · 측면 사진" subtitle={"발등 높이와 아치가\n보이게 옆에서 찍어주세요"} exampleSrc={guideSide} checklist={SIDE_CL}
              onNext={(p) => { setPhotos((prev) => ({ ...prev, side: p })); setStep("photo-heel"); }} onBack={() => setStep("photo-front")} />
          </div>
        )}
        {step === "photo-heel" && (
          <div style={{ padding: 24 }}>
            <PhotoUploadStep stepIndex={2} totalSteps={3} title="3 / 3 · 뒤꿈치 사진" subtitle={"뒤꿈치 중심이\n정중앙에 오게 찍어주세요"} exampleSrc={guideHeel} checklist={HEEL_CL}
              onNext={(p) => { setPhotos((prev) => ({ ...prev, heel: p })); setStep("foot-scan"); }} onBack={() => setStep("photo-side")} />
          </div>
        )}

        {/* ── FOOT SCAN (AI analysis runs here) ── */}
        {step === "foot-scan" && (
          <FootScanStep photos={photos} onComplete={handleScanComplete} />
        )}

        {/* ── SURVEY (with AI context) ── */}
        {step === "survey" && current && (
          <div style={{ padding: 24 }}>
            {/* Show mini AI result bar during survey */}
            {aiResult && (
              <div style={{ background: GL, borderRadius: 8, padding: "8px 14px", marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
                <p className="ff-m" style={{ fontSize: 10, color: G, margin: 0, letterSpacing: 0.3 }}>AI 분석</p>
                <div style={{ display: "flex", gap: 8 }}>
                  {[`발볼 ${aiResult.footWidth}`, `아치 ${aiResult.archHeight}`].map(t => (
                    <span key={t} style={{ fontSize: 11, fontWeight: 600, color: G, background: "#fff", padding: "2px 8px", borderRadius: 100 }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
            {current.kind === "visual"
              ? <VisualSurveyQuestion key={surveyIndex} current={surveyIndex} total={SURVEY_STEPS.length} title={current.title} question={current.question} helper={current.helper} options={current.options} aiHint={aiHint(current)} onAnswer={(val) => handleSurveyAnswer(current.key, val)} onBack={surveyIndex > 0 ? () => setSurveyIndex(surveyIndex - 1) : () => setStep("foot-scan")} />
              : <NumberSurveyQuestion key={surveyIndex} current={surveyIndex} total={SURVEY_STEPS.length} title={current.title} question={current.question} helper={current.helper} placeholder={current.placeholder} suffix={current.suffix} min={current.min} max={current.max} onAnswer={(val) => handleSurveyAnswer(current.key, val)} onBack={surveyIndex > 0 ? () => setSurveyIndex(surveyIndex - 1) : () => setStep("foot-scan")} />
            }
          </div>
        )}

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
