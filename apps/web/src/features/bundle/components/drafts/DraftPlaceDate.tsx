'use client';

import { DateChangeSheet, SelectionField, SelectionFieldGroup } from '@app/design-system/web';
import { useState } from 'react';
import type { DraftActions } from '../../hooks/useDraft';
import type { Draft } from '../../lib/types';
import { BUNDLE_MESSAGES, MAX_LOCATIONS } from '../../constants/messages';
import { formatDraftDate, parseDraftDate, toDraftDateString } from '../../lib/draftDate';
import { LocationSearchSheet } from './LocationSearchSheet';

type DraftPlaceDateProps = {
  draft: Draft;
  actions: Pick<DraftActions, 'addLocation' | 'removeLocation' | 'setDate' | 'searchPlaces'>;
  /** 위치·날짜를 고칠 수 있는지(참여 멤버만) */
  editable: boolean;
  /** 날짜 형식(올해 여부)의 기준 연도 */
  currentYear: number;
  /** 고칠 수 없는 사람이 눌렀을 때 */
  onDenied: () => void;
  /** 다른 멤버가 편집 중인 위치·날짜를 눌렀을 때 */
  onEditingBlocked: () => void;
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
  onEditingBlocked,
}: DraftPlaceDateProps) {
  const [locationOpen, setLocationOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const guard = (action: () => void) => () => (editable ? action() : onDenied());
  // 편집 중인 멤버가 있으면 시트를 열지 않고 안내(위치·날짜는 시트를 연 동안이 편집 중)
  const openLocation = guard(() =>
    draft.editing.location ? onEditingBlocked() : setLocationOpen(true),
  );
  const openDate = guard(() => (draft.editing.date ? onEditingBlocked() : setDateOpen(true)));

  // 다른 멤버가 위치·날짜를 고르는 중이면 그 멤버의 프로필만 보임(애니메이션 없음, Figma `3043:64938`)
  const editorOf = (memberId: string | undefined) =>
    draft.members.find((candidate) => candidate.id === memberId);
  const toProfiles = (member: ReturnType<typeof editorOf>) =>
    member ? [{ name: member.name, src: member.avatarSrc }] : undefined;
  const locationEditor = editorOf(draft.editing.location);
  const dateEditor = editorOf(draft.editing.date);
  // 프로필은 장식이라 편집 중이라는 사실은 필드 이름으로 읽히게 함("○○님이 편집 중 위치")
  const fieldNameWith = (field: string, editor: ReturnType<typeof editorOf>) =>
    editor ? `${BUNDLE_MESSAGES.editingLabel(editor.name)} ${field}` : field;

  const suggestions = draft.suggestedDates.map((value) => ({
    value,
    label: formatDraftDate(value, currentYear),
  }));

  return (
    <section className="pt-padding-p7 px-padding-p8 gap-s3 flex flex-col">
      {draft.locations.length === 0 ? (
        <SelectionField
          label={BUNDLE_MESSAGES.locationAdd}
          fieldLabel={fieldNameWith(BUNDLE_MESSAGES.locationField, locationEditor)}
          members={toProfiles(locationEditor)}
          onFieldClick={openLocation}
        />
      ) : (
        <SelectionFieldGroup
          items={draft.locations.map((location) => ({ id: location.id, value: location.name }))}
          fieldLabel={BUNDLE_MESSAGES.locationField}
          groupLabel={BUNDLE_MESSAGES.locationField}
          onItemClear={(id) => guard(() => actions.removeLocation(id))()}
          onAdd={draft.locations.length < MAX_LOCATIONS ? openLocation : undefined}
          addMembers={toProfiles(locationEditor)}
          {...(locationEditor && {
            addMembersLabel: BUNDLE_MESSAGES.editingLabel(locationEditor.name),
          })}
        />
      )}
      <SelectionField
        label={
          draft.date === null ? BUNDLE_MESSAGES.dateAdd : formatDraftDate(draft.date, currentYear)
        }
        fieldLabel={fieldNameWith(BUNDLE_MESSAGES.dateField, dateEditor)}
        icon="calendar"
        members={toProfiles(dateEditor)}
        selected={draft.date !== null}
        suggestions={suggestions.map((suggestion) => suggestion.label)}
        onFieldClick={openDate}
        onSuggestionClick={(label) => {
          const picked = suggestions.find((suggestion) => suggestion.label === label);
          if (picked) guard(() => actions.setDate(picked.value))();
        }}
        onClear={guard(() => actions.setDate(null))}
      />
      <LocationSearchSheet
        open={locationOpen}
        onOpenChange={setLocationOpen}
        searchPlaces={actions.searchPlaces}
        onSelect={(place) => {
          actions.addLocation(place);
          setLocationOpen(false);
        }}
      />
      <DateChangeSheet
        open={dateOpen}
        onOpenChange={setDateOpen}
        defaultDate={draft.date === null ? null : (parseDraftDate(draft.date) ?? null)}
        onSave={(date) => {
          actions.setDate(toDraftDateString(date));
          setDateOpen(false);
        }}
      />
    </section>
  );
}
