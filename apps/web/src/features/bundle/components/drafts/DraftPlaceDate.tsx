'use client';

import { DateChangeSheet, SelectionField } from '@app/design-system/web';
import { useScreenOverlay } from '@/shared/hooks/overlay/useScreenOverlay';
import type { DraftActions } from '../../hooks/useDraft';
import type { Draft, PlaceResult } from '../../lib/types';
import { BUNDLE_MESSAGES, MAX_LOCATIONS } from '../../constants/messages';
import { formatDraftDate, parseDraftDate, toDraftDateString } from '../../lib/draftDate';
import { isPendingLocation, toLiveIndex } from '../../lib/locationOps';
import { LocationSearchSheet } from './LocationSearchSheet';
import { PresenceScope } from './PresenceScope';
import { SortableLocationGroup } from './SortableLocationGroup';

type DraftPlaceDateProps = {
  draft: Draft;
  actions: Pick<
    DraftActions,
    | 'addLocation'
    | 'replaceLocation'
    | 'removeLocation'
    | 'moveLocation'
    | 'setDate'
    | 'searchPlaces'
    | 'presence'
  >;
  /** 위치·날짜를 고칠 수 있는지(참여 멤버만) */
  editable: boolean;
  /** 참여 멤버인지: 아니면 위치는 장소만 보이고 X와 「+ 위치 추가」는 보이지 않음(연결이 끊겨 editable만 false인 때는 그대로 보임, 기능 spec 4.3.10) */
  participant: boolean;
  /** 날짜 형식(올해 여부)의 기준 연도 */
  currentYear: number | null;
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
  participant,
  currentYear,
  onDenied,
}: DraftPlaceDateProps) {
  const openOverlay = useScreenOverlay();

  const guard = (action: () => void) => () => (editable ? action() : onDenied());
  // 검색 시트가 열려 있는 동안 그 영역을 작업 중으로 알림: 새 위치는 `LOCATION`, 기존 줄을 바꾸는 중이면 그 줄(`LOCATION:{서버 행 id}`)
  const openLocationSheet = (target: string, onSelect: (_place: PlaceResult) => void) => {
    openOverlay((rootProps, close) => (
      <PresenceScope presence={actions.presence} target={target}>
        <LocationSearchSheet
          {...rootProps}
          searchPlaces={actions.searchPlaces}
          onSelect={(place) => {
            onSelect(place);
            close();
          }}
        />
      </PresenceScope>
    ));
  };
  const openLocation = guard(() => openLocationSheet('LOCATION', actions.addLocation));
  // 서버 id를 아직 받지 못한 줄(내가 막 추가한 줄)은 바꾸지 않음
  const openReplace = (locationId: string) =>
    guard(() => {
      if (isPendingLocation({ id: locationId })) return;
      openLocationSheet(`LOCATION:${locationId}`, (place) =>
        actions.replaceLocation(locationId, place),
      );
    })();
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
  // 위치가 없을 때는 새 위치를 더하려는 멤버만 「위치 추가」 줄에 보임
  const locationEditors = membersOf(draft.editing.locationAddMemberIds ?? []);
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
          // 줄마다 그 줄을 바꾸거나 끄는 멤버의 프로필을 이름 오른쪽에 보임(기능 spec 4.3.13)
          items={draft.locations.map((location) => {
            const rowEditors = membersOf(draft.editing.locationEditors?.[location.id] ?? []);
            return {
              id: location.id,
              value: location.name,
              members: toProfiles(rowEditors),
              fieldLabel: fieldNameWith(BUNDLE_MESSAGES.locationField, rowEditors),
            };
          })}
          // 하나뿐이거나 권한이 없으면 끌 수 없음(눌렀을 때 이유를 안내)
          disabled={!editable || draft.locations.length < 2}
          onBlockedPress={!editable ? onDenied : undefined}
          onMove={(id, shownIndex, overId) =>
            actions.moveLocation(id, toLiveIndex(draft.locations, overId, shownIndex))
          }
          onItemClick={openReplace}
          onDragStateChange={(id, dragging) =>
            dragging
              ? actions.presence.begin(`LOCATION:${id}`)
              : actions.presence.end(`LOCATION:${id}`)
          }
          fieldLabel={BUNDLE_MESSAGES.locationField}
          groupLabel={BUNDLE_MESSAGES.locationField}
          onItemClear={(id) => guard(() => actions.removeLocation(id))()}
          hideItemClear={!participant}
          onAdd={participant && draft.locations.length < MAX_LOCATIONS ? openLocation : undefined}
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
        // 참여 멤버가 아니면 추천 날짜 칩을 누를 수 없음(연결이 끊긴 참여 멤버는 그대로 보임)
        suggestionsDisabled={!participant}
        onSuggestionClick={(label) => {
          const picked = suggestions.find((suggestion) => suggestion.label === label);
          if (picked) guard(() => actions.setDate(picked.value))();
        }}
        onClear={guard(() => actions.setDate(null))}
      />
    </section>
  );
}
