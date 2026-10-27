// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineTrashcanLargeIcon';
import Medium from './LineTrashcanMediumIcon';
import Small from './LineTrashcanSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineTrashcanIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineTrashcanIcon;
