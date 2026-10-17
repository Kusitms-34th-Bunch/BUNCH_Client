// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './FillCameraLargeIcon';
import Medium from './FillCameraMediumIcon';
import Small from './FillCameraSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const FillCameraIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default FillCameraIcon;
