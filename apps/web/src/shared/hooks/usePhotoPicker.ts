import { galleryImageSchema } from '@app/bridge';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { galleryBridge, isNativeShell } from '@/shared/bridge/client';

const MAX_WEB_FILE_SIZE = 3 * 1024 * 1024;
const WEB_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function readWebImage(file: File): Promise<string> {
  if (!WEB_IMAGE_TYPES.includes(file.type) || file.size > MAX_WEB_FILE_SIZE) {
    return Promise.reject(new Error('3MB 이하의 JPEG, PNG, WebP 사진을 선택해 주세요.'));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('이 사진은 사용할 수 없어요.'));
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('이 사진은 사용할 수 없어요.'));
        return;
      }
      const dataUrl = reader.result;
      const image = new Image();
      image.onload = () => resolve(dataUrl);
      image.onerror = () => reject(new Error('이 사진은 사용할 수 없어요.'));
      image.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/** 사진 선택과 임시 미리보기(네이티브 갤러리 또는 웹 파일 선택). 서버 저장은 이미지 업로드 API 연결 시 추가 */
type PhotoPickerOptions = {
  /** 사진 선택이 실패했을 때 호출. 화면이 자기 방식으로 알릴 때 쓴다(`message`와 별개) */
  onError?: (_error: Error) => void;
};

export function usePhotoPicker({ onError }: PhotoPickerOptions = {}) {
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
      }
    } catch (error) {
      const failure = error instanceof Error ? error : new Error('사진을 선택하지 못했어요.');
      if (isMounted.current) setMessage(failure.message);
      onError?.(failure);
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
        const result = await galleryBridge.pickGalleryImage();
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
    if (file) void selectPhoto(() => readWebImage(file));
  };

  return { inputRef, photoUrl, isPending, message, handleCameraClick, handleFileChange };
}
