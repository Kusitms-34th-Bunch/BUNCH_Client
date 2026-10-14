---
name: refactor-code
description: 저장소의 코드 품질·검증 기준으로 의도된 동작을 바꾸지 않고 기존 frontend 코드를 개선한다. 중복 제거, 경계 정리, 유지보수성 개선에 사용한다.
---

# 동작 보존 리팩터링

## 시작 전

`docs/code-quality/`, 대상 source·usage·test·최근 변경을 읽고 다음을 분리한다.

- 현재 책임과 실제 유지보수 문제
- 반드시 보존할 동작·public API·accessibility·performance 특성
- Must / Should / Could 범위와 제외할 요구

파일이 길거나 prop이 많다는 사실만으로 분리·공통화를 결정하지 않는다.

## 진행

1. 기존 coverage가 약하면 observable behavior regression test를 먼저 만든다.
2. 중복, 책임 혼합, 숨은 side effect, 불명확 타입·이름, dead code 중 하나의 냄새를 한 pass에서 다룬다.
3. 책임·상태·변경 이유가 다른 경우에만 component/hook/module을 추출한다.
4. 관련 없는 formatting·이름 변경·기능 추가를 섞지 않는다.
5. 실제 cross-app reuse가 확인되기 전에는 shared package로 올리지 않는다.
6. public contract가 바뀌면 refactor가 아니라 별도 기능·구조 변경으로 분리하고 spec/docs 영향을 확인한다.

## 완료 기준

보존한 동작, 줄인 복잡도, 변경 경계, 추가한 regression, targeted test·lint·typecheck 결과, 남은 위험을 보고한다. 새 dependency는 요청된 경우만 추가한다.
