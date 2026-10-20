import { permissionKindSchema, type PermissionKind, type PermissionStatus } from '@app/bridge';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';

type PermissionResponse = { status: string; granted: boolean; canAskAgain: boolean };

// expo가 돌려주는 status를 그대로 따른다(Android는 한 번 거부해도 canAskAgain이 true라 그것만으로는 구분할 수 없다)
const toStatus = ({ status, granted }: PermissionResponse): PermissionStatus => {
  if (granted || status === 'granted') return 'granted';
  return status === 'denied' ? 'denied' : 'undetermined';
};

const request = (kind: PermissionKind): Promise<PermissionResponse> => {
  switch (kind) {
    case 'photo':
      return ImagePicker.requestMediaLibraryPermissionsAsync();
    case 'camera':
      return ImagePicker.requestCameraPermissionsAsync();
    case 'notification':
      return Notifications.requestPermissionsAsync();
  }
};

/**
 * 시스템 권한 팝업 요청. 이미 정해진 권한은 OS가 팝업 없이 현재 상태를 돌려준다
 * 개발 중 어떤 팝업이 왜 안 떴는지 알 수 있게 결과와 실패를 Metro 로그에 남긴다
 */
export async function requestPermission(kind: PermissionKind): Promise<PermissionStatus> {
  const parsed = permissionKindSchema.parse(kind);
  try {
    const response = await request(parsed);
    const status = toStatus(response);
    if (__DEV__) {
      console.log(
        `[permission] ${parsed}: ${status} (granted=${String(response.granted)}, canAskAgain=${String(response.canAskAgain)})`,
      );
    }
    return status;
  } catch (error) {
    console.warn(`[permission] ${parsed} 요청 실패`, error);
    throw error;
  }
}
