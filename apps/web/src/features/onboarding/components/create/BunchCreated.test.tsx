import type * as DesignSystem from '@app/design-system';
import { toast } from '@app/design-system';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { type ReactNode, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ok, fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper } from '@/shared/query/testing';
import type { CreatedBunch } from '../../api/bunches';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { useCreateBunchDraft } from '../../contexts/createBunchDraftContext';
import { CreateBunchDraftProvider } from '../../contexts/CreateBunchDraftProvider';
import { BunchCreated } from './BunchCreated';

const replace = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push }) }));
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: vi.fn(),
}));

const PHOTO = 'data:image/jpeg;base64,YWJj';
// 사진 선택·조정 흐름은 ProfilePhotoField의 책임이라 결과(조정을 마친 사진, 기본 이미지)만 흉내 냄
vi.mock('@/shared/components/profile/ProfilePhotoField', () => ({
  ProfilePhotoField: ({
    onChange,
    renderPhoto,
  }: {
    onChange: (_value: string | undefined) => void;
    renderPhoto: (_props: { onCameraClick: () => void }) => ReactNode;
  }) => (
    <>
      {renderPhoto({ onCameraClick: () => undefined })}
      <button onClick={() => onChange(PHOTO)}>사진 고르기</button>
      <button onClick={() => onChange(undefined)}>기본 이미지로</button>
    </>
  ),
}));

const CREATED: CreatedBunch = { id: '7', name: '퇴근런클럽', characterType: 'TYPE_1' };

const withBunch = (createdBunch?: CreatedBunch) =>
  function Wrapper({ children }: { children: ReactNode }) {
    // 렌더마다 client가 새로 만들어지지 않게 한 번만 만듦
    const [Query] = useState(() => createQueryWrapper());
    return (
      <Query>
        <CreateBunchDraftProvider {...(createdBunch ? { initial: { createdBunch } } : {})}>
          {children}
        </CreateBunchDraftProvider>
      </Query>
    );
  };
const Created = withBunch(CREATED);

const bunchBody = (imageUrl: string | null) => ({
  id: 7,
  name: '퇴근런클럽',
  characterType: 'TYPE_1' as const,
  imageUrl,
});

