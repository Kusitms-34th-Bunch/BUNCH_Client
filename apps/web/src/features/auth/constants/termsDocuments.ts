import type { TermsDocumentId } from './terms';

type TermsArticle = {
  title: string;
  /** 본문 문단 */
  paragraphs?: readonly string[];
  /** 번호가 붙는 항목 */
  items?: readonly string[];
};

type TermsDocumentContent = {
  title: string;
  /** 시행일자 */
  effectiveDate: string;
  version: string;
  articles: readonly TermsArticle[];
};

// 임시 문구(설계서: 약관 원문은 추후 변경 예정)
const purpose =
  '본 약관은 BUNCH 주식회사(이하 “회사”)가 제공하는 그룹 사진 기록 및 아카이빙 서비스 BUNCH(이하 “서비스”)의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.';
const definitions = [
  '“번치(BUNCH)”란 회원이 공통의 주제나 친목을 위해 개설한 비공개 또는 공개 그룹 작업 공간을 말합니다.',
  '“번들(Bundle)”이란 번치 내 참여 멤버들이 공유한 사진과 코멘트를 묶어 공동 발행하는 기록 단위입니다.',
  '“뭉치”란 번들의 발행 빈도와 상호작용에 따라 성장하는 번치 내 마스코트 오브젝트를 지칭합니다.',
] as const;
const amendment =
  '회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있으며, 변경 사항은 서비스 내 고지사항 및 화면을 통해 최소 7일 전 사전 고지합니다.';
const duty =
  '회원은 타인의 저작권을 침해하는 미디어를 무단 게시할 수 없으며, 업로드 완료된 사진 데이터는 서버 정책에 따라 암호화 보존됩니다.';

export const TERMS_DOCUMENTS: Record<TermsDocumentId, TermsDocumentContent> = {
  service: {
    title: '서비스 이용약관',
    effectiveDate: '2025. 01. 01',
    version: '1.2',
    articles: [
      { title: '제 1조 (목적)', paragraphs: [purpose] },
      { title: '제 2조 (용어의 정의)', items: definitions },
      { title: '제 3조 (약관의 효력 및 변경)', paragraphs: [amendment] },
      { title: '제 4조 (회원의 의무 및 데이터 보존)', paragraphs: [duty] },
    ],
  },
  privacy: {
    title: '개인정보 처리방침',
    effectiveDate: '2025. 01. 01',
    version: '1.2',
    articles: [
      { title: '제 1조 (목적)', paragraphs: [purpose] },
      { title: '제 2조 (용어의 정의)', items: definitions },
      { title: '제 3조 (약관의 효력 및 변경)', paragraphs: [amendment] },
      { title: '제 4조 (회원의 의무 및 데이터 보존)', paragraphs: [duty] },
    ],
  },
};
