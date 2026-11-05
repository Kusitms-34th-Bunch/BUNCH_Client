// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineAlertLargeIcon';
import Medium from './LineAlertMediumIcon';
import Small from './LineAlertSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineAlertIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineAlertIcon;
