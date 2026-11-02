'use client';

import { Header, LineChevronLeftLargeIcon } from '@app/design-system';
import type { PhotoBoxMember, PhotoBoxPhoto } from '@/features/photo-box/lib/types';
import { PhotoViewerSwiper } from '@/features/photo-box/components/PhotoViewerSwiper';
import { usePhotoViewer } from '@/features/photo-box/hooks/usePhotoViewer';
import { formatDetailDate } from '@/features/photo-box/lib/photoDetail';
import { getViewerHeaderClass } from '@/features/photo-box/lib/photoViewerStyle';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { BUNDLE_SELECT_MESSAGES } from '../constants/selectMessages';

type RecommendViewerScreenProps = {
  /** 추천 순서를 지킨 사진 */
  photos: readonly PhotoBoxPhoto[];
  members: readonly PhotoBoxMember[];
  /** 처음 보여 줄 사진 id */
  initialPhotoId: string;
  /** 날짜 형식(올해 여부)의 기준 연도. 기본은 올해 */
  currentYear?: number | undefined;
  onBack: () => void;
  /** 다른 사진으로 넘어갔을 때(주소를 맞추는 호출 지점) */
  onPhotoChange?: ((_photoId: string) => void) | undefined;
};

/**
 * 추천 번들 사진 뷰어(Figma `2060:38839`): 헤더에 촬영 날짜, 좌우로 넘기는 원본 비율 사진과 올린 멤버 배지
 * 한 번 누르거나 확대하면 헤더와 배지를 숨기고 다시 누르면 보임. 저장·날짜 변경·삭제는 없는 보기 전용(기획 4.2.6)
 * 사진 넘기기·헤더 숨김은 `usePhotoViewer`·`PhotoViewerSwiper`가 맡음
 */
export function RecommendViewerScreen({
  photos,
  members,
  initialPhotoId,
  currentYear = new Date().getFullYear(),
  onBack,
  onPhotoChange,
}: RecommendViewerScreenProps) {
  const photoViewer = usePhotoViewer({ photos, initialPhotoId, onPhotoChange });
  const { activeIndex, chromeHidden } = photoViewer;
  const activePhoto = photos[activeIndex];

  if (!activePhoto) return null;

  return (
    <PageShell
      header={
        <div className={getViewerHeaderClass(chromeHidden)}>
          <Header
            leading={
              <HeaderIconButton label={BUNDLE_SELECT_MESSAGES.back} onClick={onBack}>
                <LineChevronLeftLargeIcon aria-hidden="true" />
              </HeaderIconButton>
            }
            title={formatDetailDate(activePhoto.takenAt, currentYear)}
          />
        </div>
      }
    >
      <h1 className="sr-only">{BUNDLE_SELECT_MESSAGES.viewerTitle}</h1>
      <p role="status" className="sr-only">
        {BUNDLE_SELECT_MESSAGES.photoPosition(activeIndex + 1, photos.length)}
      </p>
      <PhotoViewerSwiper viewer={photoViewer} photos={photos} members={members} />
    </PageShell>
  );
}
