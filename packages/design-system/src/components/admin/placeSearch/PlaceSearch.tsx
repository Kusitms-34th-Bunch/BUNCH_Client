import { Combobox } from '@base-ui/react/combobox';
import { useEffect, useId, useRef, useState } from 'react';
import { FillMapPinMediumIcon, LineSearchMediumIcon } from '../../../icons';
import { cn } from '../../../utils';
import { Skeleton } from '../../core/skeleton';
import { useKeyboardFocusWithin } from '../keyboardFocus.internal';

export type PlaceSearchResult = {
  id: string;
  /** 장소 이름(검색어와 같은 부분은 굵게) */
  name: string;
  /** 업종(예: `공방`) */
  category?: string | undefined;
  /** 주소 */
  address: string;
};

/** 결과 목록 상태: 검색 전 `idle`, 받는 중 `loading`, 결과 있음 `results`, 결과 없음 `empty` */
export type PlaceSearchStatus = 'idle' | 'loading' | 'results' | 'empty';

export type PlaceSearchProps = {
  /** 보이는 라벨(예: `장소검색`) */
  label: string;
  /** 필수 항목이면 라벨 뒤 별표와 `aria-required` */
  required?: boolean | undefined;
  /** 검색어(제어 컴포넌트). 검색 요청은 호출자가 이 값으로 함 */
  query: string;
  onQueryChange: (_query: string) => void;
  /** 결과 목록 상태. 검색어가 비면 `idle`로 둠(「변경」 뒤 비운 채 벗어날 때 고른 장소로 되돌리려면 필요) */
  status: PlaceSearchStatus;
  results: readonly PlaceSearchResult[];
  /** 결과를 골랐을 때. 입력칸에 장소 이름이 들어가고(`onQueryChange`도 불림) 패널은 고른 장소 칸으로 바뀜 */
  onSelect: (_result: PlaceSearchResult) => void;
  /** 고른 장소. 다시 입력하기 전까지 패널에 장소 칸을 보여 주고, 다시 입력하면 검색 패널로 바뀜(「변경」 뒤 비운 채 벗어나거나 Esc면 되돌림) */
  selected?: Pick<PlaceSearchResult, 'name' | 'address'> | null | undefined;
  /** 장소 칸의 「변경」을 눌렀을 때. 누르면 입력칸을 비우고 초점을 줘 바로 새로 입력할 수 있게 함(고른 값은 호출자가 새로 고를 때까지 유지) */
  onChangeSelected?: (() => void) | undefined;
  /** 「변경」 버튼 글자 */
  changeLabel?: string | undefined;
  placeholder?: string | undefined;
  /** 결과 없음 제목(예: `'플로디'에 대한 검색 결과가 없어요`) */
  emptyTitle: string;
  /** 결과 없음 안내(예: `주소로 다시 검색하거나 직접 입력해 주세요`) */
  emptyDescription?: string | undefined;
  /** 결과 없음의 직접 입력 버튼. 없으면 버튼을 숨김 */
  manualInput?: { label: string; onClick: () => void } | undefined;
  /** 받는 중을 스크린 리더에 알릴 글자(예: `장소를 찾는 중`) */
  loadingLabel: string;
  /** 결과가 나왔을 때 스크린 리더에 알릴 글자(예: `(count) => \`결과 ${count}건\``). 없으면 결과 건수는 낭독하지 않음 */
  formatResultsLabel?: ((_count: number) => string) | undefined;
  /** 결과를 골랐을 때 스크린 리더에 알릴 글자(예: `(name) => \`${name} 선택됨\``). 없으면 선택은 낭독하지 않음 */
  formatSelectedLabel?: ((_name: string) => string) | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
};

// 검색어와 같은 첫 부분만 굵게(Figma: 「플로디」 SemiBold + 나머지 Regular)
const HighlightedName = ({ name, query }: { name: string; query: string }) => {
  const keyword = query.trim();
  const index = keyword ? name.toLowerCase().indexOf(keyword.toLowerCase()) : -1;
  if (index < 0) return <span className="typography-body-3-regular">{name}</span>;
  return (
    <span className="typography-body-3-regular">
      {name.slice(0, index)}
      <span className="typography-body-3-semibold">
        {name.slice(index, index + keyword.length)}
      </span>
      {name.slice(index + keyword.length)}
    </span>
  );
};

