'use client';

import type { ReactNode } from 'react';
import { cn, Header, LineChevronLeftLargeIcon, LineCloseSmallIcon } from '@app/design-system';
import { RoleBadge, type RoleBadgeRole } from '@app/design-system/web';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { BUNCH_HOME_PATHS } from '../../constants/paths';

type Allowance = 'all' | 'some' | 'none';

const ROLE_LABELS: Record<RoleBadgeRole, string> = {
  owner: '메인 관리자',
  coOwner: '공동 관리자',
  draftAuthor: '번들 최초생성자',
};
const ALLOWANCE_LABELS: Record<Allowance, string> = {
  all: '모두 허용',
  some: '일부 허용',
  none: '권한 없음',
};

type PermissionTable = {
  title: string;
  roles: readonly RoleBadgeRole[];
  rows: readonly { label: string; noted?: boolean; values: readonly Allowance[] }[];
  note: string;
};

// Figma 2500:54066 권한 표 그대로(서버 판단 기준이 아닌 안내용, 화면설계서 1-1)
const TABLES: readonly PermissionTable[] = [
  {
    title: '번치',
    roles: ['owner', 'coOwner'],
    rows: [
      { label: '번치 정보 바꾸기', values: ['all', 'none'] },
      { label: '공동 관리자 지정・해제', values: ['all', 'none'] },
      { label: '번치 삭제', values: ['all', 'none'] },
      { label: '멤버 내보내기', noted: true, values: ['all', 'all'] },
      { label: '타멤버 사진 삭제・날짜 변경', values: ['all', 'all'] },
      { label: '다른 번치 차단', values: ['all', 'all'] },
    ],
    note: '메인 관리자는 내보낼 수 없어요.',
  },
  {
    title: '번들',
    roles: ['owner', 'coOwner', 'draftAuthor'],
    rows: [
      { label: '작성 중인 번들 업로드', values: ['some', 'some', 'all'] },
      { label: '작성 중인 번들 삭제', values: ['some', 'some', 'all'] },
      { label: '멤버 내보내기', noted: true, values: ['some', 'some', 'all'] },
      { label: '발행된 번들 수정・삭제', values: ['all', 'none', 'none'] },
    ],
    note: '번들 최초 생성자는 내보낼 수 없어요.',
  },
];

// 원·세모는 디자인 시스템 아이콘이 없어 Figma 벡터(16px, 선 1.2)를 그대로 옮김. 닫기 모양만 공용 아이콘
// 「일부 허용」 칸은 조건 각주를 이름에 함께 넣어 읽힘
const SOME_CELL_LABEL = '일부 허용, 해당 번들에 참여한 경우만';

