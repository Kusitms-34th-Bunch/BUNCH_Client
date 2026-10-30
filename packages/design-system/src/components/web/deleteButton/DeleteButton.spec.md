# 컴포넌트: DeleteButton

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import). BUNCH 사용자 앱(web)에서만 쓴다.
- Status: 구현됨(Storybook 렌더를 Figma 값과 대조함. 실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Delete Button`(node `1741:14500`). 변형 `Size` × `Variant`(Default·Overlay) 4개. 이슈 #94.
- 이 컴포넌트를 쓰는 곳: `BundlePhoto`(size L · overlay)와 `MemberCard`(size M · default)의 삭제 버튼이 이 컴포넌트로 교체됐다.

## 목적과 범위

### 제공하는 동작

- 작은 원 안에 X가 있는 삭제 버튼. 사진·카드 모서리에 얹어 쓴다.
- 크기 M(16px 원, X 6px)과 L(24px 원, X 8px), 모양 default(`icon-tertiary` 배경 `#535a61`)와 overlay(`overlay-scrim` 검정 60% + 배경 블러 15px, 사진 위용). X는 흰색(`icon-inversed`)이고 선 굵기는 크기와 상관없이 1px이다.

### 제공하지 않는 동작

- 위치(오른쪽 위로 삐져나오기, 오른쪽 끝 정렬 등)는 호출하는 쪽이 `className`으로 정한다.
- 삭제 확인, 목록 갱신, 삭제 문구는 호출하는 쪽이 맡는다.
- Figma에 호버·눌림·비활성이 없어 만들지 않는다(`disabled`를 받지 않음).

## Public API

- `label`(필수, 접근성 이름), `size`(`M` 기본·`L`), `variant`(`default` 기본·`overlay`), 그리고 native `<button>` 속성(`type`·`children`·`aria-label`·`disabled` 제외).
- Figma 변형 이름 대응: `Size=M, Variant=Default`→`size="M" variant="default"`, `Size=L, Variant=Default`→`L`·`default`, `Size=Size4, Variant=Overlay`→`M`·`overlay`, `Size=Size3, Variant=Overlay`→`L`·`overlay`(Figma가 Overlay의 크기 이름을 `Size3`·`Size4`로 지었으나 16px·24px이라 M·L로 통일).
- 호출자 소유 책임: 이름(`label`), 클릭 처리, 위치.

## 상태와 동작

- 누르면 `onClick`을 호출한다. 시각 상태 변화는 포커스 링뿐이다.
- X 아이콘은 기존 `LineCloseSmallIcon`을 M에서 12px, L에서 16px로 쓴다(Small 아이콘의 X가 그 크기에서 6px·8px). `vector-effect: non-scaling-stroke`로 선 굵기를 1px에 고정한다(Figma 값. 이전 구현은 크기에 따라 0.9px·1.2px).

## 접근성

- Semantic element: native `<button type="button">`이고 이름은 `label`(`aria-label`)이다. X 아이콘은 `aria-hidden`이다.
- Keyboard·focus: Tab·Enter·Space로 누르고 포커스는 버튼 바깥 2px `border-brand` outline(offset 2)이다. 밝은 사진 위에서 윤곽선이 잘 보이는지는 디자이너 확인이 필요하다.
- 터치 영역: 보이는 원보다 넓은 32px(`design-system-icons.md`의 Small 기준)로 `before` 가상 요소(M 사방 8px, L 사방 4px)를 둔다. 44px에는 못 미치며, 호출하는 쪽이 옆 요소와 겹치지 않게 배치해야 한다. 특히 카드 모서리 밖으로 삐져나오게 둘 때(`MemberCard`) 터치 영역은 카드 밖 위·오른쪽으로 최대 11px 나가므로 이웃 카드와의 간격은 8px 이상으로 두고, 부모가 `overflow-hidden`이면 터치 영역과 포커스 링이 잘린다.
- 색 대비: default는 흰색 on `#535a61` 약 7:1이다. overlay는 흰색 X가 검정 60% 위에 얹혀 흰 사진 뒤에서는 배경이 `#666666`(약 5.7:1)이지만, 밝은 색 사진이나 블러가 덜 먹는 경우의 실제 대비는 사진 위 렌더로 확인해야 한다(디자이너 확인).
- 이름이 없으면 의미를 알 수 없어 `label`을 필수로 했다.

## Styling과 의존성

- Token: `bg-icon-tertiary`, `text-icon-inversed`, `bg-overlay-scrim`, `rounded-full`, `size-4`·`size-6`. 블러 15px은 token이 없어 Figma 값 `backdrop-blur-[15px]`을 썼다.
- 아이콘: 기존 `LineCloseSmallIcon`. dependency 추가 없음.
- Storybook: `Web/DeleteButton`(Default, Large, Overlay, Matrix).

## 디자이너 확인 항목

- Figma가 Overlay의 크기 이름을 `Size3`·`Size4`로 지었다(Default는 `M`·`L`). 의도된 이름인지 확인이 필요하다.
- overlay 삭제 버튼의 대비와 포커스 윤곽선이 밝은 사진 위에서 충분한지.
- 터치 영역 32px가 목표(44px)에 못 미친다. 코너에 얹는 작은 컨트롤이라 Figma 크기를 유지했다.
