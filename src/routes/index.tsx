import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useRef, useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "발 사진으로 축구화 찾기" },
      { name: "description", content: "사진 3장과 간단한 질문 5개로 딱 맞는 축구화를 추천해드려요." },
      { property: "og:title", content: "발 사진으로 축구화 찾기" },
      { property: "og:description", content: "사진 3장과 간단한 질문 5개로 딱 맞는 축구화를 추천해드려요." },
    ],
  }),
  component: App,
});

const GREEN = "#0F6E56";
const GREEN_LIGHT = "#E1F5EE";

type Product = {
  id: string;
  brand: string;
  silo: string;
  modelName: string;
  groundTypes: string[];
  fitWidth: "넓음" | "보통" | "좁음";
  styleTag: string;
  weightClass: string;
  priceKrw: number;
  upperMaterial: string;
  gender: string;
};

const PRODUCTS: Product[] = [
  { id: "94634333", brand: "나이키", silo: "팬텀", modelName: "나이키 팬텀 6 로우 엘리트 AG 프로 HQ2335-400", groundTypes: ["AG"], fitWidth: "보통", styleTag: "올라운드", weightClass: "정보없음", priceKrw: 118250, upperMaterial: "합성가죽", gender: "남성용" },
  { id: "102881093", brand: "나이키", silo: "머큐리얼", modelName: "나이키 줌 머큐리얼 베이퍼 16 엘리트 AG-PRO FQ8693-446", groundTypes: ["AG"], fitWidth: "좁음", styleTag: "스피드", weightClass: "정보없음", priceKrw: 236490, upperMaterial: "니트", gender: "남녀공용" },
  { id: "75376451", brand: "미즈노", silo: "모렐리아 네오", modelName: "미즈노 모렐리아 네오 4 프로 AG P1GA2535-37", groundTypes: ["AG"], fitWidth: "좁음", styleTag: "터치_컨트롤", weightClass: "정보없음", priceKrw: 74840, upperMaterial: "천연가죽", gender: "남성용" },
  { id: "104224388", brand: "아디다스", silo: "F50", modelName: "아디다스 클럽 벨크로 TF JS1487", groundTypes: ["AG"], fitWidth: "좁음", styleTag: "스피드", weightClass: "정보없음", priceKrw: 28121, upperMaterial: "합성가죽", gender: "주니어용" },
  { id: "86719379", brand: "나이키", silo: "팬텀", modelName: "나이키 팬텀 GX 2 엘리트 AG-PRO FJ2554-100", groundTypes: ["AG"], fitWidth: "보통", styleTag: "올라운드", weightClass: "정보없음", priceKrw: 245010, upperMaterial: "합성가죽", gender: "남성용" },
  { id: "122618804", brand: "푸마", silo: "킹", modelName: "푸마 킹 20 얼티메이트 MG 108459-03", groundTypes: ["MG"], fitWidth: "보통", styleTag: "올라운드", weightClass: "정보없음", priceKrw: 142560, upperMaterial: "천연가죽", gender: "남성용" },
  { id: "94129226", brand: "나이키", silo: "머큐리얼", modelName: "나이키 줌 머큐리얼 베이퍼 16 엘리트 AG 프로 FQ7861-100", groundTypes: ["AG"], fitWidth: "좁음", styleTag: "스피드", weightClass: "정보없음", priceKrw: 229000, upperMaterial: "니트", gender: "남성용" },
  { id: "108226505", brand: "나이키", silo: "티엠포", modelName: "나이키 티엠포 마에스트로 아카데미 TF IB4484-100", groundTypes: ["TF"], fitWidth: "보통", styleTag: "올라운드", weightClass: "정보없음", priceKrw: 54900, upperMaterial: "천연가죽", gender: "남성용" },
  { id: "106753931", brand: "미즈노", silo: "알파", modelName: "미즈노 알파3 엘리트 AS P1GD266264", groundTypes: ["AS"], fitWidth: "넓음", styleTag: "올라운드", weightClass: "정보없음", priceKrw: 89900, upperMaterial: "합성가죽", gender: "남성용" },
  { id: "108446933", brand: "푸마", silo: "울트라", modelName: "푸마 울트라 6 얼티메이트 MG 108999-03", groundTypes: ["MG"], fitWidth: "보통", styleTag: "스피드", weightClass: "정보없음", priceKrw: 156870, upperMaterial: "합성가죽", gender: "남성용" },
  { id: "72416609", brand: "미즈노", silo: "모렐리아 네오", modelName: "미즈노 모렐리아 네오 4 베타 재팬 FG AG P1GA2536", groundTypes: ["FG", "AG"], fitWidth: "좁음", styleTag: "터치_컨트롤", weightClass: "정보없음", priceKrw: 215190, upperMaterial: "천연가죽", gender: "남성용" },
  { id: "95204216", brand: "나이키", silo: "머큐리얼", modelName: "나이키 줌 머큐리얼 베이퍼 16 프로 HG FQ8686-100", groundTypes: ["HG"], fitWidth: "좁음", styleTag: "스피드", weightClass: "정보없음", priceKrw: 169000, upperMaterial: "합성가죽", gender: "남성용" },
  { id: "93860060", brand: "미즈노", silo: "모나르시다 네오", modelName: "미즈노 모나르시다 네오 3 셀렉트 AG P1GA2526-60", groundTypes: ["AG"], fitWidth: "넓음", styleTag: "터치_컨트롤", weightClass: "정보없음", priceKrw: 48510, upperMaterial: "합성가죽", gender: "남성용" },
  { id: "66453518", brand: "아디다스", silo: "프레데터", modelName: "아디다스 프레데터 엘리트 AG IG7766", groundTypes: ["AG"], fitWidth: "보통", styleTag: "올라운드", weightClass: "정보없음", priceKrw: 159090, upperMaterial: "천연가죽", gender: "남성용" },
  { id: "77784575", brand: "나이키", silo: "팬텀", modelName: "나이키 팬텀 GX 엘리트 링크 FG DD9676-700", groundTypes: ["FG"], fitWidth: "보통", styleTag: "올라운드", weightClass: "정보없음", priceKrw: 80850, upperMaterial: "합성가죽", gender: "남성용" },
  { id: "122619657", brand: "아디다스", silo: "F50", modelName: "아디다스 F50 클럽 벨크로 TF 키즈 JS1486", groundTypes: ["AG"], fitWidth: "좁음", styleTag: "스피드", weightClass: "정보없음", priceKrw: 27553, upperMaterial: "합성가죽", gender: "주니어용" },
  { id: "puma_future7", brand: "푸마", silo: "퓨처", modelName: "푸마 퓨처 7 매치 FG AG", groundTypes: ["FG", "AG"], fitWidth: "넓음", styleTag: "터치_컨트롤", weightClass: "보통", priceKrw: 41390, upperMaterial: "합성가죽", gender: "남성용" },
  { id: "adidas_copa", brand: "아디다스", silo: "코파", modelName: "아디다스 코파 퓨어 AG", groundTypes: ["AG"], fitWidth: "넓음", styleTag: "터치_컨트롤", weightClass: "보통", priceKrw: 89000, upperMaterial: "천연가죽", gender: "남성용" },
];

