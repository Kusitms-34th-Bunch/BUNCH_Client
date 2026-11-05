// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineChevronDownLargeIcon';
import Medium from './LineChevronDownMediumIcon';
import Small from './LineChevronDownSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineChevronDownIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineChevronDownIcon;
