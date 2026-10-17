// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './FillHeartLargeIcon';
import Medium from './FillHeartMediumIcon';
import Small from './FillHeartSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const FillHeartIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default FillHeartIcon;
