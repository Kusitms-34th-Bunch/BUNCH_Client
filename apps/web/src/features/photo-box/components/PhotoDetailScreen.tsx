'use client';

import 'swiper/css';
import 'swiper/css/zoom';
import type { Swiper as SwiperInstance } from 'swiper/types';
import { cn, Header, LineChevronLeftLargeIcon, LineDotsLargeIcon, toast } from '@app/design-system';
import { IconButton } from '@app/design-system/web';
import { useEffect, useRef, useState } from 'react';
import { A11y, Keyboard, Zoom } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import type { PhotoBoxActions, PhotoBoxMember, PhotoBoxPhoto, PhotoBoxViewer } from '../lib/types';
import { PHOTO_BOX_MESSAGES } from '../constants/messages';
import { canDeletePhotos, getDeleteKind } from '../lib/photoActions';
import { formatDetailDate } from '../lib/photoDetail';
import { PhotoDetailMenu, type PhotoDetailMenuAction } from './PhotoDetailMenu';
import { PhotoDetailSlide } from './PhotoDetailSlide';
import { DeleteConfirmDialog } from './PhotoSelectionDialogs';

// 단일 탭과 더블탭(확대)을 구분하기 위해 단일 탭 처리를 잠깐 미룸
const TAP_DELAY_MS = 250;
// 현재 사진 앞뒤 이만큼만 그리고 나머지는 빈 슬라이드(사진이 많아도 가볍게 유지)
const RENDER_RANGE = 1;
const MAX_ZOOM = 3;

type PhotoDetailScreenProps = {
  /** 사진함 순서(`getDetailOrder`)로 정렬된 사진 */
  photos: readonly PhotoBoxPhoto[];
  members: readonly PhotoBoxMember[];
  viewer: PhotoBoxViewer;
  /** 처음 보여 줄 사진 id */
  initialPhotoId: string;
  actions: PhotoBoxActions;
  /** 날짜 형식(올해 여부)의 기준 연도. 기본은 올해 */
  currentYear?: number | undefined;
  onBack: () => void;
  /** 사진이 사라지게 삭제해 사진함으로 돌아갈 때 */
  onLeave: () => void;
  /** 다른 사진으로 넘어갔을 때(주소를 맞추는 호출 지점) */
  onPhotoChange?: ((_photoId: string) => void) | undefined;
  /** 「날짜 바꾸기」를 골랐을 때(날짜 변경 시트는 추후 작업) */
  onChangeDate?: ((_photoId: string) => void) | undefined;
};

// 사진함 토스트는 목록 폭(343px)으로 펼침(Figma 사진함_18)
const notify = (message: string) => toast(message, { fullWidth: true });

/**
 * 사진 상세 화면: 헤더(뒤로·촬영 날짜·더보기), 좌우로 넘기는 큰 사진과 올린 멤버 배지, 더보기 메뉴(저장·날짜 바꾸기·삭제)
 * 한 번 누르거나 확대하면 헤더와 배지를 서서히 숨기고 다시 누르면 보이며, 숨긴 상태는 사진을 넘겨도 유지
 */
