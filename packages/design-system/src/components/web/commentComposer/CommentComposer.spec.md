# 컴포넌트: CommentComposer

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `CommentComposer`(node `4137:111014`)
- 기능 명세: `docs/specs/feed.md` 6.2.8(댓글 입력·답글 작성 상태)
- 이슈: #251

## 목적과 범위

### 제공하는 동작

- 번들 상세 아래에 고정되는 댓글 입력 영역: 위쪽 1px 선, 답글 대상 줄(있을 때만), `CommentInput`.
- 답글 대상이 있으면 「{닉네임}님에게 답글 남기는 중」과 닫기 버튼을 보인다. 닉네임이 길면 닉네임만 줄인다.

### 제공하지 않는 동작

- 화면 아래 고정 위치, 아래 Safe Area, 답글 대상 선택과 해제 후 상태는 호출자가 정한다.

## Public API

- Props: `CommentInput`의 props 전부 + `replyTarget`(닉네임), `onCancelReply`, `cancelReplyLabel`(기본 「답글 그만 쓰기」). `className`은 영역 전체에 적용.
- Figma 이름 대응: Figma 변형 이름은 반대로 붙어 있다. `Mode=Comment`가 답글 대상 줄이 있는 모양이고 `Mode=Reply`가 입력칸만 있는 모양이다. 코드는 `replyTarget` 유무로 구분한다.

## 상태와 동작

| 상태      | 모양                                                          | 높이(Figma) |
| --------- | ------------------------------------------------------------- | ----------- |
| 댓글      | 위쪽 선, 입력칸(위 10·아래 4·좌우 16)                         | 57          |
| 답글 작성 | 위쪽 선, 답글 대상 줄(위 8·좌우 16, Body-4 `#535A61`), 입력칸 | 83          |

## 접근성

- 닫기 버튼은 이름 「답글 그만 쓰기」, 아이콘 16px에 누르는 영역 가로 40·세로 32px(아래 입력칸과 겹치지 않게).
- 답글 중이면 입력칸 이름을 「{닉네임}님에게 답글, {안내 문구}」로 바꿔 낭독에서도 구분한다(`label`을 넘기면 그 값). 답글 모드로 바뀔 때 알림(live region)은 하지 않고, 입력칸으로 포커스를 옮기는 것은 호출자가 한다.

## Styling과 의존성

| Figma        | 값                             | 토큰·클래스                                    |
| ------------ | ------------------------------ | ---------------------------------------------- |
| 위쪽 선      | 1px `border-tertiary`          | `border-t border-border-tertiary`              |
| 답글 대상 줄 | Body-4-Regular 13/18 `#535A61` | `typography-body-4-regular text-text-tertiary` |
| 닫기         | Line/Icon-S/Close 16           | `LineCloseSmallIcon`, `text-icon-quaternary`   |
| 입력칸 여백  | 위 10·아래 4·좌우 16           | `pt-padding-p5 pb-padding-p2 px-padding-p8`    |

- 새 dependency 없음. Storybook: `Comment`, `Replying`.

## 확인할 항목

- 닫기 아이콘 색: Figma 레이어 색을 확인하지 못해 `icon-quaternary`로 두었다(캡처 밝기 기준).
- Figma 변형 이름이 반대로 붙어 있음(디자이너에게 이름 정리 요청).

## 검증

- 단위 테스트: 답글 대상이 없으면 입력칸만, 있으면 안내 줄과 닫기 버튼, 닫기 누르면 알림.
- Storybook(Chromium) 측정: 높이 57(댓글)·83(답글 작성)으로 Figma와 같음. 스크린 리더·실기기는 확인하지 않았다.
