import type { Metadata } from 'next';
import Link from 'next/link';
import { NativeTabBarVisibility } from '@/features/main-navigation/components';
import { MAIN_TAB_PATHS } from '@/features/main-navigation/constants/tabs';
import { AppFrame } from '@/shared/components/layout/AppFrame';
import { PageShell } from '@/shared/components/layout/PageShell';
import { pretendardFontStyle } from './fonts/pretendard';

export const metadata: Metadata = { title: '페이지를 찾을 수 없어요', robots: { index: false } };

/**
 * 앱 전체의 404(없는 주소, 화면이 `notFound()`를 부른 경우)
 * (app) layout 밖에서 그려지므로 앱 틀(AppFrame)·글꼴·iOS 쉘 탭 바 숨김을 직접 갖춤
 */
export default function NotFound() {
  return (
    <>
      <style>{pretendardFontStyle}</style>
      <AppFrame>
        <PageShell>
          <div className="gap-s4 px-padding-p8 flex min-h-full flex-col items-center justify-center text-center">
            <h1 className="typography-title-1-semi-bold text-text-primary">
              페이지를 찾을 수 없어요
            </h1>
            <p className="typography-body-3-regular text-text-tertiary break-keep">
              주소가 바뀌었거나 더 이상 볼 수 없는 화면이에요.
            </p>
            <Link
              href={MAIN_TAB_PATHS.bunch}
              className="typography-body-2-medium text-text-brand mt-s4 underline underline-offset-4"
            >
              번치 탭으로 가기
            </Link>
          </div>
        </PageShell>
      </AppFrame>
      <NativeTabBarVisibility />
    </>
  );
}
