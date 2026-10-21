/**
 * 입력 필드(`SearchField`, `TextField`)의 input 글자 스타일: 입력값은 Regular 기본색, 안내 문구는 SemiBold(Body-2-Meduim) 흐린 색
 * 안내 문구는 굵기·자간만 지정(크기·행 높이는 input에서 상속해 iOS 16px 렌더링·축소 보정과 맞춤)
 */
export const fieldText =
  'min-w-0 flex-1 truncate typography-body-2-regular text-text-primary placeholder:font-(--semantic-font-weights-pretendard-1) placeholder:tracking-(--semantic-letter-spacing-1) placeholder:text-text-quaternary';
