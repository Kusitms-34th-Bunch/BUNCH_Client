'use client';

import { ActionDialog, toast } from '@app/design-system';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { createTapSequence } from './tapSequence';
import { resetToStateA, restoreStateB } from './utStateB';

// 작성 화면 맨 위 가운데의 보이지 않는 영역을 이 횟수만큼 연달아 누르면 열림(참여자가 우연히 열지 않도록 넉넉히)
const OPEN_TAP_COUNT = 5;
// 번치 홈의 캐릭터 자리(`data-facilitator-trigger="bunch-character"`)는 5번
const CHARACTER_TAP_COUNT = 5;
const CHARACTER_SELECTOR = '[data-facilitator-trigger="bunch-character"]';
const TAP_GAP_MS = 1000;
// 가짜 DB가 IndexedDB에 쓰기까지의 지연(300ms)보다 길게 기다린 뒤 새로 불러와야 바뀐 값이 남음
const PERSIST_WAIT_MS = 700;

const DRAFT_PATH = /^\/bunch\/drafts\/(\d+)(?:\/|$)/;

type FacilitatorToolProps = {
  /** 새로 불러올 주소(테스트에서 대체), 기본은 브라우저 이동 */
  navigate?: (_path: string) => void;
};

const browserNavigate = (path: string) => {
  window.location.assign(path);
};

/**
 * UT 진행자 장치(참여자 화면에는 보이지 않음): 번치 홈의 캐릭터를 5번, 작성 화면 맨 위 가운데(헤더 저장 상태 자리)를 5번 연달아 누르면 작은 창이 열림
 * - 상태 B로 되돌리기: 작성 화면에서만, 지금 초안을 UT 상태 B로 되돌림
 * - 상태 A로 초기화: 가짜 DB를 시작 데이터로 되돌리고 번치 홈에서 다시 시작
 * `mocks/scenario`와 함께 UT가 끝나면 지움(ApiMockingGate의 불러오는 한 곳)
 */
export function FacilitatorTool({ navigate = browserNavigate }: FacilitatorToolProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const sequence = useMemo(
    () => createTapSequence({ count: OPEN_TAP_COUNT, gapMs: TAP_GAP_MS }),
    [],
  );
  const draftId = DRAFT_PATH.exec(pathname)?.[1];

  // 번치 홈 캐릭터를 연달아 누르면 열림(화면 코드는 표식만 두고 터치 판정은 여기서 함)
  useEffect(() => {
    const characterTaps = createTapSequence({ count: CHARACTER_TAP_COUNT, gapMs: TAP_GAP_MS });
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest(CHARACTER_SELECTOR)) return;
      if (characterTaps.tap()) setOpen(true);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const finish = (message: string, path: string) => {
    setOpen(false);
    toast(message, { fullWidth: true });
    // 저장이 끝난 뒤 새로 불러와 화면의 입력·캐시를 모두 비움
    setTimeout(() => navigate(path), PERSIST_WAIT_MS);
  };

  return (
    <>
      {/* 보이지 않는 열기 영역(작성 화면에서만): 읽히거나 포커스되지 않음 */}
      {draftId !== undefined && (
        <div
          aria-hidden
          data-testid="facilitator-tap-area"
          className="fixed top-0 left-1/2 z-100 w-40 -translate-x-1/2"
          // 상단 Safe Area와 헤더 가운데(저장 상태 글자뿐이라 눌러도 반응 없는 자리)를 덮음, 뒤로 가기·업로드 버튼은 양 끝이라 가리지 않음
          style={{ height: 'calc(env(safe-area-inset-top) + 48px)' }}
          onPointerDown={() => {
            if (sequence.tap()) setOpen(true);
          }}
        />
      )}
      <ActionDialog
        open={open}
        onOpenChange={setOpen}
        title="진행자 메뉴"
        description="참여자 화면에는 보이지 않아요. 회차 사이에는 상태 A로 초기화하고, 세팅이 깨졌을 때는 상태 B로 되돌려요."
        cancelLabel="닫기"
        actions={[
          {
            label: '상태 B로 되돌리기',
            variant: 'secondary',
            disabled: draftId === undefined,
            onClick: () => {
              if (draftId === undefined) return;
              restoreStateB(Number(draftId));
              finish('상태 B로 되돌렸어요', pathname);
            },
          },
          {
            label: '상태 A로 초기화',
            variant: 'warning',
            onClick: () => {
              resetToStateA();
              sessionStorage.clear();
              finish('상태 A로 초기화했어요', '/bunch');
            },
          },
        ]}
      />
    </>
  );
}
