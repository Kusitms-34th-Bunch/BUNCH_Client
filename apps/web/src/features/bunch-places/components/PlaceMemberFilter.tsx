'use client';

import { ChipButton } from '@app/design-system/web';
import { useRef, type KeyboardEvent } from 'react';
import { ALL_MEMBERS, type PlaceMember } from '../lib/types';

type PlaceMemberFilterProps = {
  members: readonly PlaceMember[];
  /** 선택된 칩 id. 「전체」는 `ALL_MEMBERS` */
  selectedId: string;
  /** 멤버 id와 `ALL_MEMBERS`별 콕한 장소 수 */
  counts: Readonly<Record<string, number>>;
  onSelect: (_memberId: string) => void;
};

/**
 * 멤버별 필터 칩(기능명세 8.1.2, Figma 4096:76101): 「전체 N」과 멤버 칩(프로필 이미지·이름·장소 수) 중 하나만 고르는 radio 그룹
 * 방향키로 이동하면 바로 선택되고(radio 관례) Tab은 선택된 칩 하나에만 머묾. 칩이 길어지면 가로로 스크롤
 * 「전체」는 0개여도 숫자를 보이고, 멤버 칩은 0개면 숫자를 붙이지 않음
 */
export function PlaceMemberFilter({
  members,
  selectedId,
  counts,
  onSelect,
}: PlaceMemberFilterProps) {
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

  const labelOf = (id: string, name: string) => {
    const count = counts[id] ?? 0;
    return id === ALL_MEMBERS || count > 0 ? `${name} ${count}` : name;
  };

  return (
    // 칩 둘레 포커스 링이 스크롤 영역에 잘리지 않도록 아래 여백 4px
    <div
      role="radiogroup"
      aria-label="멤버 필터"
      className="gap-s3 px-s8 pt-s8 flex scrollbar-none overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden"
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
            // Figma 칩 높이 40px(칩 L 기본은 38px)
            className="h-10"
            onClick={() => onSelect(option.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {labelOf(option.id, option.name)}
          </ChipButton>
        );
      })}
    </div>
  );
}