const AllowanceMark = ({
  allowance,
  label = ALLOWANCE_LABELS[allowance],
}: {
  allowance: Allowance;
  label?: string;
}) => {
  if (allowance === 'none') return <LineCloseSmallIcon role="img" aria-label={label} />;
  return (
    <svg role="img" aria-label={label} width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d={
          allowance === 'all'
            ? 'M8 13.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11Z'
            : 'M8.753 2.96a.85.85 0 0 0-1.507 0L2.59 12.273a.85.85 0 0 0 .754 1.227h9.312a.85.85 0 0 0 .754-1.227L8.753 2.96Z'
        }
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const Asterisk = () => (
  <span aria-hidden="true" className="text-text-brand">
    *
  </span>
);

// 아이콘과 글자 사이: 역할 배지 4, 허용 기호 6(Figma 2553:32530·2553:32540)
const LegendItem = ({
  icon,
  wide,
  children,
}: {
  icon: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) => (
  <li className={cn('p-s2 flex w-27.5 items-center', wide ? 'gap-s3' : 'gap-s2')}>
    {icon}
    {children}
  </li>
);

/**
 * 역할별 권한 안내(화면설계서 1-1): 설정 변경 없이 보기만 하는 표. 뒤로 가기는 이전 화면
 */
export function BunchRoleGuide() {
  const backOr = useBackOr();

  return (
    <PageShell
      header={
        <Header
          leading={
            <HeaderIconButton
              label="뒤로 가기"
              tone="subtle"
              onClick={() => backOr(BUNCH_HOME_PATHS.members)}
            >
              <LineChevronLeftLargeIcon />
            </HeaderIconButton>
          }
        />
      }
    >
      <h1 className="sr-only">역할별 권한</h1>
      {/* 헤더 아래 12, 묶음 사이 36, 표 묶음 사이 28(Figma 2500:54066) */}
      <div className="pt-s6 px-padding-p8 pb-s8 gap-s15 text-text-secondary flex flex-col">
        <section aria-labelledby="role-guide-legend">
          <h2
            id="role-guide-legend"
            className="bg-surface-secondary rounded-r4 px-padding-p8 py-s4 typography-body-4-semi-bold"
          >
            기호 안내
          </h2>
          <ul className="typography-body-4-semi-bold px-s4 py-s2 flex flex-wrap justify-between">
            {(['owner', 'coOwner', 'draftAuthor'] as const).map((role) => (
              <LegendItem key={role} icon={<RoleBadge memberRole={role} />}>
                {ROLE_LABELS[role]}
              </LegendItem>
            ))}
          </ul>
          <ul className="typography-body-4-semi-bold px-s4 py-s2 flex flex-wrap justify-between">
            {(['all', 'some', 'none'] as const).map((allowance) => (
              <LegendItem
                key={allowance}
                wide
                icon={
                  <span aria-hidden="true" className="text-icon-tertiary flex">
                    <AllowanceMark allowance={allowance} />
                  </span>
                }
              >
                <span>
                  {ALLOWANCE_LABELS[allowance]}
                  {allowance === 'some' ? <Asterisk /> : null}
                </span>
              </LegendItem>
            ))}
          </ul>
          <p className="typography-caption-1-medium text-text-tertiary px-padding-p8 py-s3">
            <Asterisk />
            해당 번들에 참여한 경우에만 할 수 있어요.
          </p>
        </section>
        <div className="gap-s13 flex flex-col">
          {TABLES.map((table) => (
            <section key={table.title} className="gap-s7 flex flex-col">
              <h2 className="bg-surface-secondary rounded-r5 px-padding-p8 py-padding-p5 typography-body-2-semibold text-text-tertiary">
                {table.title}
              </h2>
              <div>
                <table className="w-full border-collapse">
                  <caption className="sr-only">{table.title} 역할별 권한</caption>
                  <thead>
                    <tr>
                      <th scope="col">
                        <span className="sr-only">권한</span>
                      </th>
                      {table.roles.map((role) => (
                        <th key={role} scope="col" className="px-s10 py-s2 w-14">
                          <span className="flex justify-center">
                            <RoleBadge memberRole={role} label={ROLE_LABELS[role]} />
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="typography-caption-1-medium">
                    {table.rows.map((row) => (
                      <tr key={row.label} className="border-border-tertiary border-b">
                        <th
                          scope="row"
                          className="px-padding-p8 py-s5 typography-caption-1-medium text-left"
                        >
                          {row.label}
                          {/* 「*」는 장식이라 각주 문장을 행 이름에 붙여 읽힘 */}
                          {row.noted ? (
                            <>
                              <Asterisk />
                              <span className="sr-only">({table.note})</span>
                            </>
                          ) : null}
                        </th>
                        {row.values.map((allowance, index) => (
                          <td key={table.roles[index]} className="px-s10 py-s5 text-icon-tertiary">
                            <span className="flex justify-center">
                              <AllowanceMark
                                allowance={allowance}
                                {...(allowance === 'some' ? { label: SOME_CELL_LABEL } : {})}
                              />
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="typography-caption-1-medium text-text-tertiary px-padding-p8 py-s3">
                  <Asterisk />
                  {table.note}
                </p>
              </div>
            </section>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
