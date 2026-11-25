'use client';

import { Button, ConfirmDialog } from '@app/design-system';
import {
  CameraButton,
  LabeledTextArea,
  LabeledTextField,
  ProfileImage,
} from '@app/design-system/web';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { PageShell } from '@/shared/components/layout/PageShell';
import { ProfilePhotoField } from '@/shared/components/profile/ProfilePhotoField';
import { useScreenOverlay } from '@/shared/hooks/overlay/useScreenOverlay';
import {
  type CheckNickname,
  useNicknameAvailability,
} from '@/shared/hooks/profile/useNicknameAvailability';
import { closeKeyboard, dismissKeyboard } from '@/shared/lib/keyboard';
import {
  BUNCH_DESCRIPTION_MAX_LENGTH,
  BUNCH_DESCRIPTION_PROHIBITED_MESSAGE,
  BUNCH_NAME_MAX_LENGTH,
  bunchNameMessages,
  type CharacterType,
  defaultBunchImage,
  hasInvalidBunchNameChars,
  pasteBunchName,
} from '@/shared/lib/profile/bunchProfile';
import { filteredPaste } from '@/shared/lib/profile/filteredPaste';
import type { BunchProfileImageChange } from '../../api/bunchHome';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import {
  type BunchProfileDraft,
  type EditableProfile,
  NO_PROHIBITED,
  type ProhibitedValues,
} from '../../lib/profileEdit';
import { BunchVisibilityField } from './BunchVisibilityField';

