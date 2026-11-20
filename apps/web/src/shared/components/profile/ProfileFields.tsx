'use client';

import { LabeledTextField } from '@app/design-system/web';
import { useId } from 'react';
import type { ProfileFieldsState } from '../../hooks/useProfileFields';
import { filteredPaste } from '../../lib/filteredPaste';
import { closeKeyboard } from '../../lib/keyboard';
import {
  NICKNAME_AVAILABLE_MESSAGE,
  NICKNAME_CHECKING_MESSAGE,
  NICKNAME_MAX_LENGTH,
  pasteNickname,
} from '../../lib/nickname';
import { GenderField } from './GenderField';

type ProfileFieldsProps = {
  /** `useProfileFields`가 돌려준 값·오류·변경 함수 */
  fields: ProfileFieldsState;
  /** 출생연도·성별과 비공개 안내를 보임. 선택 약관(추가 개인정보)에 동의했을 때만 보임(가입·MY 수정 공통, 기본은 보임) */
  showDemographics?: boolean | undefined;
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
  note = '출생연도와 성별은 다른 사용자에게 공개되지 않아요.',
}: ProfileFieldsProps) {
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
        helperMessage={
          fields.nicknameChecking
            ? NICKNAME_CHECKING_MESSAGE
            : fields.nicknameAvailable
              ? NICKNAME_AVAILABLE_MESSAGE
              : undefined
        }
        onChange={(event) => fields.setNickname(event.target.value)}
        // 허용하지 않는 문자는 빼고, 12자를 넘으면 자르지 않고 넣어 초과 안내를 보임
        onPaste={filteredPaste(pasteNickname, fields.setNickname)}
        onCompositionStart={() => fields.setComposing(true)}
        onCompositionEnd={() => fields.setComposing(false)}
        onFocus={() => fields.setNicknameFocused(true)}
        // 일부 모바일 키보드의 조합 종료 없는 포커스 이탈 처리
        onBlur={() => {
          fields.setComposing(false);
          fields.setNicknameFocused(false);
        }}
      />
      {showDemographics ? (
        <>
          <span id={birthYearHintId} className="sr-only">
            숫자 4자리로 입력해 주세요.
          </span>
          <LabeledTextField
            title="출생연도"
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
