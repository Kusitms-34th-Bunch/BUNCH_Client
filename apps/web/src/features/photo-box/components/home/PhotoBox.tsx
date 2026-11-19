'use client';

import { toast } from '@app/design-system';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BUNDLE_SELECT_PATHS } from '@/features/bundle/constants/selectPaths';
import { startFromPhotoBox } from '@/features/bundle/lib/photoBoxEntry';
import type { PhotoBoxPreview } from '../../lib/preview';
import { PHOTO_BOX_MESSAGES } from '../../constants/messages';
import { usePhotoBox } from '../../hooks/usePhotoBox';
import { usePhotoUpload } from '../../hooks/usePhotoUpload';
import { PHOTO_ID_ATTRIBUTE } from '../../lib/dragSelect';
import { rememberPhotoBoxSelection } from '../../lib/selectionResume';
import { usePrefetchPhotoOriginal } from '../../queries/photoDetail';
import { PhotoBoxScreen } from './PhotoBoxScreen';

// 누른 뒤 원본 받기를 시작하기까지 기다리는 시간(그 안에 스크롤로 바뀌면 받지 않음)
const WARM_DELAY_MS = 100;

type PhotoBoxProps = {
  /** 임시 상태 미리보기(`/photos?preview=…`). API 연결 후 제거 */
  preview?: PhotoBoxPreview | undefined;
  /** 헤더의 번치 이름을 눌렀을 때 여는 번치 전환 시트(번치 홈과 같은 시트라 route에서 조합해 넘김, 기능명세 3.1.1) */
  bunchSwitcher?: { open: (() => void) | undefined; switcherOpen: boolean } | undefined;
  /**
   * 번들 만들기 진입 확인(멤버 1명이면 안내 창, 초안 10개면 토스트, 기능명세 3.3.4 상세 동작 1). 들어가도 되면 true
   * 번들 만들기 feature의 확인이라 route가 조합해 넘김. 없으면 확인 없이 들어감
   */
  checkBundleEntry?: ((_bunchId: string | undefined) => Promise<boolean>) | undefined;
};

/**
 * `/photos` 사진함 탭 화면: 상태와 동작을 가져와 화면에 연결(번치 전환 시트는 route가 조합해 넘김)
 * 선택 모드의 「번들 만들기」는 고른 사진을 넘기고 참여 멤버 고르기로 이동(기능 spec 3.3.4)
 * 멤버를 고르면 그 화면이 고른 사진으로 초안 생성 API를 불러 작성 화면으로 보냄
 */