describe('BunchCreated', () => {
  beforeEach(() => {
    replace.mockClear();
    push.mockClear();
    vi.mocked(toast).mockClear();
  });

  it('사진이 없으면 서버가 돌려준 성격의 기본 대표 이미지를 보여 준다', () => {
    const { container } = render(<BunchCreated />, {
      wrapper: withBunch({ ...CREATED, characterType: 'TYPE_2' }),
    });

    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      '/images/default-bunch/type-2.svg',
    );
  });

  it('번치 대표 사진이 있으면 그 사진을 보여 준다', () => {
    render(<BunchCreated />, {
      wrapper: withBunch({ ...CREATED, imageUrl: 'https://cdn.example.com/bunch.jpg' }),
    });

    expect(screen.getByAltText('번치 대표 사진').getAttribute('src')).toBe(
      'https://cdn.example.com/bunch.jpg',
    );
  });

  it('서버가 돌려준 번치 이름과 완료 문구를 제목으로 보여 준다', () => {
    render(<BunchCreated />, { wrapper: Created });

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('퇴근런클럽 번치가 만들어졌어요!');
    expect(heading.querySelectorAll('span')).toHaveLength(2);
    expect(replace).not.toHaveBeenCalled();
  });

  it('멤버 초대하기 카드와 내 번치로 이동하기 버튼과 사진 변경 버튼이 있다', () => {
    render(<BunchCreated />, { wrapper: Created });

    expect(screen.getByRole('button', { name: /멤버 초대하기/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: '내 번치로 이동하기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '사진 변경' })).toBeTruthy();
  });

  it('만든 번치 없이 직접 들어오면 화면을 그리지 않고 1단계로 되돌린다', () => {
    render(<BunchCreated />, { wrapper: withBunch() });

    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.createBunch);
  });

  it('멤버 초대하기는 초대 화면으로 이동한다', async () => {
    render(<BunchCreated />, { wrapper: Created });

    await userEvent.click(screen.getByRole('button', { name: /멤버 초대하기/ }));

    expect(push).toHaveBeenCalledWith(ONBOARDING_PATHS.createBunchInvite);
  });

  it('내 번치로 이동하기는 피드로 replace한다', async () => {
    render(<BunchCreated />, { wrapper: Created });

    await userEvent.click(screen.getByRole('button', { name: '내 번치로 이동하기' }));

    expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.feed);
  });

  it('초대 화면에서 뒤로 가서 다시 들어와도 같은 완료 화면을 보여 준다', async () => {
    const Toggle = () => {
      const [shown, setShown] = useState(true);
      return (
        <>
          <button onClick={() => setShown((value) => !value)}>화면 전환</button>
          {shown ? <BunchCreated /> : null}
        </>
      );
    };
    render(<Toggle />, { wrapper: Created });

    await userEvent.click(screen.getByRole('button', { name: '화면 전환' }));
    await userEvent.click(screen.getByRole('button', { name: '화면 전환' }));

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      '퇴근런클럽 번치가 만들어졌어요!',
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it('조정한 사진을 올리면 서버가 돌려준 대표 사진으로 바뀐다', async () => {
    let received: FormDataEntryValue | null = null;
    server.use(
      http.put('/api/bunches/7/profile-image', async ({ request }) => {
        received = (await request.formData()).get('photo');
        return ok(bunchBody('https://cdn.example.com/new.jpg'));
      }),
    );
    render(<BunchCreated />, { wrapper: Created });

    await userEvent.click(screen.getByRole('button', { name: '사진 고르기' }));

    await waitFor(() =>
      expect(screen.getByAltText('번치 대표 사진').getAttribute('src')).toBe(
        'https://cdn.example.com/new.jpg',
      ),
    );
    expect((received as File | null)?.type).toBe('image/jpeg');
    expect(toast).not.toHaveBeenCalled();
  });

  it('기본 이미지 적용은 사진을 되돌리고 기본 이미지를 다시 보여 준다', async () => {
    let deleted = false;
    server.use(
      http.delete('/api/bunches/7/profile-image', () => {
        deleted = true;
        return ok(bunchBody(null));
      }),
    );
    const { container } = render(<BunchCreated />, {
      wrapper: withBunch({ ...CREATED, imageUrl: 'https://cdn.example.com/bunch.jpg' }),
    });

    await userEvent.click(screen.getByRole('button', { name: '기본 이미지로' }));

    await waitFor(() =>
      expect(container.querySelector('img')?.getAttribute('src')).toBe(
        '/images/default-bunch/type-1.svg',
      ),
    );
    expect(deleted).toBe(true);
  });

  it('사진 저장에 실패하면 안내하고 기존 이미지를 유지한다', async () => {
    server.use(http.put('/api/bunches/7/profile-image', () => fail(503, 'IMAGE_001')));
    const { container } = render(<BunchCreated />, { wrapper: Created });

    await userEvent.click(screen.getByRole('button', { name: '사진 고르기' }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요'),
    );
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      '/images/default-bunch/type-1.svg',
    );
  });

  it('마친 뒤 새로 입력하기 시작하면 이전 완료 기록을 버린다', async () => {
    const Probe = () => {
      const { createdBunch, setName } = useCreateBunchDraft();
      return (
        <>
          <button onClick={() => setName('새이름')}>입력 시작</button>
          <output aria-label="완료 기록">{createdBunch?.name ?? '없음'}</output>
        </>
      );
    };
    // 완료 화면 없이 입력 화면만 있는 상태(뒤로 가서 1단계에 있는 경우)
    render(<Probe />, { wrapper: Created });
    expect(screen.getByLabelText('완료 기록').textContent).toBe('퇴근런클럽');

    await userEvent.click(screen.getByRole('button', { name: '입력 시작' }));

    expect(screen.getByLabelText('완료 기록').textContent).toBe('없음');
  });
});
