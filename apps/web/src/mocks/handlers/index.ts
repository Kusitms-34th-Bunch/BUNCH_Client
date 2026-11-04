import { bundleLeaseHandlers } from './bundleLeases';
import { bundleHandlers } from './bundles';
import { memberHandlers } from './members';
import { photoHandlers } from './photos';
import { sessionHandlers } from './session';

// 번치 홈·번들 목록은 번치 홈 연동 이슈에서 추가
export const handlers = [
  ...sessionHandlers,
  ...memberHandlers,
  ...photoHandlers,
  ...bundleHandlers,
  ...bundleLeaseHandlers,
];
