import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  PlaceSearch,
  type PlaceSearchProps,
  type PlaceSearchResult,
  type PlaceSearchStatus,
} from './PlaceSearch';

const meta = {
  title: 'Admin/Input/PlaceSearch',
  parameters: { layout: 'padded' },
  // Figma 폭 320px
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const RESULTS: PlaceSearchResult[] = [
  {
    id: 'a',
    name: '플로디스튜디오 연남점',
    category: '공방',
    address: '서울 마포구 연남로 12, 2층',
  },
  { id: 'b', name: '플로디스튜디오 성수점', category: '공방', address: '서울 성동구 서울숲2길 7' },
  {
    id: 'c',
    name: '플로디 세라믹',
    category: '도자기 공방',
    address: '경기 성남시 분당구 정자일로 95',
  },
];

const COPY = {
  label: '장소검색',
  required: true,
  placeholder: '장소명을 검색해주세요.',
  emptyDescription: '주소로 다시 검색하거나 직접 입력해 주세요',
  manualInput: { label: '직접 입력하기', onClick: () => {} },
  loadingLabel: '장소를 찾는 중',
  formatResultsLabel: (count: number) => `결과 ${count}건`,
} satisfies Partial<PlaceSearchProps>;

// 검색어에 따라 상태를 흉내 냄: 「없음」이 들어가면 결과 없음, 「로딩」이 들어가면 받는 중
const statusOf = (query: string): PlaceSearchStatus => {
  if (!query.trim()) return 'idle';
  if (query.includes('로딩')) return 'loading';
  if (query.includes('없음')) return 'empty';
  return 'results';
};

const Interactive = ({ initialSelected = false }: { initialSelected?: boolean }) => {
  const first = RESULTS[0] ?? null;
  const [selected, setSelected] = useState<PlaceSearchResult | null>(
    initialSelected ? first : null,
  );
  const [query, setQuery] = useState(initialSelected && first ? first.name : '');
  const status = statusOf(query);
  return (
    <PlaceSearch
      {...COPY}
      query={query}
      onQueryChange={setQuery}
      status={status}
      results={status === 'results' ? RESULTS : []}
      onSelect={setSelected}
      selected={selected}
      emptyTitle={`'${query}'에 대한 검색 결과가 없어요`}
    />
  );
};

/**
 * 입력칸 아래 패널 자리 하나에 내용이 바뀜: 입력하면 결과(Results), 고르면 장소 칸(Selected).
 * 「로딩」을 넣으면 받는 중, 「없음」을 넣으면 결과 없음. 장소 칸에서 「변경」을 누르거나 다시 입력하면 검색 패널로 돌아감
 */
export const Default: Story = { render: () => <Interactive /> };

/** Figma Selected: 고른 장소 칸과 「변경」(고른 뒤 다시 열린 상태) */
export const Selected: Story = { render: () => <Interactive initialSelected /> };

/** Figma Loading: 받는 중 스켈레톤(core Skeleton, 동작 줄이기면 깜빡임 멈춤) */
export const Loading: Story = {
  render: () => (
    <PlaceSearch
      {...COPY}
      query="플로디"
      onQueryChange={() => {}}
      status="loading"
      results={[]}
      onSelect={() => {}}
      emptyTitle=""
    />
  ),
};

/** Figma No Results: 안내와 「직접 입력하기」 */
export const Empty: Story = {
  render: () => (
    <PlaceSearch
      {...COPY}
      query="플로디"
      onQueryChange={() => {}}
      status="empty"
      results={[]}
      onSelect={() => {}}
      emptyTitle="'플로디'에 대한 검색 결과가 없어요"
    />
  ),
};

export const Disabled: Story = {
  render: () => (
    <PlaceSearch
      {...COPY}
      query=""
      onQueryChange={() => {}}
      status="idle"
      results={[]}
      onSelect={() => {}}
      emptyTitle=""
      disabled
    />
  ),
};
