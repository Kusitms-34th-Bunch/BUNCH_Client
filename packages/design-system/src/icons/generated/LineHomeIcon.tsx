// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineHomeLargeIcon';
import Medium from './LineHomeMediumIcon';
import Small from './LineHomeSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineHomeIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineHomeIcon;
