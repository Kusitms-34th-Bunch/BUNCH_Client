import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebVitalsReporter } from './WebVitalsReporter';

const captureWebVital = vi.hoisted(() => vi.fn());
vi.mock('@/shared/config/posthog', () => ({ captureWebVital }));

type Report = (_metric: Record<string, unknown>) => void;
const reporter = vi.hoisted(() => ({ report: undefined as Report | undefined }));
vi.mock('next/web-vitals', () => ({
  useReportWebVitals: (report: Report) => {
    reporter.report = report;
  },
}));

const metric = (name: string, value: number) => ({
  id: `v-${name}`,
  name,
  value,
  startTime: 0,
  label: 'web-vital',
  rating: 'good',
  navigationType: 'navigate',
});

describe('WebVitalsReporter', () => {
  afterEach(() => {
    captureWebVital.mockClear();
    vi.unstubAllGlobals();
  });

  it('Web Vitals 다섯 가지만 경로·웹 여부와 함께 넘기고 Next 전용 지표는 뺀다', () => {
    window.history.replaceState(null, '', '/bunch/12');
    render(<WebVitalsReporter />);

    reporter.report?.(metric('LCP', 1234.6));
    reporter.report?.(metric('CLS', 0.04567));
    reporter.report?.({ ...metric('Next.js-hydration', 50), label: 'custom' });

    expect(captureWebVital).toHaveBeenCalledTimes(2);
    expect(captureWebVital).toHaveBeenNthCalledWith(1, {
      metric: 'LCP',
      metric_id: 'v-LCP',
      value: 1235,
      rating: 'good',
      navigation_type: 'navigate',
      path: '/bunch/12',
      surface: 'web',
    });
    expect(captureWebVital).toHaveBeenNthCalledWith(2, expect.objectContaining({ value: 0.046 }));
  });

  it('INP는 어떤 조작이 느렸는지(누른 요소·지연 구간·가장 긴 스크립트 파일)를 함께 보내고 숫자 ID는 가린다', () => {
    window.history.replaceState(null, '', '/feed');
    render(<WebVitalsReporter />);

    reporter.report?.({
      ...metric('INP', 466),
      attribution: {
        interactionTarget: '#comment-7',
        interactionType: 'pointer',
        inputDelay: 12.4,
        processingDuration: 380.6,
        presentationDelay: 73.2,
        loadState: 'complete',
        longestScript: {
          entry: {
            invokerType: 'event-listener',
            sourceURL: `${window.location.origin}/_next/static/chunks/4499-abc.js?v=1`,
          },
        },
      },
    });
    // LCP는 원인 정보가 와도 보내지 않음(INP만 켬)
    reporter.report?.({ ...metric('LCP', 900), attribution: { interactionTarget: 'img' } });

    expect(captureWebVital).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        metric: 'INP',
        inp_target: '#comment-:n',
        inp_type: 'pointer',
        inp_input_delay: 12,
        inp_processing: 381,
        inp_presentation: 73,
        inp_load_state: 'complete',
        inp_script_type: 'event-listener',
        inp_script_source: '4499-abc.js',
      }),
    );
    expect(captureWebVital.mock.calls[1]?.[0]).not.toHaveProperty('inp_target');
  });

  it.each([
    ['인라인 스크립트(문서 주소, 초대 토큰 포함)', '/invite/AbC123token', 'inline'],
    ['다른 출처 스크립트', 'https://cdn.example.com/sdk.js', 'external'],
  ])('%s는 파일 이름 대신 종류만 보낸다', (_name, sourceURL, expected) => {
    render(<WebVitalsReporter />);
    reporter.report?.({
      ...metric('INP', 300),
      attribution: { longestScript: { entry: { invokerType: 'classic-script', sourceURL } } },
    });
    expect(captureWebVital).toHaveBeenCalledWith(
      expect.objectContaining({ inp_script_source: expected }),
    );
  });

  it('측정한 화면 주소(navigationURL)가 있으면 보고 시점 경로 대신 그 경로를 보낸다', () => {
    window.history.replaceState(null, '', '/my');
    render(<WebVitalsReporter />);

    reporter.report?.({
      ...metric('INP', 80),
      navigationURL: 'https://example.com/bunch/12?tab=a',
    });

    expect(captureWebVital).toHaveBeenCalledWith(expect.objectContaining({ path: '/bunch/12' }));
  });

  it('앱 쉘 안이면 surface를 app으로 보낸다', () => {
    vi.stubGlobal('ReactNativeWebView', { postMessage: vi.fn() });
    render(<WebVitalsReporter />);

    reporter.report?.(metric('INP', 80));

    expect(captureWebVital).toHaveBeenCalledWith(expect.objectContaining({ surface: 'app' }));
  });
});
