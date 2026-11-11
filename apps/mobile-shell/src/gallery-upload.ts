import {
  MAX_PICKED_PHOTOS,
  pickedPhotoIdSchema,
  pickedPhotoIdsSchema,
  pickGalleryImagesOptionsSchema,
  pickPhotosResultSchema,
  uploadImageSchema,
  type PickedPhoto,
  type PickGalleryImagesOptions,
  type PickPhotosResult,
  type UploadImage,
} from '@app/bridge';
import { ImageManipulator, SaveFormat, type ImageRef } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { deleteCacheFiles } from './cache-cleanup';
import {
  base64ByteLength,
  fitLongEdge,
  MAX_UPLOAD_EDGE,
  UPLOAD_QUALITIES,
  UPLOAD_TARGET_BYTES,
} from './gallery-resize';
import { formatLocalDateTime, readCapturedAt } from './photo-exif';
import {
  getPickedPhoto,
  registerPickedPhoto,
  releasePickedPhotos as releaseStoredPhotos,
} from './picked-photos';

// 선택·촬영 창이 겹쳐 열리지 않게 한 번에 하나만. 이미 열려 있으면 둘째 요청은 취소로 돌려줌
let isPicking = false;

const toPickedPhoto = (asset: ImagePicker.ImagePickerAsset, fallback?: Date): PickedPhoto => {
  const id = registerPickedPhoto({ uri: asset.uri, width: asset.width, height: asset.height });
  // asset.exif는 위치를 포함할 수 있어 여기서 촬영 날짜·시각만 꺼내고 나머지는 어디에도 넘기지 않음
  const found = readCapturedAt(asset.exif);
  const { capturedDate, capturedTime } =
    found.capturedDate === undefined && fallback ? formatLocalDateTime(fallback) : found;
  return {
    id,
    ...(capturedDate ? { capturedDate } : {}),
    ...(capturedTime ? { capturedTime } : {}),
  };
};

// 보관한 뒤 결과 검증이 실패하면 웹이 id를 받지 못하므로, 이번에 보관한 사진을 놓아 주고 오류를 그대로 전달
const toPickedResult = (
  assets: readonly ImagePicker.ImagePickerAsset[],
  fallback?: Date,
): PickPhotosResult => {
  const ids: string[] = [];
  try {
    const photos = assets.map((asset) => {
      const photo = toPickedPhoto(asset, fallback);
      ids.push(photo.id);
      return photo;
    });
    return pickPhotosResultSchema.parse({ status: 'picked', photos });
  } catch (error) {
    void deleteCacheFiles(releaseStoredPhotos(ids).map((source) => source.uri));
    throw error;
  }
};

/**
 * 시스템 사진 선택기로 여러 장 선택(최대 50장). 사진 데이터는 웹에 넘기지 않고 `readPickedPhoto`가 하나씩 가공해 줌
 * 사진 전용 시스템 선택기는 전체 앨범 권한을 먼저 요청하지 않으므로 이 경로에는 권한 거부가 없음
 */
export async function pickGalleryImages(
  options?: PickGalleryImagesOptions,
): Promise<PickPhotosResult> {
  const limit = pickGalleryImagesOptionsSchema.parse(options)?.limit ?? MAX_PICKED_PHOTOS;
  if (isPicking) return { status: 'canceled' };
  isPicking = true;
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: limit,
      // 촬영 날짜·시각을 읽으려고 요청. 선택기가 압축하지 않도록 품질은 최대로
      exif: true,
      quality: 1,
    });
    if (result.canceled) return { status: 'canceled' };
    const assets = result.assets.slice(0, limit);
    // 선택기가 한도보다 많이 돌려주면 잘려 나간 사진은 쓰지 않으므로, 선택기가 만든 복사본(위치 포함)을 바로 지움
    void deleteCacheFiles(result.assets.slice(limit).map((asset) => asset.uri));
    if (assets.length === 0) return { status: 'canceled' };
    return toPickedResult(assets);
  } finally {
    isPicking = false;
  }
}

/**
 * 카메라로 한 장 촬영. 카메라 권한이 아직 정해지지 않았으면 이 호출에서 권한 팝업이 뜨고, 거부되어 있으면 팝업 없이 `denied`
 * 촬영 정보가 비어 있으면 지금 시각을 촬영 시각으로 씀(기능명세서 3.2.3)
 */
