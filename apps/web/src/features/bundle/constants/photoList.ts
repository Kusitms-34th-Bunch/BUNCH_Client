// BundlePhotoEditor `m`(330px)와 사진 사이 간격 12px: 가로로 넘긴 거리를 사진 번호로 바꾸는 기준
export const PHOTO_STEP = 330 + 12;

// 길게 누르기: 이만큼 누르고 있어야 사진이 떠오르고, 그 전에 움직이면 가로 스크롤로 넘김(기능 spec 4.3.5)
export const LONG_PRESS_MS = 500;
export const LONG_PRESS_TOLERANCE_PX = 8;

// 끌다가 목록 가장자리에 닿았을 때 자동 스크롤: 라이브러리 기본(acceleration 10)은 사진이 너무 빨리 지나가 느리게 함
export const AUTO_SCROLL = { acceleration: 3, threshold: { x: 0.15, y: 0 } } as const;

// 「+ 사진 추가」 카드도 사진을 뺄 때 함께 움직이도록 등록하는 id(사진 id와 겹치지 않는 값)
export const ADD_CARD_ID = 'add-photo-card';
