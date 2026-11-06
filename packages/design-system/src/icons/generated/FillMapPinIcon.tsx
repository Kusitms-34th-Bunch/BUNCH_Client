// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './FillMapPinLargeIcon';
import Medium from './FillMapPinMediumIcon';
import Small from './FillMapPinSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const FillMapPinIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default FillMapPinIcon;
