'use client';

import { DateChangeSheet } from '@app/design-system/web';
import { useState } from 'react';
import type { ScreenOverlayProps } from '@/shared/hooks/useScreenOverlay';

type SavingDateSheetProps = ScreenOverlayProps & {
  close: () => void;
  defaultDate?: Date | null | undefined;
  /** 저장 전 확인. false면 시트를 그대로 둠 */
  beforeSave?: ((_date: Date) => boolean | Promise<boolean>) | undefined;
  /** true면 시트를 닫고, false(실패)면 그대로 둠(기능 spec 3.4.1) */
  save: (_date: Date) => Promise<boolean>;
};

/** 날짜 바꾸기 시트와 저장 상태. 저장이 도는 동안은 닫지 않음 */
export function SavingDateSheet({
  close,
  defaultDate,
  beforeSave,
  save,
  ...rootProps
}: SavingDateSheetProps) {
  const [saving, setSaving] = useState(false);
  return (
    <DateChangeSheet
      {...rootProps}
      defaultDate={defaultDate ?? null}
      onOpenChange={(open) => {
        if (!saving) rootProps.onOpenChange(open);
      }}
      saving={saving}
      onSave={(date) => {
        void (async () => {
          if (saving || (beforeSave && !(await beforeSave(date)))) return;
          setSaving(true);
          // 성공하면 닫힘 모션 동안 「저장」이 다시 켜지지 않게 저장 중을 유지
          if (await save(date)) close();
          else setSaving(false);
        })();
      }}
    />
  );
}
