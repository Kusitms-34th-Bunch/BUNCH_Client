// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineConfettiLargeIcon';
import Medium from './LineConfettiMediumIcon';
import Small from './LineConfettiSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineConfettiIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineConfettiIcon;
