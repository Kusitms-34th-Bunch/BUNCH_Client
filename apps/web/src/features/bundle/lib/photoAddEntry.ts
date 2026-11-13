// 작성 화면에서 사진 추가 화면으로 앱 안에서 이동했는지(메모리). 새로고침이나 직접 주소 진입이면 false라 이전 기록을 믿지 않음
let enteredFromApp = false;

/** 작성 화면이 사진 추가 화면으로 이동하기 직전에 부름 */
export const markPhotoAddEntry = () => {
  enteredFromApp = true;
};

export const isPhotoAddEntry = () => enteredFromApp;

export const clearPhotoAddEntry = () => {
  enteredFromApp = false;
};
