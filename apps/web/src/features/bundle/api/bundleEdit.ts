import type { components } from '@app/api-core/generated';
import { bffApi } from '@/shared/api/bffApi';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import type { LocationInput } from '../lib/locationOps';
import type { BundleDetail } from '../model/bundle';
import { bundlePath, REQUEST_ID_HEADER, requestBundle, wireIdOrThrow } from './bundleRequest';
import { toWirePlace } from './locations';

type Schemas = components['schemas'];

/** 발행 번들 수정으로 보낼 최종 내용(사진은 남길 번들 사진 id 또는 사진함 원본 id 중 하나, 위치는 보낸 순서가 자리) */
export type PublishedEditInput = {
  /** 수정 화면을 연 때 받은 번들 revision(어긋나면 BUNDLE_003) */
  expectedRevision: number;
  title: string;
  /** 'YYYY-MM-DD', 없으면 null */
  date: string | null;
  photos: readonly ({ bundlePhotoId: string } | { photoId: string })[];
  locations: readonly LocationInput[];
};

/**
 * 발행 번들 수정: 메인 관리자가 최종 제목·날짜·사진 순서·위치를 한 번에 저장(원자적, 공개 범위·코멘트·참여 멤버는 바꾸지 않음)
 * requestId는 서버가 변경 이벤트의 상관 ID로만 쓰고 멱등 키가 아니므로, 호출부는 호출마다 새 ID를 씀
 * 낡은 revision은 같은 내용이어도 BUNDLE_003(detail에 현재 revision), 발행 전 초안은 BUNDLE_002, 권한이 없으면 AUTH_002
 */
export const editPublishedBundle = async (
  bunchId: string,
  bundleId: string,
  input: PublishedEditInput,
  requestId = createIdempotencyKey(),
): Promise<BundleDetail> =>
  await requestBundle(
    bffApi.put(`${bundlePath(bunchId, bundleId)}/published`, {
      headers: { [REQUEST_ID_HEADER]: requestId },
      json: {
        expectedRevision: input.expectedRevision,
        title: input.title,
        // 날짜 없음은 필드를 생략함(null을 보내지 않음)
        ...(input.date === null ? {} : { date: input.date }),
        photos: input.photos.map((photo) =>
          'bundlePhotoId' in photo
            ? { bundlePhotoId: wireIdOrThrow(photo.bundlePhotoId) }
            : { photoId: wireIdOrThrow(photo.photoId) },
        ),
        locations: input.locations.map((place, position) => ({
          ...toWirePlace(place),
          position,
        })),
        // 생성 타입은 주소를 문자열로만 적었지만 서버는 주소 없음을 null로 받음(명세)
      } satisfies Omit<Schemas['EditPublishedBundleRequest'], 'locations'> & {
        locations: (Omit<Schemas['BundleLocationInput'], 'address'> & { address: string | null })[];
      },
    }),
    'edit published bundle',
  );
