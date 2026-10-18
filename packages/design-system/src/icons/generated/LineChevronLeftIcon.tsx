// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineChevronLeftLargeIcon';
import Medium from './LineChevronLeftMediumIcon';
import Small from './LineChevronLeftSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineChevronLeftIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineChevronLeftIcon;
