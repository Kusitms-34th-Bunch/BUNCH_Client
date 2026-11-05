// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineDotsVerticalLargeIcon';
import Medium from './LineDotsVerticalMediumIcon';
import Small from './LineDotsVerticalSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineDotsVerticalIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineDotsVerticalIcon;
