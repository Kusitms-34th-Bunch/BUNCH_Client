import { bunchHomeHandlers } from './bunchHome';
import { bundleExitHandlers } from './bundleExit';
import { bundleLeaseHandlers } from './bundleLeases';
import { bundlePhotoHandlers } from './bundlePhotos';
import { bundleHandlers } from './bundles';
import { memberHandlers } from './members';
import { photoHandlers } from './photos';
import { sessionHandlers } from './session';

export const handlers = [
  ...sessionHandlers,
  ...memberHandlers,
  ...photoHandlers,
  // 번들 목록·현황은 `/bundles/:id`보다 먼저 맞아야 해서(먼저 맞는 handler 사용) 번들 handler 앞에 둠
  ...bunchHomeHandlers,
  ...bundleHandlers,
  ...bundleLeaseHandlers,
  ...bundleExitHandlers,
  ...bundlePhotoHandlers,
];
