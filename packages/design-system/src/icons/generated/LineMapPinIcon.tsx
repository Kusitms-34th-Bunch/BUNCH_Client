// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineMapPinLargeIcon';
import Medium from './LineMapPinMediumIcon';
import Small from './LineMapPinSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineMapPinIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineMapPinIcon;
