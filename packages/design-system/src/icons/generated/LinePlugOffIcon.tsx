// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LinePlugOffLargeIcon';
import Medium from './LinePlugOffMediumIcon';
import Small from './LinePlugOffSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LinePlugOffIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LinePlugOffIcon;
