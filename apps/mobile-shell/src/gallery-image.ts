import {
  galleryImageSchema,
  pickGalleryImageOptionsSchema,
  type GalleryImage,
  type PickGalleryImageOptions,
} from '@app/bridge';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { fitLongEdge } from './gallery-resize';

let isPicking = false;

const toDataUrl = (base64: string) =>
  galleryImageSchema.parse({ dataUrl: `data:image/jpeg;base64,${base64}` });

/**
 * 시스템 갤러리 선택과 WebView에서 읽을 수 있는 JPEG 미리보기 전달
 * 기본은 정사각형 편집, `edit: false`면 편집 없이 긴 변을 줄인 원본(웹이 직접 자름)
 */
export async function pickGalleryImage(
  options?: PickGalleryImageOptions,
): Promise<GalleryImage | null> {
  const edit = pickGalleryImageOptionsSchema.parse(options)?.edit ?? true;
  if (isPicking) return null;
  isPicking = true;
  try {
    // 사진 전용 시스템 선택기는 전체 앨범 접근 권한의 선행 요청 불필요
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: edit,
      aspect: edit ? [1, 1] : undefined,
      quality: edit ? 0.7 : 1,
      base64: edit,
      exif: false,
    });
    if (result.canceled) return null;
    const asset = result.assets[0];
    if (!asset) throw new Error('사진을 읽을 수 없어요.');
    if (edit) {
      if (!asset.base64) throw new Error('사진을 읽을 수 없어요.');
      // shortcut: 업로드 API 확정 전까지 크기를 제한한 base64로 미리보기만 전달
      return toDataUrl(asset.base64);
    }
    const context = ImageManipulator.manipulate(asset.uri);
    const size = fitLongEdge(asset.width, asset.height);
    if (size) context.resize(size);
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
    if (!saved.base64) throw new Error('사진을 읽을 수 없어요.');
    return toDataUrl(saved.base64);
  } finally {
    isPicking = false;
  }
}
