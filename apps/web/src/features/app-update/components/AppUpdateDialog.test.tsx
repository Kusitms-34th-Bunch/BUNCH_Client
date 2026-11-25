import type { QueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/server';
import { shouldReportApiError } from '@/shared/lib/reportApiError';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { appUpdateKeys } from '../queries/keys';
import { AppUpdateDialog } from './AppUpdateDialog';

const shell = vi.hoisted(() => ({
  inShell: true,
  hasVersion: true,
  getAppVersion: vi.fn(() => Promise.resolve({ version: '1.0.0', build: '7' })),
}));
vi.mock('@/shared/bridge/client', () => ({
  isNativeShell: () => shell.inShell,
  hasNativeMethod: () => shell.hasVersion,
  appBridge: { getAppVersion: shell.getAppVersion },
}));

const respond = (updateRequired: boolean, seen: URLSearchParams[] = []) =>
  server.use(
    http.get('*/api/app-version', ({ request }) => {
      seen.push(new URL(request.url).searchParams);
      return HttpResponse.json({ updateRequired });
    }),
  );

const renderDialog = () => {
  const client = createTestQueryClient();
  render(<AppUpdateDialog />, { wrapper: createQueryWrapper(client) });
  return client;
};

// 조회가 성공·오류로 끝날 때까지(모달을 잘못 여는 회귀를 놓치지 않게)
const settled = async (client: QueryClient) => {
  await vi.waitFor(() =>
    expect(client.getQueryState(appUpdateKeys.required())?.status).not.toBe('pending'),
  );
  return client.getQueryState(appUpdateKeys.required());
};

describe('AppUpdateDialog', () => {
  afterEach(() => {
    shell.inShell = true;
    shell.hasVersion = true;
  });

  it('쉘 버전을 보내고 업데이트가 필요하면 닫을 수 없는 모달을 띄운다', async () => {
    const seen: URLSearchParams[] = [];
    respond(true, seen);
    renderDialog();

    const dialog = await screen.findByRole('alertdialog', { name: '업데이트가 필요해요' });
    expect(seen[0]?.toString()).toBe('version=1.0.0&build=7');
    const update = screen.getByRole('button', { name: '업데이트' });
    expect(screen.getAllByRole('button')).toHaveLength(1);
    await vi.waitFor(() => expect(update).toHaveFocus());

    await userEvent.keyboard('{Escape}');
    await userEvent.tab();
    expect(dialog).toBeInTheDocument();
    expect(update).toHaveFocus();

    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    await userEvent.click(update);
    expect(assign).toHaveBeenCalledWith('https://apps.apple.com/app/id6834488511');
    vi.unstubAllGlobals();
  });

  it('getAppVersion이 없는 이전 쉘은 legacy로 묻는다', async () => {
    shell.hasVersion = false;
    const seen: URLSearchParams[] = [];
    respond(true, seen);
    renderDialog();

    await screen.findByRole('alertdialog');
    expect(seen[0]?.toString()).toBe('version=legacy');
  });

  it('업데이트가 필요 없으면 모달을 띄우지 않는다', async () => {
    respond(false);
    const state = await settled(renderDialog());
    expect(state?.status).toBe('success');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('확인 요청이 실패하면 막지 않는다', async () => {
    server.use(http.get('*/api/app-version', () => HttpResponse.error()));
    const state = await settled(renderDialog());
    expect(state?.status).toBe('error');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('쉘이 버전을 주지 못하면(시간 초과) 묻지 않고 막지 않으며, 성공으로 캐시하지 않고 보고에서 뺀다', async () => {
    shell.getAppVersion.mockResolvedValueOnce(undefined as never);
    const seen: URLSearchParams[] = [];
    respond(true, seen);
    const state = await settled(renderDialog());
    expect(seen).toHaveLength(0);
    expect(state?.status).toBe('error');
    expect(shouldReportApiError(state?.error)).toBe(false);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('브라우저에서는 묻지 않는다', () => {
    shell.inShell = false;
    const seen: URLSearchParams[] = [];
    respond(true, seen);
    renderDialog();
    expect(seen).toHaveLength(0);
  });
});
