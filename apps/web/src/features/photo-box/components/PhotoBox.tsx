'use client';

import type { PhotoBoxPreview } from '../lib/preview';
import { usePhotoBoxState } from '../hooks/usePhotoBoxState';
import { PhotoBoxScreen } from './PhotoBoxScreen';

type PhotoBoxProps = {
  /** 임시 상태 미리보기(`/photos?preview=…`). API 연결 후 제거 */
  preview?: PhotoBoxPreview | undefined;
};

/** `/photos` 사진함 탭 화면: 상태를 가져와 화면에 연결(번치 전환·선택 모드·올리기는 아직 동작 없음) */
export function PhotoBox({ preview }: PhotoBoxProps) {
  const state = usePhotoBoxState(preview);

  return <PhotoBoxScreen state={state} />;
}
