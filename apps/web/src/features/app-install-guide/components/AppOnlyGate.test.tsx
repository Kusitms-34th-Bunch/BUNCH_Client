import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppOnlyGate } from './AppOnlyGate';

const shell = vi.hoisted(() => ({ inShell: false }));
vi.mock('@/shared/bridge/client', () => ({ isNativeShell: () => shell.inShell }));

const gate = (
  <AppOnlyGate fallback={<p>설치 안내</p>}>
    <p>앱 화면</p>
  </AppOnlyGate>
);

describe('AppOnlyGate', () => {
  // 테스트 설정은 가짜 서버를 켜 두므로 운영 빌드처럼 끔
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_MOCKING', '');
  });
  afterEach(() => {
    shell.inShell = false;
    vi.unstubAllEnvs();
  });

  it('브라우저에서는 앱 화면 대신 설치 안내를 보여 준다', () => {
    render(gate);
    expect(screen.getByText('설치 안내')).toBeInTheDocument();
    expect(screen.queryByText('앱 화면')).not.toBeInTheDocument();
  });

  it('앱 쉘 안에서는 앱 화면을 그대로 연다', () => {
    shell.inShell = true;
    render(gate);
    expect(screen.getByText('앱 화면')).toBeInTheDocument();
    expect(screen.queryByText('설치 안내')).not.toBeInTheDocument();
  });

  it('가짜 서버 빌드(E2E)는 브라우저에서도 앱 화면을 연다', () => {
    vi.stubEnv('NEXT_PUBLIC_API_MOCKING', 'enabled');
    render(gate);
    expect(screen.getByText('앱 화면')).toBeInTheDocument();
  });

  it('로컬 개발 서버는 브라우저에서도 앱 화면을 연다', () => {
    vi.stubEnv('NODE_ENV', 'development');
    render(gate);
    expect(screen.getByText('앱 화면')).toBeInTheDocument();
  });

  it('서버 렌더에서는 쉘 여부를 알 수 없어 앱 화면(접근 가드의 로딩)을 그린다', () => {
    expect(renderToString(gate)).toContain('앱 화면');
  });
});
