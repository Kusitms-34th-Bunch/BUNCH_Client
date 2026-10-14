# Form 흐름 가이드

form은 field를 그리는 작업이 아니라 입력, validation, submit 조건, 서버 오류, mutation 성공 뒤 상태를 연결하는 작업이다. 구현은 `implement-form-flow` skill을 사용한다.

## 시작 전 정리

| 항목       | 확인할 내용                                            |
| ---------- | ------------------------------------------------------ |
| 입력       | field, default 값, URL·서버에서 오는 초기 값           |
| 파생 상태  | dirty, valid, submit 가능 조건                         |
| validation | client rule, 서버 오류 mapping, 표시 시점              |
| submit     | endpoint, pending, duplicate submit, success 이후 동작 |
| cache      | invalidate, setQueryData, reset 또는 redirect          |

## 책임 분리

- field, validation, error 표현, submit payload는 같은 feature 경계에서 함께 바뀌게 둔다.
- design-system input은 값·label·invalid·disabled 같은 UI 계약만 맡고 API·route·form business rule을 모른다.
- client validation과 서버 validation을 같은 오류로 뭉개지 않는다.
- disabled는 실제 submit 가능 조건을 반영하고, 이유를 사용자에게 전달한다.

## 상태 체크리스트

- [ ] label, help, error가 form control과 연결됨
- [ ] keyboard submit, focus 이동, invalid field 안내
- [ ] pending 중 중복 제출 방지
- [ ] validation·network·auth 오류 구분
- [ ] success 뒤 reset, cache 갱신, redirect가 설명 가능함
- [ ] retry·error reset과 취소 동작이 필요한 범위에서 정의됨

## 검증

field 입력, invalid submit, pending, 서버 오류, success를 user-visible result로 test한다. 여러 화면을 지나는 성공 흐름만 E2E 후보로 올린다.
