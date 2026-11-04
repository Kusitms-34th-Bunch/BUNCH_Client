'use client';

import { useState } from 'react';
import type { Gender } from '../components/profile/GenderField';
import {
  BIRTH_YEAR_MIN,
  getBirthYearMax,
  isBirthYearInRange,
  isCompleteBirthYear,
  isValidBirthYear,
  sanitizeBirthYear,
} from '../lib/birthYear';
import {
  hasInvalidNicknameChars,
  isValidNickname,
  NICKNAME_INVALID_MESSAGE,
  NICKNAME_TAKEN_MESSAGE,
  normalizeNickname,
} from '../lib/nickname';
import {
  CHECK_FAILURE_MESSAGE,
  type CheckNickname,
  useNicknameAvailability,
} from './useNicknameAvailability';

export type ProfileValues = { nickname: string; birthYear: string; gender: Gender | null };

export const EMPTY_PROFILE_VALUES: ProfileValues = { nickname: '', birthYear: '', gender: null };

/**
 * 프로필 입력(닉네임·출생연도·성별)의 값·오류·유효 여부. 가입 프로필 작성과 MY 프로필 수정이 같은 규칙 사용
 * 닉네임은 조합 중 자모를 허용해 오류를 띄우지 않고, 유효 여부·중복 확인은 조합이 끝난 완성 값만 인정
 */
export function useProfileFields(initial: ProfileValues, checkNickname?: CheckNickname) {
  const [nickname, setNickname] = useState(initial.nickname);
  const [composing, setComposing] = useState(false);
  const [birthYear, setBirthYear] = useState(initial.birthYear);
  const [birthYearBlurred, setBirthYearBlurred] = useState(false);
  const [gender, setGender] = useState(initial.gender);

  const nicknameInvalid = hasInvalidNicknameChars(nickname, composing);
  const nicknameValid = isValidNickname(nickname);
  const availability = useNicknameAvailability(
    nicknameValid ? normalizeNickname(nickname) : '',
    checkNickname,
  );
  const nicknameError = nicknameInvalid
    ? NICKNAME_INVALID_MESSAGE
    : availability === 'taken'
      ? NICKNAME_TAKEN_MESSAGE
      : availability === 'failed'
        ? CHECK_FAILURE_MESSAGE
        : undefined;
  const nicknameConfirmed =
    nicknameValid && (availability === 'idle' || availability === 'available');

  const currentYear = new Date().getFullYear();
  const birthYearComplete = isCompleteBirthYear(birthYear);
  const birthYearIncomplete = birthYear !== '' && !birthYearComplete;
  // 4자리를 다 쓴 뒤 범위를 벗어났거나, 포커스를 벗어났는데 4자리가 아닐 때 안내
  const birthYearError =
    (birthYearComplete && !isBirthYearInRange(birthYear, currentYear)) ||
    (birthYearIncomplete && birthYearBlurred)
      ? `${BIRTH_YEAR_MIN}년부터 ${getBirthYearMax(currentYear)}년 사이로 입력해 주세요.`
      : undefined;

  return {
    values: { nickname, birthYear, gender },
    isValid: nicknameConfirmed && isValidBirthYear(birthYear, currentYear),
    nicknameError,
    birthYearError,
    setNickname,
    setComposing,
    setBirthYear: (value: string) => setBirthYear(sanitizeBirthYear(value)),
    setBirthYearBlurred,
    setGender,
  };
}

export type ProfileFieldsState = ReturnType<typeof useProfileFields>;
