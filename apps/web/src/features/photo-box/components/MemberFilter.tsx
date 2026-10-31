'use client';

import { ChipButton } from '@app/design-system/web';
import { useRef, type KeyboardEvent } from 'react';
import { ALL_MEMBERS, type PhotoBoxMember } from '../lib/types';

type MemberFilterProps = {
  members: readonly PhotoBoxMember[];
  /** 선택된 멤버 id. 「전체」는 `ALL_MEMBERS` */
  selectedId: string;
  onSelect: (_memberId: string) => void;
  /** 선택 모드에서 칩 이름 뒤에 붙는 고른 사진 수(멤버 id 또는 `ALL_MEMBERS`별). 0장이거나 없으면 숫자 없음 */
  selectedCounts?: Readonly<Record<string, number>> | undefined;
};

/**
 * 멤버 필터 칩: 「전체」와 멤버를 하나만 고르는 radio 그룹
 * 방향키로 이동하면 바로 선택되고(radio 관례), Tab은 선택된 칩 하나에만 머묾
 * 칩이 길어지면 가로로 스크롤하며, 사진이 없는 멤버도 칩을 보임
 */
export function MemberFilter({ members, selectedId, onSelect, selectedCounts }: MemberFilterProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const options = [{ id: ALL_MEMBERS, name: '전체', avatarSrc: undefined }, ...members];

  const moveTo = (index: number) => {
    const next = (index + options.length) % options.length;
    const option = options[next];
    if (!option) return;
    onSelect(option.id);
    refs.current[next]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const target = {
      ArrowRight: index + 1,
      ArrowDown: index + 1,
      ArrowLeft: index - 1,
      ArrowUp: index - 1,
      Home: 0,
      End: options.length - 1,
    }[event.key];
    // Alt+←(뒤로 가기) 같은 브라우저 단축키는 가로채지 않음
    if (target === undefined || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    moveTo(target);
  };

  return (
    // 칩 둘레 포커스 링이 스크롤 영역에 잘리지 않도록 아래 여백 4px(다음 영역 위 여백에서 뺌)
    <div
      role="radiogroup"
      aria-label="멤버 필터"
      className="gap-s3 px-s8 pt-s9 flex scrollbar-none overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden"
    >
      {options.map((option, index) => {
        const selected = option.id === selectedId;
        return (
          <ChipButton
            key={option.id}
            ref={(element) => {
              refs.current[index] = element;
            }}
            role="radio"
            aria-checked={selected}
            aria-pressed={undefined}
            tabIndex={selected ? 0 : -1}
            size="L"
            variant={option.id === ALL_MEMBERS ? 'solid' : 'avatar'}
            avatarSrc={option.avatarSrc}
            selected={selected}
            // Figma 화면 인스턴스는 칩 높이 40px(칩 L 기본은 38px)
            className="h-10"
            onClick={() => onSelect(option.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {selectedCounts?.[option.id]
              ? `${option.name} (${selectedCounts[option.id]})`
              : option.name}
          </ChipButton>
        );
      })}
    </div>
  );
}
