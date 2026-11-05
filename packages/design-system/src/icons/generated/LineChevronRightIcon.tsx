// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineChevronRightLargeIcon';
import Medium from './LineChevronRightMediumIcon';
import Small from './LineChevronRightSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineChevronRightIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineChevronRightIcon;
