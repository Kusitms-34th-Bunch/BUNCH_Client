import { AppWebView, WEB_URL } from '../src/web-view/AppWebView';

export default function SingleWebViewScreen() {
  return <AppWebView uri={WEB_URL} />;
}
