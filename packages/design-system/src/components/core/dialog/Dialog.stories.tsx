import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from '../button';
import { toast, Toaster } from '../toast';
import { ConfirmDialog, Dialog, type ConfirmDialogProps } from './Dialog';

const meta = {
  title: 'Components/Dialog',
  component: ConfirmDialog,
  parameters: { layout: 'fullscreen' },
  args: {
    open: true,
    onOpenChange: () => {},
    title: '현재 선택된 사진이 초기화됩니다',
    description: '새로운 추천 번들을 적용할까요?',
    confirmLabel: '예',
    onConfirm: () => {},
  },
} satisfies Meta<typeof ConfirmDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Solid: Story = { args: { cancelLabel: '아니요' } };
export const Text: Story = { args: { appearance: 'text', confirmLabel: '확인' } };
export const SingleButton: Story = { args: { confirmLabel: '확인' } };
export const LongText: Story = {
  args: {
    title: '변경한 내용을 저장하지 않고 이 화면에서 나가시겠어요?',
    description: '지금 나가면 변경 내용이 사라집니다. '.repeat(30),
    cancelLabel: '계속 편집',
    confirmLabel: '나가기',
  },
};

const PlaygroundDialog = (props: ConfirmDialogProps) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Toaster />
      <Button onClick={() => setOpen(true)}>확인창 열기</Button>
      <ConfirmDialog
        {...props}
        open={open}
        onOpenChange={setOpen}
        onConfirm={() => {
          setOpen(false);
          toast('적용했어요.', { icon: 'success' });
        }}
      />
    </>
  );
};
export const Playground: Story = {
  parameters: { chromatic: { disableSnapshot: true } },
  render: (args) => <PlaygroundDialog {...args} />,
};

// 모달 바깥 Sonner 접근 제한 재현용
export const ToastWhileOpen: Story = {
  parameters: { chromatic: { disableSnapshot: true } },
  render: () => (
    <>
      <Toaster />
      <Dialog.Root open onOpenChange={() => {}}>
        <Dialog.Content>
          <Dialog.Title>Toast 공존 시험</Dialog.Title>
          <Dialog.Description>Toast 액션의 포커스와 클릭을 확인합니다.</Dialog.Description>
          <Dialog.Footer>
            <Dialog.Confirm
              onClick={() =>
                toast('알림 표시', {
                  duration: Infinity,
                  action: { label: '액션 시험', onClick: () => toast('액션 실행됨') },
                })
              }
            >
              Toast 표시
            </Dialog.Confirm>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </>
  ),
};
