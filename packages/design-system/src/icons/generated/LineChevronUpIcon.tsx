// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineChevronUpLargeIcon';
import Medium from './LineChevronUpMediumIcon';
import Small from './LineChevronUpSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineChevronUpIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineChevronUpIcon;
