// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineTransitionLeftLargeIcon';
import Medium from './LineTransitionLeftMediumIcon';
import Small from './LineTransitionLeftSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineTransitionLeftIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineTransitionLeftIcon;
