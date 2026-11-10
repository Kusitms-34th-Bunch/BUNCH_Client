import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OtherBunch } from './OtherBunch';
import { OtherBunchMembers } from './OtherBunchMembers';

const back = vi.fn();
const replace = vi.fn();
const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
);
vi.mock('next/navigation', () => ({ useRouter: () => ({ back, replace }), notFound }));

beforeEach(() => {
  vi.clearAllMocks();
});

// 팔로우 결과는 모듈 저장소에 남으므로 각 테스트가 마지막에 처음 상태(팔로우 안 함)로 되돌림
describe('OtherBunch 공개 번치', () => {
  it('팔로우하면 「팔로잉」이 되고 팔로워가 한 명 늘며, 시트에서 팔로우를 취소한다', async () => {
    const user = userEvent.setup();
    render(<OtherBunch bunchId="bunch-camping" />);

    expect(screen.getByRole('heading', { level: 1, name: '캠핑러버' })).toBeInTheDocument();
    expect(screen.getByText('팔로워').parentElement).toHaveTextContent('23팔로워');
    // 공개 번치는 팔로우 전에도 번들이 보임
    expect(screen.getByRole('region', { name: '번들' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '팔로우' }));
    expect(screen.getByText('팔로워').parentElement).toHaveTextContent('24팔로워');
    expect(screen.getByRole('status')).toHaveTextContent('캠핑러버 번치를 팔로우했어요.');

    await user.click(screen.getByRole('button', { name: '팔로잉' }));
    const sheet = await screen.findByRole('dialog', { name: '캠핑러버 팔로우를 취소할까요?' });
    expect(within(sheet).getByText('공개 번치')).toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: '팔로우 취소' }));

    expect(screen.getByRole('button', { name: '팔로우' })).toBeInTheDocument();
    expect(screen.getByText('팔로워').parentElement).toHaveTextContent('23팔로워');
    expect(screen.getByRole('status')).toHaveTextContent('캠핑러버 번치 팔로우를 취소했어요.');
  });

  it('시트의 「취소」는 팔로우 상태를 그대로 둔다', async () => {
    const user = userEvent.setup();
    render(<OtherBunch bunchId="bunch-camping" />);

    await user.click(screen.getByRole('button', { name: '팔로우' }));
    await user.click(screen.getByRole('button', { name: '팔로잉' }));
    const sheet = await screen.findByRole('dialog');
    await user.click(within(sheet).getByRole('button', { name: '취소' }));

    expect(screen.getByRole('button', { name: '팔로잉' })).toBeInTheDocument();
    // 다음 테스트를 위해 처음 상태로
    await user.click(screen.getByRole('button', { name: '팔로잉' }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: '팔로우 취소' }),
    );
  });

  it('헤더에 알림은 없고 더보기만 있다', () => {
    render(<OtherBunch bunchId="bunch-camping" />);

    expect(screen.queryByRole('link', { name: '알림' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /더보기/ })).toBeInTheDocument();
  });

  it('팔로워·팔로잉·멤버 수는 그 번치의 각 목록으로 가는 링크다', () => {
    render(<OtherBunch bunchId="bunch-camping" />);

    expect(screen.getByRole('link', { name: '23 팔로워' })).toHaveAttribute(
      'href',
      '/bunches/bunch-camping/follows',
    );
    expect(screen.getByRole('link', { name: '8 팔로잉' })).toHaveAttribute(
      'href',
      '/bunches/bunch-camping/follows?tab=following',
    );
    expect(screen.getByRole('link', { name: '4 멤버' })).toHaveAttribute(
      'href',
      '/bunches/bunch-camping/members',
    );
  });
});

describe('OtherBunch 비공개 번치', () => {
  it('팔로우 전에는 번들 대신 안내를 보이고, 팔로우하면 요청 상태로 바뀌며 요청을 취소할 수 있다', async () => {
    const user = userEvent.setup();
    render(<OtherBunch bunchId="bunch-book" />);

    // 승인 전에는 수치만 보이고 팔로워·팔로잉·멤버 목록 링크는 없음
    expect(screen.getByText('팔로워').parentElement).toHaveTextContent('32팔로워');
    expect(screen.queryByRole('link', { name: /팔로워|팔로잉|멤버/ })).toBeNull();

    expect(screen.getByRole('region', { name: '비공개 번치예요' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: '번들' })).toBeNull();

    await user.click(screen.getByRole('button', { name: '팔로우' }));
    expect(screen.getByRole('status')).toHaveTextContent('책방산책 번치에 팔로우를 요청했어요.');
    // 요청만 보낸 상태라 여전히 가림
    expect(screen.getByRole('heading', { name: '비공개 번치예요' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '팔로우 요청됨' }));
    const sheet = await screen.findByRole('dialog', { name: '책방산책 팔로우 요청을 취소할까요?' });
    expect(within(sheet).getByText('요청 대기 중인 비공개 번치')).toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: '팔로우 요청 취소' }));

    expect(screen.getByRole('button', { name: '팔로우' })).toBeInTheDocument();
  });

  it('없는 번치와 상속 속성 이름은 404로 보낸다', () => {
    expect(() => render(<OtherBunch bunchId="unknown" />)).toThrow('NEXT_NOT_FOUND');
    expect(() => render(<OtherBunch bunchId="__proto__" />)).toThrow('NEXT_NOT_FOUND');
    expect(() => render(<OtherBunchMembers bunchId="constructor" />)).toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });
});

describe('OtherBunchMembers', () => {
  it('그 번치의 멤버를 관리 동작 없이 보여 준다', () => {
    render(<OtherBunchMembers bunchId="bunch-camping" />);

    expect(screen.getByRole('heading', { level: 1, name: '캠핑러버 멤버' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.queryByRole('button', { name: /관리|더보기/ })).toBeNull();
  });

  it('팔로우 승인 전의 비공개 번치는 멤버 명단 대신 안내를 보인다', () => {
    render(<OtherBunchMembers bunchId="bunch-book" />);

    expect(screen.getByRole('region', { name: '비공개 번치예요' })).toHaveTextContent(
      '목록을 보려면 이 번치를 팔로우하세요.',
    );
    expect(screen.queryByRole('listitem')).toBeNull();
  });
});
