import { appBridge, clipboardBridge, isNativeShell } from '@/shared/bridge/client';

// 앱 쉘이 클립보드 브리지를 구현했는지(이전 쉘 빌드는 없어서 브라우저 방식으로 대체)
const hasNativeClipboard = (method: 'copyToClipboard' | 'readClipboard') =>
  isNativeShell() && appBridge.isNativeMethodAvailable(method);

/**
 * 텍스트를 클립보드에 복사하고 성공 여부를 돌려줌. 사용자가 누른 동작 안에서 호출
 * 앱 쉘에서는 네이티브 클립보드(WebView의 http 개발 주소는 `navigator.clipboard`가 없음), 브라우저에서는 `navigator.clipboard`
 */
export async function copyText(text: string): Promise<boolean> {
  if (hasNativeClipboard('copyToClipboard')) {
    try {
      return await appBridge.copyToClipboard(text);
    } catch {
      return false;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** 클립보드의 텍스트를 읽음. 비어 있거나 읽지 못하면 null. 사용자가 누른 동작 안에서 호출(iOS는 붙여넣기 허용 팝업이 뜰 수 있음) */
export async function readClipboardText(): Promise<string | null> {
  if (hasNativeClipboard('readClipboard')) {
    try {
      return (await clipboardBridge.readClipboard()) ?? null;
    } catch {
      return null;
    }
  }
  try {
    return (await navigator.clipboard.readText()).trim() || null;
  } catch {
    return null;
  }
}
