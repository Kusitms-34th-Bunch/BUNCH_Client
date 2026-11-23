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