/** 번치 프로필 편집 화면의 틀(헤더·하단 바)과 입력 폼 */
export function EditFrame({
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

export function ProfileForm({
  initial: latest,
  header,
  onBack,
  onSave,
  saving,
  takenName,
  prohibited,
  checkName,
  characterType,
}: {
  initial: EditableProfile;
  header: (_back: () => void) => ReactNode;
  onBack: () => void;
  onSave: (_draft: BunchProfileDraft) => void;
  saving: boolean;
  takenName: string | null;
  prohibited: ProhibitedValues;
  checkName: CheckNickname | undefined;
  characterType: CharacterType | undefined;
}) {
  const formId = useId();
  const nameId = useId();
  const descriptionId = useId();
  const openOverlay = useScreenOverlay();
  // 폼을 연 순간의 값과 버전으로 고정(그 뒤 다시 받은 값으로 바뀌면 입력은 그대로인데 비교·버전만 바뀌어 모르고 덮어씀)
  const [initial] = useState(latest);
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [isPrivate, setIsPrivate] = useState(initial.isPrivate);
  // 보이는 대표 사진: 처음 값, 조정한 새 사진(data URL), 기본 이미지면 undefined
  const [imageSrc, setImageSrc] = useState(initial.imageSrc);
  const [composing, setComposing] = useState(false);
  // 고른 사진을 읽거나 조정하는 중이면 저장하지 않음(이전 사진으로 저장되지 않게)
  const [photoPending, setPhotoPending] = useState(false);

  const nameInvalid = hasInvalidBunchNameChars(name, composing);
  const normalized = name.normalize('NFC').trim();
  // 규칙에 맞지 않거나 지금 이름 그대로면 서버에 묻지 않음
  const availability = useNicknameAvailability(
    nameInvalid || composing || normalized === initial.name ? '' : normalized,
    checkName,
    { notifyFailure: false },
  );
  // 저장 때 서버가 거절한 이름은 저장 전에 받은 「사용 가능」보다 앞섬(그 사이 다른 번치가 씀). 이름을 바꾸면 다시 확인
  const taken = availability === 'taken' || (takenName !== null && takenName === normalized);
  // 입력 때 확인과 저장 때 서버 거부 모두 금칙어로 봄. 거부된 값에서 고치면 안내를 지우고 다시 활성 조건을 따름(기능명세 5.5.5)
  const nameProhibited =
    availability === 'prohibited' ||
    (prohibited.name !== undefined && prohibited.name.normalize('NFC').trim() === normalized);
  const descriptionProhibited =
    prohibited.description !== undefined && prohibited.description === description;
  // 저장 거부로 저장하기가 비활성이 되면 초점을 안내가 남은 칸(둘 다면 이름 먼저)으로 옮겨 바로 고칠 수 있게 함(안내는 이미 그려진 뒤)
  // 응답을 기다리는 사이 고친 칸은 안내가 없어 고르지 않음. 새 거부 응답을 받을 때 한 번만 옮김
  const handledRejection = useRef<ProhibitedValues>(NO_PROHIBITED);
  useEffect(() => {
    if (handledRejection.current === prohibited) return;
    handledRejection.current = prohibited;
    const target = nameProhibited ? nameId : descriptionProhibited ? descriptionId : undefined;
    if (target) document.getElementById(target)?.focus();
  }, [prohibited, nameProhibited, descriptionProhibited, nameId, descriptionId]);
  // 앞뒤 공백만 바뀐 이름은 서버에 같은 이름으로 가므로 바뀐 것으로 보지 않음
  const changed =
    normalized !== initial.name ||
    description !== initial.description ||
    isPrivate !== initial.isPrivate ||
    imageSrc !== initial.imageSrc;
  const canSave =
    changed &&
    !saving &&
    !photoPending &&
    !composing &&
    normalized.length > 0 &&
    !nameInvalid &&
    !taken &&
    !nameProhibited &&
    !descriptionProhibited &&
    availability !== 'checking' &&
    description.trim().length > 0;
  // 비공개였던 번치를 공개로 바꿀 때만 안내(Figma 1873:33513)
  const showPublicNotice = initial.isPrivate && !isPrivate;

  const save = () => {
    closeKeyboard();
    const image: BunchProfileImageChange =
      imageSrc === initial.imageSrc
        ? { action: 'KEEP' }
        : imageSrc === undefined
          ? { action: 'RESET' }
          : { action: 'REPLACE', photo: imageSrc };
    onSave({
      name,
      description,
      isPrivate,
      image,
      expectedProfileVersion: initial.profileVersion,
    });
  };

  // 바꾼 내용이 있으면 나가기 전에 확인(기능명세 5.5.1 상세 5, MY 프로필 수정과 같은 창). 저장 중에는 묻지 않음
  const back = () => {
    if (saving || !changed) return onBack();
    // 키보드를 닫고 열어 「취소」 뒤 초점이 입력창으로 돌아가 키보드가 다시 뜨지 않게 함
    closeKeyboard();
    openOverlay((rootProps, close) => (
      <ConfirmDialog
        {...rootProps}
        title={BUNCH_HOME_MESSAGES.profileLeave.title}
        description={BUNCH_HOME_MESSAGES.profileLeave.description}
        confirmLabel={BUNCH_HOME_MESSAGES.profileLeave.confirm}
        cancelLabel={BUNCH_HOME_MESSAGES.profileLeave.cancel}
        onConfirm={() => {
          close();
          onBack();
        }}
      />
    ));
  };

  return (
    <EditFrame
      header={header(back)}
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
          {/* 고르기 → 원형 조정 → 미리보기. 서버 저장은 「저장하기」에서 함께 함 */}
          <ProfilePhotoField
            value={imageSrc}
            onChange={setImageSrc}
            onPendingChange={setPhotoPending}
            renderPhoto={({ onCameraClick }) => (
              <div className="relative h-22.5 w-23.75 shrink-0">
                <ProfileImage
                  src={imageSrc ?? defaultBunchImage(characterType)}
                  className="absolute top-0 left-0.75"
                />
                <CameraButton
                  aria-label="번치 대표 사진 변경"
                  className="absolute top-15.5 left-16.75"
                  onClick={onCameraClick}
                />
              </div>
            )}
          />
          <p role="status" className="sr-only">
            {saving ? '번치 프로필을 저장하는 중이에요' : ''}
          </p>
          <div className="gap-s8 flex w-full flex-col">
            <LabeledTextField
              id={nameId}
              title="번치 이름"
              value={name}
              maxLength={BUNCH_NAME_MAX_LENGTH}
              autoComplete="off"
              // 확인 중 안내와 통과 문구는 번치 만들기와 같음(기능명세 5.5.3)
              {...bunchNameMessages({
                invalid: nameInvalid,
                prohibited: nameProhibited,
                taken,
                availability,
              })}
              onChange={(event) => setName(event.target.value)}
              // 키보드 다음 키로 한 줄 소개 칸으로(#579)
              enterKeyHint="next"
              onEnterKey={() => document.getElementById(descriptionId)?.focus()}
              // 쓸 수 없는 문자를 섞어 붙여넣으면 그 문자만 빼고 넣음(기능명세 2.2.2 예외)
              onPaste={filteredPaste(pasteBunchName, setName)}
              onCompositionStart={() => setComposing(true)}
              onCompositionEnd={() => setComposing(false)}
              // 일부 모바일 키보드의 조합 종료 없는 포커스 이탈 처리
              onBlur={() => setComposing(false)}
            />
            {/* 번치 만들기와 같은 여러 줄 입력(줄바꿈 허용, 보이는 글자 기준 50자, 기능명세 5.5.3) */}
            <LabeledTextArea
              id={descriptionId}
              label="한 줄 소개"
              value={description}
              maxLength={BUNCH_DESCRIPTION_MAX_LENGTH}
              autoComplete="off"
              error={descriptionProhibited ? BUNCH_DESCRIPTION_PROHIBITED_MESSAGE : undefined}
              onChange={(event) => setDescription(event.target.value)}
            />
            <BunchVisibilityField
              isPrivate={isPrivate}
              onChange={setIsPrivate}
              showPublicNotice={showPublicNotice}
            />
          </div>
        </div>
      </form>
    </EditFrame>
  );
}
