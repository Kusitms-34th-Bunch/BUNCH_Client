// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineSearchLargeIcon';
import Medium from './LineSearchMediumIcon';
import Small from './LineSearchSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineSearchIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineSearchIcon;
