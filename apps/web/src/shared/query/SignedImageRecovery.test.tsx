import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { SignedImageRecovery } from './SignedImageRecovery';

const signed = (file: string, signature: string) =>
  `https://r2.example.com/photos/${file}?X-Amz-Date=20261125T140000Z&X-Amz-Expires=1800&X-Amz-Signature=${signature}`;

const setup = () => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(['photos'], { pages: [{ items: [{ src: signed('a.jpg', 'aaa') }] }] });
  queryClient.setQueryData(['others'], { items: [{ src: signed('b.jpg', 'bbb') }] });
  queryClient.setQueryData(['profile'], { imageSrc: 'https://example.com/me.jpg' });
  render(
    <QueryClientProvider client={queryClient}>
      <SignedImageRecovery />
    </QueryClientProvider>,
  );
  const failImage = (src: string) => {
    const image = document.createElement('img');
    image.src = src;
    document.body.append(image);
    fireEvent.error(image);
    image.remove();
  };
  // 실패는 잠깐(100ms) 모아 처리
  const settle = () => new Promise((resolve) => setTimeout(resolve, 150));
  const invalidated = (key: string) => queryClient.getQueryState([key])?.isInvalidated;
  return { queryClient, failImage, settle, invalidated };
};

it('서명 주소 이미지가 실패하면 그 주소를 가진 query만 다시 받게 하고, 같은 순간 실패는 한 번에 처리한다', async () => {
  const { failImage, settle, invalidated } = setup();
  failImage(signed('a.jpg', 'aaa'));
  failImage(signed('b.jpg', 'bbb'));
  failImage('https://example.com/me.jpg');
  await settle();

  expect(invalidated('photos')).toBe(true);
  expect(invalidated('others')).toBe(true);
  expect(invalidated('profile')).toBe(false);
});

it('같은 파일은 다시 받은 새 서명 주소가 또 실패해도 반복하지 않는다(없는 사진)', async () => {
  const { queryClient, failImage, settle, invalidated } = setup();
  failImage(signed('a.jpg', 'aaa'));
  await settle();
  queryClient.setQueryData(['photos'], { pages: [{ items: [{ src: signed('a.jpg', 'ccc') }] }] });

  failImage(signed('a.jpg', 'ccc'));
  await settle();
  expect(invalidated('photos')).toBe(false);
});

it('편집 중 고정한 query(staleTime 무한)는 다시 받지 않는다', async () => {
  const { queryClient, failImage, settle } = setup();
  const src = signed('c.jpg', 'ddd');
  queryClient.setQueryDefaults(['edit'], { staleTime: Infinity });
  queryClient.setQueryData(['edit'], { photos: [{ src }] });

  failImage(src);
  await settle();
  expect(queryClient.getQueryState(['edit'])?.isInvalidated).toBe(false);
});

it('다시 받다 실패해 이전 data만 남은 query도 다시 받게 한다', async () => {
  const { queryClient, failImage, settle, invalidated } = setup();
  queryClient
    .getQueryCache()
    .find({ queryKey: ['photos'] })
    ?.setState({ status: 'error', error: new Error('재조회 실패') });

  failImage(signed('a.jpg', 'aaa'));
  await settle();
  expect(invalidated('photos')).toBe(true);
});

it('같은 묶음 안에서 같은 파일의 다른 주소가 실패하면 둘 다 다시 받는다', async () => {
  const { queryClient, failImage, settle, invalidated } = setup();
  queryClient.setQueryData(['old'], { items: [{ src: signed('a.jpg', 'old') }] });

  failImage(signed('a.jpg', 'aaa'));
  failImage(signed('a.jpg', 'old'));
  await settle();
  expect(invalidated('photos')).toBe(true);
  expect(invalidated('old')).toBe(true);
});
