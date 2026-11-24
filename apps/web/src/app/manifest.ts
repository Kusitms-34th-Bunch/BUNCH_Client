import type { MetadataRoute } from 'next';
import { SITE_NAME, SITE_SLOGAN } from '@/shared/constants/site';

// 홈 화면에 추가(PWA)했을 때의 이름·시작 화면·아이콘, iOS는 매니페스트 아이콘을 쓰지 않고 layout의 apple-touch-icon을 씀
// 아이콘은 앱 아이콘(`apps/mobile-shell/assets/icon.png`)을 줄인 것, maskable도 글리프가 안전 영역(반지름 40%) 안이라 같은 그림
const BACKGROUND_COLOR = '#ffffff';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_SLOGAN,
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
