// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineAddLargeIcon';
import Medium from './LineAddMediumIcon';
import Small from './LineAddSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineAddIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineAddIcon;
