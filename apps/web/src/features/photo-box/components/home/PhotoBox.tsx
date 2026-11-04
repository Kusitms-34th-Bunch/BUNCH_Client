'use client';

import { toast } from '@app/design-system';
import { useEffect } from 'react';
import { useCreateBundle } from '@/features/bundle/hooks/useCreateBundle';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import type { PhotoBoxPreview } from '../../lib/preview';
import { PHOTO_BOX_MESSAGES } from '../../constants/messages';
import { usePhotoBox } from '../../hooks/usePhotoBox';
import { PhotoBoxScreen } from './PhotoBoxScreen';

type PhotoBoxProps = {
  /** 임시 상태 미리보기(`/photos?preview=…`). API 연결 후 제거 */
  preview?: PhotoBoxPreview | undefined;
};

/**
 * `/photos` 사진함 탭 화면: 상태와 동작을 가져와 화면에 연결(번치 전환·날짜 바꾸기·올리기는 아직 동작 없음)
 * 선택 모드의 「번들 만들기」는 번들 만들기 화면을 거치지 않고 화면 전체 로딩 뒤 초안 작성 화면으로 이동(기능 spec 3.3.4)
 * 고른 사진으로 초안 생성 API를 불러 만든 초안으로 이동하고, 만드는 동안 중복 요청을 막음
 */
export function PhotoBox({ preview }: PhotoBoxProps) {
  const { state, actions, retry, stale } = usePhotoBox(preview);
  const { create: createBundle, creating } = useCreateBundle();
  // 목록을 다시 받지 못하면(삭제한 사진이 남아 보일 수 있음) 한 번 알리고, 다시 받은 뒤의 다음 실패 때 또 알림
  useEffect(() => {
    if (stale) toast(PHOTO_BOX_MESSAGES.listStale, { fullWidth: true });
  }, [stale]);

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
