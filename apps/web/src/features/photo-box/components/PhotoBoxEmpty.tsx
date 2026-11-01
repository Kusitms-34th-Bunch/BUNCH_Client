type PhotoBoxEmptyProps = {
  /** `bunch`는 번치에 사진이 하나도 없을 때, `member`는 선택한 멤버의 사진이 없을 때 */
  reason: 'bunch' | 'member';
};

const MESSAGES = {
  bunch: '첫 번째 사진을 공유해 보세요',
  member: '첫 사진을 기다리고 있어요!',
} as const;

/** 사진 없음 빈 상태. 이미지 에셋은 Figma가 추후 공유한다고 해서 회색 자리표시 사용 */
export function PhotoBoxEmpty({ reason }: PhotoBoxEmptyProps) {
  return (
    <div className="gap-s6 flex flex-1 flex-col items-center justify-center">
      <div aria-hidden="true" className="bg-surface-secondary size-20" />
      <p className="typography-body-3-semi-bold text-text-quinary">{MESSAGES[reason]}</p>
    </div>
  );
}
