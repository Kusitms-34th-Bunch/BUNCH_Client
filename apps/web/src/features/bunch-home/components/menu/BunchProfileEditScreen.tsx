'use client';

import { Button, cn, Header, LineChevronLeftLargeIcon, toast } from '@app/design-system';
import {
  CameraButton,
  DescriptionRadioCard,
  LabeledTextField,
  ProfileImage,
} from '@app/design-system/web';
import { type ReactNode, useId, useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { usePhotoPicker } from '@/shared/hooks/usePhotoPicker';
import {
  BUNCH_DESCRIPTION_MAX_LENGTH,
  BUNCH_NAME_INVALID_MESSAGE,
  BUNCH_NAME_MAX_LENGTH,
  type CharacterType,
  defaultProfileImage,
  hasInvalidBunchNameChars,
} from '@/shared/lib/bunchProfile';
import { WEB_IMAGE_ACCEPT } from '@/shared/lib/imageFile';
import { closeKeyboard, dismissKeyboard } from '@/shared/lib/keyboard';
import type { BunchProfileEdit as BunchProfile } from '../../hooks/useBunchProfileEdits';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';

// 기획: 지원하지 않는 형식·손상된 사진은 이 문구의 토스트(가입 프로필 사진과 같음)
const PHOTO_UNUSABLE_MESSAGE = '이 사진은 사용할 수 없어요.';

type BunchProfileEditScreenProps = {
  /** 편집할 번치의 저장된 값. 아직 모르거나 메인 관리자가 아니면 undefined(폼을 그리지 않음) */
  initial: BunchProfile | undefined;
  onBack: () => void;
  /** 저장한 값으로 호출. 반영·이동·저장 토스트는 호출자 담당 */
  onSaved: (_profile: BunchProfile) => void;
  /** 번치 타입(대표 사진이 없을 때 보일 기본 이미지를 정함, 모르면 타입 1) */
  characterType?: CharacterType | undefined;
};

/**
 * 번치 프로필 편집(기능명세 5.5): 대표 사진·이름·한 줄 소개·공개 범위를 「저장하기」로 한 번에 저장
 * 저장 값은 API 연결 전 임시 메모리 저장소로 번치 홈에 반영(호출자 담당)
 */
export function BunchProfileEditScreen({
  initial,
  onBack,
  onSaved,
  characterType,
}: BunchProfileEditScreenProps) {
  const header = (
    <Header
      leading={
        <HeaderIconButton label="뒤로 가기" tone="subtle" onClick={onBack}>
          <LineChevronLeftLargeIcon />
        </HeaderIconButton>
      }
    />
  );
  if (!initial) return <EditFrame header={header} />;
  return (
    <ProfileForm
      initial={initial}
      header={header}
      onSaved={onSaved}
      characterType={characterType}
    />
  );
}

function EditFrame({
  header,
  bottom,
  children,
}: {
  header: ReactNode;
  bottom?: ReactNode;
  children?: ReactNode;
}) {
  return (
    // 화면설계서 4번: 빈 영역이나 CTA를 누르면 키보드 닫기, 다른 입력을 누르면 포커스만 이동
    <div className="flex min-h-0 flex-1 flex-col" onPointerDown={dismissKeyboard}>
      <PageShell header={header} bottom={bottom}>
        <h1 className="sr-only">번치 프로필 편집</h1>
        {children}
      </PageShell>
    </div>
  );
}

function ProfileForm({
  initial,
  header,
  onSaved,
  characterType,
}: {
  initial: BunchProfile;
  header: ReactNode;
  onSaved: (_profile: BunchProfile) => void;
  characterType: CharacterType | undefined;
}) {
  const formId = useId();
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [isPrivate, setIsPrivate] = useState(initial.isPrivate);
  const [composing, setComposing] = useState(false);
  const { inputRef, photoUrl, isPending, message, handleCameraClick, handleFileChange } =
    usePhotoPicker({ onError: () => toast(PHOTO_UNUSABLE_MESSAGE) });

  const imageSrc = photoUrl ?? initial.imageSrc;
  const nameInvalid = hasInvalidBunchNameChars(name, composing);
  const changed =
    name !== initial.name ||
    description !== initial.description ||
    isPrivate !== initial.isPrivate ||
    imageSrc !== initial.imageSrc;
  // 사진을 읽는 중에는 저장하지 않음(이전 사진이 저장되지 않게)
  const canSave =
    changed &&
    !isPending &&
    !composing &&
    name.length > 0 &&
    !nameInvalid &&
    description.trim().length > 0;
  // 비공개였던 번치를 공개로 바꿀 때만 안내(Figma 1873:33513)
  const showPublicNotice = initial.isPrivate && !isPrivate;

  const save = () => {
    closeKeyboard();
    onSaved({ name, description, isPrivate, imageSrc });
  };

  return (
    <EditFrame
      header={header}
      bottom={
        // Figma Indicator + CTA: 위 14
        <div className="pt-padding-p7 px-padding-p8">
          <Button type="submit" form={formId} className="w-full" disabled={!canSave}>
            저장하기
          </Button>
        </div>
      }
    >
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave) save();
        }}
      >
        {/* 헤더 아래 32, 사진과 입력 사이 32, 입력 사이 16(Figma 1873:33494) */}
        <div className="pt-s14 px-padding-p8 gap-s14 pb-s8 flex flex-col items-center">
          <div className="relative h-22.5 w-23.75 shrink-0">
            <ProfileImage
              src={imageSrc ?? defaultProfileImage(characterType)}
              className="absolute top-0 left-0.75"
            />
            <CameraButton
              aria-label="번치 대표 사진 변경"
              className="absolute top-15.5 left-16.75"
              onClick={handleCameraClick}
            />
            <input
              ref={inputRef}
              type="file"
              accept={WEB_IMAGE_ACCEPT}
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          {/* 사진 선택 결과 낭독(미리보기만 바뀌어 화면 읽기 사용자에게 알림) */}
          <p role="status" className="sr-only">
            {message}
          </p>
          <div className="gap-s8 flex w-full flex-col">
            <LabeledTextField
              title="번치 이름"
              value={name}
              maxLength={BUNCH_NAME_MAX_LENGTH}
              autoComplete="off"
              errorMessage={nameInvalid ? BUNCH_NAME_INVALID_MESSAGE : undefined}
              onChange={(event) => setName(event.target.value)}
              onCompositionStart={() => setComposing(true)}
              onCompositionEnd={() => setComposing(false)}
              // 일부 모바일 키보드의 조합 종료 없는 포커스 이탈 처리
              onBlur={() => setComposing(false)}
            />
            <LabeledTextField
              title="한 줄 소개"
              value={description}
              maxLength={BUNCH_DESCRIPTION_MAX_LENGTH}
              autoComplete="off"
              onChange={(event) => setDescription(event.target.value)}
            />
            <fieldset className="min-w-0">
              <legend className="typography-body-3-semi-bold text-text-secondary pb-s6">
                공개 범위
              </legend>
              <div className="gap-s5 flex flex-col">
                <div className="flex flex-col">
                  <DescriptionRadioCard
                    name="visibility"
                    value="public"
                    title="공개"
                    description="누구나 우리 번치와 번들을 볼 수 있어요."
                    checked={!isPrivate}
                    onChange={() => setIsPrivate(false)}
                  />
                  {/* 화면설계서 5-1: On Click / Smart Animate / Ease out(시간은 디자이너 요청 150ms). 자리가 벌어지며 나타나고 아래 카드도 함께 이동 */}
                  <div
                    aria-hidden
                    className={cn(
                      'grid transition-[grid-template-rows,opacity,visibility] duration-150 ease-[ease-out] motion-reduce:transition-none',
                      showPublicNotice
                        ? 'visible grid-rows-[1fr] opacity-100'
                        : 'invisible grid-rows-[0fr] opacity-0',
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="typography-body-4-regular text-text-quaternary px-padding-p8 py-s2 mt-s2 flex">
                        <span>*</span>
                        <span>{BUNCH_HOME_MESSAGES.publicNotice}</span>
                      </p>
                    </div>
                  </div>
                  {/* 화면용 문구는 항상 있어 낭독되지 않으므로 공개를 고르는 순간 읽힐 status를 따로 둠 */}
                  <p role="status" className="sr-only">
                    {showPublicNotice ? BUNCH_HOME_MESSAGES.publicNotice : ''}
                  </p>
                </div>
                <DescriptionRadioCard
                  name="visibility"
                  value="private"
                  title="비공개"
                  description="팔로우를 승인한 번치만 우리 번치와 번들을 볼 수 있어요."
                  checked={isPrivate}
                  onChange={() => setIsPrivate(true)}
                />
              </div>
            </fieldset>
          </div>
        </div>
      </form>
    </EditFrame>
  );
}
