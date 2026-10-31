import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LocationListItem, type LocationListItemProps } from './LocationListItem';

const renderItem = (props?: Partial<LocationListItemProps>) =>
  render(
    <LocationListItem
      placeName="여의도한강공원"
      address="서울특별시 영등포구 여의동로 330"
      {...props}
    />,
  );

describe('LocationListItem', () => {
  it('장소 이름과 주소를 보여 준다', () => {
    renderItem();

    expect(screen.getByText('여의도한강공원')).toBeTruthy();
    expect(screen.getByText('서울특별시 영등포구 여의동로 330')).toBeTruthy();
  });

  it('장소 이름이 먼저, 주소가 나중에 읽히는 순서다', () => {
    const { container } = renderItem();
    const texts = [...(container.firstElementChild?.children ?? [])].map(
      (child) => child.textContent,
    );

    expect(texts).toEqual(['여의도한강공원', '서울특별시 영등포구 여의동로 330']);
  });

  it('줄은 흰 배경에 아래 구분선(border-tertiary)과 여백 16px이다', () => {
    const { container } = renderItem();
    const { classList } = container.firstElementChild as HTMLElement;

    expect(classList.contains('bg-surface-primary')).toBe(true);
    expect(classList.contains('border-b')).toBe(true);
    expect(classList.contains('border-border-tertiary')).toBe(true);
    expect(classList.contains('p-s8')).toBe(true);
    expect(classList.contains('flex-col')).toBe(true);
    expect(classList.contains('w-full')).toBe(true);
  });

  it('장소 이름은 15/22 SemiBold이고 text-secondary다', () => {
    renderItem();
    const { classList } = screen.getByText('여의도한강공원');

    expect(classList.contains('typography-login-button')).toBe(true);
    expect(classList.contains('font-(--semantic-font-weights-pretendard-1)')).toBe(true);
    expect(classList.contains('text-text-secondary')).toBe(true);
  });

  it('주소는 13/18 Regular이고 quaternary 색이다', () => {
    renderItem();
    const { classList } = screen.getByText('서울특별시 영등포구 여의동로 330');

    expect(classList.contains('typography-body-4-regular')).toBe(true);
    expect(classList.contains('text-text-quaternary')).toBe(true);
  });

  it('긴 글자는 한 줄로 줄여 넘치지 않는다', () => {
    renderItem();

    expect(screen.getByText('여의도한강공원').classList.contains('truncate')).toBe(true);
    expect(
      screen.getByText('서울특별시 영등포구 여의동로 330').classList.contains('truncate'),
    ).toBe(true);
  });

  it('className과 span 속성이 줄에 합쳐진다', () => {
    render(<LocationListItem placeName="이름" address="주소" className="mt-2" data-testid="row" />);

    expect(screen.getByTestId('row').className).toContain('mt-2');
  });

  it('button·a 안에 넣어도 유효하도록 div·p를 쓰지 않고 span만 쓴다', () => {
    const { container } = renderItem();

    expect(container.firstElementChild?.tagName).toBe('SPAN');
    expect(container.querySelectorAll('div, p')).toHaveLength(0);
  });

  it('button 안에서도 이름이 장소 이름과 주소로 합쳐져 읽힌다', () => {
    render(
      <button type="button">
        <LocationListItem placeName="여의도한강공원" address="영등포구 여의동로 330" />
      </button>,
    );

    expect(screen.getByRole('button').textContent).toBe('여의도한강공원영등포구 여의동로 330');
  });
});
