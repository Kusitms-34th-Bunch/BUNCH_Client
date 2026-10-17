// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineHeartLargeIcon';
import Medium from './LineHeartMediumIcon';
import Small from './LineHeartSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineHeartIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineHeartIcon;
