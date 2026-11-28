// 사진함 칸 ↔ 사진 상세 hero의 시간·곡선(SSGOI 단독 상세 전환과 겹쳐 띄운 상세가 함께 씀, 결정 기록 032)
// 들어갈 때 피드와 같은 곡선을 조금 짧게(550ms는 느리다는 사용자 의견, #568)
export const PHOTO_HERO_MS = 450;
export const PHOTO_HERO_EASING = [0.3, 0, 0.15, 1] as const;
