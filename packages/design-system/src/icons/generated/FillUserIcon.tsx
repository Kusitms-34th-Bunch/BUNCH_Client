// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './FillUserLargeIcon';
import Medium from './FillUserMediumIcon';
import Small from './FillUserSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const FillUserIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default FillUserIcon;
