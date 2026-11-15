'use client';

import { toast } from '@app/design-system';
import { PlaceSearchSheet } from '@app/design-system/web';
import { useEffect, useState } from 'react';
import type { ScreenOverlayProps } from '@/shared/hooks/useScreenOverlay';
import type { PlaceResult } from '../../lib/types';
import { BUNDLE_MESSAGES } from '../../constants/messages';

// 이 글자 수 미만이면 검색하지 않고 처음 안내를 보임(두 글자부터 자동 검색, 기획 원문에 없어 합의로 정한 값)
export const MIN_SEARCH_LENGTH = 2;
// 글자를 칠 때마다 요청하지 않도록 입력이 멈추고 이만큼 지나면 검색(기획 원문에 없는 구현 기본값)
export const SEARCH_DEBOUNCE_MS = 300;

type LocationSearchSheetProps = ScreenOverlayProps & {
  searchPlaces: (_keyword: string, _signal?: AbortSignal) => Promise<readonly PlaceResult[]>;
  /** 결과를 눌러 위치를 정했을 때(시트는 호출하는 쪽이 닫음) */
  onSelect: (_place: PlaceResult) => void;
};

/**
 * 위치 검색(`PlaceSearchSheet`에 검색 상태를 연결): 검색 전 안내, 결과(이름과 주소), 결과 없음
 * 두 글자 이상이면 입력할 때마다(입력이 잠깐 멈춘 뒤) 자동으로 검색하고, Enter를 누르면 바로 검색함
 * 글자를 모두 지우거나 한 글자만 남으면 결과를 없애고 처음 안내를 다시 보임(기능 spec 4.3.10 「검색어를 모두 지움」 예외)
 * 열 때마다 새로 그려져 처음 상태로 돌아가고, 결과를 누르면 바로 정하고 닫음
 */
export function LocationSearchSheet({
  searchPlaces,
  onSelect,
  ...rootProps
}: LocationSearchSheetProps) {
  // 입력창의 지금 글자(앞뒤 공백 제외)와, Enter로 바로 검색을 요청한 횟수(같은 글자로 다시 눌러도 다시 검색)
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState(0);
  // 검색 전(또는 글자를 지운 뒤)에는 undefined, 검색한 뒤에는 결과(빈 목록이면 결과 없음)
  const [results, setResults] = useState<readonly PlaceResult[] | undefined>(undefined);

  const searchable = query.length >= MIN_SEARCH_LENGTH;

  // 검색 대상이 아니면 결과를 없애고 처음 안내로 돌아감(렌더 중 상태 조정: 글자가 줄어드는 그 렌더에 바로 반영)
  if (!searchable && results !== undefined) setResults(undefined);

  // 입력이 멈추면 검색하고, 글자가 바뀌거나 시트가 닫히면 이전 검색의 늦은 응답은 버림(마지막 검색만 반영)
  // Enter는 기다리지 않고 바로 검색(submitted가 바뀌면 이 effect가 다시 돌면서 대기 시간을 없앰)
  useEffect(() => {
    if (!searchable) return;
    const controller = new AbortController();
    const wait = submitted > 0 ? 0 : SEARCH_DEBOUNCE_MS;
    const timer = setTimeout(() => {
      searchPlaces(query, controller.signal).then(
        (found) => {
          if (!controller.signal.aborted) setResults(found);
        },
        // 검색 실패는 오류 토스트만 띄우고 검색어와 이전 결과는 유지
        () => {
          if (!controller.signal.aborted) toast(BUNDLE_MESSAGES.searchFailed);
        },
      );
    }, wait);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, submitted, searchable, searchPlaces]);

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
      onQueryChange={(value) => {
        setQuery(value.trim());
        // 글자가 바뀌면 Enter로 요청한 즉시 검색 표시는 끝남(다음 입력은 다시 잠깐 기다림)
        setSubmitted(0);
      }}
      onSearch={(keyword) => {
        setQuery(keyword.trim());
        setSubmitted((count) => count + 1);
      }}
      onSelect={(picked) => {
        const place = results?.find((candidate) => candidate.id === picked.id);
        if (place) onSelect(place);
      }}
    />
  );
}
