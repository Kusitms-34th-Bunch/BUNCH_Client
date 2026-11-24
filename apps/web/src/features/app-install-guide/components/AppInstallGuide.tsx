import { ButtonLink } from '@app/design-system';
import Image, { type StaticImageData } from 'next/image';
import wordmarkSvg from '@/shared/assets/images/logo/wordmark-dark.svg';
import { APP_STORE_URL } from '@/shared/constants/site';
import { InstallGuideBackground } from './InstallGuideBackground';
import styles from './installGuideRise.module.css';

const WORDMARK = wordmarkSvg as StaticImageData;
// Figma 목업(8038:187329) 원본 1920×2123을 PC 2배 폭(1400)으로 줄인 WebP
const PHONES = '/images/install/phones.webp';

// 요소별 등장 값(Figma 8038:187365·8038:187551). 모바일은 모두 16px·1.5초, PC는 로고·설명·버튼 14px·1.4초, 목업 24px·1.8초
const rise = `${styles.rise} [--rise-distance:16px] [--rise-duration:1.5s]`;
const riseSmallOnWide = 'lg:[--rise-distance:14px] lg:[--rise-duration:1.4s]';

/**
 * 브라우저로 들어온 사람의 앱 설치 안내(Figma 8038:187763), 1024px 미만은 모바일·이상은 PC 배치
 * Android 설치 버튼은 출시 전이라 두지 않음
 */
export function AppInstallGuide() {
  return (
    <main className="bg-surface-primary relative isolate flex min-h-dvh flex-col overflow-hidden pt-(--safe-area-top) lg:justify-center">
      <InstallGuideBackground />
      <div className="gap-s13 flex flex-1 flex-col lg:mx-auto lg:grid lg:w-full lg:max-w-360 lg:flex-none lg:grid-cols-[30.5rem_auto] lg:grid-rows-[auto_auto] lg:items-center lg:gap-x-6.5 lg:gap-y-10 lg:pr-8 lg:pl-34">
        <div className="gap-s7 px-padding-p8 pt-padding-p8 flex flex-col lg:col-start-1 lg:row-start-1 lg:gap-6 lg:self-end lg:p-0">
          <div className="gap-s12 flex flex-col lg:gap-10">
            <Image
              src={WORDMARK}
              alt="BUNCH"
              width={76}
              height={19}
              priority
              className={`${rise} ${riseSmallOnWide} h-4.75 w-19 [--rise-delay:0.2s] lg:h-9.5 lg:w-37.5`}
            />
            <h1
              className={`${rise} typography-title-1-bold text-text-primary [--rise-delay:0.38s] lg:text-[48px] lg:leading-[1.36] lg:tracking-[-0.96px]`}
            >
              함께한 순간은
              <br />
              휴대폰에서 모여요
            </h1>
          </div>
          <p
            className={`${rise} ${riseSmallOnWide} typography-body-4-regular text-text-tertiary [--rise-delay:0.56s] lg:text-[18px] lg:leading-[1.6]`}
          >
            <span className="lg:hidden">
              번치는 모바일 앱이에요.
              <br />
              앱을 설치하고 친구들과의 순간을 모아보세요.
            </span>
            <span className="hidden lg:inline">
              번치는 모바일 앱으로 만들어졌어요.
              <br />
              휴대폰으로 앱을 설치하고, 친구들과의 순간을 모아보세요.
            </span>
          </p>
        </div>

        {/* 화면 높이가 낮거나 PC 폭이 좁으면 목업이 먼저 줄어듦(글자·버튼 크기 유지)
            틀(모바일 321×358, PC 694×774)을 3.52도 돌리고 그 안에 Figma와 같은 비율·위치로 이미지를 둠. 모바일은 남는 높이의 가운데 */}
        <div className="relative min-h-0 flex-1 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:flex-none">
          <div
            className={`${rise} absolute inset-0 m-auto aspect-694/774 h-full max-h-89.5 rotate-[3.52deg] overflow-hidden [--rise-delay:0.6s] lg:relative lg:inset-auto lg:mx-auto lg:h-[min(48.375rem,86dvh,calc((100vw-43rem)*1.115))] lg:max-h-none lg:[--rise-distance:24px] lg:[--rise-duration:1.8s]`}
          >
            <Image
              src={PHONES}
              alt=""
              width={1400}
              height={1549}
              priority
              sizes="(min-width: 64rem) 694px, 321px"
              className="absolute top-[2.46%] left-[-0.3%] h-[99.24%] w-[99.93%] max-w-none"
            />
          </div>
        </div>

        {/* 모바일은 화면 아래 고정(홈 인디케이터 위), 낮은 화면에서 스크롤되면 흰 바탕으로 글 위에 겹침. PC는 설명 아래 */}
        <div
          className={`${rise} ${riseSmallOnWide} gap-s3 px-padding-p8 bg-surface-primary pt-s4 sticky bottom-0 flex flex-col pb-[calc(var(--spacing-padding-p8)+var(--safe-area-bottom))] [--rise-delay:0.74s] lg:static lg:col-start-1 lg:row-start-2 lg:flex-row lg:self-start lg:bg-transparent lg:p-0`}
        >
          <ButtonLink href={APP_STORE_URL} className="w-full lg:w-49.25">
            iOS 앱 설치하기
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
