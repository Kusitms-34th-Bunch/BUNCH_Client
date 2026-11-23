'use client';

import { cn } from '@app/design-system';
import { useEffect, useState, type CSSProperties } from 'react';
import { PHOTO_BOX_MESSAGES } from '../../constants/messages';
import {
  UPLOAD_STATUS_COLLAPSE_AT,
  UPLOAD_STATUS_EASING,
  UPLOAD_STATUS_IN_AT,
  UPLOAD_STATUS_OUT_AT,
  UPLOAD_STATUS_TIMING,
  type UploadStatus,
} from '../../lib/uploadStatus';

// 시간·곡선은 한 곳(lib/uploadStatus)에서 정하고 CSS 변수로 넘김
const motionVars = {
  '--upload-fill': `${UPLOAD_STATUS_TIMING.fill}ms`,
  '--upload-fill-ease': UPLOAD_STATUS_EASING.fill,
  '--upload-out': `${UPLOAD_STATUS_TIMING.out}ms`,
  '--upload-out-at': `${UPLOAD_STATUS_OUT_AT}ms`,
  '--upload-out-ease': UPLOAD_STATUS_EASING.out,
  '--upload-in': `${UPLOAD_STATUS_TIMING.in}ms`,
  '--upload-in-at': `${UPLOAD_STATUS_IN_AT}ms`,
  '--upload-in-ease': UPLOAD_STATUS_EASING.in,
  '--upload-collapse': `${UPLOAD_STATUS_TIMING.collapse}ms`,
  '--upload-collapse-ease': UPLOAD_STATUS_EASING.collapse,
} as CSSProperties;

type PhotoUploadStatusProps = {
  /** 이 번치의 업로드 상태. 없으면 자리를 차지하지 않음 */
  status: UploadStatus | undefined;
  bunchName: string;
};

/**
 * 사진함 멤버 칩 아래의 업로드 상태 줄(Figma 사진함_02 Upload Status `7722:48323`·`7722:48484`)
 * - 올리는 중: 썸네일 + 「{번치}에 N장 업로드 중..」 + 진행 바(결과가 나온 장수 / 전체)
 * - 완료: 진행 바가 다 차면 문구가 위로 흐려지며 나가고 결과 문구가 아래에서 올라옴 → 5초 유지 → 높이가 접히며 아래 목록이 올라옴
 * - 썸네일은 그대로 두고 글자 영역만 바뀜. 글자는 잘라내지 않고 투명도로만 사라지고 나타남(스펙 「문구 교체 디테일」)
 * - 동작 줄이기에서는 이동·높이·진행 바 전환 없이 투명도만 바뀜
 * 스크린 리더 안내(시작·결과)는 화면이 inert가 돼도 들리도록 `PhotoBox`의 live region이 맡음
 */
