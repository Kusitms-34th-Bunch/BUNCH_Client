/* eslint-disable react-refresh/only-export-components -- Compound API 부품을 객체 하나로 묶어 export */
import {
  type ComponentProps,
  createContext,
  type CSSProperties,
  type ReactNode,
  useContext,
} from 'react';
import { cn, tv } from '../../../utils';

// 표 이름 필수(이름 없는 table 방지)
export type TableRootProps = {
  /** 열 폭(CSS grid-template-columns). 열 제목 줄과 모든 행이 같은 값을 씀(예: `300px 320px 86px 72px 1fr 28px`) */
  columns: string;
  /** 열 사이 간격: `default` 20px(`spacing-s10`), `none` 0(열 폭에 간격을 포함해 Figma 위치를 그대로 재현할 때) */
  columnGap?: 'default' | 'none' | undefined;
  className?: string | undefined;
  children: ReactNode;
} & ({ 'aria-label': string } | { 'aria-labelledby': string });

export type TableCellAlign = 'start' | 'end';

export type TableHeaderCellProps = {
  /** 칸 정렬. 숫자 열은 `end` */
  align?: TableCellAlign | undefined;
  className?: string | undefined;
  children?: ReactNode;
};

export type TableRowProps = {
  /** 열린 상세의 행(Figma `Status=Selected`) */
  selected?: boolean | undefined;
  /** 누를 수 없는 행(Figma `Status=Disabled`) */
  disabled?: boolean | undefined;
  /** 위아래 여백: 썸네일 있는 행 `media`(6px, Figma Type 01), 글자만 있는 행 `text`(10px, Type 02·03) */
  variant?: 'media' | 'text' | undefined;
  className?: string | undefined;
  children: ReactNode;
};

export type TableCellProps = {
  align?: TableCellAlign | undefined;
  /** 칸 안에 링크·버튼이 있으면 true. 행 버튼 누름 영역 위로 올림 */
  interactive?: boolean | undefined;
  className?: string | undefined;
  children?: ReactNode;
};

// disabled·aria-current는 행 상태(Table.Row)가 정해 호출자가 덮어쓰지 못하게 뺌
export type TableRowButtonProps = Omit<
  ComponentProps<'button'>,
  'disabled' | 'type' | 'aria-current'
>;

export type TableHeaderProps = { className?: string | undefined; children: ReactNode };
export type TableBodyProps = { className?: string | undefined; children: ReactNode };

// 칸은 항상 열 폭을 채움(justify-self로 줄이면 글자 길이만큼 늘어나 말줄임이 안 되고 옆 칸으로 넘침). 정렬은 글자·flex 정렬로만
const ALIGN: Record<TableCellAlign, string> = {
  start: 'text-start justify-start',
  end: 'text-end justify-end',
};

// 열 폭은 Root가 CSS 변수로 한 번 정하고 열 제목 줄·행이 같은 격자를 씀
const GRID = 'gap-x-(--table-column-gap) grid grid-cols-(--table-columns) items-center';

const Root = ({
  columns,
  columnGap = 'default',
  className,
  children,
  ...labelProps
}: TableRootProps) => (
  <div
    role="table"
    {...labelProps}
    style={
      {
        '--table-columns': columns,
        '--table-column-gap': columnGap === 'none' ? '0px' : 'var(--semantic-spacing-s10)',
      } as CSSProperties
    }
    className={cn(
      'border-border-secondary rounded-r4 gap-s4 pb-s6 flex flex-col overflow-clip border',
      className,
    )}
  >
    {children}
  </div>
);

// 열 제목 줄(Figma 화면설계서의 회색 줄)
// 좌우 여백을 행과 같은 겹(바깥 p7 14px + 안쪽 p4 8px)으로 두어 열 제목과 칸 위치를 맞춤(Figma 18px은 칸과 4px 어긋남)
const Header = ({ className, children }: TableHeaderProps) => (
  <div role="rowgroup" className="bg-surface-tertiary px-padding-p7">
    <div
      role="row"
      className={cn(
        GRID,
        'px-padding-p4 py-padding-p6 typography-body-3-regular text-text-secondary',
        className,
      )}
    >
      {children}
    </div>
  </div>
);

