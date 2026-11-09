/**
 * 카카오 로그인 흐름(SDK 시작 → nonce 생성 → 로그인 → 결과 변환)
 * 네이티브 모듈에 의존하지 않도록 필요한 것을 주입받아 Node 테스트로 확인(실제 SDK 연결은 `social-login.ts`)
 */

export type KakaoLoginToken = { idToken?: string | undefined };

export type KakaoLoginDeps = {
  /** 카카오 네이티브 앱 키(`EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY`) */
  appKey: string | undefined;
  initialize: (_appKey: string) => Promise<void>;
  /** 카카오 로그인(nonce를 ID 토큰 요청에 실음) */
  login: (_options: { nonce: string }) => Promise<KakaoLoginToken>;
  /** 암호학적 난수(Math.random 금지) */
  randomNonce: () => string;
};

export type KakaoLoginOutcome =
  | { status: 'success'; provider: 'kakao'; idToken: string; nonce: string }
  | { status: 'cancelled' };

// iOS 네이티브 오류 코드: 사용자가 로그인 창을 닫음(Cancelled), 동의 화면에서 취소(AccessDenied)
const CANCEL_CODES = new Set(['Cancelled', 'AccessDenied']);

/** 사용자가 로그인을 취소했는지(실패가 아닌 취소로 돌려줌) */
export const isKakaoCancelled = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  CANCEL_CODES.has(String((error as { code: unknown }).code));

/**
 * 카카오 로그인 함수를 만듦. SDK는 처음 한 번만 시작(실패하면 다음 호출에서 다시 시도)
 * 오류 메시지에는 SDK 원문·토큰·nonce를 넣지 않음(웹 오류 수집으로 새지 않도록 일반 문구로 바꿈)
 */
export const createKakaoLogin = ({ appKey, initialize, login, randomNonce }: KakaoLoginDeps) => {
  let initialized: Promise<void> | undefined;

  const ensureInitialized = () => {
    if (!appKey) {
      throw new Error('카카오 앱 키(EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY)가 설정되지 않았어요.');
    }
    initialized ??= initialize(appKey).catch(() => {
      initialized = undefined;
      throw new Error('카카오 SDK를 시작하지 못했어요.');
    });
    return initialized;
  };

  const run = async (): Promise<KakaoLoginOutcome> => {
    await ensureInitialized();

    const nonce = randomNonce();
    let token: KakaoLoginToken;
    try {
      token = await login({ nonce });
    } catch (error) {
      if (isKakaoCancelled(error)) return { status: 'cancelled' };
      throw new Error('카카오 로그인에 실패했어요.');
    }

    // OpenID Connect를 켜지 않았거나 scope가 빠지면 ID 토큰이 오지 않음
    if (!token.idToken) {
      throw new Error(
        '카카오 ID 토큰을 받지 못했어요. 카카오 콘솔에서 OpenID Connect가 켜져 있는지 확인해 주세요.',
      );
    }
    return { status: 'success', provider: 'kakao', idToken: token.idToken, nonce };
  };

  // 진행 중인 로그인이 있으면 같은 결과를 공유(중복 탭으로 로그인 창이 겹치지 않게)
  let inFlight: Promise<KakaoLoginOutcome> | undefined;
  return () => {
    inFlight ??= run().finally(() => {
      inFlight = undefined;
    });
    return inFlight;
  };
};

// ---- Google ----

export type GoogleSignInResult =
  { type: 'success'; data: { idToken: string | null } } | { type: 'cancelled' };

export type GoogleLoginDeps = {
  /** iOS OAuth 클라이언트 ID(`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`) */
  iosClientId: string | undefined;
  /** 웹(서버) OAuth 클라이언트 ID(`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`). 정하면 ID 토큰의 `aud`가 이 값이고, Android는 ID 토큰을 받으려면 필요 */
  webClientId: string | undefined;
  configure: (_options: { iosClientId: string; webClientId?: string }) => void;
  signIn: () => Promise<GoogleSignInResult>;
};

export type GoogleLoginOutcome =
  { status: 'success'; provider: 'google'; idToken: string } | { status: 'cancelled' };

// 라이브러리가 취소를 응답으로 돌려주지만, 일부 경로는 이 코드로 reject함
const GOOGLE_CANCEL_CODES = new Set(['SIGN_IN_CANCELLED', '-5', '12501']);

/** 사용자가 로그인을 취소했는지(오류 코드만 봄) */
export const isGoogleCancelled = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  GOOGLE_CANCEL_CODES.has(String((error as { code: unknown }).code));

/**
 * Google 로그인 함수를 만듦. 설정은 처음 한 번만 하고, 로그인이 진행 중이면 같은 결과를 공유
 * Google은 ID 토큰만 서버에 보내면 되어 nonce가 없음. 오류 메시지에는 SDK 원문·토큰을 넣지 않음
 */
export const createGoogleLogin = ({
  iosClientId,
  webClientId,
  configure,
  signIn,
}: GoogleLoginDeps) => {
  let configured = false;

  const run = async (): Promise<GoogleLoginOutcome> => {
    if (!iosClientId) {
      throw new Error('구글 클라이언트 ID(EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID)가 설정되지 않았어요.');
    }
    if (!configured) {
      try {
        configure({ iosClientId, ...(webClientId ? { webClientId } : {}) });
      } catch {
        throw new Error('구글 SDK를 시작하지 못했어요.');
      }
      configured = true;
    }

    let result: GoogleSignInResult;
    try {
      result = await signIn();
    } catch (error) {
      if (isGoogleCancelled(error)) return { status: 'cancelled' };
      throw new Error('구글 로그인에 실패했어요.');
    }

    if (result.type === 'cancelled') return { status: 'cancelled' };
    if (!result.data.idToken) {
      throw new Error(
        '구글 ID 토큰을 받지 못했어요. 구글 콘솔의 웹 클라이언트 ID(EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) 설정을 확인해 주세요.',
      );
    }
    return { status: 'success', provider: 'google', idToken: result.data.idToken };
  };

  let inFlight: Promise<GoogleLoginOutcome> | undefined;
  return () => {
    inFlight ??= run().finally(() => {
      inFlight = undefined;
    });
    return inFlight;
  };
};
