// 번들 화면들의 첫 불러오기 실패 안내(다시 시도). 사진함과 같은 화면을 쓰되, feature 예외 import를 이 한 곳으로 모음
// (docs/architecture/domain-ownership.md: bundle → photo-box 예외는 늘리지 않고 줄임)
export { PhotoBoxError as BundleLoadError } from '@/features/photo-box/components/PhotoBoxError';
