import type { components } from '@app/api-core/generated';
import { type ApiContract, normalizeError } from '@app/api-core';
import { z } from 'zod';
import type { CharacterType } from '@/shared/lib/profile/bunchProfile';
import { checkBunchNameAvailability as checkSharedBunchName } from '@/shared/api/bunchNameAvailability';
import { bffApi, requestData } from '@/shared/api/client/bffApi';
import { IDEMPOTENCY_KEY_HEADER } from '@/shared/api/client/idempotencyKey';
import { toDomainId } from '@/shared/api/client/ids';
import { dataUrlToBlob } from '@/shared/lib/image/dataUrl';
import { isSafeImageUrl } from '@/shared/lib/image/safeImageUrl';
import type { Visibility } from '../contexts/createBunchDraftContext';

type Schemas = components['schemas'];

/** 번치 이름을 지금 쓸 수 있는지. 이름을 예약하지 않으므로 생성 때 서버가 다시 확인함(`BUNCH_001`) */
export const checkBunchNameAvailability = (name: string) => checkSharedBunchName(name);

/**
 * 번치 만들기 2단계 「다음」 전 한 줄 소개 사전 검사(`POST /bunches/introduction-validation`, 기능명세 2.2.6 로직 4)
 * 저장하지 않으며 통과하면 끝남. 금칙어는 400 `COMMON_003`(`detail.fields: ["introduction"]`), 그 밖의 실패도 `ApiError`로 던짐
 * 번치를 만들 때(2.2.10) 서버가 이름·소개를 다시 검사함
 */
export const validateBunchIntroduction = async (introduction: string): Promise<void> => {
  await requestData(
    bffApi.post('bunches/introduction-validation', {
      json: {
        introduction: introduction.trim(),
      } satisfies Schemas['ValidateBunchIntroductionRequest'],
    }),
    z.null().optional(),
    'validate bunch introduction',
  );
};

/** `POST /bunches`·`PUT·DELETE /bunches/{id}/profile-image` 응답 */
export const bunchSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  characterType: z.enum(['TYPE_1', 'TYPE_2', 'TYPE_3', 'TYPE_4']),
  imageUrl: z.string().nullish(),
}) satisfies z.ZodType<ApiContract<Schemas['BunchResponse']>>;

/** 화면이 쓰는 번치 모양. 사진이 없거나 안전하지 않은 주소면 `imageUrl`은 없음(기본 이미지를 보여 줌) */
export type CreatedBunch = {
  id: string;
  name: string;
  characterType: CharacterType;
  imageUrl?: string;
};

export const toCreatedBunch = (bunch: z.infer<typeof bunchSchema>): CreatedBunch => ({
  id: toDomainId(bunch.id),
  name: bunch.name,
  characterType: bunch.characterType,
  ...(bunch.imageUrl && isSafeImageUrl(bunch.imageUrl) ? { imageUrl: bunch.imageUrl } : {}),
});

const SERVER_VISIBILITY = { public: 'PUBLIC', private: 'PRIVATE' } as const satisfies Record<
  Visibility,
  Schemas['CreateBunchRequest']['visibility']
>;

export type CreateBunchInput = {
  name: string;
  visibility: Visibility;
  introduction: string;
  characterType: CharacterType;
};

/**
 * 번치 생성: 요청한 회원이 첫 OWNER가 됨(가입 완료 회원만, 소속은 최대 10개)
 * 같은 멱등 키·같은 입력의 재전송은 새로 만들지 않고 처음 만든 번치를 돌려줌, 같은 키에 다른 입력은 409(`REQUEST_001`)
 * 이름 중복은 409 `BUNCH_001`, 소속 한도는 409 `BUNCH_003`, 이름·소개 금칙어는 400 `COMMON_003`. 실패는 `ApiError`로 던짐
 */
export const createBunch = async (
  { name, visibility, introduction, characterType }: CreateBunchInput,
  idempotencyKey: string,
): Promise<CreatedBunch> =>
  toCreatedBunch(
    await requestData(
      bffApi.post('bunches', {
        headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
        json: {
          name: name.normalize('NFC').trim(),
          introduction: introduction.trim(),
          visibility: SERVER_VISIBILITY[visibility],
          characterType,
        } satisfies Schemas['CreateBunchRequest'],
      }),
      bunchSchema,
      'create bunch',
    ),
  );

/**
 * 번치 대표 사진 변경(OWNER만). 서버는 JPEG 정사각형(한 변 1024px 이하, 5MiB 이하)만 받음
 * 사진 조정 화면이 만든 JPEG data URL을 보냄. 사진 검증·저장 실패는 503 `IMAGE_001`, OWNER가 아니면 403 `AUTH_002`
 */
export const updateBunchProfileImage = async (
  bunchId: string,
  photo: string,
): Promise<CreatedBunch> => {
  try {
    const jpeg = dataUrlToBlob(photo);
    if (jpeg.type !== 'image/jpeg') throw new Error('JPEG 사진만 올릴 수 있습니다.');
    const body = new FormData();
    // 파일 이름이 있는 File로 보냄(서버가 업로드 파일로 인식)
    body.append('photo', new File([jpeg], 'bunch.jpg', { type: jpeg.type }));
    return toCreatedBunch(
      await requestData(
        bffApi.put(`bunches/${encodeURIComponent(bunchId)}/profile-image`, { body }),
        bunchSchema,
        'update bunch profile image',
      ),
    );
  } catch (error) {
    throw normalizeError(error);
  }
};

/** 번치 대표 사진을 기본 이미지로 되돌림(OWNER만). 이미 기본 이미지여도 성공 */
export const resetBunchProfileImage = async (bunchId: string): Promise<CreatedBunch> =>
  toCreatedBunch(
    await requestData(
      bffApi.delete(`bunches/${encodeURIComponent(bunchId)}/profile-image`),
      bunchSchema,
      'reset bunch profile image',
    ),
  );

// 초대 링크 발급은 번치 멤버 초대 화면도 써서 shared에 둠
export { type BunchInvitation, issueBunchInvitation } from '@/shared/api/bunchInvitation';
