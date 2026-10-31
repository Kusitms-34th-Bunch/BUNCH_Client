import type { Meta, StoryObj } from '@storybook/react-vite';
import { BundleTitle, type BundleTitleMember } from './BundleTitle';

/** 예시 프로필 사진(연한 하늘색 배경의 원) */
const SAMPLE_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="#d9ecf5"/><circle cx="24" cy="20" r="9" fill="#f4f8fb"/><ellipse cx="24" cy="44" rx="15" ry="12" fill="#f4f8fb"/></svg>',
)}`;

const NAMES = ['지예', '경진', '수인', '은우', '경준', '효찬', '도윤', '하준'];
const members = (count: number): BundleTitleMember[] =>
  NAMES.slice(0, count).map((name) => ({ name, src: SAMPLE_IMAGE }));

const meta = {
  title: 'Web/BundleTitle',
  component: BundleTitle,
  args: { title: '사진', required: true },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof BundleTitle>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Figma `BundleTitle`: 핀·제목·필수 별표 */
export const Default: Story = {};

/** Figma `Variant=Weak`: Regular 제목(자간 0) */
export const Weak: Story = { args: { variant: 'weak', required: false } };

/** 멤버 아바타가 오른쪽에 8px씩 겹쳐 놓임(Figma는 최대 8명) */
export const WithMembers: Story = { args: { members: members(8) } };

/** 아바타 한 명 */
export const OneMember: Story = { args: { members: members(1) } };

/** 8명을 넘으면 앞의 8명만 보임 */
export const MoreThanEight: Story = {
  args: { members: [...members(8), { name: '민재', src: SAMPLE_IMAGE }] },
};

const MATRIX_COUNTS = [0, 1, 3, 8] as const;
const MATRIX_FLAGS = [
  { icon: true, required: true },
  { icon: true, required: false },
  { icon: false, required: true },
  { icon: false, required: false },
] as const;

/** 핀 × 필수 표시 × 멤버 수(0·1·3·8명)를 한눈에 보기. 줄 높이는 모두 25px로 같음 */
export const Matrix: Story = {
  render: () => (
    <div className="gap-s8 flex flex-col">
      {MATRIX_FLAGS.map(({ icon, required }) => (
        <div key={`${icon}-${required}`} className="gap-s3 flex flex-col">
          <p className="typography-caption-1-medium text-text-tertiary">
            핀 {icon ? '있음' : '없음'} · 필수 {required ? '표시' : '없음'}
          </p>
          {MATRIX_COUNTS.map((count) => (
            <BundleTitle
              key={count}
              title="사진"
              icon={icon}
              required={required}
              members={members(count)}
            />
          ))}
        </div>
      ))}
    </div>
  ),
};

/** 핀 아이콘 없이, 필수 표시 없이 */
export const Plain: Story = { args: { icon: false, required: false } };

/** 긴 제목은 한 줄로 줄이고 아바타는 그대로 */
export const LongTitle: Story = {
  args: { title: '아주 긴 번들 항목 제목이 여기에 들어가는 경우', members: members(3) },
};
