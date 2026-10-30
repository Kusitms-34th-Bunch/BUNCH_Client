import type { PhotoBoxData, PhotoBoxPhoto, PhotoStatus } from '../lib/types';

// 사진 목록·멤버 목록 API 연결 전 Figma 예시 값 사용(저장소에 사진 에셋이 없어 색 그라데이션 SVG를 데이터 주소로 사용)
const HUES = [205, 190, 35, 160, 330, 260];

const samplePhoto = (seed: number) => {
  const hue = HUES[seed % HUES.length] ?? 205;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="246" height="246">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${hue},45%,62%)"/>` +
    `<stop offset="1" stop-color="hsl(${(hue + 40) % 360},40%,78%)"/>` +
    `</linearGradient></defs><rect width="246" height="246" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

let seed = 0;
const photo = (
  takenAt: string | null,
  uploaderIds: string[],
  status: PhotoStatus = 'ready',
): PhotoBoxPhoto => {
  seed += 1;
  return {
    id: `photo-${seed}`,
    src: samplePhoto(seed),
    alt: takenAt
      ? `${takenAt.slice(0, 10)}에 찍은 사진 ${seed}`
      : `촬영 날짜를 모르는 사진 ${seed}`,
    takenAt,
    uploadedAt: `2026-10-29T09:${String(seed % 60).padStart(2, '0')}:00`,
    uploaderIds,
    status,
  };
};

const range = (count: number) => Array.from({ length: count }, (_, i) => i);

const DEFAULT_BUNCH_IMAGE = '/images/default-bunch.png';

export const photoBoxFixture: PhotoBoxData = {
  bunch: { id: 'bunch-1', name: '여행가조', imageSrc: DEFAULT_BUNCH_IMAGE },
  members: [
    { id: 'eunwoo', name: '은우', avatarSrc: DEFAULT_BUNCH_IMAGE },
    { id: 'gyeongjin', name: '경진', avatarSrc: DEFAULT_BUNCH_IMAGE },
    { id: 'suin', name: '수인', avatarSrc: DEFAULT_BUNCH_IMAGE },
    { id: 'jiye', name: '지예', avatarSrc: DEFAULT_BUNCH_IMAGE },
    { id: 'hyochan', name: '효찬', avatarSrc: DEFAULT_BUNCH_IMAGE },
    { id: 'gyeongjun', name: '경준', avatarSrc: DEFAULT_BUNCH_IMAGE },
  ],
  photos: [
    // 9월 27일(일): 여러 멤버, 함께 올린 사진 1장, 처리 중 1장
    photo('2026-09-27T14:10', ['eunwoo']),
    photo('2026-09-27T14:05', ['gyeongjin']),
    photo('2026-09-27T13:40', ['eunwoo', 'suin']),
    photo('2026-09-27T13:20', ['jiye']),
    photo('2026-09-27T12:55', ['suin'], 'processing'),
    photo('2026-09-27T12:30', ['gyeongjin']),
    // 9월 26일(토)
    ...range(6).map((i) =>
      photo(`2026-09-26T1${i}:00`, [['eunwoo', 'gyeongjin', 'suin', 'jiye'][i % 4] as string]),
    ),
    // 지난해: 요일 없이 「2025년 12월 24일」 형식
    photo('2025-12-24T19:30', ['jiye']),
    photo('2025-12-24T19:10', ['suin']),
    photo('2025-12-24T18:50', ['eunwoo'], 'failed'),
    // 촬영 날짜를 확인하지 못한 사진 9장
    ...range(9).map((i) => photo(null, [['gyeongjin', 'jiye', 'eunwoo'][i % 3] as string])),
  ],
};
