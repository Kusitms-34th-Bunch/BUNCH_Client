import { normalizeError } from '@app/api-core';
import { z } from 'zod';
import { bffApi, requestData } from '@/shared/api/bffApi';
import { IDEMPOTENCY_KEY_HEADER } from '@/shared/api/idempotencyKey';
import { dataUrlToBlob } from '@/shared/lib/dataUrl';
import {
  bunchHomeResponseSchema,
  bunchProfileResponseSchema,
  draftBundlesPageSchema,
  myBunchesResponseSchema,
  publishedBundlesPageSchema,
} from '../model/bunchHome';

// 데이터 없는 성공 응답(Swagger `ApiResponseUnit`)은 data가 빠지거나 null
const unitSchema = z.null().optional();

// 번치 홈 「완성된 번들」·「작성 중인 번들」은 한 번에 받을 수 있는 최대 쪽 크기만 불러옴(더 불러오기는 UT 이후)
const PUBLISHED_PAGE_SIZE = 50;

const bunchPath = (bunchId: string) => `bunches/${encodeURIComponent(bunchId)}`;

/** 번치 홈 프로필·권한·개수. 내가 속하지 않은 번치는 `accessScope: EXTERNAL`(소속·개수 일부 null), 없는 번치는 404 */
export const getBunchHome = (bunchId: string, signal?: AbortSignal) =>
  requestData(
    bffApi.get(`${bunchPath(bunchId)}/home`, { signal: signal ?? null }),
    bunchHomeResponseSchema,
    'bunch home',
  );

/** 발행된 번들 첫 쪽(발행 최신순) */
export const getPublishedBundles = (bunchId: string, signal?: AbortSignal) =>
  requestData(
    bffApi.get(`${bunchPath(bunchId)}/published-bundles`, {
      searchParams: { page: 0, size: PUBLISHED_PAGE_SIZE },
      signal: signal ?? null,
    }),
    publishedBundlesPageSchema,
    'published bundles',
  );

/** 작성 중인 번들 첫 쪽(최근 수정순) */
export const getDraftBundles = (bunchId: string, signal?: AbortSignal) =>
  requestData(
    bffApi.get(`${bunchPath(bunchId)}/bundles`, {
      searchParams: { status: 'DRAFT', page: 0, size: PUBLISHED_PAGE_SIZE },
      signal: signal ?? null,
    }),
    draftBundlesPageSchema,
    'draft bundles',
  );

/** 내 소속 번치(번치 전환 목록)와 접근 불가 번치 안내 */
export const getMyBunches = (signal?: AbortSignal) =>
  requestData(
    bffApi.get('members/me/bunches', { signal: signal ?? null }),
    myBunchesResponseSchema,
    'my bunches',
  );

/** 번치 전환: 마지막 사용 번치로 저장(기본 번치가 이 번치로 바뀜). 내 번치가 아니면 AUTH_002 */
export const updateLastUsedBunch = async (bunchId: string) => {
  await requestData(bffApi.put(`${bunchPath(bunchId)}/last-used`), unitSchema, 'last used bunch');
};

/** 접근 불가 번치 안내 지우기(전환 목록의 「번치 목록에서 삭제」) */
export const deleteBunchAccessNotice = async (noticeId: string) => {
  await requestData(
    bffApi.delete(`members/me/bunch-access-notices/${encodeURIComponent(noticeId)}`),
    unitSchema,
    'delete bunch access notice',
  );
};

/** 대표 사진을 어떻게 할지: 그대로 · 새 사진(조정 화면의 정사각 JPEG data URL) · 기본 이미지 */
export type BunchProfileImageChange =
  | { action: 'KEEP' }
  | { action: 'REPLACE'; photo: string }
  | { action: 'RESET' };

export type UpdateBunchProfileInput = {
  name: string;
  introduction: string;
  isPrivate: boolean;
  image: BunchProfileImageChange;
  /** 편집을 시작할 때 받은 프로필 버전. 그 사이 다른 곳에서 바뀌었으면 서버가 거절함 */
  expectedProfileVersion: number;
};

/**
 * 번치 프로필 저장(메인 관리자): 이름·소개·공개 범위·대표 사진을 한 번에 저장(multipart `profile` JSON + 선택 `photo`)
 * 이름 중복은 409 `BUNCH_001`. 버전 충돌·권한 오류의 코드는 Swagger에 없어 화면은 그 밖의 실패를 하나로 다룸
 */
export const updateBunchProfile = async (
  bunchId: string,
  { name, introduction, isPrivate, image, expectedProfileVersion }: UpdateBunchProfileInput,
  idempotencyKey: string,
) => {
  try {
    const body = new FormData();
    // 서버는 profile 파트를 JSON으로 읽으므로 파트의 Content-Type을 application/json으로 보냄
    body.append(
      'profile',
      new Blob(
        [
          JSON.stringify({
            name: name.normalize('NFC').trim(),
            introduction: introduction.trim(),
            visibility: isPrivate ? 'PRIVATE' : 'PUBLIC',
            imageAction: image.action,
            expectedProfileVersion,
          }),
        ],
        { type: 'application/json' },
      ),
    );
    if (image.action === 'REPLACE') {
      const jpeg = dataUrlToBlob(image.photo);
      if (jpeg.type !== 'image/jpeg') throw new Error('JPEG 사진만 올릴 수 있습니다.');
      body.append('photo', new File([jpeg], 'bunch.jpg', { type: jpeg.type }));
    }
    return await requestData(
      bffApi.put(`${bunchPath(bunchId)}/profile`, {
        body,
        headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
      }),
      bunchProfileResponseSchema,
      'update bunch profile',
    );
  } catch (error) {
    throw normalizeError(error);
  }
};