export function PhotoDetailScreen({
  photos,
  members,
  viewer,
  initialPhotoId,
  actions,
  currentYear = new Date().getFullYear(),
  onBack,
  onLeave,
  onPhotoChange,
  onChangeDate,
}: PhotoDetailScreenProps) {
  const initialIndex = Math.max(
    0,
    photos.findIndex((photo) => photo.id === initialPhotoId),
  );
  const [activeId, setActiveId] = useState(photos[initialIndex]?.id ?? initialPhotoId);
  const [tapHidden, setTapHidden] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  // 메뉴는 닫히는 모션이 끝날 때까지 화면에 남기므로 열림과 마운트를 따로 둠
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  // 확인 창을 연 시점의 사진 id를 고정해 두고 확정 때 그 사진을 지움(그 사이 넘겨져도 다른 사진을 지우지 않음)
  const [deleteTargetId, setDeleteTargetId] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState<'save' | 'delete' | undefined>(undefined);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const swiperRef = useRef<SwiperInstance | null>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const activeIndex = photos.findIndex((photo) => photo.id === activeId);
  const activePhoto = photos[activeIndex];
  const chromeHidden = tapHidden || zoomed;
  const canManage = activePhoto ? canDeletePhotos([activePhoto], viewer) : false;

  const toggleMenu = () => {
    setMenuMounted(true);
    setMenuOpen((open) => !open);
  };

  // 단일 탭만 헤더·배지를 토글(더블탭은 확대라 토글하지 않음)
  const handleTap = () => {
    clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => setTapHidden((hidden) => !hidden), TAP_DELAY_MS);
  };
  const handleDoubleTap = () => clearTimeout(tapTimer.current);

  const handleSlideChange = (swiper: SwiperInstance) => {
    const next = photos[swiper.activeIndex];
    if (!next || next.id === activeId) return;
    setActiveId(next.id);
    onPhotoChange?.(next.id);
  };

  const save = async () => {
    if (!activePhoto) return;
    setPending('save');
    let failed = false;
    try {
      const result = await actions.savePhotos([activePhoto.id]);
      failed = result.failedIds.length > 0;
    } catch {
      failed = true;
    }
    setPending(undefined);
    notify(failed ? PHOTO_BOX_MESSAGES.saveFailedAll : PHOTO_BOX_MESSAGES.saveDone);
  };

  const confirmDelete = async () => {
    const targetId = deleteTargetId;
    setDeleteTargetId(undefined);
    if (!targetId) return;
    setPending('delete');
    try {
      const { removedCount } = await actions.deletePhotos([targetId]);
      setPending(undefined);
      if (removedCount > 0) {
        // 사진이 사라지면 사진함으로 돌아가 삭제 토스트, 내 배지만 빠지면 상세에 머묾
        notify(PHOTO_BOX_MESSAGES.deleteDone(removedCount));
        onLeave();
      }
    } catch {
      setPending(undefined);
      notify(PHOTO_BOX_MESSAGES.deleteFailed);
    }
  };

  const handleMenuSelect = (action: PhotoDetailMenuAction) => {
    if (pending || !activePhoto) return;
    if (action === 'save') void save();
    else if (action === 'date') onChangeDate?.(activePhoto.id);
    else if (canManage) setDeleteTargetId(activePhoto.id);
    else notify(PHOTO_BOX_MESSAGES.deleteForbidden);
  };

  // 메뉴·확인 창이 열려 있거나 요청이 도는 동안은 방향키가 사진을 넘기지 않게 함(Swiper Keyboard는 문서 단위)
  const keyboardBlocked = menuOpen || deleteTargetId !== undefined || pending !== undefined;
  useEffect(() => {
    const keyboard = swiperRef.current?.keyboard;
    if (!keyboard) return;
    if (keyboardBlocked) keyboard.disable();
    else keyboard.enable();
  }, [keyboardBlocked]);

  if (!activePhoto) return null;

  const headerFade = cn(
    'relative transition-opacity duration-200 ease-[cubic-bezier(0,0,0.35,1)] motion-reduce:transition-none',
    // 숨긴 상태에서도 키보드·스크린 리더로 접근: 포커스가 들어오면 다시 보임
    chromeHidden
      ? 'pointer-events-none opacity-0 focus-within:pointer-events-auto focus-within:opacity-100'
      : 'opacity-100',
  );

  return (
    <PageShell
      header={
        <div className={headerFade}>
          <Header
            leading={
              <HeaderIconButton label="뒤로 가기" onClick={onBack}>
                <LineChevronLeftLargeIcon aria-hidden="true" />
              </HeaderIconButton>
            }
            title={formatDetailDate(activePhoto.takenAt, currentYear)}
            trailing={
              <IconButton
                ref={menuTriggerRef}
                aria-label="더보기"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-disabled={pending ? true : undefined}
                onClick={pending ? undefined : toggleMenu}
              >
                <LineDotsLargeIcon aria-hidden="true" />
              </IconButton>
            }
          />
          {menuMounted ? (
            <div className="right-s8 absolute top-full z-20">
              <PhotoDetailMenu
                canManage={canManage}
                open={menuOpen}
                onClose={() => setMenuOpen(false)}
                onExited={() => setMenuMounted(false)}
                onSelect={handleMenuSelect}
                triggerRef={menuTriggerRef}
              />
            </div>
          ) : null}
        </div>
      }
    >
      <h1 className="sr-only">사진 상세</h1>
      <p role="status" className="sr-only">
        {pending === 'save'
          ? PHOTO_BOX_MESSAGES.saving
          : PHOTO_BOX_MESSAGES.detailPosition(activeIndex + 1, photos.length)}
      </p>
      {/* 저장·삭제 중에는 사진 영역을 inert로 막음(더보기가 포커스를 잃지 않도록 헤더는 열어 둠) */}
      <div className="relative h-full" inert={pending !== undefined}>
        <Swiper
          modules={[Zoom, Keyboard, A11y]}
          className="h-full"
          initialSlide={initialIndex}
          slidesPerView={1}
          resistance={false}
          zoom={{ maxRatio: MAX_ZOOM, toggle: true }}
          keyboard={{ enabled: true }}
          a11y={{
            prevSlideMessage: PHOTO_BOX_MESSAGES.previousPhoto,
            nextSlideMessage: PHOTO_BOX_MESSAGES.nextPhoto,
          }}
          onSwiper={(swiper: SwiperInstance) => {
            swiperRef.current = swiper;
          }}
          onSlideChange={handleSlideChange}
          onZoomChange={(_swiper: SwiperInstance, scale: number) => setZoomed(scale > 1)}
          onTap={handleTap}
          onDoubleTap={handleDoubleTap}
        >
          {photos.map((photo, index) => (
            <SwiperSlide
              key={photo.id}
              aria-hidden={Math.abs(index - activeIndex) <= RENDER_RANGE ? undefined : true}
            >
              {Math.abs(index - activeIndex) <= RENDER_RANGE ? (
                <PhotoDetailSlide photo={photo} members={members} chromeHidden={chromeHidden} />
              ) : null}
            </SwiperSlide>
          ))}
        </Swiper>
        {/* 스와이프의 단일 포인터 대체: 키보드·스크린 리더 사용자가 쓰는 이전·다음 버튼(포커스가 있을 때만 보임) */}
        <button
          type="button"
          onClick={() => {
            if (activeIndex > 0) swiperRef.current?.slidePrev();
          }}
          aria-disabled={activeIndex <= 0 ? true : undefined}
          className="focus-visible:bg-surface-primary focus-visible:text-text-primary focus-visible:left-s8 focus-visible:top-s8 focus-visible:rounded-r4 focus-visible:px-s6 focus-visible:py-s4 sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:z-10"
        >
          {PHOTO_BOX_MESSAGES.previousPhoto}
        </button>
        <button
          type="button"
          onClick={() => {
            if (activeIndex < photos.length - 1) swiperRef.current?.slideNext();
          }}
          aria-disabled={activeIndex >= photos.length - 1 ? true : undefined}
          className="focus-visible:bg-surface-primary focus-visible:text-text-primary focus-visible:right-s8 focus-visible:top-s8 focus-visible:rounded-r4 focus-visible:px-s6 focus-visible:py-s4 sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:z-10"
        >
          {PHOTO_BOX_MESSAGES.nextPhoto}
        </button>
        {/* 키보드·스크린 리더 사용자의 확대·축소 수단(포커스가 있을 때만 보임) */}
        <button
          type="button"
          aria-pressed={zoomed}
          onClick={() => swiperRef.current?.zoom.toggle()}
          className="focus-visible:bg-surface-primary focus-visible:text-text-primary focus-visible:left-s8 focus-visible:bottom-s8 focus-visible:rounded-r4 focus-visible:px-s6 focus-visible:py-s4 sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:z-10"
        >
          {zoomed ? PHOTO_BOX_MESSAGES.zoomOut : PHOTO_BOX_MESSAGES.zoomIn}
        </button>
      </div>
      {pending === 'save' ? <PageLoading /> : null}
      <DeleteConfirmDialog
        open={deleteTargetId !== undefined}
        description={PHOTO_BOX_MESSAGES.deleteConfirmDescription(
          getDeleteKind(
            [photos.find((photo) => photo.id === deleteTargetId) ?? activePhoto],
            viewer,
          ),
        )}
        onClose={() => setDeleteTargetId(undefined)}
        onConfirm={() => void confirmDelete()}
      />
    </PageShell>
  );
}
