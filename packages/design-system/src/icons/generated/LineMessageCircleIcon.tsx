// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineMessageCircleLargeIcon';
import Medium from './LineMessageCircleMediumIcon';
import Small from './LineMessageCircleSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineMessageCircleIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineMessageCircleIcon;