type Profile = {
  groundType?: string;
  injuryHistory?: boolean;
  fitPreference?: string;
  playStyle?: string;
  budgetMaxKrw?: number;
};

function filterAdultProducts(products: Product[]) {
  return products.filter((p) => p.gender !== "주니어용");
}
function filterSafeGroundTypes(products: Product[], profile: Profile) {
  const target = profile.groundType;
  return products.filter((p) => {
    if (target && p.groundTypes.includes(target)) return true;
    if (!profile.injuryHistory && target === "AG" && p.groundTypes.includes("FG")) return true;
    return false;
  });
}
function filterBudget(products: Product[], profile: Profile) {
  const cap = (profile.budgetMaxKrw ?? 0) * 1.1;
  return products.filter((p) => p.priceKrw != null && p.priceKrw <= cap);
}
function pickFitFirst(products: Product[]) {
  const wide = products.filter((p) => p.fitWidth === "넓음");
  if (wide.length === 0) return null;
  wide.sort((a, b) => b.priceKrw - a.priceKrw);
  const chosen = wide[0];
  return { product: chosen, reason: `발볼이 넓은 편이라는 진단을 1순위로 반영했어요. '${chosen.silo}' 계열은 발볼이 넉넉한 편으로 알려져 있어요.` };
}
function pickStyleFirst(budgetProducts: Product[], safeProducts: Product[], profile: Profile) {
  let matched = budgetProducts.filter((p) => p.styleTag === profile.playStyle);
  if (matched.length > 0) {
    matched.sort((a, b) => a.priceKrw - b.priceKrw);
    const chosen = matched[0];
    let fitNote = "";
    if (chosen.fitWidth === "좁음") {
      fitNote = " 다만 이 라인은 발볼이 좁은 편으로 알려져 있어서, 평소 발볼이 넓다고 느끼셨다면 착화감이 타이트할 수 있어요.";
    }
    return { product: chosen, reason: `선호하시는 '${profile.playStyle}' 스타일을 1순위로 맞췄어요.${fitNote}`, overBudget: false };
  }
  matched = safeProducts.filter((p) => p.styleTag === profile.playStyle);
  if (matched.length > 0) {
    matched.sort((a, b) => a.priceKrw - b.priceKrw);
    const chosen = matched[0];
    const overAmount = chosen.priceKrw - (profile.budgetMaxKrw ?? 0);
    return { product: chosen, reason: `선호하시는 '${profile.playStyle}' 스타일 제품은 말씀하신 예산(${(profile.budgetMaxKrw ?? 0).toLocaleString()}원) 안에는 없었어요. 가장 저렴한 옵션도 약 ${overAmount.toLocaleString()}원 정도 예산을 넘어요.`, overBudget: true };
  }
  return null;
}
function pickBalanced(budgetProducts: Product[], profile: Profile) {
  const candidates = budgetProducts.filter((p) => p.fitWidth === "넓음" || p.fitWidth === "보통");
  if (candidates.length === 0) return null;
  const styleScore = (p: Product) => (p.styleTag === profile.playStyle ? 2 : profile.playStyle && p.styleTag.includes(profile.playStyle) ? 1 : 0);
  candidates.sort((a, b) => styleScore(b) - styleScore(a) || a.priceKrw - b.priceKrw);
  const chosen = candidates[0];
  return { product: chosen, reason: `발볼 편안함과 '${profile.playStyle}' 스타일 사이의 절충안이에요. '${chosen.silo}' 계열은 발볼이 ${chosen.fitWidth}으로 알려져 있고, 스타일도 어느 정도 맞아요.` };
}

