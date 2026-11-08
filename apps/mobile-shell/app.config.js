// app.json이 기준이고, 환경변수가 필요한 설정(카카오 네이티브 앱 키)만 여기서 더한다
// 카카오 plugin은 Info.plist에 `kakao{앱 키}` URL scheme과 카카오톡 앱 실행 허용 목록을 쓰고,
// `handleKakaoOpenUrl`은 카카오톡 앱에서 로그인하고 돌아올 때(URL 콜백)의 AppDelegate 처리를 켠다
module.exports = ({ config }) => {
  const nativeAppKey = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY;

  if (!nativeAppKey) {
    // EAS 빌드에 키가 없으면 카카오 설정이 빠진 앱이 조용히 만들어지므로 빌드를 멈춘다
    if (process.env.EAS_BUILD) {
      throw new Error('EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY가 없습니다. EAS 환경변수에 등록해 주세요.');
    }
    console.warn(
      '[app.config] EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY가 없어 카카오 로그인 설정을 넣지 않습니다(.env.local 확인).',
    );
    return config;
  }

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      ['@react-native-kakao/core', { nativeAppKey, ios: { handleKakaoOpenUrl: true } }],
    ],
  };
};
