import { ActionDialog, toast } from '@app/design-system';
import { CameraButton, ProfileImage } from '@app/design-system/web';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import { isNativeShell } from '../../bridge/client';
import { usePhotoPicker } from '../../hooks/usePhotoPicker';
import { DEFAULT_PROFILE_IMAGE } from '../../lib/bunchProfile';
import { PROFILE_IMAGE_RULES } from '../../lib/imageFile';
import { closeKeyboard } from '../../lib/keyboard';
import { PhotoCropScreen } from './PhotoCropScreen';

// 작은 사진은 바로 조정 화면으로, 오래 걸릴 때만 「사진을 불러오는 중」(화면 설계서 MY(2) 6번)
const LOADING_DELAY_MS = 300;
// 기획 문구(이전 가입 사진 오류 문구)
const CROP_FAILED_MESSAGE = '이 사진은 사용할 수 없어요.';

type ProfilePhotoFieldProps = {
  /** 지금 보이는 프로필 사진. 없으면 BUNCH 기본 이미지 */
  value: string | undefined;
  /** 조정을 마친 사진(512px JPEG data URL), 기본 이미지로 바꾸면 undefined. 저장은 호출하는 쪽 */
  onChange: (_value: string | undefined) => void;
  /** 사진 영역을 다른 모양(번치 대표 사진 등)으로 그릴 때. 카메라 버튼이 누르면 사진 변경 흐름을 여는 `onCameraClick`을 받음 */
  renderPhoto?: ((_props: { onCameraClick: () => void }) => ReactNode) | undefined;
  /** 바꾼 결과를 화면 읽기에 알림(기본). 고르자마자 서버에 저장해 결과를 따로 알리는 화면은 false */
  announceChange?: boolean | undefined;
  /** 고른 사진을 읽거나 조정하는 중인지(끝나야 `onChange`가 불림). 따로 저장하는 화면이 그동안 저장을 막을 때 */
  onPendingChange?: ((_pending: boolean) => void) | undefined;
};

/**
 * 프로필 사진과 사진 변경 흐름(가입 프로필·MY 프로필 수정 공통, 화면 설계서 MY(2))
 * 카메라 버튼 → 「프로필 사진 설정」 선택지 → 앨범 선택 → 원형 조정 → 미리보기. 앱도 시스템 편집 없이 이 조정 화면 사용
 */
export function ProfilePhotoField({
  value,
  onChange,
  renderPhoto,
  announceChange = true,
  onPendingChange,
}: ProfilePhotoFieldProps) {
  const openOverlay = useScreenOverlay();
  const [cropSrc, setCropSrc] = useState<string>();
  const [showLoading, setShowLoading] = useState(false);
  // 미리보기만 바뀌어 화면 읽기 사용자에게 결과를 알림(항상 그려 둔 status에 문구만 바꿈)
  const [announcement, setAnnouncement] = useState('');
  const photoRef = useRef<HTMLDivElement>(null);
  // 불러오는 중에 취소한 선택은 읽기가 끝나도 조정 화면·오류 토스트를 띄우지 않음
  const cancelledWhilePending = useRef(false);
  const consumeCancel = () => {
    const cancelled = cancelledWhilePending.current;
    cancelledWhilePending.current = false;
    return cancelled;
  };
  const { inputRef, isPending, handleCameraClick, handleFileChange } = usePhotoPicker({
    rules: PROFILE_IMAGE_RULES,
    nativeEdit: false,
    onSelect: (url) => {
      if (!consumeCancel()) setCropSrc(url);
    },
    onError: (error) => {
      if (!consumeCancel()) toast(error.message);
    },
  });

  const closeCrop = () => {
    setCropSrc(undefined);
    setShowLoading(false);
  };

  // 앱은 대기 시간 대부분이 시스템 선택기 화면이라 웹 파일 읽기에서만 로딩 화면
  const loadingPossible = isPending && !cropSrc && !isNativeShell();
  useEffect(() => {
    if (!loadingPossible) return;
    const timer = setTimeout(() => setShowLoading(true), LOADING_DELAY_MS);
    return () => {
      clearTimeout(timer);
      setShowLoading(false);
    };
  }, [loadingPossible]);

  // 읽기(네이티브는 로딩 화면 없음)·조정이 끝나기 전에는 부모의 사진 값이 이전 값이라 알림
  const photoPending = isPending || Boolean(cropSrc);
  const pendingRef = useRef(onPendingChange);
  useEffect(() => {
    pendingRef.current = onPendingChange;
  });
  useEffect(() => {
    pendingRef.current?.(photoPending);
  }, [photoPending]);

  // 조정 화면이 닫혀 뒤 화면 inert가 풀린 뒤 초점을 카메라 버튼으로 되돌림
  const cropOpen = Boolean(cropSrc) || showLoading;
  const wasCropOpen = useRef(false);
  useEffect(() => {
    if (wasCropOpen.current && !cropOpen) photoRef.current?.querySelector('button')?.focus();
    wasCropOpen.current = cropOpen;
  }, [cropOpen]);

  const openDialog = () =>
    openOverlay((rootProps, close) => (
      <ActionDialog
        {...rootProps}
        title="프로필 사진 설정"
        actions={[
          {
            label: '앨범에서 사진 선택하기',
            onClick: () => {
              close();
              // 앞선 읽기가 남아 있으면 새 선택이 시작되지 않으므로 취소 표시도 유지
              if (!isPending) cancelledWhilePending.current = false;
              // 웹 파일 선택 창은 사용자 클릭 안에서 열어야 해서 바로 호출
              handleCameraClick();
            },
          },
          // 이미 기본 이미지면 기본 이미지로 바꾸는 선택지는 없음(화면 설계서 2-1번)
          ...(value
            ? [
                {
                  label: '기본 이미지 적용하기',
                  onClick: () => {
                    close();
                    onChange(undefined);
                    if (announceChange) setAnnouncement('기본 이미지로 바꿨어요');
                  },
                },
              ]
            : []),
        ]}
      />
    ));

  const openChange = () => {
    closeKeyboard();
    // 같은 문구가 다시 들어가도 읽히도록 새 변경을 시작할 때 비움
    setAnnouncement('');
    openDialog();
  };

  return (
    <>
      {renderPhoto ? (
        <div ref={photoRef}>{renderPhoto({ onCameraClick: openChange })}</div>
      ) : (
        <div ref={photoRef} className="relative h-22.5 w-23.75">
          <ProfileImage src={value ?? DEFAULT_PROFILE_IMAGE} className="absolute top-0 left-0.75" />
          <CameraButton
            aria-label="프로필 사진 변경"
            className="absolute top-15.5 left-16.75"
            onClick={openChange}
          />
        </div>
      )}
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={PROFILE_IMAGE_RULES.types.join(',')}
        className="hidden"
        onChange={handleFileChange}
      />
      {cropOpen ? (
        <PhotoCropScreen
          key={cropSrc ?? 'loading'}
          src={cropSrc}
          onCancel={() => {
            if (!cropSrc) cancelledWhilePending.current = true;
            closeCrop();
          }}
          onComplete={(dataUrl) => {
            closeCrop();
            onChange(dataUrl);
            if (announceChange) setAnnouncement('사진을 바꿨어요');
          }}
          onFail={() => {
            closeCrop();
            toast(CROP_FAILED_MESSAGE);
          }}
        />
      ) : null}
    </>
  );
}
