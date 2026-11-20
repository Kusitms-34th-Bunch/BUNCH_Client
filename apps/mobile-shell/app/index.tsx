import { useEffect, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import { LoginBackgroundVideo } from '../src/login-background/LoginBackgroundVideo';
import { loginBackgroundStore } from '../src/login-background/login-background-store';
import { AppWebView, WEB_URL } from '../src/web-view/AppWebView';

export default function SingleWebViewScreen() {
  const loginBackground = useSyncExternalStore(
    loginBackgroundStore.subscribe,
    loginBackgroundStore.get,
  );

  // 탭 화면으로 넘어가는 등 이 화면이 사라지면 배경 영상도 걷음(웹이 정리 신호를 보내지 못하고 사라질 수 있음)
  useEffect(() => () => loginBackgroundStore.set(false), []);

  return (
    <View style={styles.screen}>
      {loginBackground ? <LoginBackgroundVideo /> : null}
      <AppWebView
        uri={WEB_URL}
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
