'use client';

import { Button } from '@app/design-system';
import { Option } from '@app/design-system/web';
import { useId } from 'react';

export type Gender = 'female' | 'male';

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'female', label: '여성' },
  { value: 'male', label: '남성' },
];

type GenderFieldProps = {
  value: Gender | null;
  onChange: (_value: Gender | null) => void;
  /** 그룹에 연결할 설명 요소 id(예: 공개 여부 안내) */
  describedBy?: string;
};

// 여성·남성 중 하나 선택, 다시 누르면 해제(선택은 Figma 눌림 모양 유지)
export function GenderField({ value, onChange, describedBy }: GenderFieldProps) {
  const titleId = useId();

  return (
    <div
      role="group"
      aria-labelledby={titleId}
      aria-describedby={describedBy}
      className="gap-s3 flex w-full flex-col"
    >
      <div className="typography-body-3-semi-bold gap-s2 text-text-secondary flex items-center">
        <span id={titleId}>성별</span>
        <Option variant="optional" />
      </div>
      <div className="gap-s4 flex">
        {GENDERS.map((gender) => {
          const selected = value === gender.value;
          return (
            <Button
              key={gender.value}
              variant="tertiary"
              size="md"
              aria-pressed={selected}
              className={selected ? 'flex-1 before:opacity-100' : 'text-text-tertiary flex-1'}
              onClick={() => onChange(selected ? null : gender.value)}
            >
              {gender.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
