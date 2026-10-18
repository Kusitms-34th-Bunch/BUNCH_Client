// 초대 링크 형식: `https://<호스트>/invite/<코드>`. 호스트는 운영 도메인이 정해지지 않아 검사하지 않는다(spec 확인할 항목)
// 링크가 실제로 유효한지·인원이 찼는지는 서버만 알 수 있어 형식 검사만 한다
const INVITE_PATH = /^\/invite\/[^/]+\/?$/;

export function isInviteLink(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && INVITE_PATH.test(url.pathname);
  } catch {
    return false;
  }
}
