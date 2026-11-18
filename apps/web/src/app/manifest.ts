import type { MetadataRoute } from 'next';

// 홈 화면에 추가(PWA)했을 때의 이름·시작 화면·아이콘, iOS는 매니페스트 아이콘을 쓰지 않고 layout의 apple-touch-icon을 씀
// 아이콘은 확정 전이라 임시 이미지, 실제 아이콘이 오면 `public/icons`의 같은 파일명으로 교체
const BACKGROUND_COLOR = '#ffffff';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BUNCH',
    short_name: 'BUNCH',
    description: '함께한 순간을 하나의 기록으로',
    lang: 'ko',
    // 설치한 앱은 번치 탭에서 시작(UT 시작 화면이 번치 홈)
    start_url: '/bunch',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: BACKGROUND_COLOR,
    theme_color: BACKGROUND_COLOR,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
