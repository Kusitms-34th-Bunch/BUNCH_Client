import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { NativeShellViewport } from './NativeShellViewport';

const BASE = 'width=device-width, initial-scale=1, viewport-fit=cover';

const addViewport = () => {
  const meta = document.createElement('meta');
  meta.name = 'viewport';
  meta.content = BASE;
  document.head.append(meta);
  return meta;
};

afterEach(() => {
  document.head.querySelectorAll('meta[name="viewport"]').forEach((meta) => meta.remove());
  delete (window as { ReactNativeWebView?: unknown }).ReactNativeWebView;
});

describe('NativeShellViewport', () => {
  it('앱 쉘에서는 화면 확대·축소를 막는다', () => {
    (window as { ReactNativeWebView?: unknown }).ReactNativeWebView = {};
    const meta = addViewport();
    render(<NativeShellViewport />);
    expect(meta.content).toBe(`${BASE}, maximum-scale=1, user-scalable=no`);
  });

  it('Next가 viewport를 새로 그려도 다시 막고, 이미 막혀 있으면 덧붙이지 않는다', async () => {
    (window as { ReactNativeWebView?: unknown }).ReactNativeWebView = {};
    addViewport().remove();
    render(<NativeShellViewport />);

    const meta = addViewport();
    await waitFor(() => expect(meta.content).toBe(`${BASE}, maximum-scale=1, user-scalable=no`));
    meta.content = BASE;
    await waitFor(() => expect(meta.content).toBe(`${BASE}, maximum-scale=1, user-scalable=no`));
  });

  it('브라우저에서는 확대를 그대로 둔다', () => {
    const meta = addViewport();
    render(<NativeShellViewport />);
    expect(meta.content).toBe(BASE);
  });
});
