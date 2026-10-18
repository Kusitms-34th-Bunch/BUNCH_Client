// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineBellLargeIcon';
import Medium from './LineBellMediumIcon';
import Small from './LineBellSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineBellIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineBellIcon;
