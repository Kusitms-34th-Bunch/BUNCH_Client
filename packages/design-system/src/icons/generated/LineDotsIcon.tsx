// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineDotsLargeIcon';
import Medium from './LineDotsMediumIcon';
import Small from './LineDotsSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineDotsIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineDotsIcon;
