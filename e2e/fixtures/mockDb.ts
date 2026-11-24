/// <reference lib="dom" />
import { expect, type Page } from '@playwright/test';

type MockComment = {
  memberId: number;
  content: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};
type MockBundle = { id: number; participants: { memberId: number }[]; comments: MockComment[] };
type MockState = { bundles: MockBundle[] };

/**
 * 브라우저 IndexedDB의 가짜 DB(`bunch-mock`)에서 번들 하나를 읽고, `fill`이 있으면 코멘트 없는 참여자에게 그 글을 넣어 씀
 * 저장 키는 버전마다 바뀌고(`mock-db:vN`) 옛 키를 지우지 않아 버전이 가장 높은 키를 씀. 페이지 안에서 실행되어 바깥 값을 참조하지 않음
 */
const accessBundle = (page: Page, bundleId: number, fill?: string) =>
  page.evaluate(
    async ({ id, text }) => {
      const request = <T>(run: () => IDBRequest<T>) =>
        new Promise<T>((resolve, reject) => {
          const req = run();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error ?? new Error('IndexedDB 요청 실패'));
        });
      const db = await request(() => indexedDB.open('bunch-mock', 1));
      try {
        const store = db.transaction('state', text ? 'readwrite' : 'readonly').objectStore('state');
        const version = (item: string) => Number(item.replace('mock-db:v', ''));
        const [key] = (await request(() => store.getAllKeys()))
          .filter(
            (item): item is string => typeof item === 'string' && item.startsWith('mock-db:v'),
          )
          .sort((a, b) => version(b) - version(a));
        if (key === undefined) return null;
        const state = (await request(() => store.get(key))) as MockState;
        const bundle = state.bundles.find((item) => item.id === id);
        if (!bundle || !text) return bundle ?? null;
        const now = new Date().toISOString();
        for (const { memberId } of bundle.participants) {
          const done = bundle.comments.some((c) => c.memberId === memberId && c.content.trim());
          if (done) continue;
          bundle.comments = bundle.comments.filter((c) => c.memberId !== memberId);
          bundle.comments.push({
            memberId,
            content: text,
            version: 1,
            createdAt: now,
            updatedAt: now,
          });
        }
        await request(() => store.put(state, key));
        return bundle;
      } finally {
        db.close();
      }
    },
    { id: bundleId, text: fill },
  );

/**
 * 가짜 서버에는 다른 참여자가 코멘트를 쓸 길이 없어(실시간 서버 없음) 발행 조건을 채우려고 저장소에 직접 넣음
 * 앱이 떠 있으면 메모리 상태가 저장소를 덮으므로, 내 코멘트가 저장된 뒤 같은 출처의 정적 파일로 나가 고쳐 쓰고 돌아옴
 */
export const fillOtherParticipantComments = async (
  page: Page,
  { bundleId, mine, others }: { bundleId: number; mine: string; others: string },
) => {
  const back = page.url();
  await expect
    .poll(async () =>
      (await accessBundle(page, bundleId))?.comments.some((c) => c.content === mine),
    )
    .toBe(true);
  await page.goto('/robots.txt');
  // 나가는 페이지의 pagehide 저장이 늦게 끝나 덮을 수 있어 다시 읽어 남았는지 확인(덮였으면 다시 씀)
  await expect
    .poll(async () => {
      await accessBundle(page, bundleId, others);
      const bundle = await accessBundle(page, bundleId);
      return bundle?.participants.every(({ memberId }) =>
        bundle.comments.some((c) => c.memberId === memberId && c.content.trim()),
      );
    })
    .toBe(true);
  await page.goto(back);
};
