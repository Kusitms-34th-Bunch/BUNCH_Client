import { useSyncExternalStore } from 'react';
import { bundleEdits } from '../lib/bundleEdits';

/** 지운 번들과 바꾼 공개 범위를 구독(피드에서 빼고, 상세 뱃지에 반영) */
export function useBundleEdits() {
  const edits = useSyncExternalStore(bundleEdits.subscribe, bundleEdits.read, bundleEdits.read);
  return {
    isDeleted: (bundleId: string) => edits.deleted.has(bundleId),
    memberOnlyOf: (bundleId: string, fallback: boolean) =>
      edits.memberOnly.get(bundleId) ?? fallback,
    /** 원래 공개였는데 화면에서 「멤버 공개」로 바꾼 번들(피드에서 뺌, 기능명세서 6.2.12 로직 5) */
    becameMemberOnly: (bundleId: string, original: boolean) =>
      !original && edits.memberOnly.get(bundleId) === true,
  };
}
