import type { BunchSummary } from '../lib/types';

export const BUNCH_HOME_MESSAGES = {
  switched: (bunchName: string) => `${bunchName} 번치로 전환했어요.`,
  completedEmptyTitle: '추억은 많은데, 번들은 아직!',
  draftEmptyTitle: '아직 작성 중인 번들이 없어요',
  emptyDescription: '함께한 순간을 하나의 기록으로 남겨보세요.',
  deleteDraftTitle: '작성 중인 번들을 삭제할까요?',
  deleteDraftDescription:
    '삭제한 번들은 다시 복구할 수 없지만, 사용된 사진은 사진함에 그대로 남아요.',
  unavailableTitle: ({ name, access }: BunchSummary) =>
    access === 'deleted' ? `${name} 번치가 삭제됐어요` : `${name} 번치에서 내보내졌어요`,
  unavailableDescription: ({ access }: BunchSummary) =>
    access === 'deleted'
      ? '관리자가 번치를 삭제하여 더 이상 접근할 수 없어요.'
      : '번치 멤버 목록에서 제외되어 더 이상 번치에 참여할 수 없어요.',
} as const;
