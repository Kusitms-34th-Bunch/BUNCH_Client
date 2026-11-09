/** base64 data URL을 Blob으로 바꿈(업로드용). 형식이 맞지 않으면 던짐 */
export const dataUrlToBlob = (dataUrl: string): Blob => {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw new Error('올바르지 않은 이미지 데이터입니다.');
  const [, type = '', base64 = ''] = match;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type });
};
