import type { Recommendation } from '../lib/recommendation';

// 추천 번들 목록 API가 아직 없어 UT 시작 데이터(가짜 서버 사진 1~13번)에 맞춘 샘플
// 사진 id는 가짜 서버 시드 순서(10월 18일 1~6, 17일 7~10, 3일 11~13)이고, 번들 제목은 서버의 제목 생성 로직이 내려줄 값
export const recommendationFixture: readonly Recommendation[] = [
  {
    id: 'rec-1',
    title: '설악산 단풍 여행',
    imageSrc: '/mock/photos/S1-thumb.jpg',
    memberNames: ['지예', '경진', '은우', '수인', '큐시즘'],
    photoIds: ['1', '2', '3', '4', '5', '6'],
    month: 10,
    day: 18,
  },
  {
    id: 'rec-2',
    title: '속초에서 보낸 주말',
    imageSrc: '/mock/photos/P1-thumb.jpg',
    memberNames: ['경진', '은우', '큐시즘', '지예', '수인'],
    photoIds: ['7', '8', '9', '10', '11', '12', '13'],
    month: 10,
    day: 17,
  },
];
