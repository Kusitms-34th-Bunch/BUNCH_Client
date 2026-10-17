// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineSettingLargeIcon';
import Medium from './LineSettingMediumIcon';
import Small from './LineSettingSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineSettingIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineSettingIcon;
