// 코드로 준 초점은 iOS에서 키보드 초점 테두리가 그려져 키 입력·떠남 전까지 감춤(스크린 리더 낭독은 유지)
// 앱 전환으로 문서 초점이 빠지는 blur는 무시(돌아오면 같은 요소에 초점이 복원됨). 테두리 감춤은 globals.css의 [data-quiet-focus]
export function quietFocus(item: HTMLElement) {
  item.dataset.quietFocus = '';
  const reveal = () => {
    delete item.dataset.quietFocus;
    item.removeEventListener('blur', onBlur);
    document.removeEventListener('keydown', reveal, true);
  };
  const onBlur = () => {
    if (document.hasFocus()) reveal();
  };
  item.addEventListener('blur', onBlur);
  document.addEventListener('keydown', reveal, true);
  item.focus({ preventScroll: true });
  if (document.activeElement !== item) reveal();
}
