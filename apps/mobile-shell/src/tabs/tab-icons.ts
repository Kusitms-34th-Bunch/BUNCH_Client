import type { TabId } from './tabs';

// Node 테스트가 읽는 tabs.ts와 분리(Metro가 이미지를 숫자 ID로 바꿔 Node에서 import 불가)
/** 탭 아이콘: 웹 막대와 같은 디자인 시스템 아이콘(Line·Fill, Large 24px)을 PNG로 옮긴 것. 색은 시스템 탭 바가 적용 */
export const TAB_ICONS: Record<TabId, { default: number; selected: number }> = {
  feed: {
    default: require('../../assets/tab-icons/line-home.png'),
    selected: require('../../assets/tab-icons/fill-home.png'),
  },
  photos: {
    default: require('../../assets/tab-icons/line-photo.png'),
    selected: require('../../assets/tab-icons/fill-photo.png'),
  },
  bunch: {
    default: require('../../assets/tab-icons/line-confetti.png'),
    selected: require('../../assets/tab-icons/fill-confetti.png'),
  },
  my: {
    default: require('../../assets/tab-icons/line-user.png'),
    selected: require('../../assets/tab-icons/fill-user.png'),
  },
};