type ResultItem = { label: string; product: Product | null; reason: string; overBudget: boolean };

function recommend(profile: Profile): { error: string | null; results: ResultItem[] } {
  const adult = filterAdultProducts(PRODUCTS);
  const safe = filterSafeGroundTypes(adult, profile);
  const budget = filterBudget(safe, profile);
  if (safe.length === 0) return { error: "그라운드 조건에 맞는 제품이 없어요.", results: [] };

  const results: ResultItem[] = [];
  const fit = pickFitFirst(budget);
  results.push({ label: "핏 우선", product: fit?.product || null, reason: fit?.reason || "조건에 맞는 제품을 찾지 못했어요.", overBudget: false });
  const style = pickStyleFirst(budget, safe, profile);
  results.push({ label: "스타일 우선", product: style?.product || null, reason: style?.reason || "조건에 맞는 제품을 찾지 못했어요.", overBudget: style?.overBudget || false });
  const bal = pickBalanced(budget, profile);
  results.push({ label: "절충안", product: bal?.product || null, reason: bal?.reason || "조건에 맞는 제품을 찾지 못했어요.", overBudget: false });
  return { error: null, results };
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
  stepIndex, totalSteps, title, subtitle, checklist, warnText, onNext, onBack,
}: {
  stepIndex: number; totalSteps: number; title: string; subtitle: string;
  checklist: ChecklistItem[]; warnText?: string;
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

      <div
        onClick={() => inputRef.current && inputRef.current.click()}
        style={{ borderRadius: 12, border: preview ? "1px solid #E5E2D9" : "1.5px dashed #C9C5B8", height: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16, cursor: "pointer", overflow: "hidden", background: preview ? "transparent" : "#FAF9F5" }}
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

      {warnText && (
        <div style={{ display: "flex", gap: 8, padding: 12, background: "#FFF8E1", borderRadius: 8, marginBottom: 16 }}>
          <span>⚠️</span>
          <p style={{ fontSize: 12, color: "#6B5A0B", margin: 0, lineHeight: 1.5 }}>{warnText}</p>
        </div>
      )}

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

type SurveyOption = { value: string | number | boolean; label: string };
function SurveyQuestion({
  question, options, onAnswer, onBack, current, total,
}: {
  question: string; options: SurveyOption[];
  onAnswer: (v: string | number | boolean) => void; onBack?: () => void;
  current: number; total: number;
}) {
  return (
    <div>
      <ProgressBar current={current} total={total} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        {onBack && (
          <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", padding: 0 }}>←</button>
        )}
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>간단한 질문</h2>
      </div>
      <p style={{ fontSize: 15, fontWeight: 600, color: "#1A1A18", margin: "0 0 16px 0", lineHeight: 1.5 }}>{question}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={() => onAnswer(opt.value)}
            style={{ width: "100%", textAlign: "left", padding: "14px 16px", borderRadius: 10, border: "1px solid #E5E2D9", background: "#fff", fontSize: 14, cursor: "pointer" }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AnalyzingStep({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: 48, height: 48, border: `3px solid ${GREEN_LIGHT}`, borderTopColor: GREEN, borderRadius: "50%", margin: "0 auto 20px", animation: "spin 0.9s linear infinite" }} />
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px 0" }}>발 모양을 분석하고 있어요</h2>
      <p style={{ fontSize: 13, color: "#6B6A65", margin: 0 }}>사진과 답변을 바탕으로 딱 맞는 축구화를 찾고 있어요</p>
    </div>
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
          <p style={{ fontSize: 12, color: "#6B6A65", margin: "0 0 6px 0" }}>발볼 {product.fitWidth} · {product.silo}</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: GREEN, margin: "0 0 10px 0" }}>{product.priceKrw.toLocaleString()}원</p>
          <p style={{ fontSize: 13, color: "#3A3A36", margin: 0, lineHeight: 1.6 }}>{reason}</p>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "#6B6A65", margin: 0, lineHeight: 1.6 }}>{reason}</p>
      )}
    </div>
  );
}

