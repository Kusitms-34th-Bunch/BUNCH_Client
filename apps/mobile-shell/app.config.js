// app.json이 기준이고, 환경변수가 필요한 설정(카카오 네이티브 앱 키, 구글 iOS 클라이언트 ID)만 여기서 더한다
// 카카오 plugin은 Info.plist에 `kakao{앱 키}` URL scheme과 카카오톡 앱 실행 허용 목록을 쓰고,
// `handleKakaoOpenUrl`은 카카오톡 앱에서 로그인하고 돌아올 때(URL 콜백)의 AppDelegate 처리를 켠다
// 구글 plugin은 iOS 클라이언트 ID를 뒤집은 URL scheme(`com.googleusercontent.apps.{ID 앞부분}`)을 Info.plist에 쓴다
const requireOnEas = (name) => {
  // EAS 빌드에 값이 없으면 설정이 빠진 앱이 조용히 만들어지므로 빌드를 멈춘다
  if (process.env.EAS_BUILD) {
    throw new Error(`${name}가 없습니다. EAS 환경변수에 등록해 주세요.`);
  }
  console.warn(`[app.config] ${name}가 없어 해당 로그인 설정을 넣지 않습니다(.env.local 확인).`);
};

// 값이 잘못 들어가면 빌드는 통과하고 로그인만 조용히 깨지므로 형식 확인
const GOOGLE_IOS_CLIENT_ID = /^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/;

// `1234-abc.apps.googleusercontent.com` → `com.googleusercontent.apps.1234-abc`
const googleUrlScheme = (iosClientId) =>
  `com.googleusercontent.apps.${iosClientId.replace(/\.apps\.googleusercontent\.com$/, '')}`;

module.exports = ({ config }) => {
  const plugins = [...(config.plugins ?? [])];

  const nativeAppKey = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY;
  if (nativeAppKey) {
    plugins.push(['@react-native-kakao/core', { nativeAppKey, ios: { handleKakaoOpenUrl: true } }]);
  } else {
    requireOnEas('EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY');
  }

  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (googleIosClientId && !GOOGLE_IOS_CLIENT_ID.test(googleIosClientId)) {
    throw new Error(
      'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID 형식이 올바르지 않습니다(예: 1234-abc.apps.googleusercontent.com).',
    );
  }
  if (googleIosClientId) {
    plugins.push([
      '@react-native-google-signin/google-signin',
      { iosUrlScheme: googleUrlScheme(googleIosClientId) },
    ]);
  } else {
    requireOnEas('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID');
  }

  return { ...config, plugins };
};
