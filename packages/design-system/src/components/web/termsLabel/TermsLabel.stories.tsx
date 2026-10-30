import type { Meta, StoryObj } from '@storybook/react-vite';
import { TermsLabel } from './TermsLabel';

const meta = {
  title: 'Web/TermsLabel',
  component: TermsLabel,
  args: { tag: '[필수]', children: '서비스 이용 약관', onViewTerms: () => {} },
  decorators: [
    (Story) => (
      <div className="w-85.75">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TermsLabel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Checked: Story = { args: { defaultChecked: true } };

export const WithoutViewButton: Story = {
  render: (args) => <TermsLabel {...args} onViewTerms={undefined} />,
};

export const List: Story = {
  render: () => (
    <div className="space-y-s4">
      <TermsLabel tag="[필수]" defaultChecked onViewTerms={() => {}}>
        서비스 이용 약관
      </TermsLabel>
      <TermsLabel tag="[필수]" onViewTerms={() => {}}>
        개인정보 수집 및 이용 동의
      </TermsLabel>
      <TermsLabel tag="[선택]">마케팅 정보 수신 동의</TermsLabel>
    </div>
  ),
};

export const LongLabel: Story = {
  args: {
    children: '아주 긴 약관 이름이 들어와도 줄바꿈되어 모두 보이고 버튼이 밀려나지 않아야 합니다',
  },
};
