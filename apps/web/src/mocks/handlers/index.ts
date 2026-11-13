import { blockHandlers } from './blocks';
import { bunchHomeHandlers } from './bunchHome';
import { bunchOnboardingHandlers } from './bunchOnboarding';
import { bundleExitHandlers } from './bundleExit';
import { bundlePhotoHandlers } from './bundlePhotos';
import { bundleHandlers } from './bundles';
import { followHandlers } from './follows';
import { invitationHandlers } from './invitations';
import { memberHandlers } from './members';
import { membershipHandlers } from './memberships';
import { notificationHandlers } from './notifications';
import { photoHandlers } from './photos';
import { pushDeviceHandlers } from './pushDevices';
import { pushPreferenceHandlers } from './pushPreferences';
import { sessionHandlers } from './session';
import { termHandlers } from './terms';

export const handlers = [
  ...sessionHandlers,
  ...memberHandlers,
  ...pushPreferenceHandlers,
  ...pushDeviceHandlers,
  ...termHandlers,
  ...photoHandlers,
  ...bunchOnboardingHandlers,
  ...invitationHandlers,
  // 번들 목록·현황은 `/bundles/:id`보다 먼저 맞아야 해서(먼저 맞는 handler 사용) 번들 handler 앞에 둠
  ...bunchHomeHandlers,
  ...membershipHandlers,
  ...followHandlers,
  ...blockHandlers,
  ...notificationHandlers,
  ...bundleHandlers,
  ...bundleExitHandlers,
  ...bundlePhotoHandlers,
];
