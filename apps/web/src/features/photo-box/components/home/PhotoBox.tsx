'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import type { PhotoBoxPreview } from '../../lib/preview';
import { PHOTO_BOX_MESSAGES } from '../../constants/messages';
import { PHOTO_BOX_PATHS } from '../../constants/paths';
import { usePhotoBox } from '../../hooks/usePhotoBox';
import { PhotoBoxScreen } from './PhotoBoxScreen';

// 목 번들 생성이 끝나기까지의 시간(화면 전체 로딩이 보이도록, 번들 만들기 화면과 같은 값)
const MOCK_CREATE_DELAY_MS = 800;
// 초안 생성 API 연결 전에는 샘플 초안으로 이동
const SAMPLE_DRAFT_ID = 'draft-1';

type PhotoBoxProps = {
  /** 임시 상태 미리보기(`/photos?preview=…`). API 연결 후 제거 */
  preview?: PhotoBoxPreview | undefined;
};

/**
 * `/photos` 사진함 탭 화면: 상태와 동작을 가져와 화면에 연결(번치 전환·날짜 바꾸기·올리기는 아직 동작 없음)
 * 선택 모드의 「번들 만들기」는 번들 만들기 화면을 거치지 않고 화면 전체 로딩 뒤 초안 작성 화면으로 이동(기능 spec 3.3.4)
 * 초안 생성 API 연결 전에는 고른 사진이 초안에 반영되지 않고 샘플 초안으로 이동
 */
export function PhotoBox({ preview }: PhotoBoxProps) {
  const router = useRouter();
  const { state, actions, retry } = usePhotoBox(preview);
  const [creating, setCreating] = useState(false);
  const createTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(createTimer.current), []);

  const createBundle = () => {
    if (creating) return;
    setCreating(true);
    createTimer.current = setTimeout(
      () => router.push(PHOTO_BOX_PATHS.draft(SAMPLE_DRAFT_ID)),
      MOCK_CREATE_DELAY_MS,
    );
  };

  return (
    <>
      {/* 만드는 동안은 아래 화면을 inert로 막아 키보드·스크린 리더도 건드리지 못하게 함(레이아웃은 그대로 두려고 contents) */}
      <div className="contents" inert={creating}>
        <PhotoBoxScreen
          state={state}
          actions={actions}
          onCreateBundle={createBundle}
          onRetry={retry}
        />
      </div>
      {/* 안내 live region은 항상 마운트하고 문구만 바꿈. 만드는 동안은 화면 전체를 dim으로 덮고 가운데에 로딩 */}
      <p role="status" className="sr-only">
        {creating ? PHOTO_BOX_MESSAGES.bundleCreating : ''}
      </p>
      {creating ? <PageLoading /> : null}
    </>
  );
}
