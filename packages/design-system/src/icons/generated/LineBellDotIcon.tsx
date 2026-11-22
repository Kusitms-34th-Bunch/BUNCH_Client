// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineBellDotLargeIcon';
import Medium from './LineBellDotMediumIcon';
import Small from './LineBellDotSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineBellDotIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineBellDotIcon;
