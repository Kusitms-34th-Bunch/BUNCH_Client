// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './FillCircleCheckLargeIcon';
import Medium from './FillCircleCheckMediumIcon';
import Small from './FillCircleCheckSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const FillCircleCheckIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default FillCircleCheckIcon;