const FRONT_CHECKLIST: ChecklistItem[] = [
  { ok: true, text: "발가락부터 발뒤꿈치까지 전체가 보이게" },
  { ok: true, text: "가장 넓은 부분(발볼)이 선명하게 보이게" },
  { ok: true, text: "발가락은 자연스럽게 편 상태로" },
  { ok: false, text: "양말은 벗고, 비스듬한 각도는 피해주세요" },
];
const SIDE_CHECKLIST: ChecklistItem[] = [
  { ok: true, text: "발의 완전한 옆모습(안쪽 또는 바깥쪽)" },
  { ok: true, text: "카메라를 발과 수평으로 맞춰 촬영" },
  { ok: true, text: "아치(발바닥 곡선)가 선명하게 보이게" },
];
const HEEL_CHECKLIST: ChecklistItem[] = [
  { ok: true, text: "뒤꿈치 중심이 화면 정중앙에 오게" },
  { ok: true, text: "A4 용지 위에, 발 전체가 종이 안에 들어오게" },
  { ok: true, text: "뒤꿈치 너비와 발목이 같이 보이도록" },
];

type SurveyQ = { key: keyof Profile; question: string; options: SurveyOption[] };
const SURVEY_QUESTIONS: SurveyQ[] = [
  { key: "groundType", question: "주로 어디서 축구/풋살 하세요?", options: [
    { value: "FG", label: "천연잔디 (진짜 초록 잔디 구장)" },
    { value: "AG", label: "인조잔디 구장 (인공 잔디)" },
    { value: "HG", label: "맨땅/흙구장" },
    { value: "MG", label: "여러 구장 다 다녀요" },
  ]},
  { key: "injuryHistory", question: "전에 신던 축구화나 운동화 때문에 다치거나 크게 불편했던 적 있어요?", options: [
    { value: true, label: "네, 있어요 (발목 등)" },
    { value: false, label: "아니요, 큰 문제 없었어요" },
  ]},
  { key: "fitPreference", question: "평소 신발 신을 때 발볼(발 앞쪽 넓은 부분) 느낌은요?", options: [
    { value: "넓음", label: "넓어서 헐렁한 느낌이 자주 있어요" },
    { value: "좁음", label: "좁아서 끼는 느낌이 자주 있어요" },
    { value: "보통", label: "보통이에요, 특별히 느낀 적 없어요" },
  ]},
  { key: "playStyle", question: "포지션이나 플레이 스타일이 있나요?", options: [
    { value: "스피드", label: "공격수 쪽 (스피드, 슈팅 위주)" },
    { value: "터치_컨트롤", label: "미드필더 쪽 (볼 터치, 패스 위주)" },
    { value: "올라운드", label: "수비수/골키퍼 쪽 (안정성 중요)" },
    { value: "올라운드", label: "잘 모르겠어요, 즐기는 수준이에요" },
  ]},
  { key: "budgetMaxKrw", question: "예산은 어느 정도로 생각하세요?", options: [
    { value: 50000, label: "5만원 이하" },
    { value: 100000, label: "5~10만원" },
    { value: 200000, label: "10~20만원" },
    { value: 500000, label: "20만원 이상도 괜찮아요" },
  ]},
];

type Step = "intro" | "photo-front" | "photo-side" | "photo-heel" | "survey" | "analyzing" | "results";

