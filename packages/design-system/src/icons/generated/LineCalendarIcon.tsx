// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineCalendarLargeIcon';
import Medium from './LineCalendarMediumIcon';
import Small from './LineCalendarSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineCalendarIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineCalendarIcon;