export function PhotoBox({ preview, bunchSwitcher, checkBundleEntry }: PhotoBoxProps) {
  const { state, actions, retry, loadMore, refresh, moreErrorAt, stale } = usePhotoBox(preview, {
    progressive: true,
  });
  const router = useRouter();
  const prefetchOriginal = usePrefetchPhotoOriginal();
  // 상세 링크를 누르면 원본 주소와 이미지를 미리 받음: 상세가 처음부터 원본 비율의 틀로 그려져 hero가 그 자리로 날아감
  // 스크롤을 시작하는 터치도 pointerdown이라 100ms 안에 스크롤로 바뀌면(pointercancel) 받지 않고, 그 전에 떼면 바로 받음
  const warmTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const warmPhotoId = useRef<string | null>(null);
  useEffect(() => () => clearTimeout(warmTimer.current), []);
  const warmNow = () => {
    clearTimeout(warmTimer.current);
    const photoId = warmPhotoId.current;
    warmPhotoId.current = null;
    if (photoId && state.kind === 'ready') prefetchOriginal(state.data.bunch.id, photoId);
  };
  const startWarm = (target: EventTarget) => {
    if (state.kind !== 'ready' || !(target instanceof Element) || !target.closest('a[href]'))
      return;
    warmPhotoId.current =
      target.closest(`[${PHOTO_ID_ATTRIBUTE}]`)?.getAttribute(PHOTO_ID_ATTRIBUTE) ?? null;
    clearTimeout(warmTimer.current);
    warmTimer.current = setTimeout(warmNow, WARM_DELAY_MS);
  };
  const cancelWarm = () => {
    clearTimeout(warmTimer.current);
    warmPhotoId.current = null;
  };
  // 멤버가 나 혼자거나 초안이 이미 10개면 들어가지 않고 안내(기능명세 3.3.4 상세 동작 1), 선택 모드는 그대로 둠
  const createBundle = async (selection: readonly string[]) => {
    const bunchId = readyBunchId;
    if (checkBundleEntry && !(await checkBundleEntry(bunchId))) return;
    // 확인하는 사이 화면을 떠났거나(다른 탭) 번치가 바뀌었으면 이동하지 않음
    if (!mounted.current || bunchId !== readyBunchIdRef.current) return;
    startFromPhotoBox(selection);
    // 멤버 고르기에서 뒤로 오면 이 선택으로 선택 모드를 이어 감(같은 번치일 때만)
    if (bunchId !== undefined) rememberPhotoBoxSelection(bunchId, selection);
    router.push(BUNDLE_SELECT_PATHS.members);
  };
  // 올리기는 올리기를 시작한 시점의 번치에 저장
  const { start: startUpload, uploading } = usePhotoUpload(
    state.kind === 'ready' ? state.data.bunch.id : undefined,
  );
  // 화면을 새로 시작하는 기준: 준비된 번치의 id. 로딩·오류로 잠깐 바뀌어도 마지막 번치 id를 유지해, 같은 번치로 돌아올 때는 선택 모드와 멤버 필터를 지우지 않음
  const readyBunchId = state.kind === 'ready' ? state.data.bunch.id : undefined;
  const readyBunchIdRef = useRef(readyBunchId);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    readyBunchIdRef.current = readyBunchId;
  }, [readyBunchId]);
  const [screenKey, setScreenKey] = useState(readyBunchId);
  if (readyBunchId !== undefined && readyBunchId !== screenKey) setScreenKey(readyBunchId);
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
      <div
        className="contents"
        onPointerDown={(event) => startWarm(event.target)}
        onPointerUp={warmNow}
        onPointerCancel={cancelWarm}
        // 키보드로 사진 링크에 초점이 가도 같은 지연 뒤 미리 받음(Tab으로 지나가면 취소)
        onFocus={(event) => startWarm(event.target)}
        onBlur={(event) => {
          // 사진 링크에서 초점이 빠질 때만 취소(다른 요소의 blur가 누르는 중인 미리 받기를 지우지 않게)
          if (event.target instanceof Element && event.target.closest('a[href]')) cancelWarm();
        }}
      >
        {/* 번치가 바뀌면 화면을 새로 시작해 멤버 필터는 「전체」로, 선택 모드는 해제(명세 3.1.1, 3.3.1). 처음 로딩에서 준비로 갈 때는 키가 undefined에서 번치 id로 한 번 바뀌어 새로 시작하지만 로딩 화면에는 상태가 없어 무해 */}
        <PhotoBoxScreen
          key={screenKey}
          state={state}
          actions={actions}
          onCreateBundle={(selection) => void createBundle(selection)}
          onUpload={(source) => void startUpload(source)}
          onRetry={retry}
          onBunchClick={bunchSwitcher?.open}
          switcherOpen={bunchSwitcher?.switcherOpen}
          onLoadMore={loadMore}
          onRefresh={refresh}
        />
      </div>
      {/* 올리는 동안은 화면을 막거나 진행 표시를 두지 않고 다 올라간 사진부터 목록에 들어오게 함(기획 확정). 사진함을 보거나 다른 화면으로 가도 계속 올라가며, 스크린 리더에게만 문구로 알림 */}
      <p role="status" className="sr-only">
        {uploading ? PHOTO_BOX_MESSAGES.uploading : ''}
      </p>
    </>
  );
}