export function PhotoUploadStatus({ status, bunchName }: PhotoUploadStatusProps) {
  const shownAt = status?.phase === 'complete' ? status.shownAt : undefined;
  // 접히기 시작한 완료 시각. 화면에 다시 들어와도 완료 시각 기준으로 남은 시간만 기다림
  const [collapsedFor, setCollapsedFor] = useState<number>();
  useEffect(() => {
    if (shownAt === undefined) return;
    const timer = setTimeout(
      () => setCollapsedFor(shownAt),
      Math.max(0, shownAt + UPLOAD_STATUS_COLLAPSE_AT - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [shownAt]);
  const collapsing = shownAt !== undefined && collapsedFor === shownAt;
  const open = status !== undefined && !collapsing;
  const complete = status?.phase === 'complete';
  // 사진마다 받기·결과 두 칸씩 채우고 앞으로만 감(저장소가 계산)
  const progress = !status ? 0 : complete ? 1 : status.progress;

  return (
    // 접힘은 grid 행 1fr→0fr로 높이를 줄여 아래 목록을 끌어올림(motion.md 높이 예외). 나타날 때는 스펙에 모션이 없어 바로 자리를 잡음
    // 동작 줄이기에서는 접히는 동안 높이를 그대로 두고 투명도만 줄인 뒤, 저장소에서 지워질 때 자리를 비움
    // 접히기 시작하면 보조기기에서도 숨김(결과는 live region이 이미 알림)
    <div
      style={motionVars}
      aria-hidden={!open || undefined}
      inert={!open || undefined}
      className={cn(
        'grid',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        collapsing &&
          'duration-(--upload-collapse) ease-(--upload-collapse-ease) transition-[grid-template-rows,opacity] motion-reduce:grid-rows-[1fr] motion-reduce:transition-opacity',
      )}
    >
      {/* 문구가 아래 10px에서 올라올 때 잘리지 않도록 넘침은 접히는 동안만 숨김 */}
      <div className={cn('min-h-0', !open && 'overflow-hidden')}>
        {status ? (
          // 줄마다 새로 그려, 완료 문구 중 새로 올리면 진행 바가 거꾸로 줄어들지 않고 처음부터 시작함
          <div key={status.id} className="gap-s5 px-s8 pt-s9 flex items-center">
            <div className="rounded-r2 border-border-tertiary bg-surface-tertiary size-8.5 shrink-0 overflow-hidden border">
              {status.thumbnailUrl ? (
                // 쉘에서 받은 사진의 blob 주소라 next/image 최적화 대상이 아님
                // eslint-disable-next-line @next/next/no-img-element
                <img src={status.thumbnailUrl} alt="" className="size-full object-cover" />
              ) : null}
            </div>
            {/* 두 문구를 같은 칸에 겹쳐 두고 투명도·위치만 바꿈 */}
            <div className="grid h-9 min-w-0 flex-1">
              <div
                aria-hidden={complete || undefined}
                className={cn(
                  'gap-s2 flex min-w-0 flex-col py-1 [grid-area:1/1]',
                  complete &&
                    'delay-(--upload-out-at) duration-(--upload-out) ease-(--upload-out-ease) -translate-y-2.5 opacity-0 transition-[opacity,translate] motion-reduce:translate-y-0 motion-reduce:delay-0',
                )}
              >
                {/* 번치 이름이 길면 이름만 줄여 「N장 업로드 중..」은 남김 */}
                <p className="typography-body-4-regular text-text-quaternary flex min-w-0 whitespace-nowrap">
                  <span className="truncate">{bunchName}</span>
                  <span className="shrink-0">
                    {PHOTO_BOX_MESSAGES.uploadStatusTitleSuffix(status.total)}
                  </span>
                </p>
                <div
                  role="progressbar"
                  // 보이는 문구는 이름만 줄이려고 두 칸으로 나눠 있어, 이름 계산에서 칸 사이에 공백이 끼지 않게 한 문자열로 줌
                  aria-label={`${bunchName}${PHOTO_BOX_MESSAGES.uploadStatusTitleSuffix(status.total)}`}
                  aria-valuemin={0}
                  aria-valuemax={status.total}
                  // 값은 결과가 나온 장수(막대는 받기까지 반 칸씩 세는 steps 기준이라 조금 앞설 수 있음)
                  aria-valuenow={complete ? status.total : status.done}
                  className="bg-surface-tertiary h-1 overflow-hidden rounded-full"
                >
                  {/* 너비 대신 transform으로 채움(motion.md 성능): 막대를 왼쪽으로 밀어 둔 만큼 덜 찬 것으로 보임 */}
                  <div
                    className="bg-surface-inversed-lighter h-full rounded-full transition-transform duration-(--upload-fill) ease-(--upload-fill-ease) motion-reduce:transition-none"
                    style={{ transform: `translateX(${(progress - 1) * 100}%)` }}
                  />
                </div>
              </div>
              <div
                aria-hidden={!complete || undefined}
                className={cn(
                  'gap-s1 flex min-w-0 flex-col justify-center [grid-area:1/1]',
                  complete
                    ? 'delay-(--upload-in-at) duration-(--upload-in) ease-(--upload-in-ease) translate-y-0 opacity-100 transition-[opacity,translate] motion-reduce:delay-0'
                    : 'translate-y-2.5 opacity-0 motion-reduce:translate-y-0',
                )}
              >
                {status.phase === 'complete' ? (
                  <>
                    <p className="typography-body-4-regular text-text-secondary truncate">
                      {status.message}
                    </p>
                    {status.withBundleHint ? (
                      <p className="typography-caption-1-regular text-text-quaternary truncate">
                        {PHOTO_BOX_MESSAGES.uploadStatusBundleHint}
                      </p>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
