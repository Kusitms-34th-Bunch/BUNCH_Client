'use client';

import { LabeledTextField } from '@app/design-system/web';
import { useId } from 'react';
import type { ProfileFieldsState } from '../../hooks/useProfileFields';
import { closeKeyboard } from '../../lib/keyboard';
import {
  hasInvalidNicknameChars,
  NICKNAME_CHECKING_MESSAGE,
  NICKNAME_MAX_LENGTH,
  pasteIntoNickname,
} from '../../lib/nickname';
import { GenderField } from './GenderField';

type ProfileFieldsProps = {
  /** `useProfileFields`가 돌려준 값·오류·변경 함수 */
  fields: ProfileFieldsState;
  /** 출생연도·성별과 비공개 안내를 보임. 가입은 선택 약관에 동의했을 때만 보임(MY 수정은 동의하지 않아도 보이되 `demographicsDisabled`로 막음, 기본은 보임) */
  showDemographics?: boolean | undefined;
  /** 출생연도·성별을 보이되 입력할 수 없게 함(추가 개인정보에 동의하지 않은 MY 수정). 값은 비워 두고 입력란 안내는 `demographicsDisabledPlaceholder` */
  demographicsDisabled?: boolean | undefined;
  /** 비활성 출생연도 입력란에 보일 안내 문구 */
  demographicsDisabledPlaceholder?: string | undefined;
  /** 출생연도·성별 아래 안내 문구. 기본은 비공개 안내이고 가입은 통계 분석 용도를 함께 안내(Figma). 줄바꿈 문자(`\n`)는 그대로 줄이 바뀜 */
  note?: string | undefined;
};

/**
 * 프로필 입력 칸 묶음: 닉네임(필수)·출생연도·성별과 비공개 안내 문구
 * 출생연도·성별은 안내 문구를 설명으로 연결, 성별을 고르면 키보드를 닫음
 */
export function ProfileFields({
  fields,
  showDemographics = true,
  demographicsDisabled = false,
  demographicsDisabledPlaceholder,
  note = '출생연도와 성별은 다른 사용자에게 공개되지 않아요.',
}: ProfileFieldsProps) {
  const noteId = useId();
  const birthYearHintId = useId();
  const lockedReasonId = useId();
  // 비활성이면 사유를, 아니면 입력 힌트를 출생연도 입력란의 설명으로 연결(칩 그룹은 사유만)
  const lockedNote = demographicsDisabled ? lockedReasonId : undefined;
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
        helperMessage={fields.nicknameChecking ? NICKNAME_CHECKING_MESSAGE : undefined}
        onChange={(event) => fields.setNickname(event.target.value)}
        onPaste={(event) => {
          // 허용하지 않는 문자가 섞였으면 그 문자만 빼고 넣음(허용 문자만이면 브라우저 기본 동작)
          const pasted = event.clipboardData.getData('text');
          if (!hasInvalidNicknameChars(pasted, false)) return;
          event.preventDefault();
          const input = event.currentTarget;
          const result = pasteIntoNickname(
            values.nickname,
            { start: input.selectionStart ?? 0, end: input.selectionEnd ?? 0 },
            pasted,
          );
          if (!result) return;
          fields.setNickname(result.value);
          requestAnimationFrame(() => input.setSelectionRange(result.caret, result.caret));
        }}
        onCompositionStart={() => fields.setComposing(true)}
        onCompositionEnd={() => fields.setComposing(false)}
        // 일부 모바일 키보드의 조합 종료 없는 포커스 이탈 처리
        onBlur={() => fields.setComposing(false)}
      />
      {showDemographics ? (
        <>
          <span id={demographicsDisabled ? lockedReasonId : birthYearHintId} className="sr-only">
            {demographicsDisabled ? demographicsDisabledPlaceholder : '숫자 4자리로 입력해 주세요.'}
          </span>
          <LabeledTextField
            title="출생연도"
            placeholder={demographicsDisabled ? demographicsDisabledPlaceholder : 'EX)1998'}
            disabled={demographicsDisabled}
            inputMode="numeric"
            autoComplete="off"
            aria-describedby={`${demographicsDisabled ? lockedReasonId : birthYearHintId} ${noteId}`}
            value={values.birthYear}
            errorMessage={fields.birthYearError}
            onChange={(event) => fields.setBirthYear(event.target.value)}
            onFocus={() => fields.setBirthYearBlurred(false)}
            onBlur={() => fields.setBirthYearBlurred(true)}
          />
          <div className="gap-s4 flex flex-col">
            <GenderField
              value={values.gender}
              describedBy={[lockedNote, noteId].filter(Boolean).join(' ')}
              disabled={demographicsDisabled}
              onChange={(next) => {
                fields.setGender(next);
                closeKeyboard();
              }}
            />
            <p
              id={noteId}
              className="typography-caption-1-medium text-text-quaternary whitespace-pre-line"
            >
              {note}
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
