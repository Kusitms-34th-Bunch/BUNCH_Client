import 'server-only';
/**
 * 개발 전용 토큰 로그인을 켤지 판단: 서버 전용 `DEV_TOKEN_LOGIN=enabled`이고 운영 빌드가 아닐 때만 켜짐
 * 로컬 개발 서버(`next dev`)에서 쓰는 용도로, 운영 빌드는 변수가 켜져 있어도 꺼짐
 * route와 로그인 화면이 같은 함수를 요청 시점에 호출해 진입점과 route의 판단이 어긋나지 않게 함
 */
export const isDevTokenLoginEnabled = () =>
  process.env.NODE_ENV !== 'production' && process.env.DEV_TOKEN_LOGIN === 'enabled';