// Figma 받는 중 막대 폭(제목·주소 쌍 3줄)
const SKELETON_ROWS = [
  ['w-35', 'w-50'],
  ['w-30', 'w-45'],
  ['w-25', 'w-40'],
] as const;

// 패널 모션(2026-11-27 사용자 결정): 패널 자리 자체는 처음 나타날 때(투명도 150ms ease-out)와 완전히 없어질 때(100ms ease-in)만 움직임
// 떠 있는 동안 받는 중·결과·결과 없음·고른 장소로 바뀌면 상자는 그대로 두고 안의 내용만 살짝 나타남. 동작 줄이기면 바로 바뀜
const PANEL_SLOT = [
  'transition-opacity duration-150 ease-out starting:opacity-0 motion-reduce:transition-none',
  'data-leaving:pointer-events-none data-leaving:opacity-0 data-leaving:duration-100 data-leaving:ease-in',
].join(' ');
const CONTENT_ENTER =
  'transition-opacity duration-150 ease-out starting:opacity-0 motion-reduce:transition-none';
const LEAVE_MS = 100;

// 받는 중·결과·결과 없음 상자(Figma dropdown)
const SEARCH_BOX =
  'bg-surface-primary border-border-tertiary rounded-r3 p-padding-p3 border shadow-[0px_4px_12px_0px_rgba(0,0,0,0.06)]';
// 고른 장소 칸
const SELECTED_BOX =
  'bg-surface-secondary border-border-tertiary rounded-r3 pl-padding-p8 pr-padding-p6 py-padding-p5 border';

type PanelKind = 'loading' | 'results' | 'empty' | 'selected';

// 사라지는 동안 그릴 마지막 내용
type PanelSnapshot = {
  key: string;
  kind: PanelKind;
  results: readonly PlaceSearchResult[];
  selected: Pick<PlaceSearchResult, 'name' | 'address'> | null;
  query: string;
  emptyTitle: string;
  emptyDescription: string | undefined;
  manualInputLabel: string | undefined;
};

// 결과 항목 안쪽(Combobox 항목과 사라지는 동안의 정적 사본이 함께 씀)
const ResultRow = ({ result, query }: { result: PlaceSearchResult; query: string }) => (
  <>
    <span className="gap-s3 text-text-secondary flex min-w-0 items-center">
      <span className="truncate">
        <HighlightedName name={result.name} query={query} />
      </span>
      {result.category ? (
        <span className="typography-caption-1-regular text-text-quaternary shrink-0">
          {result.category}
        </span>
      ) : null}
    </span>
    <span className="typography-body-4-regular text-text-quaternary truncate">
      {result.address}
    </span>
  </>
);
const RESULT_ITEM = 'rounded-r2 flex flex-col gap-0.5 p-2.5 whitespace-nowrap';

/**
 * 어드민 장소 검색(Figma `어드민 컴포넌트` > `Place Search`): 라벨 + 검색 입력 + 결과 목록(받는 중·결과) + 결과 없음 + 고른 장소 칸
 * 검색 요청·결과는 호출자가 `status`·`results`로 넘김. combobox 역할·방향키로 결과 고르기는 Base UI Combobox 담당
 * 목록·결과 없음은 Figma처럼 입력칸 아래 자리(문서 흐름)에 그림(Base UI Combobox inline)
 */
