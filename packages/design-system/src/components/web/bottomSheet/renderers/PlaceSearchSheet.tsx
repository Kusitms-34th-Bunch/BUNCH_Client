'use client';

import { useEffect, useRef, useState } from 'react';
import { SearchField } from '../../../core/searchField';
import { LocationListItem } from '../../locationListItem';
import { BottomSheet, type BottomSheetRootProps } from '../BottomSheet';

export type PlaceSearchResult = { id: string; name: string; address: string };

export type PlaceSearchSheetProps = Omit<
  BottomSheetRootProps,
  'children' | 'disablePointerDismissal'
> & {
  /** 보이지 않는 시트 이름 */
  title: string;
  inputLabel: string;
  placeholder: string;
  /** 검색 전 안내 */
  guideTitle: string;
  guideDescription: string;
  /** 결과 없음 문구 */
  noResultLabel: string;
  /** 결과 수 낭독 문구 */
  resultCountLabel: (_count: number) => string;
  /** 검색 전에는 undefined, 검색한 뒤에는 결과(빈 목록이면 결과 없음) */
  results: readonly PlaceSearchResult[] | undefined;
  /** Enter(검색 키)를 눌렀을 때 현재 입력값과 함께 호출 */
  onSearch: (_keyword: string) => void;
  /** 입력값이 바뀔 때마다 현재 입력값과 함께 호출(입력하는 대로 검색하는 호출자가 씀, 없으면 Enter 검색만) */
  onQueryChange?: ((_query: string) => void) | undefined;
  /** 결과를 눌렀을 때(닫기는 호출자 담당) */
  onSelect: (_place: PlaceSearchResult) => void;
};

/**
 * 장소 검색 시트(거의 전체 높이): 검색 입력란, 검색 전 안내, 결과(이름과 주소), 결과 없음
 * 검색 요청과 결과 보관은 호출자 담당
 */
// 낭독 영역을 잠깐 비웠다가 문구를 다시 채워야 같은 문구(같은 결과 수)도 매번 상태 변화로 읽힘
const STATUS_ANNOUNCE_DELAY_MS = 150;

/** 결과가 바뀔 때마다 낭독하는 상태 영역(결과 수·결과 없음, 결과를 지워 안내로 돌아가면 안내 제목) */
const ResultStatus = ({
  results,
  noResultLabel,
  resultCountLabel,
  guideTitle,
}: Pick<
  PlaceSearchSheetProps,
  'results' | 'noResultLabel' | 'resultCountLabel' | 'guideTitle'
>) => {
  const [text, setText] = useState('');
  // 결과가 있다가 안내로 돌아갈 때만 안내를 읽음(시트를 처음 열 때는 읽지 않음)
  const hadResults = useRef(false);

  const message =
    results === undefined
      ? guideTitle
      : results.length === 0
        ? noResultLabel
        : resultCountLabel(results.length);
  const showing = results !== undefined;

  useEffect(() => {
    const announced = showing || hadResults.current ? message : '';
    hadResults.current = showing;
    const clear = setTimeout(() => setText(''), 0);
    const announce = setTimeout(() => setText(announced), STATUS_ANNOUNCE_DELAY_MS);
    return () => {
      clearTimeout(clear);
      clearTimeout(announce);
    };
    // 같은 결과 수도 새 검색이면 results가 새 배열이라 다시 읽힘
  }, [results, showing, message]);

  return (
    <p role="status" className="sr-only">
      {text}
    </p>
  );
};

export const PlaceSearchSheet = ({
  title,
  inputLabel,
  placeholder,
  guideTitle,
  guideDescription,
  noResultLabel,
  resultCountLabel,
  results,
  onSearch,
  onQueryChange,
  onSelect,
  ...rootProps
}: PlaceSearchSheetProps) => (
  <BottomSheet.Root {...rootProps}>
    <BottomSheet.Content className="h-[calc(100dvh-var(--safe-area-top,env(safe-area-inset-top,0px))-var(--spacing-s12))]">
      <BottomSheet.Header>
        <BottomSheet.Title className="sr-only">{title}</BottomSheet.Title>
      </BottomSheet.Header>
      <div className="px-padding-p8 flex items-center">
        <div className="min-w-0 flex-1">
          <SearchField
            inputLabel={inputLabel}
            placeholder={placeholder}
            onSearch={onSearch}
            {...(onQueryChange && { onChange: (event) => onQueryChange(event.target.value) })}
          />
        </div>
        {/* 화면에 닫기 버튼이 없어 숨겨 둠. 입력란에 먼저 초점이 가도록 입력란 뒤에 둠 */}
        <BottomSheet.Close className="focus-visible:-m-s5 focus-visible:p-s5 sr-only focus-visible:not-sr-only" />
      </div>
      {/* 결과 줄의 구분선이 시트 양끝까지 닿도록 Body 기본 좌우 패딩을 없앰(줄 자체가 16px 패딩을 가짐) */}
      <BottomSheet.Body className="flex flex-col px-0">
        {/* 낭독 영역은 항상 마운트해 두고 문구만 바꿔야 검색 결과가 상태 변화로 읽힘 */}
        <ResultStatus
          results={results}
          noResultLabel={noResultLabel}
          resultCountLabel={resultCountLabel}
          guideTitle={guideTitle}
        />
        {results === undefined && (
          <div className="gap-s2 px-s8 flex flex-1 flex-col items-center justify-center text-center">
            <p className="typography-body-1-medium text-text-tertiary">{guideTitle}</p>
            <p className="typography-body-4-regular text-text-quaternary whitespace-pre-line">
              {guideDescription}
            </p>
          </div>
        )}
        {results !== undefined && results.length === 0 && (
          <p className="typography-body-3-regular text-text-quaternary flex flex-1 items-center justify-center">
            {noResultLabel}
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
