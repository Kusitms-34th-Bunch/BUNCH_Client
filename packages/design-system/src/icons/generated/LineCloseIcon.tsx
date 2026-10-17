// @generated — run `yarn icons:build` to update
import type { IconProps } from '../types';
import Large from './LineCloseLargeIcon';
import Medium from './LineCloseMediumIcon';
import Small from './LineCloseSmallIcon';

const SIZES = { sm: Small, md: Medium, lg: Large };
const LineCloseIcon = ({ size = 'md', ...props }: IconProps) => {
  const Icon = SIZES[size];
  return <Icon {...props} />;
};
export default LineCloseIcon;
