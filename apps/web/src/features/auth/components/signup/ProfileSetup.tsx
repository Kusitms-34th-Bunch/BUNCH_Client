'use client';

import { Button, toast } from '@app/design-system';
import { CameraButton, LabeledTextField, PageHeader, ProfileImage } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { type PointerEvent, useId, useState } from 'react';
import { usePhotoPicker } from '@/shared/hooks/usePhotoPicker';
import {
  CHECK_FAILURE_MESSAGE,
  type CheckNickname,
  useNicknameAvailability,
} from '../../hooks/useNicknameAvailability';
import { useScrollFocusedIntoView } from '../../hooks/useScrollFocusedIntoView';
import {
  BIRTH_YEAR_MIN,
  getBirthYearMax,
  isBirthYearInRange,
  isCompleteBirthYear,
  isValidBirthYear,
  sanitizeBirthYear,
} from '../../lib/birthYear';
import {
  hasInvalidNicknameChars,
  isValidNickname,
  NICKNAME_INVALID_MESSAGE,
  NICKNAME_MAX_LENGTH,
  NICKNAME_TAKEN_MESSAGE,
  normalizeNickname,
} from '../../lib/nickname';
import { type Gender, GenderField } from './GenderField';
import { SignupFrame } from './SignupFrame';

// 기획: 지원하지 않는 형식·손상된 사진은 이 문구의 토스트
const PHOTO_UNUSABLE_MESSAGE = '이 사진은 사용할 수 없어요.';
// 기본 프로필 이미지는 번치 대표 이미지(구름 마스코트)
const DEFAULT_PROFILE_IMAGE = '/images/default-bunch.png';

type ProfileSetupProps = {
  /** 시작하기를 누르면 이동할 경로. 이동 대상은 호출하는 route가 정한다 */
  nextPath: string;
  /** 닉네임 중복 확인 호출. 없으면(서버 연결 전) 확인하지 않는다 */
  checkNickname?: CheckNickname | undefined;
};

const closeKeyboard = () => {
  const active = document.activeElement;
  if (active instanceof HTMLInputElement) active.blur();
};

// 입력창·라벨·버튼이 아닌 곳을 누르면 키보드를 닫는다. 버튼은 누르는 중에 닫으면 화면이 밀려 탭이 사라지므로 클릭 뒤에 닫는다
const dismissKeyboard = (event: PointerEvent<HTMLElement>) => {
  if (event.target instanceof Element && event.target.closest('input, label, button')) return;
  closeKeyboard();
};

/**
 * 가입 마지막 단계인 프로필 작성 화면
 * 닉네임(필수)이 규칙에 맞고 중복이 아닐 때만 시작하기가 활성화된다. 사진은 미리보기까지만 연결하고 저장·접근 제어는 연결하지 않았다
 */
export function ProfileSetup({ nextPath, checkNickname }: ProfileSetupProps) {
  const router = useRouter();
  useScrollFocusedIntoView();
  const noteId = useId();
  const birthYearHintId = useId();
  const { inputRef, photoUrl, handleCameraClick, handleFileChange } = usePhotoPicker({
    onError: () => toast(PHOTO_UNUSABLE_MESSAGE),
  });

  const [nickname, setNickname] = useState('');
  const [composing, setComposing] = useState(false);
  const [birthYear, setBirthYear] = useState('');
  const [birthYearBlurred, setBirthYearBlurred] = useState(false);
  const [gender, setGender] = useState<Gender | null>(null);

  // 오류 표시는 조합 중인 자모를 봐주고, 시작하기·중복 확인은 조합이 끝난 완성된 값만 인정한다
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
  const showBirthYearError =
    (birthYearComplete && !isBirthYearInRange(birthYear, currentYear)) ||
    (birthYearIncomplete && birthYearBlurred);

  const canStart = nicknameConfirmed && isValidBirthYear(birthYear, currentYear);

  const start = () => {
    closeKeyboard();
    router.push(nextPath);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col" onPointerDown={dismissKeyboard}>
      <SignupFrame
        bottom={
          <div className="px-padding-p8 pt-padding-p7">
            <Button className="w-full" disabled={!canStart} onClick={start}>
              BUNCH 시작하기
            </Button>
          </div>
        }
      >
        <PageHeader
          title="먼저 나를 소개해 볼까요?"
          description="BUNCH에서 사용할 닉네임과 프로필 사진을 설정해 주세요."
        />
        <div className="pt-s18 gap-s4 flex flex-col items-center">
          <div className="relative h-22.5 w-23.75">
            <ProfileImage
              src={photoUrl ?? DEFAULT_PROFILE_IMAGE}
              className="absolute top-0 left-0.75"
            />
            <CameraButton
              aria-label="프로필 사진 변경"
              className="absolute top-15.5 left-16.75"
              onClick={() => {
                closeKeyboard();
                handleCameraClick();
              }}
            />
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        <div className="pt-s14 px-padding-p8 gap-s8 flex flex-col">
          <LabeledTextField
            title="닉네임"
            option="required"
            placeholder="EX) 지원"
            value={nickname}
            maxLength={NICKNAME_MAX_LENGTH}
            autoComplete="off"
            {...(nicknameError ? { errorMessage: nicknameError } : {})}
            onChange={(event) => setNickname(event.target.value)}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={() => setComposing(false)}
            // 일부 모바일 키보드의 조합 종료 없는 포커스 이탈 처리
            onBlur={() => setComposing(false)}
          />
          <span id={birthYearHintId} className="sr-only">
            숫자 4자리로 입력해 주세요.
          </span>
          <LabeledTextField
            title="출생연도"
            option="optional"
            placeholder="EX)1998"
            inputMode="numeric"
            autoComplete="off"
            aria-describedby={`${birthYearHintId} ${noteId}`}
            value={birthYear}
            {...(showBirthYearError
              ? {
                  errorMessage: `${BIRTH_YEAR_MIN}년부터 ${getBirthYearMax(currentYear)}년 사이로 입력해 주세요.`,
                }
              : {})}
            onChange={(event) => setBirthYear(sanitizeBirthYear(event.target.value))}
            onFocus={() => setBirthYearBlurred(false)}
            onBlur={() => setBirthYearBlurred(true)}
          />
          <div className="gap-s4 flex flex-col">
            <GenderField
              value={gender}
              describedBy={noteId}
              onChange={(next) => {
                setGender(next);
                closeKeyboard();
              }}
            />
            <p id={noteId} className="typography-caption-1-medium text-text-quaternary">
              출생연도와 성별은 다른 사용자에게 공개되지 않아요.
            </p>
          </div>
        </div>
      </SignupFrame>
    </div>
  );
}
