# 컴포넌트: SearchField

## 메타데이터

- 소유 경계: design-system `core`
- Status: 구현됨(Storybook 렌더를 Figma 값과 대조함. 실기기·스크린 리더 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `SearchField`(node `1782:26092`). 2026-10-22 Figma 변경으로 높이·여백·배경이 바뀌고 검색 아이콘이 왼쪽 장식으로 옮겨졌다.

## 목적과 범위

### 제공하는 동작

- `role="search"` form 안의 한 줄 검색 입력창. 왼쪽에 16px 검색 아이콘(장식), 오른쪽에 입력창.
- Enter(모바일 키보드의 검색 키, `enterKeyHint="search"`)를 누르면 `onSearch`를 현재 입력값과 함께 호출한다.

### 제공하지 않는 동작

- 검색 버튼이 없다(Figma에 없음). 포인터·음성 제어로 제출할 대상이 없어, 필요한 화면은 호출하는 쪽이 대체 수단을 둔다.
- 값 지우기 버튼이 없다. 브라우저 기본 지우기 버튼도 숨긴다. 필요해지면 TextField의 `onClear` 패턴을 따른다.

## Public API

- Props: `onSearch`, `inputLabel`(기본 「검색어」, 접근성 이름), `placeholder`(기본 「글, 제목, 내용을 입력해주세요.」), `disabled`, 그 밖의 native `input` 속성(`type`·`ref` 제외). `aria-label`을 직접 주면 `inputLabel`보다 우선한다.
- `className`은 바깥 form에 적용된다.
- 2026-10-22: 검색 버튼과 함께 `searchLabel` prop을 지웠다.

## 상태와 동작

- 안내 문구는 Body-2-Meduim의 굵기·자간(SemiBold, -0.5px)·`text-quaternary`, 입력값은 `typography-body-3-regular`·`text-primary`(`fieldText`, TextField와 공유).
- 포커스: 바깥에 1px `primitive-gray-700` 윤곽선(TextField의 포커스 테두리 색), 강제 색상 모드에서는 2px.
- 비활성: 전체 `opacity-disabled`(40%), 입력 불가.

## 접근성

- `role="search"` landmark, 입력창은 `type="search"`(searchbox)이고 `inputLabel`이 이름이다. 아이콘은 `aria-hidden`.

## Styling과 의존성

- Token: `bg-surface-secondary`, `rounded-full`, `py-s4`(8), `pl-s6`(12), `pr-s4`(8), `gap-s2`(4), 입력창 `py-padding-p1`(2), 아이콘 `LineSearchIcon size="sm"`(16)·`text-icon-quaternary`. 높이는 41px(8+2+21+2+8)로 내용이 정한다.
- dependency 추가 없음.

## 확인할 항목

- 배경색 (확정): 해소: `surface-secondary`가 가리키는 기본 회색 `gray-100`을 Figma 값 `#f5f5f5`로 맞췄다(2026-10-26 디자이너 확인).
- 포커스·비활성 모양 (제안): Figma에 시안이 없어 TextField 기준을 옮겼다.
- 안내 문구 대비 (디자이너 확인): `#bcbec2`는 배경 대비 약 1.7:1(계산값)이라 WCAG 1.4.3 기준(4.5:1)에 못 미친다. 보이는 label이 없어 안내 문구가 유일한 시각 힌트다.

## 검증

- [x] 사용자 관찰 동작 test(`SearchField.test.tsx`): landmark·이름·안내 문구, 버튼 없음, 장식 아이콘, Enter 제출, 비활성
- [x] Storybook 렌더 측정(폭 319px): 높이 41, padding 8/8/8/12, gap 4, 아이콘 16px·`#bcbec2`, 안내 문구 600/-0.5px
- [ ] 실기기·iOS WebKit·스크린 리더 확인은 하지 않았다
