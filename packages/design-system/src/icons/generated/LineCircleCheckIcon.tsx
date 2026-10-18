// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineCircleCheckLargeIcon';
import Medium from './LineCircleCheckMediumIcon';
import Small from './LineCircleCheckSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineCircleCheckIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineCircleCheckIcon;
