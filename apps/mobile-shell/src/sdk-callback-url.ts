// 소셜 로그인 SDK가 로그인 뒤 앱으로 돌아올 때 쓰는 주소(카카오 `kakao{앱 키}://`, 구글 `com.googleusercontent.apps.{ID}:/`)
// 이 주소는 SDK가 AppDelegate에서 받아 처리하므로, 화면 이동(expo-router)으로 해석하면 Unmatched Route로 WebView가 사라짐
const SDK_CALLBACK_SCHEME = /^(kakao[0-9a-f]+|com\.googleusercontent\.apps\.[\w-]+):/i;

/** 소셜 로그인 SDK의 복귀 주소인지 */
export function isSdkCallbackUrl(url: string) {
  return SDK_CALLBACK_SCHEME.test(url);
}
