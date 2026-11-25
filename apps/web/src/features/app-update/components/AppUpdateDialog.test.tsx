import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
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

const renderDialog = () =>
  render(<AppUpdateDialog />, { wrapper: createQueryWrapper(createTestQueryClient()) });

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

  it('업데이트가 필요 없거나 확인에 실패하면 모달을 띄우지 않는다', async () => {
    const seen: URLSearchParams[] = [];
    respond(false, seen);
    renderDialog();
    await vi.waitFor(() => expect(seen).toHaveLength(1));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    let failed = 0;
    server.use(
      http.get('*/api/app-version', () => {
        failed += 1;
        return HttpResponse.error();
      }),
    );
    renderDialog();
    await vi.waitFor(() => expect(failed).toBe(1));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('쉘이 버전을 주지 못하면(시간 초과) 묻지 않고 막지 않는다', async () => {
    shell.getAppVersion.mockResolvedValueOnce(undefined as never);
    const seen: URLSearchParams[] = [];
    respond(true, seen);
    renderDialog();
    await vi.waitFor(() => expect(shell.getAppVersion).toHaveBeenCalled());
    expect(seen).toHaveLength(0);
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
