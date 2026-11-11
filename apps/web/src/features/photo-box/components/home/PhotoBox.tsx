'use client';

import { toast } from '@app/design-system';
import { useEffect } from 'react';
import { useCreateBundle } from '@/features/bundle/hooks/useCreateBundle';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import type { PhotoBoxPreview } from '../../lib/preview';
import { PHOTO_BOX_MESSAGES } from '../../constants/messages';
import { usePhotoBox } from '../../hooks/usePhotoBox';
import { usePhotoUpload } from '../../hooks/usePhotoUpload';
import { PhotoBoxScreen } from './PhotoBoxScreen';

type PhotoBoxProps = {
  /** 임시 상태 미리보기(`/photos?preview=…`). API 연결 후 제거 */
  preview?: PhotoBoxPreview | undefined;
};

/**
 * `/photos` 사진함 탭 화면: 상태와 동작을 가져와 화면에 연결(번치 전환·날짜 바꾸기는 아직 동작 없음)
 * 선택 모드의 「번들 만들기」는 번들 만들기 화면을 거치지 않고 화면 전체 로딩 뒤 초안 작성 화면으로 이동(기능 spec 3.3.4)
 * 고른 사진으로 초안 생성 API를 불러 만든 초안으로 이동하고, 만드는 동안 중복 요청을 막음
 */
export function PhotoBox({ preview }: PhotoBoxProps) {
  const { state, actions, retry, loadMore, moreErrorAt, stale } = usePhotoBox(preview, {
    progressive: true,
  });
  const { create: createBundle, creating } = useCreateBundle();
  // 올리기는 올리기를 시작한 시점의 번치에 저장
  const { start: startUpload, uploading } = usePhotoUpload(
    state.kind === 'ready' ? state.data.bunch.id : undefined,
  );
  // 목록을 다시 받지 못하면(삭제한 사진이 남아 보일 수 있음) 한 번 알리고, 다시 받은 뒤의 다음 실패 때 또 알림
  useEffect(() => {
    if (stale) toast(PHOTO_BOX_MESSAGES.listStale);
  }, [stale]);

  // 이어 받다 실패하면(재시도 뒤 다시 실패해도) 토스트로 알림: 필터로 목록이 짧아지면 스크롤 재시도가 안 되고 빈 상태 문구도 숨겨 화면에 단서가 없음
  // 실패 시각을 기준으로 삼아 재시도가 빨라도 실패마다 한 번씩 알림
  useEffect(() => {
    if (moreErrorAt) toast(PHOTO_BOX_MESSAGES.listMoreFailed);
  }, [moreErrorAt]);

  return (
    <>
      {/* 만드는 동안은 아래 화면을 inert로 막아 키보드·스크린 리더도 건드리지 못하게 함(레이아웃은 그대로 두려고 contents) */}
      <div className="contents" inert={creating || uploading}>
        {/* 번치가 바뀌면 화면을 새로 시작해 멤버 필터는 「전체」로, 선택 모드는 해제(명세 3.1.1, 3.3.1). 로딩에서 준비로 갈 때도 키가 undefined에서 번치 id로 바뀌어 한 번 새로 시작하지만 로딩 화면에는 상태가 없어 무해 */}
        <PhotoBoxScreen
          key={state.kind === 'ready' ? state.data.bunch.id : undefined}
          state={state}
          actions={actions}
          onCreateBundle={createBundle}
          onUpload={(source) => void startUpload(source)}
          onRetry={retry}
          onLoadMore={loadMore}
        />
      </div>
      {/* 안내 live region은 항상 마운트하고 문구만 바꿈. 만드는 동안은 화면 전체를 dim으로 덮고 가운데에 로딩 */}
      <p role="status" className="sr-only">
        {creating ? PHOTO_BOX_MESSAGES.bundleCreating : ''}
      </p>
      {/* 올리는 동안은 만들 때와 같이 화면 전체를 dim으로 덮고 가운데에 로딩(사진을 가공하고 올리는 데 시간이 걸려 멈춘 것처럼 보이지 않게, 겹쳐 올리는 것도 막음). 스크린 리더에게는 문구로 알림 */}
      <p role="status" className="sr-only">
        {uploading ? PHOTO_BOX_MESSAGES.uploading : ''}
      </p>
      {creating || uploading ? <PageLoading /> : null}
    </>
  );
}
