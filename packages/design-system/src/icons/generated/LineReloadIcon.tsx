// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineReloadLargeIcon';
import Medium from './LineReloadMediumIcon';
import Small from './LineReloadSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineReloadIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineReloadIcon;
