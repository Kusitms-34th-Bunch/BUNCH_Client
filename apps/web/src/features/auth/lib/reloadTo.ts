/** 문서를 새로 불러오며 이동(메모리의 사용자 데이터·세션 캐시까지 비움). 현재 기록 항목만 바꿈 */
export const reloadTo = (path: string) => window.location.replace(path);
