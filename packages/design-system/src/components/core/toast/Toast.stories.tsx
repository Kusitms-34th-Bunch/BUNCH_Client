import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../button';
import { toast } from './showToast';
import { Toast } from './Toast';
import { Toaster } from './Toaster';

const meta = {
  title: 'Components/Toast',
  component: Toast,
  args: {
    children: '링크를 복사했어요.',
  },
} satisfies Meta<typeof Toast>;

export default meta;

type Story = StoryObj<typeof meta>;

// 네 가지 형태는 아래 Matrix가 한 번에 스냅샷하므로 개별 story는 Controls로 보는 용도로 두고 스냅샷에서 제외한다.
const skipSnapshot = { chromatic: { disableSnapshot: true } };

export const Default: Story = { parameters: skipSnapshot };

export const WithIcon: Story = {
  parameters: skipSnapshot,
  args: { icon: 'success' },
};

export const WithAction: Story = {
  parameters: skipSnapshot,
  args: { action: { label: '공유', onClick: () => {} } },
};

export const WithIconAndAction: Story = {
  parameters: skipSnapshot,
  args: { icon: 'success', action: { label: '공유', onClick: () => {} } },
};

const surfaces: { name: string; className: string }[] = [
  { name: '밝은 배경', className: 'bg-surface-primary' },
  { name: '브랜드 색 배경', className: 'bg-surface-brand' },
];

// 토스트는 화면 내용 위에 뜨므로 배경에 따라 보이는 모양(글자 대비)이 달라진다.
export const Matrix: Story = {
  render: () => (
    <div className="gap-s8 flex flex-col">
      {surfaces.map(({ name, className }) => (
        <section
          key={name}
          aria-label={name}
          className={`gap-s6 p-padding-p8 flex flex-col ${className}`}
        >
          <Toast>이 지원사업이 ‘신청 준비 중’에 추가됐어요.</Toast>
          <Toast icon="success">이 지원사업이 ‘신청 준비 중’에 추가됐어요.</Toast>
          <Toast action={{ label: '공유', onClick: () => {} }}>
            이 지원사업이 ‘신청 준비 중’에 추가됐어요.
          </Toast>
          <Toast icon="success" action={{ label: '공유', onClick: () => {} }}>
            이 지원사업이 ‘신청 준비 중’에 추가됐어요.
          </Toast>
        </section>
      ))}
    </div>
  ),
};

// 좁은 화면 폭에서 긴 글자는 줄바꿈하고 버튼은 줄어들지 않는다.
export const LongText: Story = {
  render: () => (
    <div className="bg-surface-inversed p-padding-p8 w-80">
      <Toast icon="success" action={{ label: '공유', onClick: () => {} }}>
        초대 링크를 복사했어요. 친구에게 붙여넣어 보내거나 공유 버튼으로 바로 보낼 수 있어요.
      </Toast>
    </div>
  ),
};

// 실제 toast()와 Toaster를 눌러 보는 용도. 시간이 지나면 사라지는 동작이라 스냅샷에서 제외한다.
export const Playground: Story = {
  parameters: { chromatic: { disableSnapshot: true } },
  render: () => (
    <div className="gap-s4 p-padding-p8 flex flex-wrap">
      <Toaster />
      <Button variant="secondary" onClick={() => toast('저장했어요.')}>
        글자만
      </Button>
      <Button variant="secondary" onClick={() => toast('저장했어요.', { icon: 'success' })}>
        아이콘
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast('링크를 복사했어요.', { action: { label: '공유', onClick: () => {} } })
        }
      >
        액션
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast('링크를 복사했어요.', {
            icon: 'success',
            action: { label: '공유', onClick: () => {} },
          })
        }
      >
        아이콘 + 액션
      </Button>
    </div>
  ),
};
