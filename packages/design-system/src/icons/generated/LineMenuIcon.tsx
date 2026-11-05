// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineMenuLargeIcon';
import Medium from './LineMenuMediumIcon';
import Small from './LineMenuSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineMenuIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineMenuIcon;
