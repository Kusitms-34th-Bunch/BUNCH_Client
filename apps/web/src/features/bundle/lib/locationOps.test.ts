import { describe, expect, it } from 'vitest';
import { fixtureLocation } from '../fixtures/draft.fixture';
import {
  applyLocationOp,
  applyLocationOps,
  isPendingLocation,
  locationKey,
  neighborsAfterMove,
  type LocationInput,
} from './locationOps';

const a = fixtureLocation('1', '장소 A');
const b = fixtureLocation('2', '장소 B');
const c = fixtureLocation('3', '장소 C');

const input = (key: string, name = `장소 ${key}`): LocationInput => ({
  provider: 'test',
  externalId: key,
  name,
  address: null,
});

describe('applyLocationOp', () => {
  it('add는 맨 끝에 서버 id가 없는 줄을 더한다', () => {
    const next = applyLocationOp([a], { no: 7, kind: 'add', place: input('x') });

    expect(next.map((location) => location.name)).toEqual(['장소 A', '장소 x']);
    expect(next[1]?.id).toBe('pending:7');
    expect(isPendingLocation(next[1]!)).toBe(true);
    expect(isPendingLocation(a)).toBe(false);
  });

  it('검색 결과처럼 id가 든 객체를 넘겨도 임시 줄 id를 덮지 않는다', () => {
    // 화면은 검색 결과(PlaceResult, id: 'kakao:123')를 그대로 넘김
    const place = { ...input('x'), id: 'kakao:123' } as LocationInput;

    const next = applyLocationOp([a], { no: 3, kind: 'add', place });

    expect(next[1]?.id).toBe('pending:3');
    expect(isPendingLocation(next[1]!)).toBe(true);
    expect(next[1]).not.toHaveProperty('address', undefined);
  });

  it('replace도 검색 결과의 id로 줄 id를 바꾸지 않는다', () => {
    const place = { ...input('x', '새 장소'), id: 'kakao:123' } as LocationInput;

    const next = applyLocationOp([a, b], { no: 1, kind: 'replace', targetId: '1', place });

    expect(next.map((location) => location.id)).toEqual(['1', '2']);
    expect(next[0]?.name).toBe('새 장소');
  });

  it('add는 같은 장소가 있거나 3개가 차 있으면 목록을 바꾸지 않는다', () => {
    expect(applyLocationOp([a], { no: 1, kind: 'add', place: input('1') })).toEqual([a]);
    expect(applyLocationOp([a, b, c], { no: 1, kind: 'add', place: input('x') })).toEqual([
      a,
      b,
      c,
    ]);
  });

  it('replace는 줄 id와 자리를 지킨 채 장소만 바꾼다', () => {
    const next = applyLocationOp([a, b], {
      no: 1,
      kind: 'replace',
      targetId: '1',
      place: input('x', '새 장소'),
    });

    expect(next.map((location) => [location.id, location.name])).toEqual([
      ['1', '새 장소'],
      ['2', '장소 B'],
    ]);
    expect(next[0]?.externalId).toBe('x');
  });

  it('replace는 다른 줄과 같은 장소로 바꾸려 하면 바꾸지 않는다', () => {
    const next = applyLocationOp([a, b], {
      no: 1,
      kind: 'replace',
      targetId: '1',
      place: input('2'),
    });

    expect(next).toEqual([a, b]);
  });

  it('replace는 이미 지워진 줄이면 정원이 남을 때 맨 끝에 새로 더하고 3개면 그대로 둔다', () => {
    const op = { no: 5, kind: 'replace', targetId: '9', place: input('x') } as const;

    expect(applyLocationOp([a], op).map((location) => location.id)).toEqual(['1', 'pending:5']);
    expect(applyLocationOp([a, b, c], op)).toEqual([a, b, c]);
  });

  it('remove는 그 줄을 빼고, 이미 없으면 그대로다', () => {
    expect(applyLocationOp([a, b], { no: 1, kind: 'remove', targetId: '1' })).toEqual([b]);
    expect(applyLocationOp([a, b], { no: 1, kind: 'remove', targetId: '9' })).toEqual([a, b]);
  });

  it('move는 그 줄을 다른 자리로 옮긴다', () => {
    const next = applyLocationOp([a, b, c], {
      no: 1,
      kind: 'move',
      targetId: '3',
      toIndex: 0,
      previous: null,
      next: { id: '1', key: locationKey(a) },
    });

    expect(next.map((location) => location.id)).toEqual(['3', '1', '2']);
  });
});

describe('applyLocationOps', () => {
  it('서버 목록 위에 응답을 기다리는 변경을 순서대로 얹는다', () => {
    const next = applyLocationOps(
      [a, b],
      [
        { no: 1, kind: 'remove', targetId: '1' },
        { no: 2, kind: 'add', place: input('x') },
      ],
    );

    expect(next.map((location) => location.name)).toEqual(['장소 B', '장소 x']);
  });

  it('서버 목록이 같은 결과로 바뀐 뒤에 한 번 더 얹어도 줄이 겹치지 않는다(멱등)', () => {
    const ops = [
      { no: 1, kind: 'add', place: input('x') },
      { no: 2, kind: 'remove', targetId: '2' },
    ] as const;
    // 서버가 이미 두 변경을 반영한 목록
    const server = [a, { ...fixtureLocation('9', '장소 x'), externalId: 'x' }];

    expect(applyLocationOps(server, ops).map((location) => location.name)).toEqual([
      '장소 A',
      '장소 x',
    ]);
  });
});

describe('neighborsAfterMove', () => {
  it('옮긴 뒤의 앞·뒤 이웃을 서버 id와 키로 돌려준다', () => {
    const { previous, next } = neighborsAfterMove([a, b, c], '3', 1);

    expect(previous).toEqual({ id: '1', key: locationKey(a) });
    expect(next).toEqual({ id: '2', key: locationKey(b) });
  });

  it('맨 앞·맨 뒤로 옮기면 그쪽 이웃은 null이다', () => {
    expect(neighborsAfterMove([a, b, c], '3', 0)).toMatchObject({ previous: null });
    expect(neighborsAfterMove([a, b, c], '1', 2)).toMatchObject({ next: null });
  });

  it('서버 id가 아직 없는 이웃은 id 없이 키만 담는다', () => {
    const pending = { ...fixtureLocation('pending:4', '막 더한 장소'), externalId: 'x' };

    const { next } = neighborsAfterMove([a, pending], '1', 0);

    expect(next).toEqual({ id: null, key: locationKey(pending) });
  });
});