export const PlaceSearch = ({
  label,
  required = false,
  query,
  onQueryChange,
  status,
  results,
  onSelect,
  selected,
  onChangeSelected,
  changeLabel = '변경',
  placeholder,
  emptyTitle,
  emptyDescription,
  manualInput,
  loadingLabel,
  formatResultsLabel,
  formatSelectedLabel,
  disabled,
  className,
}: PlaceSearchProps) => {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  // 고른 직후 낭독할 글자(다시 입력·Esc·변경이면 비움)
  const keyboardFocusProps = useKeyboardFocusWithin();
  const [selectedNotice, setSelectedNotice] = useState('');
  const noticeTimerRef = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(noticeTimerRef.current), []);
  // 선택 알림 비우기(대기 중인 알림도 취소해 직전 선택이 다시 들어가지 않게)
  const clearSelectedNotice = () => {
    window.clearTimeout(noticeTimerRef.current);
    setSelectedNotice('');
  };
  // 같은 장소를 다시 골라도 낭독되게 비운 뒤 다음 틱에 넣음
  const announceSelected = (name: string) => {
    setSelectedNotice('');
    const text = formatSelectedLabel?.(name);
    if (!text) return;
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setSelectedNotice(text), 0);
  };

  // 고른 뒤 다시 입력하는 중인지(검색어 입력 또는 「변경」). 고르거나 Esc·비운 채 벗어나 되돌리거나 바깥에서 고른 장소가 바뀌면 false
  // 호출자가 렌더마다 새 객체를 넘겨도 풀리지 않게 참조가 아닌 이름·주소 값으로 비교
  const [editedAfterSelect, setEditedAfterSelect] = useState(false);
  const selectedKey = selected ? `${selected.name}\n${selected.address}` : null;
  const [prevSelectedKey, setPrevSelectedKey] = useState(selectedKey);
  if (selectedKey !== prevSelectedKey) {
    setPrevSelectedKey(selectedKey);
    setEditedAfterSelect(false);
  }

  // 입력칸 아래 패널 자리 하나에 내용만 바꿔 보여 줌: 검색 중이면 검색 패널, 아니면 고른 장소 칸
  // 고른 장소가 있으면 다시 입력하기 전까지 장소 칸(고른 뒤 다시 열려도 장소 칸)
  const isSearching = status !== 'idle' && (!selected || editedAfterSelect);
  // 다시 입력하는 중이면 고른 장소 칸은 숨김(「변경」 직후 빈 입력칸 아래도 비어 있음)
  const showSelected = Boolean(selected) && !editedAfterSelect;

  // 고른 장소 이름으로 되돌려 장소 칸으로 돌아감
  const restoreSelected = () => {
    if (!selected) return;
    onQueryChange(selected.name);
    setEditedAfterSelect(false);
    // 장소 칸이 다시 나타난 것을 고를 때와 같은 글자로 알림(formatSelectedLabel이 없으면 비움)
    announceSelected(selected.name);
  };
  const listVisible = isSearching && status === 'results';

  // 패널 자리에 보일 내용 종류(없으면 패널 자리 없음)
  // isSearching이면 status는 idle이 아님
  const panelKind: PanelKind | null = isSearching
    ? status
    : selected && showSelected
      ? 'selected'
      : null;
  // 보이는 동안 마지막 내용을 기억했다가 없어질 때 그 내용으로 흐려지며 사라짐
  // 검색어마다 렌더하지 않게 내용이 실제로 바뀔 때만 갱신(호출자가 렌더마다 새 배열·객체를 넘겨도 값으로 비교)
  const panelKey =
    panelKind === null
      ? null
      : [
          panelKind,
          panelKind === 'results' ? results.map((result) => result.id).join(',') : '',
          panelKind === 'results' ? query : '',
          panelKind === 'empty'
            ? [emptyTitle, emptyDescription, manualInput?.label].join('\t')
            : '',
          panelKind === 'selected' ? selectedKey : '',
        ].join('\n');
  const [snapshot, setSnapshot] = useState<PanelSnapshot | null>(null);
  if (panelKind !== null && panelKey !== null && snapshot?.key !== panelKey) {
    setSnapshot({
      key: panelKey,
      kind: panelKind,
      results,
      selected: selected ?? null,
      query,
      emptyTitle,
      emptyDescription,
      manualInputLabel: manualInput?.label,
    });
  }
  const leaving = panelKind === null && snapshot !== null;
  // 사라지는 모션이 끝나면 패널 자리를 지움(동작 줄이기면 바로)
  useEffect(() => {
    if (!leaving) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => setSnapshot(null), reduce ? 0 : LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);
  // 그릴 내용: 보이는 동안은 지금 값, 사라지는 동안은 마지막 값
  const shownKind = panelKind ?? snapshot?.kind ?? null;
  // 패널 자리가 나타난 뒤인지(처음 나타날 때 패널 자리와 안쪽 내용이 함께 흐려져 두 번 흐려지지 않게)
  const [slotEntered, setSlotEntered] = useState(false);
  if (shownKind === null && slotEntered) setSlotEntered(false);
  useEffect(() => {
    if (shownKind === null || slotEntered) return;
    const frame = requestAnimationFrame(() => setSlotEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [shownKind, slotEntered]);
  const contentEnter = slotEntered ? CONTENT_ENTER : undefined;

  // 항상 있는 알림 영역의 글자만 바꿔 받는 중·결과·결과 없음을 낭독
  const announcement = !isSearching
    ? selectedNotice
    : status === 'loading'
      ? loadingLabel
      : status === 'empty'
        ? emptyTitle
        : status === 'results'
          ? (formatResultsLabel?.(results.length) ?? '')
          : '';

  return (
    <div className={cn('gap-s4 flex w-full flex-col', className)}>
      <label
        htmlFor={inputId}
        className="typography-body-3-semibold text-text-secondary flex items-start gap-0.5"
      >
        {label}
        {/* 필수는 Figma 별표(입력칸의 aria-required가 낭독) */}
        {required ? (
          <span aria-hidden="true" className="text-icon-brand">
            *
          </span>
        ) : null}
      </label>
      <Combobox.Root
        items={results}
        // 결과는 호출자가 검색해 넘기므로 자체 거르기 끔
        filter={null}
        inputValue={query}
        onInputValueChange={(next, details) => {
          // 목록이 닫힐 때 Base UI가 입력값을 선택값 글자로 맞추며 지우는 경우(선택값을 두지 않음)는 검색어를 유지
          if (details.reason === 'input-clear') return;
          // Esc는 직접 처리(다시 입력 중이면 고른 장소로 되돌림, 아니면 그대로)해 Base UI의 Esc 비우기는 무시
          if (details.reason === 'escape-key') return;
          clearSelectedNotice();
          if (details.reason === 'input-change') setEditedAfterSelect(true);
          onQueryChange(next);
        }}
        value={null}
        onValueChange={(result: PlaceSearchResult | null) => {
          if (!result) return;
          // inline 목록은 고른 이름을 입력칸에 넣지 않아 직접 반영(Figma Selected: 입력칸에 장소 이름)
          onQueryChange(result.name);
          setEditedAfterSelect(false);
          announceSelected(result.name);
          onSelect(result);
        }}
        itemToStringLabel={(result: PlaceSearchResult) => result.name}
        // Figma처럼 목록을 팝업이 아닌 입력칸 아래 자리(문서 흐름)에 그림
        inline
        open={listVisible}
        disabled={disabled}
      >
        <div
          {...keyboardFocusProps}
          className={cn(
            'bg-surface-primary border-border-tertiary rounded-r3 px-padding-p8 gap-s5 flex h-11.75 w-full items-center border',
            'data-focus-keyboard:outline-border-brand data-focus-keyboard:outline-2 data-focus-keyboard:outline-offset-2',
            disabled && 'opacity-(--semantic-opacity-disabled)',
          )}
        >
          <LineSearchMediumIcon className="text-icon-quaternary shrink-0" />
          <Combobox.Input
            ref={inputRef}
            id={inputId}
            aria-required={required || undefined}
            // inline이면 Base UI가 항상 펼쳐짐으로 표시해 실제로 목록이 보일 때만 펼쳐짐으로 덮어씀
            aria-expanded={listVisible}
            placeholder={placeholder}
            onKeyDown={(event) => {
              // Esc: 다시 입력하는 중 고른 장소가 있으면 그 이름으로 되돌려 장소 칸으로 돌아감
              if (
                event.key === 'Escape' &&
                !event.nativeEvent.isComposing &&
                editedAfterSelect &&
                selected
              ) {
                event.preventDefault();
                restoreSelected();
              }
            }}
            onBlur={() => {
              // 「변경」 뒤 비운 채 벗어나면 빈 입력칸과 고른 값이 어긋나지 않게 되돌림
              // 검색 패널이 보이는 동안은 결과·직접 입력을 누르는 중일 수 있어 되돌리지 않음
              if (editedAfterSelect && selected && !query.trim() && !isSearching) restoreSelected();
            }}
            className="typography-body-3-semibold text-text-tertiary placeholder:text-text-quinary min-w-0 flex-1 bg-transparent outline-none disabled:cursor-not-allowed"
          />
          {/* 받는 중·결과 건수·결과 없음 알림(항상 두고 글자만 바꿈) */}
          <Combobox.Status className="sr-only">{announcement}</Combobox.Status>
        </div>
        {/* 입력칸 아래 8px(바깥 gap spacing-s4)에 패널 자리 하나: 받는 중·결과·결과 없음·고른 장소 */}
        {shownKind !== null ? (
          <div
            data-leaving={leaving || undefined}
            // 사라지는 동안의 사본은 누르거나 읽히지 않게 함
            inert={leaving || undefined}
            aria-hidden={leaving || undefined}
            className={PANEL_SLOT}
          >
            {shownKind === 'selected' ? (
              <div className={SELECTED_BOX}>
                <div key="selected" className={cn('gap-s5 flex items-center', contentEnter)}>
                  <FillMapPinMediumIcon className="text-icon-primary shrink-0" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="typography-body-3-semibold text-text-secondary truncate">
                      {(leaving ? snapshot?.selected : selected)?.name}
                    </p>
                    <p className="typography-body-4-regular text-text-quaternary truncate">
                      {(leaving ? snapshot?.selected : selected)?.address}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onChangeSelected?.();
                      clearSelectedNotice();
                      // 입력칸을 비우고 초점을 줘 바로 새 검색어를 입력하게 함(고른 값은 새로 고를 때까지 유지)
                      onQueryChange('');
                      setEditedAfterSelect(true);
                      inputRef.current?.focus();
                    }}
                    className="bg-surface-primary border-border-secondary rounded-r4 px-s6 typography-label-s text-text-secondary focus-visible:outline-border-brand flex h-8 shrink-0 cursor-pointer items-center border focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    {changeLabel}
                  </button>
                </div>
              </div>
            ) : (
              // 받는 중·결과·결과 없음은 같은 상자를 두고 안의 내용만 바꿈
              <div className={SEARCH_BOX}>
                {shownKind === 'loading' ? (
                  <div key="loading" className={contentEnter}>
                    {SKELETON_ROWS.map(([title, address]) => (
                      <div
                        key={title}
                        aria-hidden="true"
                        className="flex flex-col gap-2 px-2.5 py-3"
                      >
                        <Skeleton className={cn('h-3', title)} />
                        <Skeleton className={cn('h-2.5', address)} />
                      </div>
                    ))}
                  </div>
                ) : null}
                {shownKind === 'results' && !leaving ? (
                  <Combobox.List key="results" className={cn('gap-s1 flex flex-col', contentEnter)}>
                    {(result: PlaceSearchResult) => (
                      <Combobox.Item
                        key={result.id}
                        value={result}
                        className={cn(
                          RESULT_ITEM,
                          'data-highlighted:bg-surface-secondary cursor-pointer outline-none',
                        )}
                      >
                        <ResultRow result={result} query={query} />
                      </Combobox.Item>
                    )}
                  </Combobox.List>
                ) : null}
                {/* 사라지는 동안은 Combobox 목록 대신 마지막 결과의 정적 사본 */}
                {shownKind === 'results' && leaving && snapshot ? (
                  <div className="gap-s1 flex flex-col">
                    {snapshot.results.map((result) => (
                      <div key={result.id} className={RESULT_ITEM}>
                        <ResultRow result={result} query={snapshot.query} />
                      </div>
                    ))}
                  </div>
                ) : null}
                {shownKind === 'empty' ? (
                  // 상자 여백(6) + 안쪽 여백으로 Figma 결과 없음 여백(위아래 20·좌우 12)
                  <div
                    key="empty"
                    className={cn(
                      'gap-s8 flex flex-col items-center px-1.5 py-3.5 text-center',
                      contentEnter,
                    )}
                  >
                    <div className="gap-s2 flex flex-col items-center">
                      <p className="typography-body-3-semibold text-text-secondary">
                        {leaving ? snapshot?.emptyTitle : emptyTitle}
                      </p>
                      {(leaving ? snapshot?.emptyDescription : emptyDescription) ? (
                        <p className="typography-body-4-regular text-text-quaternary">
                          {leaving ? snapshot?.emptyDescription : emptyDescription}
                        </p>
                      ) : null}
                    </div>
                    {leaving && snapshot?.manualInputLabel ? (
                      <span className="typography-label-s text-text-tertiary px-s6 flex h-8 items-center underline">
                        {snapshot.manualInputLabel}
                      </span>
                    ) : null}
                    {!leaving && manualInput ? (
                      <button
                        type="button"
                        onClick={() => {
                          manualInput.onClick();
                          // 결과 없음 패널이 사라져도 초점을 잃지 않게 입력칸으로
                          inputRef.current?.focus();
                        }}
                        className="typography-label-s text-text-tertiary px-s6 rounded-r4 focus-visible:outline-border-brand flex h-8 cursor-pointer items-center underline focus-visible:outline-2"
                      >
                        {manualInput.label}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </Combobox.Root>
    </div>
  );
};
