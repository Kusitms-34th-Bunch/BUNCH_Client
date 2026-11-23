'use client';

import { useState } from 'react';
import type { Gender } from '../components/profile/GenderField';
import {
  BIRTH_YEAR_ERROR_MESSAGE,
  isBirthYearInRange,
  isCompleteBirthYear,
  isValidBirthYear,
  sanitizeBirthYear,
} from '../lib/birthYear';
import {
  exceedsNicknameLength,
  hasInvalidNicknameChars,
  isValidNickname,
  NICKNAME_INVALID_MESSAGE,
  NICKNAME_PROHIBITED_MESSAGE,
  NICKNAME_TAKEN_MESSAGE,
  NICKNAME_TOO_LONG_MESSAGE,
  normalizeNickname,
} from '../lib/nickname';
import { useCurrentYear } from './useCurrentYear';
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
export function useProfileFields(
  initial: ProfileValues,
  checkNickname?: CheckNickname,
  { currentNickname }: { currentNickname?: string | undefined } = {},
) {
  const [nickname, setNickname] = useState(initial.nickname);
  const [composing, setComposing] = useState(false);
  const [nicknameFocused, setNicknameFocused] = useState(false);
  const [birthYear, setBirthYear] = useState(initial.birthYear);
  const [birthYearBlurred, setBirthYearBlurred] = useState(false);
  const [gender, setGender] = useState(initial.gender);
  // 저장할 때 서버가 거부한 닉네임과 이유
  // 중복: 입력 때의 확인 이후에 누가 먼저 썼을 수 있음, 금칙어: 그사이 목록에 단어가 추가됐을 수 있음(기능명세 1.4.7·7.2.7)
  const [rejectedNicknames, setRejectedNicknames] = useState<
    readonly { nickname: string; reason: 'taken' | 'prohibited' }[]
  >([]);

  const nicknameInvalid = hasInvalidNicknameChars(nickname, composing);
  const nicknameValid = isValidNickname(nickname);
  const normalizedNickname = nicknameValid ? normalizeNickname(nickname) : '';
  const rejectedAtSave = rejectedNicknames.find((item) => item.nickname === normalizedNickname);
  // 지금 내 닉네임과 같으면 중복 확인을 하지 않고 결과 문구도 보이지 않음(기능명세서 7.2.5 로직 1)
  const isCurrentNickname =
    currentNickname !== undefined && normalizedNickname === normalizeNickname(currentNickname);
  // 입력란을 벗어나면 대기 없이 바로 확인, 확인한 값은 기억(대기 0.5초는 타자 중 요청·문구 깜빡임을 막으려 유지)
  const availability = useNicknameAvailability(
    normalizedNickname,
    isCurrentNickname ? undefined : checkNickname,
    { immediate: !nicknameFocused, remember: true },
  );
  // 저장 때 서버가 거부한 이유가 입력 때 받은 확인 결과보다 앞섬
  const rejection = rejectedAtSave?.reason ?? availability;
  const nicknameError = nicknameInvalid
    ? NICKNAME_INVALID_MESSAGE
    : exceedsNicknameLength(nickname)
      ? NICKNAME_TOO_LONG_MESSAGE
      : rejection === 'prohibited'
        ? NICKNAME_PROHIBITED_MESSAGE
        : rejection === 'taken'
          ? NICKNAME_TAKEN_MESSAGE
          : availability === 'failed'
            ? CHECK_FAILURE_MESSAGE
            : undefined;
  const nicknameConfirmed =
    nicknameValid && !rejectedAtSave && (availability === 'idle' || availability === 'available');

  // 올해를 모르는 첫 렌더(서버 렌더·hydration)는 범위 검사를 미룸
  const currentYear = useCurrentYear();
  const birthYearComplete = isCompleteBirthYear(birthYear);
  const birthYearIncomplete = birthYear !== '' && !birthYearComplete;
  // 4자리를 다 쓴 뒤 범위를 벗어났거나, 포커스를 벗어났는데 4자리가 아닐 때 안내(두 경우 같은 문구, 기능명세서 1.4.5 상세 5·7.2.6)
  const birthYearError =
    (birthYearComplete && currentYear !== null && !isBirthYearInRange(birthYear, currentYear)) ||
    (birthYearIncomplete && birthYearBlurred)
      ? BIRTH_YEAR_ERROR_MESSAGE
      : undefined;

  return {
    values: { nickname, birthYear, gender },
    isValid:
      nicknameConfirmed &&
      (currentYear === null ? birthYear === '' : isValidBirthYear(birthYear, currentYear)),
    /** 닉네임만 유효한지(출생연도·성별 칸을 보이지 않을 때 저장 가능 판단) */
    isNicknameValid: nicknameConfirmed,
    nicknameError,
    /** 닉네임 중복 확인이 진행 중인지(입력이 바뀐 직후부터 응답까지). 안내 문구를 보일 때 사용 */
    nicknameChecking: availability === 'checking',
    /** 입력한 닉네임이 확인을 통과했는지(저장 때 거부되지 않았을 때만). 성공 문구를 보일 때 사용 */
    nicknameAvailable: nicknameValid && !rejectedAtSave && availability === 'available',
    birthYearError,
    setNickname,
    setComposing,
    /** 닉네임 입력란의 포커스 여부. 벗어나면 대기 없이 바로 확인 */
    setNicknameFocused,
    setBirthYear: (value: string) => setBirthYear(sanitizeBirthYear(value)),
    setBirthYearBlurred,
    setGender,
    /**
     * 저장 응답이 닉네임 중복·금칙어였을 때: 지금 닉네임을 그 이유로 사용할 수 없음으로 표시
     * 다른 닉네임으로 바꾸면 안내가 사라지고, 거부된 값으로 되돌아오면 다시 막음(서버가 같은 값을 다시 거부하므로)
     */
    markNicknameRejected: (reason: 'taken' | 'prohibited') =>
      setRejectedNicknames((previous) => [...previous, { nickname: normalizedNickname, reason }]),
  };
}

export type ProfileFieldsState = ReturnType<typeof useProfileFields>;
