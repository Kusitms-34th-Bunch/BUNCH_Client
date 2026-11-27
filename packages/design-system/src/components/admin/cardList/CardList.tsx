import { Fragment, type ComponentProps, type ReactNode } from 'react';
import { cn } from '../../../utils';

export type CardListProps = Omit<ComponentProps<'div'>, 'title' | 'children'> & {
  /** 첫 줄 본문(예: 신고 내용) */
  title: ReactNode;
  /** 둘째 줄 보조 정보. 항목 사이에 세로 구분선(`|`)을 그림(예: 사유, 번치(신고자), 날짜 시간) */
  meta?: ReactNode[] | undefined;
};

/**
 * 어드민 카드 목록 항목(Figma `어드민 컴포넌트` > `Card List`): 본문 한 줄 + 구분선으로 나눈 보조 정보 한 줄
 * 목록 묶음(ul/li)과 문구 조합은 호출자 담당. 구분선은 장식이라 스크린 리더에서 숨김
 */
export const CardList = ({ title, meta, className, ...props }: CardListProps) => (
  <div
    className={cn(
      'bg-surface-primary border-border-secondary rounded-r5 px-padding-p8 py-padding-p5 gap-s1 flex flex-col border',
      className,
    )}
    {...props}
  >
    <div className="typography-body-1-medium text-text-secondary wrap-break-word">{title}</div>
    {meta && meta.length > 0 ? (
      <div className="gap-s3 typography-body-4-regular text-text-tertiary flex flex-wrap items-center">
        {meta.map((item, index) => (
          // 보조 정보는 순서가 고정된 표시용 목록이라 위치를 key로 사용
          <Fragment key={index}>
            {index > 0 ? (
              <span aria-hidden="true" className="typography-body-1-regular text-text-quinary">
                |
              </span>
            ) : null}
            <span>{item}</span>
          </Fragment>
        ))}
      </div>
    ) : null}
  </div>
);
