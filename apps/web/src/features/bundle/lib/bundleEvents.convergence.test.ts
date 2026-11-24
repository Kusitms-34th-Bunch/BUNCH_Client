import { describe, expect, it } from 'vitest';
import { type BundleDetail, toDetailLocations } from '../model/bundle';
import { mergeFetchedDetail, routeBundleEvent } from './bundleEvents';
import { pickNewerDetail } from './draftMapping';

// 시드 고정 난수(mulberry32): 실패하면 같은 시드로 같은 순서를 다시 볼 수 있음
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
};

type ServerLocation = {
  id: number;
  provider: string;
  externalId: string;
  name: string;
  position: number;
};

// 가짜 서버: 저장마다 revision과 그 필드의 버전을 올림
type Server = {
  revision: number;
  date: string | null;
  dateVersion: number;
  locations: ServerLocation[];
  locationVersion: number;
};

const snapshot = (server: Server) =>
  ({
    revision: server.revision,
    status: 'DRAFT',
    title: '제목',
    titleVersion: 0,
    titleTooLong: false,
    date: server.date,
    dateVersion: server.dateVersion,
    dateChips: [],
    locations: toDetailLocations(server.locations),
    locationVersion: server.locationVersion,
    photos: [],
    comments: [],
    publishBlockers: [],
  }) as unknown as BundleDetail;

type Delivery =
  | { kind: 'event'; type: 'DATE' | 'LOCATION'; revision: number; data: unknown }
  | { kind: 'dateSaved'; detail: BundleDetail }
  | {
      kind: 'locationSaved';
      locations: BundleDetail['locations'];
      locationVersion: number;
    }
  | { kind: 'refetched'; detail: BundleDetail };

// 연산 열을 서버에서 실행하고 화면이 받을 것들(이벤트·내 저장 응답·중간 재조회)을 만듦
const runServer = (random: () => number, count: number) => {
  const server: Server = {
    revision: 0,
    date: null,
    dateVersion: 0,
    locations: [],
    locationVersion: 0,
  };
  const initial = snapshot(server);
  const events: Delivery[] = [];
  const others: Delivery[] = [];
  for (let step = 1; step <= count; step += 1) {
    const mine = random() < 0.5;
    server.revision += 1;
    if (random() < 0.5) {
      server.date = `2026-11-${String(step).padStart(2, '0')}`;
      server.dateVersion += 1;
      events.push({
        kind: 'event',
        type: 'DATE',
        revision: server.revision,
        data: { value: server.date, version: server.dateVersion, dateChips: [] },
      });
      if (mine) others.push({ kind: 'dateSaved', detail: snapshot(server) });
    } else {
      server.locations = [
        {
          id: step,
          provider: 'KAKAO',
          externalId: `place-${step}`,
          name: `장소 ${step}`,
          position: 0,
        },
      ];
      server.locationVersion += 1;
      events.push({
        kind: 'event',
        type: 'LOCATION',
        revision: server.revision,
        data: { locations: server.locations, version: server.locationVersion },
      });
      // 장소 응답은 목록과 버전만 줌(번들 revision 없음)
      if (mine)
        others.push({
          kind: 'locationSaved',
          locations: toDetailLocations(server.locations),
          locationVersion: server.locationVersion,
        });
    }
    // 이 시점에 시작한 재조회(늦게 도착할 수 있음)
    if (random() < 0.3) others.push({ kind: 'refetched', detail: snapshot(server) });
  }
  return { initial, events, others, final: snapshot(server) };
};

// 실시간 이벤트는 한 topic이라 보낸 순서대로 오고, 응답·재조회는 그 사이 어디에든 끼어듦
const interleave = (random: () => number, events: Delivery[], others: Delivery[]) => {
  const pool = [...others];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  const result: Delivery[] = [];
  let e = 0;
  let o = 0;
  while (e < events.length || o < pool.length) {
    const takeEvent = o >= pool.length || (e < events.length && random() < 0.5);
    result.push(takeEvent ? events[e++]! : pool[o++]!);
  }
  return result;
};

// 캐시 쓰기는 모두 상세 query의 구조 공유(mergeFetchedDetail)를 거침(setQueryData 포함)
// 범위: 병합·이벤트 판정·pickNewerDetail. 저장 응답을 쓰는 hook의 판정은 여기서 옮겨 적은 것이라 hook 회귀는 잡지 않음
const deliver = (cache: BundleDetail, delivery: Delivery): BundleDetail => {
  switch (delivery.kind) {
    case 'event': {
      const outcome = routeBundleEvent(cache, { ...delivery });
      // 다시 받기는 마지막 재조회가 맞춤
      return outcome.kind === 'apply' ? mergeFetchedDetail(cache, outcome.detail) : cache;
    }
    case 'dateSaved':
      // 자동 저장: 늦게 온 낡은 응답이 최신 기준을 덮지 않게 고른 뒤 씀
      return mergeFetchedDetail(cache, pickNewerDetail(cache, delivery.detail));
    case 'locationSaved':
      // 장소 대기열의 writeLocations
      return delivery.locationVersion >= cache.locationVersion
        ? mergeFetchedDetail(cache, {
            ...cache,
            locations: delivery.locations,
            locationVersion: delivery.locationVersion,
          })
        : cache;
    case 'refetched':
      return mergeFetchedDetail(cache, delivery.detail);
  }
};

describe('번들 상세 캐시의 순서 섞임 수렴', () => {
  it('이벤트·저장 응답·재조회가 어떤 순서로 와도 버전이 뒤로 가지 않고 마지막 재조회 뒤 서버와 같다', () => {
    for (let seed = 1; seed <= 300; seed += 1) {
      const random = seeded(seed);
      const { initial, events, others, final } = runServer(random, 12);
      let cache = initial;
      for (const delivery of interleave(random, events, others)) {
        const next = deliver(cache, delivery);
        const context = `seed ${seed}, ${delivery.kind}`;
        expect(next.revision, context).toBeGreaterThanOrEqual(cache.revision);
        expect(next.dateVersion, context).toBeGreaterThanOrEqual(cache.dateVersion);
        expect(next.locationVersion, context).toBeGreaterThanOrEqual(cache.locationVersion);
        cache = next;
      }

      expect(mergeFetchedDetail(cache, final), `seed ${seed}`).toEqual(final);
    }
  });
});
