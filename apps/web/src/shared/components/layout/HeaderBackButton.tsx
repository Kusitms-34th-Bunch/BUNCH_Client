import { LineChevronLeftLargeIcon } from '@app/design-system';
import { HeaderIconButton, type HeaderIconButtonProps } from './HeaderIconButton';

/** 헤더 왼쪽의 「뒤로 가기」(왼쪽 화살표). 이동·색·초점 ref는 화면이 정함 */
export function HeaderBackButton(props: Omit<HeaderIconButtonProps, 'label' | 'children'>) {
  return (
    <HeaderIconButton label="뒤로 가기" {...props}>
      <LineChevronLeftLargeIcon aria-hidden="true" />
    </HeaderIconButton>
  );
}
