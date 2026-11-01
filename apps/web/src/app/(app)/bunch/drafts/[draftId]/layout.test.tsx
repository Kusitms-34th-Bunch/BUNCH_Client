import { describe, expect, it } from 'vitest';
import BundleDraftLayout from './layout';

type Provider = { props: { draftId: string | undefined } };

const render = async (draftId: string) =>
  (await BundleDraftLayout({
    children: null,
    params: Promise.resolve({ draftId }),
  })) as unknown as Provider;

describe('/bunch/drafts/[draftId] layout', () => {
  it('형식이 맞는 id는 그대로 provider에 넘긴다', async () => {
    expect((await render('draft-1')).props.draftId).toBe('draft-1');
  });

  it('형식이 틀린 id는 undefined로 바꿔 넘긴다', async () => {
    expect((await render('../secret')).props.draftId).toBeUndefined();
    expect((await render('x'.repeat(65))).props.draftId).toBeUndefined();
  });
});