export async function capturePhoto(): Promise<PickPhotosResult> {
  if (isPicking) return { status: 'canceled' };
  isPicking = true;
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { status: 'denied' };
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      exif: true,
      quality: 1,
    });
    if (result.canceled) return { status: 'canceled' };
    const asset = result.assets[0];
    if (!asset) return { status: 'canceled' };
    return toPickedResult([asset], new Date());
  } finally {
    isPicking = false;
  }
}

// 긴 변을 상한 이하로 줄인 이미지. 기기가 알려 준 크기가 회전 전 값이면 줄이는 변이 틀려 긴 변이 상한(서버는 4096px)을
// 넘길 수 있어, 결과 크기로 한 번 더 확인하고 넘으면 올바른 변으로 다시 줄임
const renderFitted = async (uri: string, width: number, height: number): Promise<ImageRef> => {
  const context = ImageManipulator.manipulate(uri);
  try {
    const size = fitLongEdge(width, height, MAX_UPLOAD_EDGE);
    if (size) context.resize(size);
    const rendered = await context.renderAsync();
    const correction = fitLongEdge(rendered.width, rendered.height, MAX_UPLOAD_EDGE);
    if (!correction) return rendered;
    const again = ImageManipulator.manipulate(rendered);
    try {
      again.resize(correction);
      return await again.renderAsync();
    } finally {
      again.release();
      rendered.release();
    }
  } finally {
    context.release();
  }
};

// 서버가 받는 파일 크기 상한이 문서마다 다르므로(6MB·30MiB) 목표 크기 이하가 될 때까지 압축을 높여 가며 JPEG로 저장
const encodeWithinTarget = async (image: ImageRef): Promise<string> => {
  let base64: string | undefined;
  for (const compress of UPLOAD_QUALITIES) {
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress, base64: true });
    // base64를 이미 받았으니 저장된 결과 파일은 필요 없음
    await deleteCacheFiles([saved.uri]);
    base64 = saved.base64;
    if (!base64) break;
    if (base64ByteLength(base64) <= UPLOAD_TARGET_BYTES) return base64;
  }
  if (!base64) throw new Error('사진을 읽을 수 없어요.');
  // 가장 많이 압축해도 목표를 넘으면 그대로 돌려줌(웹·서버가 크기를 다시 확인)
  return base64;
};

/**
 * 고른 사진 한 장을 업로드용으로 가공: 긴 변 2560px 이하로 줄여 JPEG로 다시 저장(큰 사진은 목표 크기 이하로 압축)
 * 다시 저장하면서 위치를 포함한 원본의 메타데이터가 빠지도록 한 것이고, HEIC·PNG·WebP도 JPEG가 됨
 * 결과 파일의 메타데이터 제거는 실기기에서 확인해야 함(문서 `docs/architecture/mobile-shell.md`)
 * 서버로 보내기 전에 반드시 쉘에서 처리(기능명세서 3.2.2). 한 장씩 처리해 50장을 한꺼번에 메모리에 올리지 않음
 */
export async function readPickedPhoto(id: string): Promise<UploadImage> {
  const { uri, width, height } = getPickedPhoto(pickedPhotoIdSchema.parse(id));
  const image = await renderFitted(uri, width, height);
  try {
    const base64 = await encodeWithinTarget(image);
    return uploadImageSchema.parse({ dataUrl: `data:image/jpeg;base64,${base64}` });
  } finally {
    image.release();
  }
}

/**
 * 업로드에 쓸 사진을 다 읽었으면 놓아 줌(ids를 생략하면 모두). 선택기가 캐시에 만든 원본 복사본(위치 포함)도 함께 지움
 * 읽은 뒤 바로 놓아 줘도 되고, 실패한 사진을 다시 보내는 데는 웹이 들고 있는 가공 결과를 쓰므로 지장이 없음
 */
export async function releasePickedPhotos(ids?: string[]): Promise<void> {
  const released = releaseStoredPhotos(
    ids === undefined ? undefined : pickedPhotoIdsSchema.parse(ids),
  );
  await deleteCacheFiles(released.map((source) => source.uri));
}
