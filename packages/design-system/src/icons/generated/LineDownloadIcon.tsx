// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineDownloadLargeIcon';
import Medium from './LineDownloadMediumIcon';
import Small from './LineDownloadSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineDownloadIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineDownloadIcon;
