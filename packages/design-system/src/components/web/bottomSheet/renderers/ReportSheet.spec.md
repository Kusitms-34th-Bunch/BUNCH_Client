# 컴포넌트: ReportSheet

## 메타데이터

- 소유 경계: design-system `web` 구역(시트 렌더러)
- Status: 구현됨(Storybook 치수 확인, 실기기 미검증)
- Figma: Bottom Sheet 07 `2500:48657`(상세 입력 있음), 08 `2500:50687`(입력 없음)

## 목적과 범위

- 신고 사유를 고르는 시트. 제목·부제, `RadioButton` 목록, 상세 사유 입력(선택), 「신고하기」.
- 신고 요청, 완료 안내, 중복 신고 처리는 feature가 맡는다.

## Public API

- `open`, `onOpenChange`, `onOpenChangeComplete`: `BottomSheet.Root`와 같음. 바깥 터치 닫기는 항상 막는다.
- `title`: 예 `여행가조 번치를 신고해요`. `targetLabel`·`targetName`: 부제 「신고하는 번치: 퇴근런클럽」.
- `reasons`: `value`, `label` 목록.
- `detailReasonValue?`: 이 사유를 고르면 상세 사유 입력을 보이고 필수로 한다(07). 없으면 입력 없음(08).
- `onSubmit({ reason, detail })`: 「신고하기」. `detail`은 앞뒤 공백을 지운 값이고 입력이 없으면 빈 문자열. 닫기는 호출자 담당.
- `submitting?`: 제출 중 비활성.

## 상태와 동작

- 사유를 고르기 전, 상세 사유가 필요한데 비어 있을 때, `submitting` 중에는 「신고하기」 비활성.
- 선택·입력은 `Content` 안쪽 state라 닫히면 지워진다.
- 입력 칸이 있어 바깥 터치로 닫지 않는다. 끌기·ESC·닫기 버튼으로는 닫힌다.

## 접근성

- 제목이 시트 이름, 부제가 설명. 사유 목록은 `fieldset` + 숨긴 `legend` 「신고 사유」.
- 보이는 닫기 버튼(Figma에 없어 추가).

## Styling과 의존성

- `RadioButton`, `LabeledTextField`, `Button`. 목록 위아래 4(`py-padding-p2`), 사유 사이 4(`gap-s2`).

## 확인할 항목

- 닫기 버튼 (제안): Figma 07·08에 없지만 끌기·ESC를 못 쓰는 사용자를 위해 추가했다. 디자이너 확인 필요.
- 필수 표시 (제안): Figma는 「상세 사유 *」(브랜드 색 별표), `LabeledTextField`의 필수 표시는 「필수」 칩이라 표시 없이 제목만 썼다.
- 입력 중 닫힘 (미정): 끌기·ESC는 입력 중에도 닫는다. 닫기 전 확인은 feature에서 정한다.
- 「신고하기」 비활성 이유 (제안): `Button`의 `disabled`를 그대로 써 이유를 안내하지 않는다. 사유 목록이 바로 위에 있어 순서상 알 수 있다고 판단했다. 상세 입력 칸이 나타날 때 알림(live region)도 없다.

## 검증

- [x] test 3개: 선택 전 비활성, 입력 없는 형태 제출, 상세 사유 필수·공백 제거
- [x] Story: WithDetail(07), ReasonOnly(08)
- [x] Storybook: 사유 행 29px, 「기타」 선택 시 입력 칸 표시
