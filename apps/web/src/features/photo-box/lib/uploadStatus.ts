import { summarizeUpload, uploadResultMessage, type UploadOutcome } from './photoUpload';

/**
 * 사진함 업로드 상태 줄의 시간(Figma 「Upload Status 애니메이션 스펙」 `7724:48227`)
 * 진행 바 채움 → 기존 문구 나감 → 새 문구 들어옴 → 완료 유지 → 접힘 순서로 겹치지 않게 이어 재생함
 * 스펙의 채움 전 대기(450ms)는 프로토타입이 50%에서 시작하는 시연용이라 넣지 않음. 진행 바는 사진을 받을 때와 결과가 나올 때마다 `fill` 동안 채워지고, 마지막 사진이 끝나면 그 채움이 끝난 뒤부터 이어 감
 */
export const UPLOAD_STATUS_TIMING = {
  fill: 900,
  outDelay: 250,
  out: 320,
  in: 420,
  hold: 5000,
  collapse: 380,
} as const;

/** 스펙의 곡선 */
export const UPLOAD_STATUS_EASING = {
  fill: 'cubic-bezier(0.4, 0, 0.2, 1)',
  out: 'cubic-bezier(0.4, 0, 1, 1)',
  in: 'cubic-bezier(0.2, 0, 0, 1)',
  collapse: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

const t = UPLOAD_STATUS_TIMING;
/** 완료 시점부터 문구가 나가기 시작할 때까지 */
export const UPLOAD_STATUS_OUT_AT = t.fill + t.outDelay;
/** 완료 시점부터 새 문구가 들어오기 시작할 때까지 */
export const UPLOAD_STATUS_IN_AT = UPLOAD_STATUS_OUT_AT + t.out;
/** 완료 시점부터 접히기 시작할 때까지 */
export const UPLOAD_STATUS_COLLAPSE_AT = UPLOAD_STATUS_IN_AT + t.in + t.hold;
/** 완료 시점부터 상태를 지울 때까지(접힘이 끝난 뒤) */
const UPLOAD_STATUS_REMOVE_AT = UPLOAD_STATUS_COLLAPSE_AT + t.collapse;

export type UploadStatus =
  | {
      phase: 'uploading';
      /** 새 줄마다 바뀌는 번호. 완료 문구 중 새로 올리면 화면이 진행 바를 처음부터 다시 그리는 기준 */
      id: number;
      /** 올리는 사진 수(겹친 묶음은 합침) */
      total: number;
      /** 결과가 나온 사진 수(성공·실패·중복 모두) */
      done: number;
      /**
       * 진행 바 칸 수(전체는 `total * 2`). 사진 한 장을 쉘에서 받으면 1칸, 결과가 나오면 1칸
       * 받지 못한 사진(읽기 실패·한도로 건너뜀)은 결과가 나올 때 2칸. 첫 사진을 받는 순간부터 막대가 움직이게 함
       */
      steps: number;
      /**
       * 진행 바 비율(0~1). 앞으로만 감: 올리는 중에 같은 번치에 더 올려 전체 장수가 늘어도 줄지 않고, 실제 진행이 따라잡을 때까지 멈춤
       */
      progress: number;
      /** 고른 사진 중 처음 읽은 사진의 이미지 주소(아직 없으면 빈 칸) */
      thumbnailUrl: string | undefined;
    }
  | {
      phase: 'complete';
      id: number;
      total: number;
      done: number;
      steps: number;
      progress: number;
      thumbnailUrl: string | undefined;
      /** 결과 문구(기존 결과 토스트 문구 그대로) */
      message: string;
      /** 한 장이라도 추가됐을 때 붙는 둘째 줄 「번들을 업로드해보세요.」 */
      withBundleHint: boolean;
      /**
       * 결과가 처음 화면에 보인 시각(`Date.now`). 이때부터 5초 유지 뒤 접고 지움
       * 끝났을 때 이 번치의 사진함이 보이지 않았으면(다른 탭·사진 상세) undefined로 두고, 사진함이 보이는 순간 정함
       */
      shownAt: number | undefined;
    };

type Entry = {
  status: UploadStatus;
  /** 아직 끝나지 않은 묶음 수 */
  running: number;
  outcomes: UploadOutcome[];
  removeTimer: ReturnType<typeof setTimeout> | undefined;
};

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();
// 번치별로 상태 줄을 보고 있는 화면 수(사진함이 준비 상태로 그 번치를 보일 때만 셈)
const watchers = new Map<string, number>();
let snapshot: Readonly<Record<string, UploadStatus>> = {};
let nextId = 1;
const EMPTY: Readonly<Record<string, UploadStatus>> = {};

const emit = () => {
  snapshot = Object.fromEntries([...entries].map(([bunchId, entry]) => [bunchId, entry.status]));
  for (const listener of listeners) listener();
};

// 페이지가 화면에 보이는지. 앱은 탭마다 WebView가 따로라 다른 탭에 가 있으면 사진함 WebView가 숨음
export const isPageVisible = () =>
  typeof document === 'undefined' || document.visibilityState !== 'hidden';

// 칸 수로 비율을 다시 계산하되 이전 값보다 작아지지 않게 함
const withProgress = <Status extends { total: number; steps: number; progress: number }>(
  status: Status,
): Status => ({
  ...status,
  progress: Math.max(
    status.progress,
    status.total > 0 ? Math.min(1, status.steps / (status.total * 2)) : 0,
  ),
});

const remove = (bunchId: string) => {
  const entry = entries.get(bunchId);
  if (!entry) return;
  clearTimeout(entry.removeTimer);
  if (entry.status.thumbnailUrl) URL.revokeObjectURL(entry.status.thumbnailUrl);
  entries.delete(bunchId);
};

const scheduleRemove = (bunchId: string, entry: Entry) => {
  clearTimeout(entry.removeTimer);
  entry.removeTimer = setTimeout(() => {
    remove(bunchId);
    emit();
  }, UPLOAD_STATUS_REMOVE_AT);
};

/**
 * 번치별 사진함 업로드 상태(올리는 중·완료)를 화면 밖에 둠
 * 올리는 중에 다른 탭에 다녀와도 진행 상태가 남고, 결과는 사진함이 보일 때부터 5초 유지한 뒤 지워짐(그 전까지는 들고 기다림)
 * 올리는 중에 같은 번치에 또 올리면 한 줄로 합쳐 장수를 더하고, 모든 묶음이 끝나면 합친 결과를 보임
 */
export const uploadStatusStore = {
  getSnapshot: () => snapshot,
  /** 서버 렌더에는 올리는 중인 사진이 없음 */
  getServerSnapshot: () => EMPTY,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** 이 번치의 상태 줄을 보이는 화면이 있다고 등록함. 돌려준 함수로 해제 */
  watch: (bunchId: string) => {
    watchers.set(bunchId, (watchers.get(bunchId) ?? 0) + 1);
    // 같은 해제 함수를 여러 번 불러도 한 번만 빼서 다른 화면의 등록을 지우지 않음
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const count = (watchers.get(bunchId) ?? 0) - 1;
      if (count > 0) watchers.set(bunchId, count);
      else watchers.delete(bunchId);
    };
  },
  /** 이 번치의 상태 줄을 보이는 화면이 있는지. 없으면(다른 번치·사진 상세·오류 화면) 결과를 토스트로 대신 알림 */
  isWatched: (bunchId: string) => (watchers.get(bunchId) ?? 0) > 0,
  /** 묶음 하나를 시작함. 완료 문구가 떠 있는 동안 새로 올리면 새 줄로 다시 시작함 */
  begin: (bunchId: string, count: number) => {
    const entry = entries.get(bunchId);
    if (entry && entry.status.phase === 'uploading') {
      entry.running += 1;
      entry.status = withProgress({ ...entry.status, total: entry.status.total + count });
    } else {
      remove(bunchId);
      entries.set(bunchId, {
        status: {
          phase: 'uploading',
          id: nextId++,
          total: count,
          done: 0,
          steps: 0,
          progress: 0,
          thumbnailUrl: undefined,
        },
        running: 1,
        outcomes: [],
        removeTimer: undefined,
      });
    }
    emit();
  },
  /** 썸네일이 아직 없을 때만 이 이미지로 정함(다시 시도처럼 받기 단계가 없을 때) */
  setThumbnail: (bunchId: string, image: Blob) => {
    const entry = entries.get(bunchId);
    if (!entry || entry.status.thumbnailUrl) return;
    entry.status = { ...entry.status, thumbnailUrl: URL.createObjectURL(image) };
    emit();
  },
  /** 사진 한 장을 쉘에서 받음(진행 1칸). 썸네일이 아직 없으면 이 이미지로 정함 */
  markRead: (bunchId: string, image: Blob) => {
    const entry = entries.get(bunchId);
    if (!entry || entry.status.phase !== 'uploading') return;
    entry.status = withProgress({
      ...entry.status,
      steps: entry.status.steps + 1,
      thumbnailUrl: entry.status.thumbnailUrl ?? URL.createObjectURL(image),
    });
    emit();
  },
  /** 사진 한 장의 결과가 나옴. `read`면 받을 때 센 칸을 빼고 1칸, 아니면 2칸 */
  advance: (bunchId: string, outcome: UploadOutcome, read: boolean) => {
    const entry = entries.get(bunchId);
    if (!entry || entry.status.phase !== 'uploading') return;
    entry.outcomes.push(outcome);
    entry.status = withProgress({
      ...entry.status,
      done: entry.status.done + 1,
      steps: entry.status.steps + (read ? 1 : 2),
    });
    emit();
  },
  /** 묶음 하나가 끝남. 모든 묶음이 끝나면 결과를 보이고 접힘이 끝날 때 지움(알릴 결과가 없으면 바로 지움) */
  end: (bunchId: string) => {
    const entry = entries.get(bunchId);
    if (!entry || entry.status.phase !== 'uploading') return;
    entry.running -= 1;
    if (entry.running > 0) return;
    const summary = summarizeUpload(entry.outcomes);
    const message = uploadResultMessage(summary);
    if (message === null) {
      remove(bunchId);
      emit();
      return;
    }
    entry.status = {
      ...entry.status,
      phase: 'complete',
      message,
      // 한 장이라도 추가됐으면 실패·중복이 섞여도 번들 안내를 붙임(사용자 결정)
      withBundleHint: summary.added > 0,
      shownAt: undefined,
    };
    // 지금 이 번치의 사진함이 보이면 바로 유지 시간을 시작하고, 아니면 보일 때(`markShown`)까지 기다림
    if (watchers.has(bunchId) && isPageVisible()) {
      entry.status = { ...entry.status, shownAt: Date.now() };
      scheduleRemove(bunchId, entry);
    }
    emit();
  },
  /** 결과가 화면에 보였음(사진함으로 돌아옴·대신 띄운 토스트). 처음 한 번만 유지 시간을 시작함 */
  markShown: (bunchId: string) => {
    const entry = entries.get(bunchId);
    if (!entry || entry.status.phase !== 'complete' || entry.status.shownAt !== undefined) return;
    entry.status = { ...entry.status, shownAt: Date.now() };
    scheduleRemove(bunchId, entry);
    emit();
  },
  /** 테스트 사이에 상태가 새지 않도록 비움 */
  reset: () => {
    for (const bunchId of [...entries.keys()]) remove(bunchId);
    watchers.clear();
    emit();
  },
};
