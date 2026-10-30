import { galleryImageSchema, type GalleryImage } from '@app/bridge';
import * as ImagePicker from 'expo-image-picker';

let isPicking = false;

/** 시스템 갤러리 선택과 정사각형 편집, WebView에서 읽을 수 있는 JPEG 미리보기 전달 */
export async function pickGalleryImage(): Promise<GalleryImage | null> {
  if (isPicking) return null;
  isPicking = true;
  try {
    // 사진 전용 시스템 선택기는 전체 앨범 접근 권한의 선행 요청 불필요
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
      exif: false,
    });
    if (result.canceled) return null;
    const base64 = result.assets[0]?.base64;
    if (!base64) throw new Error('사진을 읽을 수 없어요.');
    // shortcut: 업로드 API 확정 전까지 크기를 제한한 base64로 미리보기만 전달
    return galleryImageSchema.parse({ dataUrl: `data:image/jpeg;base64,${base64}` });
  } finally {
    isPicking = false;
  }
}
