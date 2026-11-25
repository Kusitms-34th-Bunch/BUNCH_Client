// 응답은 설치된 앱 버전으로만 정해지고 한 기기 안에서 바뀌지 않아 입력 없는 key(docs/architecture/data-layer.md)
export const appUpdateKeys = {
  all: ['app-update'] as const,
  required: () => [...appUpdateKeys.all, 'required'] as const,
};
