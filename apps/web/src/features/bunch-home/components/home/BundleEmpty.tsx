import { Button } from '@app/design-system';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';

type BundleEmptyProps = {
  title: string;
  /** 「첫 번들 만들기」 버튼 표시(완성된 번들 탭) */
  showCreateButton?: boolean | undefined;
  onCreateBundle?: (() => void) | undefined;
};

/** 번들 탭 빈 상태: 제목·안내 문구와 선택적 「첫 번들 만들기」 */
export function BundleEmpty({ title, showCreateButton = false, onCreateBundle }: BundleEmptyProps) {
  return (
    <div className="gap-s8 mx-auto flex w-fit flex-col items-center text-center">
      <div className="flex flex-col items-center">
        <p className="typography-body-1-medium text-text-secondary">{title}</p>
        <p className="typography-body-4-regular text-text-tertiary">
          {BUNCH_HOME_MESSAGES.emptyDescription}
        </p>
      </div>
      {showCreateButton ? (
        <Button size="md" className="w-full" onClick={onCreateBundle}>
          첫 번들 만들기
        </Button>
      ) : null}
    </div>
  );
}
