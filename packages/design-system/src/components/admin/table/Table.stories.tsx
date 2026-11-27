import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ReactNode, useState } from 'react';
import { ColorBadge, type ColorBadgeColor } from '../../core/colorBadge';
import { Table } from './Table';

const meta = {
  title: 'Admin/ListItem/Table',
  parameters: { layout: 'padded' },
  // Figma 표 폭 1096px
  decorators: [
    (Story) => (
      <div className="bg-surface-primary w-274">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// 칩 열 제목은 칩과 같은 폭 안에서 가운데(열 폭이 칩보다 넓어도 칩 위에 제목이 옴)
const ChipHeader = ({ width, children }: { width: string; children: ReactNode }) => (
  <span className={`inline-block text-center ${width}`}>{children}</span>
);

const Chip = ({
  width,
  color,
  children,
}: {
  width: string;
  color: ColorBadgeColor;
  children: ReactNode;
}) => (
  <ColorBadge variant="weak" color={color} className={width}>
    {children}
  </ColorBadge>
);

// 접수 일시: 날짜 36px · 시간 38px, 간격 6px(Figma Display Period)
const DateTime = ({ date, time }: { date: string; time: string }) => (
  <span className="gap-s3 flex whitespace-nowrap">
    <span className="w-9">{date}</span>
    <span>{time}</span>
  </span>
);

// 신고 수: 숫자 28px 오른쪽 정렬 + 「건」(Figma Count)
const Count = ({ value, alert = false }: { value: number; alert?: boolean | undefined }) => (
  <span className={`gap-s1 flex whitespace-nowrap ${alert ? 'text-system-fail-text' : ''}`}>
    <span className="typography-body-2-semibold w-7 text-end">{value}</span>
    <span className="typography-body-2-medium">건</span>
  </span>
);

// 화면설계서 「번치 스팟 관리」 표(node 8273:145344). 열 폭은 행 안 시작 위치 차이(간격 포함):
// 장소 300+20 · 위치 320+20 · 노출 기간 86+20 · 상태(칩 65 + 남는 폭) · 콕 28+20 · 숨김 28
const SPOT_COLUMNS = '320px 340px 106px 1fr 48px 28px';

const SPOTS: {
  id: string;
  name: string;
  summary: string;
  place: string;
  period?: [string, string];
  status: string;
  badge: ColorBadgeColor;
  pin: string;
  hide: string;
}[] = [
  {
    id: 'a',
    name: '플로디스튜디오',
    summary: '도자기 원데이 클래스',
    place: '서울숲역 도보 7분',
    period: ['11.10', '11.30'],
    status: '노출중',
    badge: 'brand',
    pin: '128',
    hide: '4',
  },
  {
    id: 'b',
    name: '한강 노을 피크닉존',
    summary: '여의도 피크닉 세트 대여',
    place: '여의나루역 도보 3분',
    period: ['11.10', '11.30'],
    status: '노출중',
    badge: 'brand',
    pin: '211',
    hide: '2',
  },
  {
    id: 'c',
    name: '오후의 조각',
    summary: '연남동 소규모 베이킹 클래스',
    place: '홍대입구역 도보 10분',
    period: ['11.05', '11.25'],
    status: '노출중',
    badge: 'brand',
    pin: '96',
    hide: '7',
  },
  {
    id: 'd',
    name: '모퉁이 서가',
    summary: '북카페・프라이빗 독서룸',
    place: '망원역 도보 5분',
    period: ['12.01', '12.31'],
    status: '노출 예정',
    badge: 'orange',
    pin: '100',
    hide: '100',
  },
  {
    id: 'e',
    name: '성수 보드게임 라운지',
    summary: '단체 보드게임 카페',
    place: '성수역 도보 4분',
    status: '임시 저장',
    badge: 'gray',
    pin: '-',
    hide: '-',
  },
  {
    id: 'f',
    name: '을지로 LP바',
    summary: '6인 프라이빗 룸',
    place: '을지로3가역 도보 2분',
    period: ['10.01', '10.31'],
    status: '종료',
    badge: 'gray',
    pin: '342',
    hide: '11',
  },
];

const SpotTable = () => {
  const [opened, setOpened] = useState<string>('');
  return (
    <Table.Root aria-label="번치 스팟 목록" columns={SPOT_COLUMNS} columnGap="none">
      <Table.Header>
        <Table.HeaderCell>장소</Table.HeaderCell>
        <Table.HeaderCell>위치</Table.HeaderCell>
        <Table.HeaderCell>노출 기간</Table.HeaderCell>
        <Table.HeaderCell>
          <ChipHeader width="w-16.25">상태</ChipHeader>
        </Table.HeaderCell>
        <Table.HeaderCell>콕</Table.HeaderCell>
        <Table.HeaderCell align="end">숨김</Table.HeaderCell>
      </Table.Header>
      <Table.Body>
        {SPOTS.map((spot) => (
          <Table.Row key={spot.id} selected={opened === spot.id}>
            <Table.Cell className="pe-s10">
              <Table.RowButton
                onClick={() => setOpened(spot.id)}
                className="gap-s4 flex items-center"
              >
                {/* 썸네일 자리(story는 이미지 대신 회색 칸) */}
                <span
                  aria-hidden="true"
                  className="bg-surface-secondary rounded-r2 size-12 shrink-0"
                />
                <span className="gap-s1 flex min-w-0 flex-col">
                  <span className="typography-body-1-semi-bold truncate">{spot.name}</span>
                  <span className="typography-body-4-regular text-text-tertiary truncate">
                    {spot.summary}
                  </span>
                </span>
              </Table.RowButton>
            </Table.Cell>
            <Table.Cell className="pe-s10 truncate">{spot.place}</Table.Cell>
            <Table.Cell className="gap-s2 typography-body-2-medium flex w-21.5 items-center justify-center whitespace-nowrap">
              {spot.period ? <span className="w-9">{spot.period[0]}</span> : null}
              <span className="typography-body-2-regular text-text-quaternary">-</span>
              {spot.period ? <span className="w-9">{spot.period[1]}</span> : null}
            </Table.Cell>
            <Table.Cell>
              <Chip width="w-16.25" color={spot.badge}>
                {spot.status}
              </Chip>
            </Table.Cell>
            <Table.Cell className="typography-body-2-medium">{spot.pin}</Table.Cell>
            <Table.Cell align="end" className="typography-body-2-medium">
              {spot.hide}
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
};

/** 화면설계서 「번치 스팟 관리」 표: 썸네일 행(위아래 6px), 누르면 그 행이 Selected(열린 상세) */
export const SpotList: Story = { render: () => <SpotTable /> };

// 화면설계서 「회원 조회 및 정지」 표(node 8273:147324). 열 폭(간격 포함):
// 접수 일시(84 + 남는 폭) · 닉네임 164+20 · 소속번치 179+20 · 가입 상태 52+110 · 신고 사유 179+20 · 신고 수 43+20 · 상태 52
const MEMBER_COLUMNS = '1fr 184px 199px 162px 199px 63px 52px';

const MEMBERS: {
  id: string;
  date: string;
  time: string;
  name: string;
  bunch: string;
  joined: { label: string; color: ColorBadgeColor };
  reason: string;
  count: number;
}[] = [
  {
    id: 'a',
    date: '11.01',
    time: '15:30',
    name: '빵돌이',
    bunch: '퇴근런클럽',
    joined: { label: '정상', color: 'brand' },
    reason: '스팸',
    count: 1,
  },
  {
    id: 'b',
    date: '10.31',
    time: '18:03',
    name: '하람',
    bunch: '-',
    joined: { label: '탈퇴', color: 'gray' },
    reason: '스팸',
    count: 2,
  },
  {
    id: 'c',
    date: '10.30',
    time: '13:30',
    name: '경진',
    bunch: '퇴근런클럽',
    joined: { label: '정상', color: 'brand' },
    reason: '괴롭힘・욕설',
    count: 2,
  },
  {
    id: 'd',
    date: '10.27',
    time: '11:20',
    name: '은우',
    bunch: '퇴근런클럽 외 1',
    joined: { label: '정상', color: 'brand' },
    reason: '개인정보 노출',
    count: 1,
  },
];

/** 화면설계서 「회원 조회 및 정지」 표: 글자만 있는 행(위아래 10px) */
export const MemberList: Story = {
  render: () => (
    <Table.Root aria-label="회원 신고 목록" columns={MEMBER_COLUMNS} columnGap="none">
      <Table.Header>
        <Table.HeaderCell>접수 일시</Table.HeaderCell>
        <Table.HeaderCell>닉네임</Table.HeaderCell>
        <Table.HeaderCell>소속번치</Table.HeaderCell>
        <Table.HeaderCell>
          <ChipHeader width="w-13">가입 상태</ChipHeader>
        </Table.HeaderCell>
        <Table.HeaderCell>신고 사유</Table.HeaderCell>
        <Table.HeaderCell>신고 수</Table.HeaderCell>
        <Table.HeaderCell>
          <ChipHeader width="w-13">상태</ChipHeader>
        </Table.HeaderCell>
      </Table.Header>
      <Table.Body>
        {MEMBERS.map((member) => (
          <Table.Row key={member.id} variant="text">
            <Table.Cell>
              <DateTime date={member.date} time={member.time} />
            </Table.Cell>
            <Table.Cell className="pe-s10">
              <Table.RowButton onClick={() => {}} className="typography-body-1-semi-bold truncate">
                {member.name}
              </Table.RowButton>
            </Table.Cell>
            <Table.Cell className="typography-body-2-medium pe-s10 truncate">
              {member.bunch}
            </Table.Cell>
            <Table.Cell>
              <Chip width="w-13" color={member.joined.color}>
                {member.joined.label}
              </Chip>
            </Table.Cell>
            <Table.Cell className="pe-s10 truncate">{member.reason}</Table.Cell>
            <Table.Cell>
              <Count value={member.count} />
            </Table.Cell>
            <Table.Cell>
              <Chip width="w-13" color="orange">
                접수
              </Chip>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  ),
};

// 화면설계서 「신고 조회 및 처리/접수」 표(node 8273:145491). 열 폭(간격 포함):
// 접수 일시 84+15 · 유형 48+15 · 신고 대상 미리보기 240+20 · 작성자 156+20 · 번치(156 + 남는 폭) · 신고 사유 148+20 · 신고 수 44+20 · 상태 52
const REPORT_COLUMNS = '99px 63px 260px 176px 1fr 168px 64px 52px';

const REPORTS: {
  id: string;
  date: string;
  time: string;
  type: string;
  preview: string;
  author: string;
  bunch: string;
  reason: string;
  count: number;
  alert?: boolean;
}[] = [
  {
    id: 'a',
    date: '11.01',
    time: '14:02',
    type: '댓글',
    preview: '"진짜 못생겼다ㅋㅋ 이런 걸 왜 올리냐"',
    author: '야르렁',
    bunch: '빵순이들',
    reason: '괴롭힘・욕설',
    count: 3,
    alert: true,
  },
  {
    id: 'b',
    date: '11.01',
    time: '11:40',
    type: '번들',
    preview: '「성수 빵지순례」 사진 12장',
    author: '-',
    bunch: '빵순이들',
    reason: '스팸',
    count: 3,
    alert: true,
  },
  {
    id: 'c',
    date: '10.31',
    time: '22:15',
    type: '번치',
    preview: '광고번치24-부업・재테크 DM 주세요',
    author: '-',
    bunch: '광고번치24',
    reason: '스팸',
    count: 2,
  },
  {
    id: 'd',
    date: '10.30',
    time: '13:12',
    type: '답글',
    preview: '"너네 번치 다 알바지?"',
    author: '경진',
    bunch: '퇴근런클럽',
    reason: '기타',
    count: 1,
  },
];

/** 화면설계서 「신고 조회 및 처리/접수」 표: 글자만 있는 행(위아래 10px), 신고 수가 많으면 빨간 글자 */
export const ReportList: Story = {
  render: () => (
    <Table.Root aria-label="신고 목록" columns={REPORT_COLUMNS} columnGap="none">
      <Table.Header>
        <Table.HeaderCell>접수 일시</Table.HeaderCell>
        <Table.HeaderCell>
          <ChipHeader width="w-12">유형</ChipHeader>
        </Table.HeaderCell>
        <Table.HeaderCell>신고 대상 미리보기</Table.HeaderCell>
        <Table.HeaderCell>작성자</Table.HeaderCell>
        <Table.HeaderCell>번치</Table.HeaderCell>
        <Table.HeaderCell>신고 사유</Table.HeaderCell>
        <Table.HeaderCell>신고 수</Table.HeaderCell>
        <Table.HeaderCell>
          <ChipHeader width="w-13">상태</ChipHeader>
        </Table.HeaderCell>
      </Table.Header>
      <Table.Body>
        {REPORTS.map((report) => (
          <Table.Row key={report.id} variant="text">
            <Table.Cell>
              <DateTime date={report.date} time={report.time} />
            </Table.Cell>
            <Table.Cell>
              <Chip width="w-12" color="gray">
                {report.type}
              </Chip>
            </Table.Cell>
            <Table.Cell className="pe-s10">
              <Table.RowButton onClick={() => {}} className="typography-body-1-medium truncate">
                {report.preview}
              </Table.RowButton>
            </Table.Cell>
            <Table.Cell className="typography-body-2-medium pe-s10 truncate">
              {report.author}
            </Table.Cell>
            <Table.Cell className="typography-body-2-medium pe-s10 truncate">
              {report.bunch}
            </Table.Cell>
            <Table.Cell className="pe-s10 truncate">{report.reason}</Table.Cell>
            <Table.Cell>
              <Count value={report.count} alert={report.alert} />
            </Table.Cell>
            <Table.Cell>
              <Chip width="w-13" color="orange">
                접수
              </Chip>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  ),
};

/** Figma Status 4상태: Disabled·Default·Selected(Hover는 마우스를 올려 확인) */
export const StatusMatrix: Story = {
  render: () => (
    <Table.Root aria-label="행 상태 예시" columns="1fr 120px">
      <Table.Header>
        <Table.HeaderCell>상태</Table.HeaderCell>
        <Table.HeaderCell align="end">값</Table.HeaderCell>
      </Table.Header>
      <Table.Body>
        {(['disabled', 'default', 'selected'] as const).map((state) => (
          <Table.Row
            key={state}
            variant="text"
            disabled={state === 'disabled'}
            selected={state === 'selected'}
          >
            <Table.Cell>
              <Table.RowButton onClick={() => {}}>{state}</Table.RowButton>
            </Table.Cell>
            <Table.Cell align="end">100</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  ),
};
