import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useCreateBunchDraft } from '../model/createBunchDraftContext';
import { CreateBunchDraftProvider } from '../model/CreateBunchDraftProvider';
import { BunchCreated } from './BunchCreated';

const WithName = ({ name }: { name: string }) => {
  const { setName } = useCreateBunchDraft();
  return <button onClick={() => setName(name)}>이름 채우기</button>;
};
const Providers = ({ children }: { children: ReactNode }) => (
  <CreateBunchDraftProvider>{children}</CreateBunchDraftProvider>
);

describe('BunchCreated', () => {
  it('입력한 번치 이름과 완료 문구를 제목으로 보여 준다', async () => {
    render(
      <>
        <WithName name="퇴근런클럽" />
        <BunchCreated />
      </>,
      { wrapper: Providers },
    );
    await userEvent.click(screen.getByRole('button', { name: '이름 채우기' }));

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('퇴근런클럽 번치가 만들어졌어요!');
    expect(heading.querySelectorAll('span')).toHaveLength(2);
  });

  it('이름이 없으면(직접 진입) 완료 문구만 보여 준다', () => {
    render(<BunchCreated />, { wrapper: Providers });

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('번치가 만들어졌어요!');
  });

  it('멤버 초대하기 카드와 내 번치로 이동하기 버튼과 사진 변경 버튼이 있다', () => {
    render(<BunchCreated />, { wrapper: Providers });

    expect(screen.getByRole('button', { name: /멤버 초대하기/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: '내 번치로 이동하기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '사진 변경' })).toBeTruthy();
  });
});
