// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineCameraLargeIcon';
import Medium from './LineCameraMediumIcon';
import Small from './LineCameraSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineCameraIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineCameraIcon;
