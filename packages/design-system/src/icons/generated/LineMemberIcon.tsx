// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineMemberLargeIcon';
import Medium from './LineMemberMediumIcon';
import Small from './LineMemberSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineMemberIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineMemberIcon;
