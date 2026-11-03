import { memberHandlers } from './members';
import { sessionHandlers } from './session';

// 사진·번들·번치 홈은 각 연동 이슈에서 추가
export const handlers = [...sessionHandlers, ...memberHandlers];
