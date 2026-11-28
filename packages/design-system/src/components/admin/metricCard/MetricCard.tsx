import type { ComponentProps } from 'react';
import { cn } from '../../../utils';

export type MetricCardProps = Omit<ComponentProps<'dl'>, 'children'> & {
  /** 지표 이름(예: `노출`) */
  label: string;
  /** 값. 천 단위 쉼표 등 표기는 호출자 담당(예: `12,480`) */
  value: string | number;
  /** 값 뒤 단위(예: `회`) */
  unit?: string | undefined;
  /** 값 아래 보조 설명(예: `하루평균 1,378회`) */
  description?: string | undefined;
};

/**
 * 어드민 지표 카드(Figma `어드민 컴포넌트` > `Metric Card`): 이름·값·단위·보조 설명
 * 이름과 값을 dl/dt/dd로 묶어 스크린 리더가 짝으로 읽음. 폭은 부모(격자 칸)를 채움
 */
export const MetricCard = ({
  label,
  value,
  unit,
  description,
  className,
  ...props
}: MetricCardProps) => (
  <dl
    className={cn(
      'bg-surface-primary border-border-secondary rounded-r3 px-padding-p6 pt-padding-p5 pb-padding-p7 gap-s2 flex flex-col border',
      className,
    )}
    {...props}
  >
    <dt className="typography-body-3-semibold text-text-tertiary">{label}</dt>
    <dd className="gap-s1 flex flex-col">
      {/* 값과 단위 사이 공백 문자 유지(화면 간격은 gap 담당, 스크린 리더가 띄어 읽는지는 미확인) */}
      <span className="gap-s1 flex items-end whitespace-nowrap">
        <span className="typography-title-1-semi-bold text-text-secondary">{value}</span>
        {unit ? (
          <>
            {' '}
            <span className="typography-body-2-regular text-text-tertiary">{unit}</span>
          </>
        ) : null}
      </span>
      {description ? (
        <span className="typography-caption-1-regular text-text-tertiary">{description}</span>
      ) : null}
    </dd>
  </dl>
);