function App() {
  const [step, setStep] = useState<Step>("intro");
  const [profile, setProfile] = useState<Profile>({});
  const [surveyIndex, setSurveyIndex] = useState(0);
  const [results, setResults] = useState<ReturnType<typeof recommend> | null>(null);

  const handleSurveyAnswer = (key: keyof Profile, value: string | number | boolean) => {
    const updated = { ...profile, [key]: value } as Profile;
    setProfile(updated);
    if (surveyIndex + 1 < SURVEY_QUESTIONS.length) setSurveyIndex(surveyIndex + 1);
    else {
      setStep("analyzing");
      // compute on analyze-done using latest profile
      setTimeout(() => {}, 0);
    }
  };

  const handleAnalyzeDone = () => {
    setResults(recommend(profile));
    setStep("results");
  };

  const restart = () => {
    setStep("intro");
    setProfile({});
    setSurveyIndex(0);
    setResults(null);
  };

  const groundLabel =
    profile.groundType === "AG" ? "인조잔디"
    : profile.groundType === "FG" ? "천연잔디"
    : profile.groundType === "HG" ? "맨땅"
    : "멀티";

  return (
    <div style={{ minHeight: "100vh", background: "#FAF9F5", padding: "20px 16px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#1A1A18" }}>
      <div style={{ maxWidth: 420, margin: "0 auto", background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
        {step === "intro" && (
          <div style={{ textAlign: "center", padding: "40px 8px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📷</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 10px 0" }}>발 사진으로 축구화 찾기</h1>
            <p style={{ fontSize: 14, color: "#6B6A65", margin: "0 0 8px 0", lineHeight: 1.6 }}>
              사진 3장과 간단한 질문 5개면, 딱 맞는 축구화 3개를 추천해드려요
            </p>
            <p style={{ fontSize: 12, color: "#9B9A95", margin: "0 0 28px 0" }}>실제 다나와 상품 데이터 기반</p>
            <button onClick={() => setStep("photo-front")} style={{ width: "100%", background: "#1A1A18", color: "#fff", border: "none", height: 46, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              시작하기
            </button>
          </div>
        )}

        {step === "photo-front" && (
          <PhotoUploadStep
            stepIndex={0} totalSteps={3}
            title="1/3 발 정면(위에서) 사진"
            subtitle="발 위에서 정면으로 한 장 찍어주세요"
            checklist={FRONT_CHECKLIST}
            onNext={() => setStep("photo-side")}
          />
        )}
        {step === "photo-side" && (
          <PhotoUploadStep
            stepIndex={1} totalSteps={3}
            title="2/3 발 옆모습 사진"
            subtitle="발 옆에서 수평으로 한 장 찍어주세요"
            checklist={SIDE_CHECKLIST}
            onNext={() => setStep("photo-heel")}
            onBack={() => setStep("photo-front")}
          />
        )}
        {step === "photo-heel" && (
          <PhotoUploadStep
            stepIndex={2} totalSteps={3}
            title="3/3 발 뒤꿈치 사진"
            subtitle="A4 용지 위에 올라가서 뒤에서 찍어주세요"
            checklist={HEEL_CHECKLIST}
            warnText="가능하면 A4 용지를 깔고 발 전체가 보이도록 찍으면 분석이 더 정확해져요."
            onNext={() => setStep("survey")}
            onBack={() => setStep("photo-side")}
          />
        )}

        {step === "survey" && (
          <SurveyQuestion
            current={surveyIndex}
            total={SURVEY_QUESTIONS.length}
            question={SURVEY_QUESTIONS[surveyIndex].question}
            options={SURVEY_QUESTIONS[surveyIndex].options}
            onAnswer={(val) => handleSurveyAnswer(SURVEY_QUESTIONS[surveyIndex].key, val)}
            onBack={surveyIndex > 0 ? () => setSurveyIndex(surveyIndex - 1) : () => setStep("photo-heel")}
          />
        )}

        {step === "analyzing" && <AnalyzingStep onDone={handleAnalyzeDone} />}

        {step === "results" && results && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px 0" }}>이런 축구화를 추천해요</h2>
            <p style={{ fontSize: 13, color: "#6B6A65", margin: "0 0 20px 0" }}>{groundLabel} 구장 기준</p>
            {results.error ? (
              <p style={{ fontSize: 14, color: "#B23636" }}>{results.error}</p>
            ) : (
              results.results.map((r, i) => <ResultCard key={i} result={r} />)
            )}
            <button onClick={restart} style={{ width: "100%", marginTop: 12, background: "transparent", color: "#6B6A65", border: "1px solid #E5E2D9", height: 44, borderRadius: 8, fontSize: 14, cursor: "pointer" }}>
              처음부터 다시하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
