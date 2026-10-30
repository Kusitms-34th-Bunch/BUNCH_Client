import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ReactNode } from 'react';
import { Button } from '../../core/button';
import { BottomSheet } from './BottomSheet';

// 틀(손잡이·제목·닫기·본문·하단) 동작 예시. Figma 변형별 시트는 PhotoUploadSheet 등 렌더러 story 참고
const Sheet = ({
  children,
  disablePointerDismissal,
}: {
  children: (_close: () => void) => ReactNode;
  disablePointerDismissal?: boolean;
}) => {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button size="md" onClick={() => setOpen(true)}>
        시트 열기
      </Button>
      <BottomSheet.Root
        open={open}
        onOpenChange={setOpen}
        disablePointerDismissal={disablePointerDismissal}
      >
        {children(() => setOpen(false))}
      </BottomSheet.Root>
    </>
  );
};

const meta = {
  title: 'Web/BottomSheet/Frame',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const Placeholder = ({ height }: { height: string }) => (
  <div className={`bg-surface-secondary rounded-r4 shrink-0 ${height}`} />
);

/** 손잡이 + 제목·부제·닫기 + 본문 + 하단 버튼 */
export const Default: Story = {
  render: () => (
    <Sheet>
      {(close) => (
        <BottomSheet.Content>
          <BottomSheet.Header>
            <BottomSheet.Title>시트 제목</BottomSheet.Title>
            <BottomSheet.Description>부제는 제목 아래 왼쪽 열</BottomSheet.Description>
            <BottomSheet.Close />
          </BottomSheet.Header>
          <BottomSheet.Body>
            <Placeholder height="h-40" />
          </BottomSheet.Body>
          <BottomSheet.Footer>
            <Button onClick={close}>확인</Button>
          </BottomSheet.Footer>
        </BottomSheet.Content>
      )}
    </Sheet>
  ),
};

/** 화면에 닫기 버튼이 없는 시트: 숨긴 닫기 버튼은 키보드 초점 때만 표시 */
export const HiddenClose: Story = {
  render: () => (
    <Sheet>
      {() => (
        <BottomSheet.Content>
          <BottomSheet.Header>
            <BottomSheet.Title>제목만 있는 시트</BottomSheet.Title>
            <BottomSheet.Close className="focus-visible:-m-s5 focus-visible:p-s5 sr-only focus-visible:not-sr-only" />
          </BottomSheet.Header>
          <BottomSheet.Body className="pb-s10">
            <Placeholder height="h-24" />
          </BottomSheet.Body>
        </BottomSheet.Content>
      )}
    </Sheet>
  ),
};

/** 바깥 터치 닫기 차단(입력이 있는 시트) */
export const PointerDismissalDisabled: Story = {
  render: () => (
    <Sheet disablePointerDismissal>
      {(close) => (
        <BottomSheet.Content>
          <BottomSheet.Header>
            <BottomSheet.Title>바깥을 눌러도 닫히지 않음</BottomSheet.Title>
            <BottomSheet.Close />
          </BottomSheet.Header>
          <BottomSheet.Body>
            <Placeholder height="h-24" />
          </BottomSheet.Body>
          <BottomSheet.Footer>
            <Button onClick={close}>완료</Button>
          </BottomSheet.Footer>
        </BottomSheet.Content>
      )}
    </Sheet>
  ),
};

/** 내용이 화면보다 길 때 본문만 스크롤 */
export const LongBody: Story = {
  render: () => (
    <Sheet>
      {() => (
        <BottomSheet.Content>
          <BottomSheet.Header>
            <BottomSheet.Title>
              추천 사진으로 빠르게 번들을 만들어보세요! 긴 제목은 단어 단위로 줄바꿈
            </BottomSheet.Title>
            <BottomSheet.Close />
          </BottomSheet.Header>
          <BottomSheet.Body className="gap-s4 flex flex-col">
            {Array.from({ length: 12 }, (_, index) => (
              <Placeholder key={index} height="h-24" />
            ))}
          </BottomSheet.Body>
        </BottomSheet.Content>
      )}
    </Sheet>
  ),
};
