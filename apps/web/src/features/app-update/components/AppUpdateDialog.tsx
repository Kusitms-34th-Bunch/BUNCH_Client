'use client';

import { Dialog } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
import { isNativeShell } from '@/shared/bridge/client';
import { APP_STORE_URL } from '@/shared/constants/site';
import { appUpdateRequiredQueryOptions } from '../queries/appUpdate';

// 2026-11-26 확정 문구
const MESSAGES = {
  title: '업데이트가 필요해요',
  description: '새 버전으로 업데이트해야 BUNCH를 계속 쓸 수 있어요.',
  confirm: '업데이트',
};

// 닫기 없음: ESC·바깥 누르기의 닫기 요청을 무시
const ignoreClose = () => {};

/**
 * 최소 버전보다 낮은 앱이면 닫을 수 없는 업데이트 모달(#577). 앱 쉘 안에서만 묻고 화면 그리기는 기다리지 않음
 * 「업데이트」는 App Store 주소로 이동(쉘이 앱 밖 주소를 시스템으로 엶)
 */
export function AppUpdateDialog() {
  const { data: updateRequired = false } = useQuery({
    ...appUpdateRequiredQueryOptions(),
    enabled: isNativeShell(),
  });
  // 앱의 다른 덮개(로딩 z-30, 시트·자르기 화면 z-40)보다 위에 그려 「업데이트」를 늘 누를 수 있게 함
  return (
    <Dialog.Root open={updateRequired} onOpenChange={ignoreClose}>
      <Dialog.Content className="z-50" backdropClassName="z-50">
        <Dialog.Title>{MESSAGES.title}</Dialog.Title>
        <Dialog.Description>{MESSAGES.description}</Dialog.Description>
        <Dialog.Footer>
          <Dialog.Confirm onClick={() => window.location.assign(APP_STORE_URL)}>
            {MESSAGES.confirm}
          </Dialog.Confirm>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
