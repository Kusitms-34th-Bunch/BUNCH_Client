import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import { incomingLinkStore } from '../src/incoming-link-store';
import { LoginBackgroundVideo } from '../src/login-background/LoginBackgroundVideo';
import { loginBackgroundStore } from '../src/login-background/login-background-store';
import { AppWebView } from '../src/web-view/AppWebView';
import { WEB_URL, toAppWebUrl } from '../src/web-view/app-web-url';

export default function SingleWebViewScreen() {
  const loginBackground = useSyncExternalStore(
    loginBackgroundStore.subscribe,
    loginBackgroundStore.get,
  );
  // 초대 링크로 처음 실행됐으면 첫 문서부터 그 경로로 염(웹 첫 화면을 거치지 않음). 렌더에서는 읽기만 하고 비우기는 effect에서
  const [openedLink] = useState(incomingLinkStore.get);

  useEffect(() => {
    if (openedLink) incomingLinkStore.clear(openedLink);
  }, [openedLink]);

  // 탭 화면으로 넘어가는 등 이 화면이 사라지면 배경 영상도 걷음(웹이 정리 신호를 보내지 못하고 사라질 수 있음)
  useEffect(() => () => loginBackgroundStore.set(false), []);

  return (
    <View style={styles.screen}>
      {loginBackground ? <LoginBackgroundVideo /> : null}
      {/* 어두운 배경 영상 위라 상태 바 아이콘을 흰색으로(영상을 걷으면 공용 설정으로 돌아감) */}
      {loginBackground ? <StatusBar style="light" /> : null}
      <AppWebView
        uri={openedLink ? toAppWebUrl(openedLink) : WEB_URL}
        transparent={loginBackground}
        // 새 문서를 열면 이전 문서가 깔아 둔 배경 영상을 걷음(로그인 화면이면 웹이 다시 요청)
        onLoadStart={() => loginBackgroundStore.set(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // 영상 첫 프레임을 받기 전에 흰 화면이 비치지 않게 웹 로그인 배경과 같은 어두운 색(#121212)
  screen: { flex: 1, backgroundColor: '#121212' },
});
