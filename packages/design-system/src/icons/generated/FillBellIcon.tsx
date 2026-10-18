// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './FillBellLargeIcon';
import Medium from './FillBellMediumIcon';
import Small from './FillBellSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const FillBellIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default FillBellIcon;
