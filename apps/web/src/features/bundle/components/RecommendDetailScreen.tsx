'use client';

import { Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { PhotoThumbnail } from '@app/design-system/web';
import Link from 'next/link';
import type { PhotoSection } from '@/features/photo-box/lib/photoDate';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import type { Recommendation } from '../lib/recommendation';
import { BUNDLE_SELECT_MESSAGES } from '../constants/selectMessages';
import { BUNDLE_SELECT_PATHS } from '../constants/selectPaths';

type RecommendDetailScreenProps = {
  recommendation: Recommendation;
  /** 추천 순서를 지킨 날짜별 사진 */
  sections: readonly PhotoSection[];
  onBack: () => void;
};

/** 추천 번들 상세(Figma `2060:38861`): 헤더에 번들명, 날짜 제목과 3열 사진(선택 원·번호 없음). 사진을 누르면 뷰어 */
export function RecommendDetailScreen({
  recommendation,
  sections,
  onBack,
}: RecommendDetailScreenProps) {
  return (
    <PageShell
      header={
        <Header
          leading={
            <HeaderIconButton label={BUNDLE_SELECT_MESSAGES.back} onClick={onBack}>
              <LineChevronLeftLargeIcon aria-hidden="true" />
            </HeaderIconButton>
          }
          title={recommendation.title}
        />
      }
    >
      <h1 className="sr-only">{BUNDLE_SELECT_MESSAGES.detailTitle(recommendation.title)}</h1>
      {sections.map((section) => (
        <section key={section.dateKey}>
          <h2 className="typography-body-4-semi-bold text-text-primary px-s8 pt-s8 pb-s3">
            {section.label}
          </h2>
          <ul className="grid grid-cols-3 gap-px">
            {section.photos.map((photo) => (
              <li key={photo.id}>
                <Link
                  href={BUNDLE_SELECT_PATHS.viewer(recommendation.id, photo.id)}
                  prefetch={false}
                  className="focus-visible:outline-border-brand block focus-visible:outline-2 focus-visible:-outline-offset-2"
                >
                  <PhotoThumbnail src={photo.src} alt={photo.alt} className="w-full" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </PageShell>
  );
}
