// 제품 데이터 — 미리 다나와에서 크롤링한 결과를 여기에 채워넣으면 됩니다.
// danawa_detail_crawler.py로 만든 JSON에서:
//   reviewSnippet: 리뷰 본문 1~2문장 발췌
//   reviewKeywords: 발볼/사이즈 관련 키워드 (예: ["발볼 넓음", "사이즈 정사이즈"])
//   lowestPriceUrl: 다나와 비교 페이지 URL (클릭 시 최저가 쇼핑몰 연결)
//   lowestPriceShop: 최저가 쇼핑몰 이름

export type Product = {
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
  reviewSnippet: string;
  reviewKeywords: string[];
  lowestPriceUrl: string;
  lowestPriceShop: string;
};

const danawaUrl = (pcode: string) =>
  `https://prod.danawa.com/info/?pcode=${pcode}`;

export const PRODUCTS: Product[] = [
  { id: "94634333", brand: "나이키", silo: "팬텀", modelName: "나이키 팬텀 6 로우 엘리트 AG 프로", groundTypes: ["AG"], fitWidth: "보통", styleTag: "올라운드", weightClass: "보통", priceKrw: 118250, upperMaterial: "합성가죽", gender: "남성용",
    reviewSnippet: "발등이 낮고 발볼이 평균인 분께 잘 맞아요. 한 사이즈 크게 신는 게 편했어요.", reviewKeywords: ["발볼 보통", "정사이즈"], lowestPriceUrl: danawaUrl("94634333"), lowestPriceShop: "다나와 최저가" },
  { id: "102881093", brand: "나이키", silo: "머큐리얼", modelName: "나이키 줌 머큐리얼 베이퍼 16 엘리트 AG-PRO", groundTypes: ["AG"], fitWidth: "좁음", styleTag: "스피드", weightClass: "가벼움", priceKrw: 236490, upperMaterial: "니트", gender: "남녀공용",
    reviewSnippet: "정말 가볍고 발에 밀착돼요. 발볼 넓으신 분은 0.5 큰 사이즈 추천.", reviewKeywords: ["발볼 좁음", "타이트"], lowestPriceUrl: danawaUrl("102881093"), lowestPriceShop: "다나와 최저가" },
  { id: "75376451", brand: "미즈노", silo: "모렐리아 네오", modelName: "미즈노 모렐리아 네오 4 프로 AG", groundTypes: ["AG"], fitWidth: "좁음", styleTag: "터치_컨트롤", weightClass: "가벼움", priceKrw: 74840, upperMaterial: "천연가죽", gender: "남성용",
    reviewSnippet: "캥거루 가죽이라 길들이면 발에 감겨요. 처음엔 좁게 느껴질 수 있음.", reviewKeywords: ["발볼 좁음", "길들임 필요"], lowestPriceUrl: danawaUrl("75376451"), lowestPriceShop: "다나와 최저가" },
  { id: "86719379", brand: "나이키", silo: "팬텀", modelName: "나이키 팬텀 GX 2 엘리트 AG-PRO", groundTypes: ["AG"], fitWidth: "보통", styleTag: "올라운드", weightClass: "보통", priceKrw: 245010, upperMaterial: "합성가죽", gender: "남성용",
    reviewSnippet: "그립감이 좋고 발 모양에 잘 맞아요. 사이즈는 평소대로.", reviewKeywords: ["발볼 보통", "정사이즈"], lowestPriceUrl: danawaUrl("86719379"), lowestPriceShop: "다나와 최저가" },
  { id: "122618804", brand: "푸마", silo: "킹", modelName: "푸마 킹 20 얼티메이트 MG", groundTypes: ["MG", "AG"], fitWidth: "보통", styleTag: "올라운드", weightClass: "보통", priceKrw: 142560, upperMaterial: "천연가죽", gender: "남성용",
    reviewSnippet: "전통적인 가죽 핏이라 클래식한 착화감. 발볼 보통~넓은 분도 무난.", reviewKeywords: ["발볼 보통", "편안함"], lowestPriceUrl: danawaUrl("122618804"), lowestPriceShop: "다나와 최저가" },
  { id: "94129226", brand: "나이키", silo: "머큐리얼", modelName: "나이키 줌 머큐리얼 베이퍼 16 엘리트 AG 프로", groundTypes: ["AG"], fitWidth: "좁음", styleTag: "스피드", weightClass: "가벼움", priceKrw: 229000, upperMaterial: "니트", gender: "남성용",
    reviewSnippet: "스피드 좋고 발에 감기는 느낌. 발볼 넓으면 추천 안 함.", reviewKeywords: ["발볼 좁음", "스피드"], lowestPriceUrl: danawaUrl("94129226"), lowestPriceShop: "다나와 최저가" },
  { id: "108226505", brand: "나이키", silo: "티엠포", modelName: "나이키 티엠포 마에스트로 아카데미 TF", groundTypes: ["TF"], fitWidth: "보통", styleTag: "올라운드", weightClass: "보통", priceKrw: 54900, upperMaterial: "천연가죽", gender: "남성용",
    reviewSnippet: "풋살화로도 좋고 발 편함. 가성비 좋음.", reviewKeywords: ["발볼 보통", "가성비"], lowestPriceUrl: danawaUrl("108226505"), lowestPriceShop: "다나와 최저가" },
  { id: "106753931", brand: "미즈노", silo: "알파", modelName: "미즈노 알파3 엘리트 AS", groundTypes: ["AG"], fitWidth: "넓음", styleTag: "올라운드", weightClass: "보통", priceKrw: 89900, upperMaterial: "합성가죽", gender: "남성용",
    reviewSnippet: "발볼 넓은 한국발에 정말 잘 맞아요. 편안함 최고.", reviewKeywords: ["발볼 넓음", "한국발"], lowestPriceUrl: danawaUrl("106753931"), lowestPriceShop: "다나와 최저가" },
  { id: "108446933", brand: "푸마", silo: "울트라", modelName: "푸마 울트라 6 얼티메이트 MG", groundTypes: ["MG", "AG"], fitWidth: "보통", styleTag: "스피드", weightClass: "가벼움", priceKrw: 156870, upperMaterial: "합성가죽", gender: "남성용",
    reviewSnippet: "가볍고 스피드용으로 좋음. 발등 낮은 분도 OK.", reviewKeywords: ["발볼 보통", "가벼움"], lowestPriceUrl: danawaUrl("108446933"), lowestPriceShop: "다나와 최저가" },
  { id: "72416609", brand: "미즈노", silo: "모렐리아 네오", modelName: "미즈노 모렐리아 네오 4 베타 재팬 FG AG", groundTypes: ["FG", "AG"], fitWidth: "좁음", styleTag: "터치_컨트롤", weightClass: "가벼움", priceKrw: 215190, upperMaterial: "천연가죽", gender: "남성용",
    reviewSnippet: "캥거루 가죽 최상급. 좁은 핏이지만 길들이면 환상.", reviewKeywords: ["발볼 좁음", "프리미엄"], lowestPriceUrl: danawaUrl("72416609"), lowestPriceShop: "다나와 최저가" },
  { id: "93860060", brand: "미즈노", silo: "모나르시다 네오", modelName: "미즈노 모나르시다 네오 3 셀렉트 AG", groundTypes: ["AG"], fitWidth: "넓음", styleTag: "터치_컨트롤", weightClass: "보통", priceKrw: 48510, upperMaterial: "합성가죽", gender: "남성용",
    reviewSnippet: "발볼 넓고 발등 높은 분께 강추. 가성비 최강.", reviewKeywords: ["발볼 넓음", "발등 높음", "가성비"], lowestPriceUrl: danawaUrl("93860060"), lowestPriceShop: "다나와 최저가" },
  { id: "66453518", brand: "아디다스", silo: "프레데터", modelName: "아디다스 프레데터 엘리트 AG", groundTypes: ["AG"], fitWidth: "보통", styleTag: "올라운드", weightClass: "보통", priceKrw: 159090, upperMaterial: "천연가죽", gender: "남성용",
    reviewSnippet: "슈팅감이 좋고 핏도 무난. 발등이 좀 있는 분께도 잘 맞음.", reviewKeywords: ["발볼 보통", "슈팅"], lowestPriceUrl: danawaUrl("66453518"), lowestPriceShop: "다나와 최저가" },
  { id: "77784575", brand: "나이키", silo: "팬텀", modelName: "나이키 팬텀 GX 엘리트 링크 FG", groundTypes: ["FG"], fitWidth: "보통", styleTag: "올라운드", weightClass: "보통", priceKrw: 80850, upperMaterial: "합성가죽", gender: "남성용",
    reviewSnippet: "천연잔디 전용. 그립력 좋고 컨트롤 안정적.", reviewKeywords: ["발볼 보통", "FG 전용"], lowestPriceUrl: danawaUrl("77784575"), lowestPriceShop: "다나와 최저가" },
  { id: "puma_future7", brand: "푸마", silo: "퓨처", modelName: "푸마 퓨처 7 매치 FG AG", groundTypes: ["FG", "AG"], fitWidth: "넓음", styleTag: "터치_컨트롤", weightClass: "보통", priceKrw: 41390, upperMaterial: "합성가죽", gender: "남성용",
    reviewSnippet: "넉넉한 발볼에 부드러운 어퍼. 가성비도 좋음.", reviewKeywords: ["발볼 넓음", "가성비"], lowestPriceUrl: "https://search.danawa.com/dsearch.php?query=푸마+퓨처+7+매치", lowestPriceShop: "다나와 최저가" },
  { id: "adidas_copa", brand: "아디다스", silo: "코파", modelName: "아디다스 코파 퓨어 AG", groundTypes: ["AG"], fitWidth: "넓음", styleTag: "터치_컨트롤", weightClass: "보통", priceKrw: 89000, upperMaterial: "천연가죽", gender: "남성용",
    reviewSnippet: "끈 없는 디자인. 발볼 넓고 부드러운 가죽이라 편안.", reviewKeywords: ["발볼 넓음", "편안함"], lowestPriceUrl: "https://search.danawa.com/dsearch.php?query=아디다스+코파+퓨어+AG", lowestPriceShop: "다나와 최저가" },
];
