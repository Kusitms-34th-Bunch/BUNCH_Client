import { useMemo, useState } from 'react';
import { mergeRefs, useIntersectionObserver } from 'react-simplikit';
import type { BundlePhotoItem } from './BundlePhoto';
import { cn } from '../../../utils';
import { ProfileImage } from '../profileImage';
import pickMotion from './pickMotion.module.css';

// 접힌 상태: 앞 사람일수록 진하고 오른쪽 위로 2px·1px씩 비껴 쌓임(Figma `PickAvatar`), 1~2명이면 그 수만큼
const PICK_LAYERS = [
  'left-0.75 top-0.5',
  'left-1.25 top-px opacity-80',
  'left-1.75 top-0 opacity-60',
];
const PICK_FACE = 'outline-border-tertiary outline -outline-offset-1';

/**
 * 사진을 pick한 멤버(Figma `PickAvatar`): 얼굴을 겹친 「pick」 버튼. 누르면 전체 멤버를 세로로 펼치고 다시 누르거나 사진을 넘기면 접힘
 * 많으면 사진 높이 안에서 스크롤. 이름은 버튼 이름으로 모두 읽으므로 펼친 목록은 낭독에서 숨김
 */
export const PickAvatars = ({ pickers }: { pickers: NonNullable<BundlePhotoItem['pickers']> }) => {
  // closing: 접히는 모션이 끝날 때까지 목록 유지
  const [state, setState] = useState<'collapsed' | 'expanded' | 'closing'>('collapsed');
  const expanded = state === 'expanded';
  const closing = state === 'closing';
  // 떠다니는 모션은 얼굴이 보일 때 시작(가려진 채 끝나지 않게), 다시 보이면 또 재생
  // 움직이는 얼굴 대신 고정된 칸을 관찰(2px 움직임이 판정을 바꿔 재생이 반복되지 않게)
  const [visible, setVisible] = useState(false);
  // 1명 ↔ 2명이면 칸이 다시 만들어지는데, callback ref라 새 칸을 다시 관찰함
  const floatRef = useIntersectionObserver<HTMLSpanElement>(
    (entry) => setVisible(entry.isIntersecting),
    { threshold: 0.5 },
  );
  // 다른 사진으로 넘겨 완전히 가려지면 모션 없이 접음(기능명세 6.2.4 상세 4). 훅이 묶음의 첫 기록만 넘겨
  // 기준 0으로 따로 관찰(보임·가려짐이 번갈아 쌓여 펼친 뒤 첫 기록은 늘 가려짐)
  const collapseRef = useIntersectionObserver<HTMLSpanElement>((entry) => {
    if (!entry.isIntersecting) setState('collapsed');
  }, {});
  // 렌더마다 새 ref면 관찰을 매번 다시 시작하므로 고정
  const facesRef = useMemo(() => mergeRefs(floatRef, collapseRef), [floatRef, collapseRef]);
  const float = visible ? pickMotion.float : undefined;
  const [first, ...rest] = pickers;
  const pressable = rest.length > 0;

  const listed = expanded || closing;
  const stacked = listed ? pickers.slice(0, 1) : pickers.slice(0, PICK_LAYERS.length);
  const label = `pick ${pickers.map((picker) => picker.name).join(', ')}`;
  const badge = (
    <>
      <span ref={facesRef} className="relative -mb-2.5 block h-10.5">
        <span className={cn('block h-full', float)}>
          {stacked
            .map((picker, index) => (
              <ProfileImage
                key={`${picker.name}-${index}`}
                size="S"
                src={picker.imageSrc}
                alt=""
                className={cn(PICK_FACE, 'absolute', listed ? 'top-0 left-1' : PICK_LAYERS[index])}
              />
            ))
            .reverse()}
        </span>
      </span>
      <span className="bg-overlay-scrim px-s5 py-s1 typography-body-3-regular text-text-inversed relative rounded-full text-center backdrop-blur-[2px]">
        pick
      </span>
    </>
  );

  return (
    <div className="top-padding-p8 bottom-padding-p8 pointer-events-none absolute left-5 flex w-11.75 flex-col justify-end">
      {listed && first ? (
        <ul
          aria-hidden="true"
          tabIndex={-1}
          className="gap-s3 pb-s3 pointer-events-auto flex min-h-0 scrollbar-none flex-col-reverse items-center overflow-y-auto pt-0.5"
        >
          {rest.map((picker, index) => (
            <li
              key={`${picker.name}-${index}`}
              className={closing ? pickMotion.fall : pickMotion.rise}
              // 펼칠 때는 버튼 쪽부터, 접을 때는 위쪽부터. 버튼 옆 얼굴이 마지막에 끝남
              style={{ animationDelay: `${(closing ? rest.length - 1 - index : index) * 30}ms` }}
              onAnimationEnd={(event) => {
                if (index === 0 && event.target === event.currentTarget) {
                  setState((prev) => (prev === 'closing' ? 'collapsed' : prev));
                }
              }}
            >
              <span
                className={cn('block', float)}
                style={{ animationDelay: `${-(index + 1) * 0.3}s` }}
              >
                <ProfileImage size="S" src={picker.imageSrc} alt="" className={PICK_FACE} />
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {pressable ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={label}
          onClick={() => setState(expanded ? 'closing' : 'expanded')}
          className="focus-visible:outline-border-inversed pointer-events-auto relative flex shrink-0 cursor-pointer touch-manipulation flex-col rounded-full focus-visible:outline-2"
        >
          {badge}
        </button>
      ) : (
        <div role="img" aria-label={label} className="relative flex shrink-0 flex-col">
          {badge}
        </div>
      )}
    </div>
  );
};
