import { type ReactNode } from 'react';

/** 묶음 제목과 목록. 제목 아래 4, 목록 좌우 12(메뉴 안쪽 4와 더해 16). MY 메뉴와 약관 및 개인정보가 같은 모양을 씀 */
export function MenuSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    // 이름 붙은 region으로 두면 토스트 영역(「알림」)과 같은 이름의 랜드마크가 생겨 h2 제목만 둔 묶음으로
    <section className="gap-s2 flex flex-col">
      <h2 className="typography-body-4-semi-bold text-text-tertiary px-padding-p8 py-padding-p3">
        {title}
      </h2>
      <ul className="px-padding-p6 flex flex-col">{children}</ul>
    </section>
  );
}
