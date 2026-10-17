// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LinePencilLargeIcon';
import Medium from './LinePencilMediumIcon';
import Small from './LinePencilSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LinePencilIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LinePencilIcon;