const HeaderCell = ({ align = 'start', className, children }: TableHeaderCellProps) => (
  <div role="columnheader" className={cn('min-w-0', ALIGN[align], className)}>
    {children}
  </div>
);

const Body = ({ className, children }: TableBodyProps) => (
  <div
    role="rowgroup"
    className={cn('px-padding-p7 py-padding-p2 gap-s6 flex flex-col', className)}
  >
    {children}
  </div>
);

const row = tv({
  base: [
    GRID,
    // isolate: 덮개(z-10)·행 버튼 누름 영역(z-20)이 행 밖 팝오버·드롭다운과 겹쳐 클릭을 가로채지 않게 행 안에 가둠
    'bg-surface-primary rounded-r3 px-padding-p4 relative isolate',
    'typography-body-2-regular text-text-secondary',
    // Hover·Selected 덮개는 썸네일·배지까지 함께 어둡게(Figma: 행 위 overlay)
    'before:rounded-r3 before:pointer-events-none before:absolute before:inset-0 before:z-10',
    // 행 사이 구분선: 행 간격(12px = 6 + 구분선 + 6) 가운데, 좌우 10px 안쪽(Figma Divider 1049px). 마지막 행은 없음
    'not-last:after:bg-border-tertiary not-last:after:pointer-events-none not-last:after:absolute not-last:after:inset-x-2.5 not-last:after:bottom-[-6.5px] not-last:after:h-px',
  ],
  variants: {
    variant: { media: 'py-padding-p3', text: 'py-padding-p5' },
    state: {
      // 행 버튼(data-table-row-button)이 있는 행만 Hover 모양(누를 수 없는 행이 눌릴 것처럼 보이지 않게, interactive 칸 버튼은 제외)
      default: 'has-data-table-row-button:hover:before:bg-overlay-hover',
      selected: 'before:bg-overlay-pressed',
      disabled: 'opacity-(--semantic-opacity-disabled)',
    },
  },
  defaultVariants: { variant: 'media', state: 'default' },
});

type RowState = { selected: boolean; disabled: boolean };
const RowContext = createContext<RowState>({ selected: false, disabled: false });

const Row = ({
  selected = false,
  disabled = false,
  variant,
  className,
  children,
}: TableRowProps) => (
  <RowContext.Provider value={{ selected, disabled }}>
    <div
      role="row"
      aria-disabled={disabled || undefined}
      className={row({
        variant,
        state: disabled ? 'disabled' : selected ? 'selected' : 'default',
        className,
      })}
    >
      {children}
    </div>
  </RowContext.Provider>
);

const Cell = ({ align = 'start', interactive = false, className, children }: TableCellProps) => (
  <div
    role="cell"
    // interactive: 행 버튼 누름 영역(z-20) 위로 올려 칸 안 링크·버튼을 누를 수 있게
    className={cn('min-w-0', ALIGN[align], interactive && 'relative z-30', className)}
  >
    {children}
  </div>
);

/**
 * 행을 여는 버튼: 대표 칸 안에 두면 누름 영역이 행 전체로 넓어짐
 * 키보드·스크린 리더는 이 버튼 하나로 행을 열고, 열린 행은 `aria-current`로 알림
 * 다른 칸에 링크·버튼을 두려면 그 칸에 `interactive`를 줘야 누를 수 있음(없으면 누름 영역에 가려짐)
 */
const RowButton = ({ className, children, ...props }: TableRowButtonProps) => {
  const { selected, disabled } = useContext(RowContext);
  return (
    <button
      type="button"
      data-table-row-button=""
      disabled={disabled}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'w-full min-w-0 cursor-pointer text-start disabled:cursor-default',
        // 누름 영역을 행 전체로(행의 relative 기준), 초점 윤곽도 행 테두리에 그림
        'after:rounded-r3 after:absolute after:inset-0 after:z-20 focus-visible:outline-none',
        'focus-visible:after:outline-border-brand focus-visible:after:outline-2',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * 어드민 표(Figma `어드민 컴포넌트` > `Table Row/Type`·`Table Row/Status`와 화면설계서의 열 제목 줄)
 * 열 구성(Figma Type 01~03)은 화면의 feature가 `columns`와 칸으로 조합. ARIA table 역할로 열 제목과 칸을 연결
 */
export const Table = { Root, Header, HeaderCell, Body, Row, Cell, RowButton };
