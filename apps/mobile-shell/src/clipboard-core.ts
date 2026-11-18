type ClipboardDeps = {
  setString: (text: string) => Promise<unknown>;
  getString: () => Promise<string>;
  /** 주고받을 수 있는 텍스트인지(브리지 계약 `clipboardTextSchema`). 입력과 읽기 결과 모두에 적용 */
  isValidText: (text: string) => boolean;
};

/**
 * 웹이 부르는 클립보드 브리지. 텍스트만 다루고 입력·결과를 모두 `isValidText`(짧은 문자열)로 검증함
 * 어떤 오류도 웹에 던지지 않고 복사는 false, 읽기는 null로 알려 웹이 안내 문구를 정함
 */
export const createClipboardBridge = ({ setString, getString, isValidText }: ClipboardDeps) => ({
  copyToClipboard: async (text: string): Promise<boolean> => {
    if (!isValidText(text)) return false;
    try {
      await setString(text);
      return true;
    } catch {
      return false;
    }
  },
  readClipboard: async (): Promise<string | null> => {
    try {
      const text = (await getString()).trim();
      return isValidText(text) ? text : null;
    } catch {
      return null;
    }
  },
});
