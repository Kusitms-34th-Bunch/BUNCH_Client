import type { ReplacePhotosOptions } from '../hooks/useDraftPhotoQueue';
import type { PresenceCommands } from '../hooks/usePresenceSender';
import type {
  Draft,
  DraftMember,
  DraftPhoto,
  DraftViewer,
  DraftVisibility,
  PlaceResult,
  SaveStatus,
} from './types';

export type DraftState =
  /** 삭제됐거나 없는 초안(deleted), 다른 멤버가 업로드한 초안(published) */
  | { kind: 'missing'; reason: 'deleted' | 'published'; publisherNickname?: string | undefined }
  | { kind: 'loading' }
  /** 오류 화면의 「다시 시도」: 실패한 요청만 다시 보냄 */
  | { kind: 'error'; retry: () => void }
  | {
      kind: 'ready';
      draft: Draft;
      viewer: DraftViewer;
      /** 번치 멤버 전체(참여하지 않은 멤버 포함) */
      bunchMembers: readonly DraftMember[];
      saveStatus: SaveStatus;
      /** 실시간 연결: 끊겨 편집을 막아야 하면 down, 「재시도」는 retry */
      realtime: { down: boolean; retry: () => void };
      /** 제목 문서를 불러와 입력할 수 있는지(불러오는 동안 제목 입력란은 읽기 전용) */
      titleReady: boolean;
      /** 제목 문서를 불러오지 못함: 연결 끊김과 같이 다뤄 배너를 보이고, 「재시도」(`retryTitle`)로 다시 불러옴 */
      titleFailed: boolean;
      retryTitle: () => void;
    };

/** 발행 시도 결과(화면은 성공일 때만 이동하고 나머지는 안내가 이미 나감) */
export type PublishOutcome = 'published' | 'blocked' | 'failed';

export type DraftActions = {
  setTitle: (_title: string) => void;
  /** 한글 조합 같은 입력 중에는 원격 제목 변경을 입력이 끝난 뒤 반영하도록 알림 */
  setTitleComposing: (_composing: boolean) => void;
  /** 입력·작업 중임을 다른 멤버에게 알림(제목·코멘트 입력, 날짜·사진 작업). 잠그지 않는 표시 */
  presence: PresenceCommands;
  setComment: (_memberId: string, _text: string) => void;
  /** 제목·코멘트 입력란을 벗어날 때: 입력이 1초 멈추기를 기다리지 않고 저장하지 못한 입력을 바로 저장(기능 spec 4.3.14) */
  saveNow: () => void;
  /** 공개 범위를 고름(서버에는 업로드 요청으로만 보냄). null은 고른 값을 버림(공개 범위 화면에서 뒤로 갈 때, 기능 spec 4.3.9) */
  setVisibility: (_visibility: DraftVisibility | null) => void;
  addLocation: (_place: PlaceResult) => void;
  /** 위치 줄을 눌러 다른 장소로 바꿈(줄 id와 자리는 그대로) */
  replaceLocation: (_locationId: string, _place: PlaceResult) => void;
  removeLocation: (_locationId: string) => void;
  /** 위치를 다른 자리로 옮김(햄버거를 잡고 끌어 순서 바꾸기, 자리는 0부터) */
  moveLocation: (_locationId: string, _toIndex: number) => void;
  setDate: (_date: string | null) => void;
  /** 번치 멤버를 참여 멤버 맨 아래에 더함(이미 참여 중이거나 번치 멤버가 아니면 무시). 연결이 끊겨 막히면 false(성공 안내를 띄우지 않음) */
  addMember: (_memberId: string) => boolean;
  /** 참여 멤버를 내보냄(그 멤버의 코멘트도 함께 삭제). 연결이 끊겨 막히면 false */
  removeMember: (_memberId: string) => boolean;
  /** 사진을 번들에서 뺌(1장이면 무시). 서버 반영은 후속이라 이 화면에서만 바뀜. 연결이 끊겨 막히면 false */
  removePhoto: (_photoId: string) => boolean;
  /** 사진을 다른 자리(0부터)로 옮김. 서버 반영은 후속이라 이 화면에서만 바뀜 */
  movePhoto: (_photoId: string, _toIndex: number) => void;
  /**
   * 사진을 끌기 시작하거나 놓았을 때: 끄는 동안 다른 멤버의 사진 변경 이벤트는 미뤘다가 놓은 뒤 반영(기능 spec 4.3.6)
   * 시작할 때 끌기 시작한 사진의 id를 주면, 놓은 뒤 그 사진이 다른 멤버에게 지워졌을 때(자리를 바꾸지 않고 놓은 경우 포함) 안내함
   */
  setPhotoDragging: (_dragging: boolean, _photoId?: string) => void;
  /**
   * 사진 추가 화면에서 적용한 결과로 사진 목록 전체를 바꿈. 연결이 끊겨 막히면 false
   * `partialAdd`는 추가만 할 때 정원(20장)이 남은 자리까지만 담고, 덜 담겼으면 담긴 장수를 안내함(갤러리에서 가져오기, 기능명세서 4.3.14)
   */
  replacePhotos: (_photos: readonly DraftPhoto[], _options?: ReplacePhotosOptions) => boolean;
  searchPlaces: (_keyword: string) => Promise<readonly PlaceResult[]>;
  /** 저장하지 못한 입력을 먼저 저장한 뒤 발행 */
  publish: () => Promise<PublishOutcome>;
};

// 연결 가드를 입히기 전의 동작: 결과를 알려 주는 동작도 여기서는 반환값이 없음
export type RawActions = Omit<
  DraftActions,
  'addMember' | 'removeMember' | 'removePhoto' | 'replacePhotos'
> & {
  addMember: (_memberId: string) => void;
  removeMember: (_memberId: string) => void;
  removePhoto: (_photoId: string) => void;
  replacePhotos: (_photos: readonly DraftPhoto[], _options?: ReplacePhotosOptions) => void;
};
