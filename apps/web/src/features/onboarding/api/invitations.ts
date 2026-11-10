import type { ApiContract } from '@app/api-core';
import type { components } from '@app/api-core/generated';
import { z } from 'zod';
import { bffApi, requestData } from '@/shared/api/bffApi';
import { IDEMPOTENCY_KEY_HEADER } from '@/shared/api/idempotencyKey';
import { isSafeImageUrl } from '@/shared/lib/safeImageUrl';
import { bunchSchema, toCreatedBunch, type CreatedBunch } from './bunches';

type Schemas = components['schemas'];

/** 초대 확인 응답의 공개 초대 카드. 번치 내부 정보(멤버 수·번들 등)는 서버가 주지 않음 */
const cardSchema = z.object({
  name: z.string(),
  introduction: z.string(),
  imageUrl: z.string().nullish(),
  inviterNickname: z.string().nullish(),
  code: z.string(),
}) satisfies z.ZodType<ApiContract<Schemas['InvitationCard']>>;

const verifySchema = z.object({
  card: cardSchema,
  eligibility: z.enum(['AVAILABLE', 'ALREADY_MEMBER', 'FULL', 'LIMIT_EXCEEDED']),
});

export type InvitationEligibility = z.infer<typeof verifySchema>['eligibility'];

/** 화면용 초대 카드. 비어 있는 소개·초대한 사람·안전하지 않은 사진 주소는 없는 값으로 둠(소개·From 줄을 숨기고 기본 이미지를 보여 줌) */
export type InvitationCard = {
  name: string;
  introduction?: string;
  inviterNickname?: string;
  imageUrl?: string;
};

export type VerifiedInvitation = { card: InvitationCard; eligibility: InvitationEligibility };

/**
 * 초대 확인: 참여하지 않고 카드와 참여 가능 여부만 돌려줌(`POST /invitations/verify`)
 * `invitation`은 초대 링크 URL·토큰·8자리 보조 코드 중 하나이고 코드는 서버가 trim·대문자로 맞춤
 * 없거나 만료·폐기된 초대는 404 `INVITE_001`(구분하지 않음), 무효 입력이 반복되면 429 `REQUEST_002`. 실패는 `ApiError`로 던짐
 */
export const verifyInvitation = async (invitation: string): Promise<VerifiedInvitation> => {
  const { card, eligibility } = await requestData(
    bffApi.post('invitations/verify', {
      json: { invitation } satisfies Schemas['InvitationRequest'],
    }),
    verifySchema,
    'verify invitation',
  );
  return {
    eligibility,
    card: {
      name: card.name,
      ...(card.introduction.trim() ? { introduction: card.introduction } : {}),
      ...(card.inviterNickname?.trim() ? { inviterNickname: card.inviterNickname } : {}),
      ...(card.imageUrl && isSafeImageUrl(card.imageUrl) ? { imageUrl: card.imageUrl } : {}),
    },
  };
};

const joinSchema = z.object({
  outcome: z.enum(['JOINED', 'ALREADY_MEMBER']),
  bunch: bunchSchema,
});

export type JoinedInvitation = { outcome: 'JOINED' | 'ALREADY_MEMBER'; bunch: CreatedBunch };

/**
 * 초대 참여(`POST /invitations/join`): 서버가 조건을 다시 확인하고 MEMBER로 등록하며 마지막 사용 번치를 이 번치로 바꿈
 * 같은 멱등 키·같은 초대의 재전송은 처음 결과를 돌려주고, 이미 소속이면 `ALREADY_MEMBER`(오류 아님)
 * 오류: 404 `INVITE_001`, 409 `BUNCH_002`(정원 8명)·`BUNCH_003`(소속 10개)·`REQUEST_001`(같은 키에 다른 초대). 실패는 `ApiError`로 던짐
 */
export const joinInvitation = async (
  invitation: string,
  idempotencyKey: string,
): Promise<JoinedInvitation> => {
  const { outcome, bunch } = await requestData(
    bffApi.post('invitations/join', {
      headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
      json: { invitation } satisfies Schemas['InvitationRequest'],
    }),
    joinSchema,
    'join invitation',
  );
  return { outcome, bunch: toCreatedBunch(bunch) };
};
