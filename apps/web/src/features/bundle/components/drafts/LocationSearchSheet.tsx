'use client';

import { toast } from '@app/design-system';
import { PlaceSearchSheet } from '@app/design-system/web';
import { useEffect, useState } from 'react';
import type { ScreenOverlayProps } from '@/shared/hooks/useScreenOverlay';
import type { PlaceResult } from '../../lib/types';
import { BUNDLE_MESSAGES } from '../../constants/messages';

type LocationSearchSheetProps = ScreenOverlayProps & {
  searchPlaces: (_keyword: string) => Promise<readonly PlaceResult[]>;
  /** 결과를 눌러 위치를 정했을 때(시트는 호출하는 쪽이 닫음) */
  onSelect: (_place: PlaceResult) => void;
};

/**
 * 위치 검색(`PlaceSearchSheet`에 검색 상태를 연결): 검색 전 안내, 결과(이름과 주소), 결과 없음
 * 키워드 검색만 하며 열 때마다 새로 그려져 처음 상태로 돌아감. 결과를 누르면 바로 정하고 닫음
 */
export function LocationSearchSheet({
  searchPlaces,
  onSelect,
  ...rootProps
}: LocationSearchSheetProps) {
  // 검색 전에는 둘 다 undefined, 검색한 뒤에는 결과(빈 목록이면 결과 없음)
  // 같은 검색어로 다시 검색해도 effect가 다시 돌도록 검색 요청마다 번호(id)를 올림
  const [search, setSearch] = useState<{ keyword: string; id: number } | undefined>(undefined);
  const [results, setResults] = useState<readonly PlaceResult[] | undefined>(undefined);

  // 검색 요청이 바뀌면 이전 검색의 늦은 응답은 버리고 마지막 검색만 반영
  useEffect(() => {
    if (search === undefined) return;
    let cancelled = false;
    searchPlaces(search.keyword).then(
      (found) => {
        if (!cancelled) setResults(found);
      },
      // 검색 실패는 오류 토스트만 띄우고 검색어와 이전 결과는 유지
      () => {
        if (!cancelled) toast(BUNDLE_MESSAGES.searchFailed, { fullWidth: true });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [search, searchPlaces]);

  return (
    <PlaceSearchSheet
      {...rootProps}
      title={BUNDLE_MESSAGES.locationSheetTitle}
      inputLabel={BUNDLE_MESSAGES.locationSearchLabel}
      placeholder={BUNDLE_MESSAGES.locationSearchPlaceholder}
      guideTitle={BUNDLE_MESSAGES.locationGuideTitle}
      guideDescription={BUNDLE_MESSAGES.locationGuideDescription}
      noResultLabel={BUNDLE_MESSAGES.locationNoResult}
      resultCountLabel={BUNDLE_MESSAGES.locationResultCount}
      results={results}
      onSearch={(keyword) => setSearch((current) => ({ keyword, id: (current?.id ?? 0) + 1 }))}
      onSelect={onSelect}
    />
  );
}
