// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineHandClickLargeIcon';
import Medium from './LineHandClickMediumIcon';
import Small from './LineHandClickSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineHandClickIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineHandClickIcon;
