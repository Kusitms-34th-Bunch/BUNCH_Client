import { galleryImageSchema } from '@app/bridge';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { galleryBridge, isNativeShell } from '@/shared/bridge/client';
import { DEFAULT_IMAGE_RULES, type ImageFileRules } from '@/shared/lib/imageFile';

const UNREADABLE_MESSAGE = '이 사진은 사용할 수 없어요.';
// 바이트는 작아도 가로세로가 아주 큰 사진은 디코딩·자르기에서 탭이 멈출 수 있어 거절(50MP)
const MAX_IMAGE_PIXELS = 50_000_000;

function readWebImage(file: File, rules: ImageFileRules): Promise<string> {
  if (!rules.types.includes(file.type) || file.size > rules.maxBytes) {
    return Promise.reject(new Error(rules.invalidMessage));
  }
  const unreadable = () => new Error(rules.unreadableMessage ?? UNREADABLE_MESSAGE);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(unreadable());
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(unreadable());
        return;
      }
      const dataUrl = reader.result;
      const image = new Image();
      image.onload = () => {
        if (image.naturalWidth * image.naturalHeight > MAX_IMAGE_PIXELS) reject(unreadable());
        else resolve(dataUrl);
      };
      image.onerror = () => reject(unreadable());
      image.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/** 사진 선택과 임시 미리보기(네이티브 갤러리 또는 웹 파일 선택). 서버 저장은 이미지 업로드 API 연결 시 추가 */
type PhotoPickerOptions = {
  /** 사진 선택이 실패했을 때 호출. 화면이 자기 방식으로 알릴 때 사용(`message`와 별개) */
  onError?: (_error: Error) => void;
  /** 사진을 고른 직후 호출(취소는 호출 안 함). 조정 화면처럼 고른 뒤 바로 다음 단계로 갈 때 사용 */
  onSelect?: (_url: string) => void;
  /** 웹 파일 선택의 형식·크기 규칙. 기본은 JPEG·PNG·WebP 3MB */
  rules?: ImageFileRules;
  /** 앱 쉘의 시스템 정사각형 편집. false면 원본을 받아 웹이 자름(기본 true) */
  nativeEdit?: boolean;
};

export function usePhotoPicker({
  onError,
  onSelect,
  rules = DEFAULT_IMAGE_RULES,
  nativeEdit = true,
}: PhotoPickerOptions = {}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isPicking = useRef(false);
  const isMounted = useRef(true);
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const selectPhoto = async (read: () => Promise<string | null>) => {
    if (isPicking.current) return;
    isPicking.current = true;
    setIsPending(true);
    setMessage('');
    try {
      const url = await read();
      if (url && isMounted.current) {
        setPhotoUrl(url);
        setMessage('사진을 선택했어요.');
        onSelect?.(url);
      }
    } catch (error) {
      const failure = error instanceof Error ? error : new Error('사진을 선택하지 못했어요.');
      // 화면을 떠난 뒤 실패하면 알리지 않음(이동한 화면에 토스트가 뜨는 것 방지)
      if (isMounted.current) {
        setMessage(failure.message);
        onError?.(failure);
      }
    } finally {
      isPicking.current = false;
      if (isMounted.current) setIsPending(false);
    }
  };

  const handleCameraClick = () => {
    if (isPicking.current) return;
    if (!isNativeShell()) {
      inputRef.current?.click();
      return;
    }
    if (!galleryBridge.isNativeMethodAvailable('pickGalleryImage')) {
      const failure = new Error('갤러리를 사용하려면 개발 앱을 업데이트해 주세요.');
      setMessage(failure.message);
      onError?.(failure);
      return;
    }
    void selectPhoto(async () => {
      try {
        const result = await galleryBridge.pickGalleryImage(
          nativeEdit ? undefined : { edit: false },
        );
        return result === null ? null : galleryImageSchema.parse(result).dataUrl;
      } catch {
        throw new Error(
          '사진을 선택하지 못했어요. 다른 사진을 선택하거나 사진 접근 설정을 확인해 주세요.',
        );
      }
    });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (file) void selectPhoto(() => readWebImage(file, rules));
  };

  return { inputRef, photoUrl, isPending, message, handleCameraClick, handleFileChange };
}
