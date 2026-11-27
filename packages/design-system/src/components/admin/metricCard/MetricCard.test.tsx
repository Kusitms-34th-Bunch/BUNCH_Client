import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MetricCard } from './MetricCard';

afterEach(cleanup);

describe('MetricCard', () => {
  it('지표 이름과 값을 이름-값 짝(dt·dd)으로 보여 준다', () => {
    render(<MetricCard label="노출" value="12,480" unit="회" description="하루평균 1,378회" />);

    expect(screen.getByRole('term').textContent).toBe('노출');
    expect(screen.getByRole('definition').textContent).toBe('12,480 회하루평균 1,378회');
  });

  it('단위·보조 설명이 없으면 값만 보여 준다', () => {
    render(<MetricCard label="숨김" value={4} />);

    expect(screen.getByRole('definition').textContent).toBe('4');
  });
});
