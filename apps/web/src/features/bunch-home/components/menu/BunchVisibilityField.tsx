import { cn } from '@app/design-system';
import { DescriptionRadioCard } from '@app/design-system/web';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';

type BunchVisibilityFieldProps = {
  isPrivate: boolean;
  onChange: (_isPrivate: boolean) => void;
  /** 공개 카드 아래 안내 표시 여부 */
  showPublicNotice: boolean;
};

/** 번치 프로필 편집의 공개 범위 선택(공개·비공개 카드와 공개 전환 안내) */
export function BunchVisibilityField({
  isPrivate,
  onChange,
  showPublicNotice,
}: BunchVisibilityFieldProps) {
  return (
    <fieldset className="min-w-0">
      <legend className="typography-body-3-semibold text-text-secondary pb-s6">공개 범위</legend>
      <div className="gap-s5 flex flex-col">
        <div className="flex flex-col">
          <DescriptionRadioCard
            name="visibility"
            value="public"
            title="공개"
            description="누구나 우리 번치와 번들을 볼 수 있어요."
            checked={!isPrivate}
            onChange={() => onChange(false)}
          />
          {/* 화면설계서 5-1: On Click / Smart Animate / Ease out(시간은 디자이너 요청 150ms). 자리가 벌어지며 나타나고 아래 카드도 함께 이동 */}
          <div
            aria-hidden
            className={cn(
              'grid transition-[grid-template-rows,opacity,visibility] duration-150 ease-[ease-out] motion-reduce:transition-none',
              showPublicNotice
                ? 'visible grid-rows-[1fr] opacity-100'
                : 'invisible grid-rows-[0fr] opacity-0',
            )}
          >
            <div className="overflow-hidden">
              <p className="typography-body-4-regular text-text-quaternary px-padding-p8 py-s2 mt-s2 flex">
                <span>*</span>
                <span>{BUNCH_HOME_MESSAGES.publicNotice}</span>
              </p>
            </div>
          </div>
          {/* 화면용 문구는 항상 있어 낭독되지 않으므로 공개를 고르는 순간 읽힐 status를 따로 둠 */}
          <p role="status" className="sr-only">
            {showPublicNotice ? BUNCH_HOME_MESSAGES.publicNotice : ''}
          </p>
        </div>
        <DescriptionRadioCard
          name="visibility"
          value="private"
          title="비공개"
          description="팔로우를 승인한 번치만 우리 번치와 번들을 볼 수 있어요."
          checked={isPrivate}
          onChange={() => onChange(true)}
        />
      </div>
    </fieldset>
  );
}
