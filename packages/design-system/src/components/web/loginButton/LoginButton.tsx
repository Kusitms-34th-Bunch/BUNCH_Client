import type { ComponentProps, ReactNode } from 'react';
import type { VariantProps } from 'tailwind-variants';
import { tv } from '../../../utils';

// 눌림 오버레이: 글자 아래·배경 위의 -z-10 pseudo 요소(isolate로 쌓임 맥락 분리), overlay-hover(10%)
// 화면 설계서: 누르는 동안 Pressed 스타일, Dissolve / Ease out / 100ms → opacity만 100ms ease-out
// 브랜드 색(Kakao #fee500·글자 85% 검정, Google 테두리 #e2e2e2·글자 #1f1f1f, Apple 검정)은 각 사의 가이드 값이라 토큰이 없다
const loginButton = tv({
  base: [
    'relative isolate inline-flex h-s18 w-full max-w-full cursor-pointer touch-manipulation items-center justify-center gap-s3 overflow-clip rounded-r6 px-padding-p8 py-padding-p7 typography-login-button',
    'before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-overlay-hover before:opacity-0 before:transition-opacity before:duration-100 before:ease-out',
    'not-disabled:active:before:opacity-100',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-brand',
    'disabled:cursor-not-allowed disabled:opacity-(--semantic-opacity-disabled)',
  ],
  variants: {
    brand: {
      apple: 'border border-black bg-black text-text-inversed',
      google: 'border border-[#e2e2e2] bg-surface-primary text-[#1f1f1f]',
      kakao: 'bg-[#fee500] text-black/85',
    },
  },
});

type LoginButtonVariants = VariantProps<typeof loginButton>;

export type LoginButtonBrand = NonNullable<LoginButtonVariants['brand']>;

export type LoginButtonProps = ComponentProps<'button'> & {
  brand: LoginButtonBrand;
  /** 접근성 이름이 되는 글자(예: "Google로 계속하기"). 문구는 호출하는 쪽이 정한다 */
  children: ReactNode;
};

// 브랜드 로고(Figma 원본 에셋). 아이콘 생성 파이프라인은 16/20/24 세 크기를 요구하는데 이 로고들은 한 크기뿐이라 이 파일에 둔다
// Apple·Kakao는 글자색(currentColor)을 따라가고, Google은 색이 들어간 이미지라 그대로 쓴다
const googleLogoUrl = new URL('./assets/google-logo.png', import.meta.url).href;

const AppleLogo = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
    className="shrink-0"
  >
    <path
      fill="currentColor"
      d="M12.2227 6.88461C13.0547 6.88461 14.0977 6.30483 14.7188 5.53179C15.2812 4.83121 15.6914 3.85283 15.6914 2.87444C15.6914 2.74158 15.6797 2.60871 15.6562 2.5C14.7305 2.53624 13.6172 3.14018 12.9492 3.94946C12.4219 4.56548 11.9414 5.53179 11.9414 6.52225C11.9414 6.6672 11.9648 6.81214 11.9766 6.86046C12.0352 6.87254 12.1289 6.88461 12.2227 6.88461ZM9.29297 21.5C10.4297 21.5 10.9336 20.7149 12.3516 20.7149C13.793 20.7149 14.1094 21.4758 15.375 21.4758C16.6172 21.4758 17.4492 20.2921 18.2344 19.1325C19.1133 17.8039 19.4766 16.4994 19.5 16.439C19.418 16.4148 17.0391 15.4123 17.0391 12.5979C17.0391 10.158 18.9141 9.0588 19.0195 8.97425C17.7773 7.13827 15.8906 7.08996 15.375 7.08996C13.9805 7.08996 12.8438 7.95963 12.1289 7.95963C11.3555 7.95963 10.3359 7.13827 9.12891 7.13827C6.83203 7.13827 4.5 9.09504 4.5 12.7912C4.5 15.0861 5.36719 17.514 6.43359 19.0842C7.34766 20.4129 8.14453 21.5 9.29297 21.5Z"
    />
  </svg>
);

const KakaoLogo = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    fill="none"
    viewBox="0 0 20 20"
    aria-hidden="true"
    className="shrink-0"
  >
    <path
      fill="currentColor"
      d="M10.0007 4C6.68584 4 4 6.29821 4 9.13289C4 10.9549 5.11094 12.5558 6.78495 13.4661L6.21892 15.753C6.19789 15.8212 6.21438 15.8944 6.25949 15.9448C6.29246 15.9805 6.33748 16 6.38101 16C6.41862 16 6.45613 15.987 6.48762 15.9593L8.91977 14.1812C9.26961 14.2349 9.62992 14.2641 9.99921 14.2641C13.3127 14.2641 16 11.9658 16 9.13123C16 6.29663 13.3142 4 10.0007 4Z"
    />
  </svg>
);

// 20×20 영역 안에서 16×16.3 크기로 2px 안쪽에 놓인다(Figma 배치)
const GoogleLogo = () => (
  <span aria-hidden="true" className="relative inline-block size-5 shrink-0">
    <img
      alt=""
      src={googleLogoUrl}
      className="absolute top-0.5 left-0.5 h-[16.323px] w-4 max-w-none"
    />
  </span>
);

const logos = { apple: AppleLogo, google: GoogleLogo, kakao: KakaoLogo } satisfies Record<
  LoginButtonBrand,
  () => ReactNode
>;

export const LoginButton = ({
  brand,
  type = 'button',
  className,
  children,
  ...props
}: LoginButtonProps) => {
  const Logo = logos[brand];

  return (
    <button type={type} className={loginButton({ brand, className })} {...props}>
      <Logo />
      <span className="min-w-0 truncate">{children}</span>
    </button>
  );
};
