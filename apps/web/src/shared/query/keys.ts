// 여러 feature가 함께 쓰는 query key(응답을 바꾸는 입력은 모두 key에 포함, docs/architecture/data-layer.md)
export const sharedKeys = {
  me: () => ['me'] as const,
  // 내 소속 번치 목록(번치 전환 시트). 전환·접근 불가 안내 삭제·번치 만들기 뒤 무효화(참여·나가기·삭제 연결 때 추가)
  myBunches: () => ['my-bunches'] as const,
  // 로그인·가입 상태(가입 단계 이동·접근 제어의 기준). 로그인·약관 저장·가입 완료로 상태가 바뀌면 무효화
  session: () => ['session'] as const,
  // 번치를 아직 모르면 undefined(요청하지 않는 skipToken 상태의 key)
  bunchMembers: (bunchId: string | undefined) => ['bunch-members', bunchId] as const,
  // 번치 홈 데이터 전체: 번들 발행 뒤 한 번에 무효화해 번치 홈의 개수·목록이 함께 갱신되게 함
  bunchHomeScope: (bunchId: string | undefined) => ['bunch-home', bunchId] as const,
  bunchHome: (bunchId: string | undefined) =>
    [...sharedKeys.bunchHomeScope(bunchId), 'profile'] as const,
  publishedBundles: (bunchId: string | undefined) =>
    [...sharedKeys.bunchHomeScope(bunchId), 'published'] as const,
  draftBundles: (bunchId: string | undefined) =>
    [...sharedKeys.bunchHomeScope(bunchId), 'drafts'] as const,
};
