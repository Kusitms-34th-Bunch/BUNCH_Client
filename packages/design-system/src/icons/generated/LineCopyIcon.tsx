// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineCopyLargeIcon';
import Medium from './LineCopyMediumIcon';
import Small from './LineCopySmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineCopyIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineCopyIcon;
