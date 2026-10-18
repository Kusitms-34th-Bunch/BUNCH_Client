// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './FillHomeLargeIcon';
import Medium from './FillHomeMediumIcon';
import Small from './FillHomeSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const FillHomeIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default FillHomeIcon;
