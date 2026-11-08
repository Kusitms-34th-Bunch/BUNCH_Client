// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineCornerDownRightLargeIcon';
import Medium from './LineCornerDownRightMediumIcon';
import Small from './LineCornerDownRightSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineCornerDownRightIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineCornerDownRightIcon;
