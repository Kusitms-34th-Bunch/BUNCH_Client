// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './FillFlagLargeIcon';
import Medium from './FillFlagMediumIcon';
import Small from './FillFlagSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const FillFlagIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default FillFlagIcon;
