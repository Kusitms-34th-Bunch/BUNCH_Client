// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './FillConfettiLargeIcon';
import Medium from './FillConfettiMediumIcon';
import Small from './FillConfettiSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const FillConfettiIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default FillConfettiIcon;
