// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineUserLargeIcon';
import Medium from './LineUserMediumIcon';
import Small from './LineUserSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineUserIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineUserIcon;
