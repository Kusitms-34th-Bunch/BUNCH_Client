'use client';

import { DateChangeSheet, SelectionField } from '@app/design-system/web';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import type { DraftActions } from '../../hooks/useDraft';
import type { Draft } from '../../lib/types';
import { BUNDLE_MESSAGES, MAX_LOCATIONS } from '../../constants/messages';
import { formatDraftDate, parseDraftDate, toDraftDateString } from '../../lib/draftDate';
import { LocationSearchSheet } from './LocationSearchSheet';
import { PresenceScope } from './PresenceScope';
import { SortableLocationGroup } from './SortableLocationGroup';

type DraftPlaceDateProps = {
  draft: Draft;
  actions: Pick<
    DraftActions,
    'addLocation' | 'removeLocation' | 'moveLocation' | 'setDate' | 'searchPlaces' | 'presence'
  >;
  /** 위치·날짜를 고칠 수 있는지(참여 멤버만) */
  editable: boolean;
  /** 날짜 형식(올해 여부)의 기준 연도 */
  currentYear: number;
  /** 고칠 수 없는 사람이 눌렀을 때 */
  onDenied: () => void;
};

/**
 * 위치(최대 3개)와 날짜 줄. 위치는 검색 시트에서, 날짜는 달력 시트나 추천 날짜 칩으로 정함
 * 시트를 연 동안이 편집 중이라는 표시는 서버가 있어야 하므로 이 화면은 다른 멤버의 편집 표시만 받음
 */
export function DraftPlaceDate({
  draft,
  actions,
  editable,
  currentYear,
  onDenied,
}: DraftPlaceDateProps) {
  const openOverlay = useScreenOverlay();

  const guard = (action: () => void) => () => (editable ? action() : onDenied());
  const openLocation = guard(() => {
    openOverlay((rootProps, close) => (
      <LocationSearchSheet
        {...rootProps}
        searchPlaces={actions.searchPlaces}
        onSelect={(place) => {
          actions.addLocation(place);
          close();
        }}
      />
    ));
  });
  const openDate = guard(() => {
    openOverlay((rootProps, close) => (
      // 날짜 선택 화면이 열려 있는 동안 날짜를 작업 중으로 알림
      <PresenceScope presence={actions.presence} target="DATE">
        <DateChangeSheet
          {...rootProps}
          defaultDate={draft.date === null ? null : (parseDraftDate(draft.date) ?? null)}
          onSave={(date) => {
            actions.setDate(toDraftDateString(date));
            close();
          }}
        />
      </PresenceScope>
    ));
  });

  // 위치·날짜를 고르는 멤버의 프로필을 모두 보임(잠그지 않음, 애니메이션 없음, Figma `3043:64938`)
  const membersOf = (ids: readonly string[]) =>
    draft.members.filter((candidate) => ids.includes(candidate.id));
  const addEditors = membersOf(draft.editing.locationAddMemberIds ?? []);
  const locationEditors = membersOf([
    ...(draft.editing.locationAddMemberIds ?? []),
    ...Object.values(draft.editing.locationEditors ?? {}).flat(),
  ]);
  const dateEditors = membersOf(draft.editing.dateMemberIds ?? []);
  const toProfiles = (list: typeof locationEditors) =>
    list.length > 0
      ? list.map((member) => ({ name: member.name, src: member.avatarSrc }))
      : undefined;
  // 프로필은 장식이라 작업 중이라는 사실은 필드 이름으로 읽히게 함("○○님이 편집 중 위치")
  // 여러 명이면 이름마다 「님이 편집 중」을 붙여 이음(예: 경진님이 편집 중, 은우님이 편집 중 위치)
  const editingName = (list: typeof locationEditors) =>
    list.map((member) => BUNDLE_MESSAGES.editingLabel(member.name)).join(', ');
  const fieldNameWith = (field: string, list: typeof locationEditors) =>
    list.length > 0 ? `${editingName(list)} ${field}` : field;

  const suggestions = draft.suggestedDates.map((value) => ({
    value,
    label: formatDraftDate(value, currentYear),
  }));

  return (
    <section className="pt-s13 pb-padding-p14 px-padding-p8 gap-s3 flex flex-col">
      {draft.locations.length === 0 ? (
        <SelectionField
          label={BUNDLE_MESSAGES.locationAdd}
          fieldLabel={fieldNameWith(BUNDLE_MESSAGES.locationField, locationEditors)}
          members={toProfiles(locationEditors)}
          onFieldClick={openLocation}
        />
      ) : (
        <SortableLocationGroup
          items={draft.locations.map((location) => ({ id: location.id, value: location.name }))}
          // 하나뿐이거나 권한이 없으면 끌 수 없음(눌렀을 때 이유를 안내)
          disabled={!editable || draft.locations.length < 2}
          onBlockedPress={!editable ? onDenied : undefined}
          onMove={actions.moveLocation}
          // 작업 중인 멤버가 있으면 이름을 필드·그룹 이름에 넣어 칩에서도 읽히게 함
          fieldLabel={fieldNameWith(BUNDLE_MESSAGES.locationField, locationEditors)}
          groupLabel={fieldNameWith(BUNDLE_MESSAGES.locationField, locationEditors)}
          onItemClear={(id) => guard(() => actions.removeLocation(id))()}
          onAdd={draft.locations.length < MAX_LOCATIONS ? openLocation : undefined}
          addMembers={toProfiles(addEditors)}
          {...(addEditors.length > 0 && {
            addMembersLabel: editingName(addEditors),
          })}
        />
      )}
      <SelectionField
        label={
          draft.date === null ? BUNDLE_MESSAGES.dateAdd : formatDraftDate(draft.date, currentYear)
        }
        fieldLabel={fieldNameWith(BUNDLE_MESSAGES.dateField, dateEditors)}
        icon="calendar"
        members={toProfiles(dateEditors)}
        selected={draft.date !== null}
        suggestions={suggestions.map((suggestion) => suggestion.label)}
        onFieldClick={openDate}
        onSuggestionClick={(label) => {
          const picked = suggestions.find((suggestion) => suggestion.label === label);
          if (picked) guard(() => actions.setDate(picked.value))();
        }}
        onClear={guard(() => actions.setDate(null))}
      />
    </section>
  );
}
