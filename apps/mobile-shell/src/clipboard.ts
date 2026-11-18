import { clipboardTextSchema } from '@app/bridge';
import * as Clipboard from 'expo-clipboard';
import { createClipboardBridge } from './clipboard-core';

export const { copyToClipboard, readClipboard } = createClipboardBridge({
  setString: (text) => Clipboard.setStringAsync(text),
  getString: () => Clipboard.getStringAsync(),
  isValidText: (text) => clipboardTextSchema.safeParse(text).success,
});
