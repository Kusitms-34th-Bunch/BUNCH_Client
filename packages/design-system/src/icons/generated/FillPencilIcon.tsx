// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './FillPencilLargeIcon';
import Medium from './FillPencilMediumIcon';
import Small from './FillPencilSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const FillPencilIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default FillPencilIcon;
