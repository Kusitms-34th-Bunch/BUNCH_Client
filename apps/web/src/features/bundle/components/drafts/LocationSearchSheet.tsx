'use client';

import { SearchField, toast } from '@app/design-system';
import { BottomSheet, LocationListItem } from '@app/design-system/web';
import { useEffect, useState } from 'react';
import type { PlaceResult } from '../../lib/types';
import { BUNDLE_MESSAGES } from '../../constants/messages';

type LocationSearchSheetProps = {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  searchPlaces: (_keyword: string) => Promise<readonly PlaceResult[]>;
  /** 결과를 눌러 위치를 정했을 때(시트는 호출하는 쪽이 닫음) */
  onSelect: (_place: PlaceResult) => void;
};

/**
 * 위치 검색 시트(거의 전체 높이): 검색 전 안내, 결과(이름과 주소), 결과 없음
 * 키워드 검색만 하며 열 때마다 처음 상태로 돌아감. 결과를 누르면 바로 정하고 닫음
 */
export function LocationSearchSheet({
  open,
  onOpenChange,
  searchPlaces,
  onSelect,
}: LocationSearchSheetProps) {
  // 검색 전에는 둘 다 undefined, 검색한 뒤에는 결과(빈 목록이면 결과 없음)
  // 같은 검색어로 다시 검색해도 effect가 다시 돌도록 검색 요청마다 번호(id)를 올림
  const [search, setSearch] = useState<{ keyword: string; id: number } | undefined>(undefined);
  const [results, setResults] = useState<readonly PlaceResult[] | undefined>(undefined);
  const [wasOpen, setWasOpen] = useState(open);

  // 열 때마다 처음 상태로 돌림(닫히는 중 다시 열어도 초기화되게 열림 전환 시점에 재설정)
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSearch(undefined);
      setResults(undefined);
    }
  }

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
    <BottomSheet.Root open={open} onOpenChange={onOpenChange}>
      <BottomSheet.Content className="h-[calc(100dvh-var(--safe-area-top,env(safe-area-inset-top,0px))-var(--spacing-s12))]">
        <BottomSheet.Header>
          <BottomSheet.Title className="sr-only">
            {BUNDLE_MESSAGES.locationSheetTitle}
          </BottomSheet.Title>
        </BottomSheet.Header>
        <div className="px-padding-p8">
          <SearchField
            inputLabel={BUNDLE_MESSAGES.locationSearchLabel}
            placeholder={BUNDLE_MESSAGES.locationSearchPlaceholder}
            onSearch={(keyword) =>
              setSearch((current) => ({ keyword, id: (current?.id ?? 0) + 1 }))
            }
          />
        </div>
        {/* 결과 줄의 구분선이 시트 양끝까지 닿도록 Body 기본 좌우 패딩을 없앰(줄 자체가 16px 패딩을 가짐) */}
        <BottomSheet.Body className="flex flex-col px-0">
          {/* 낭독 영역은 항상 마운트해 두고 문구만 바꿔야 검색 결과가 상태 변화로 읽힘 */}
          <p role="status" className="sr-only">
            {results === undefined
              ? ''
              : results.length === 0
                ? BUNDLE_MESSAGES.locationNoResult
                : BUNDLE_MESSAGES.locationResultCount(results.length)}
          </p>
          {results === undefined && (
            <div className="gap-s2 px-s8 flex flex-1 flex-col items-center justify-center text-center">
              <p className="typography-body-1-medium text-text-tertiary">
                {BUNDLE_MESSAGES.locationGuideTitle}
              </p>
              <p className="typography-body-4-regular text-text-quaternary whitespace-pre-line">
                {BUNDLE_MESSAGES.locationGuideDescription}
              </p>
            </div>
          )}
          {results !== undefined && results.length === 0 && (
            <p className="typography-body-3-regular text-text-quaternary flex flex-1 items-center justify-center">
              {BUNDLE_MESSAGES.locationNoResult}
            </p>
          )}
          {results !== undefined && results.length > 0 && (
            <ul>
              {results.map((place) => (
                <li key={place.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(place)}
                    className="focus-visible:outline-border-brand block w-full cursor-pointer touch-manipulation focus-visible:outline-2 focus-visible:-outline-offset-2"
                  >
                    <LocationListItem placeName={place.name} address={place.address} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </BottomSheet.Body>
      </BottomSheet.Content>
    </BottomSheet.Root>
  );
}
