'use client';

import { LabeledTextField } from '@app/design-system/web';
import { useId } from 'react';
import type { ProfileFieldsState } from '../../hooks/useProfileFields';
import { closeKeyboard } from '../../lib/keyboard';
import { NICKNAME_MAX_LENGTH } from '../../lib/nickname';
import { GenderField } from './GenderField';

type ProfileFieldsProps = {
  /** `useProfileFields`가 돌려준 값·오류·변경 함수 */
  fields: ProfileFieldsState;
  /** 출생연도·성별 제목 옆 「선택」 표시. 가입은 표시, MY 수정은 표시하지 않음(Figma) */
  showOptional?: boolean | undefined;
};

/**
 * 프로필 입력 칸 묶음: 닉네임(필수)·출생연도·성별과 비공개 안내 문구
 * 출생연도·성별은 안내 문구를 설명으로 연결, 성별을 고르면 키보드를 닫음
 */
export function ProfileFields({ fields, showOptional = true }: ProfileFieldsProps) {
  const noteId = useId();
  const birthYearHintId = useId();
  const { values } = fields;

  return (
    <div className="gap-s8 flex flex-col">
      <LabeledTextField
        title="닉네임"
        option="required"
        placeholder="EX) 지원"
        value={values.nickname}
        maxLength={NICKNAME_MAX_LENGTH}
        autoComplete="off"
        errorMessage={fields.nicknameError}
        onChange={(event) => fields.setNickname(event.target.value)}
        onCompositionStart={() => fields.setComposing(true)}
        onCompositionEnd={() => fields.setComposing(false)}
        // 일부 모바일 키보드의 조합 종료 없는 포커스 이탈 처리
        onBlur={() => fields.setComposing(false)}
      />
      <span id={birthYearHintId} className="sr-only">
        숫자 4자리로 입력해 주세요.
      </span>
      <LabeledTextField
        title="출생연도"
        option={showOptional ? 'optional' : undefined}
        placeholder="EX)1998"
        inputMode="numeric"
        autoComplete="off"
        aria-describedby={`${birthYearHintId} ${noteId}`}
        value={values.birthYear}
        errorMessage={fields.birthYearError}
        onChange={(event) => fields.setBirthYear(event.target.value)}
        onFocus={() => fields.setBirthYearBlurred(false)}
        onBlur={() => fields.setBirthYearBlurred(true)}
      />
      <div className="gap-s4 flex flex-col">
        <GenderField
          value={values.gender}
          describedBy={noteId}
          showOptional={showOptional}
          onChange={(next) => {
            fields.setGender(next);
            closeKeyboard();
          }}
        />
        <p id={noteId} className="typography-caption-1-medium text-text-quaternary">
          {'출생연도와 성별은 서비스 개선을 위한 통계 분석에만 활용되며, '}
          <br />
          다른 사용자에게 공개되지 않아요.
        </p>
      </div>
    </div>
  );
}
