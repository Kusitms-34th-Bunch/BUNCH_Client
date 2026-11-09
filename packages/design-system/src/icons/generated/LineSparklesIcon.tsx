// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineSparklesLargeIcon';
import Medium from './LineSparklesMediumIcon';
import Small from './LineSparklesSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineSparklesIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineSparklesIcon;
