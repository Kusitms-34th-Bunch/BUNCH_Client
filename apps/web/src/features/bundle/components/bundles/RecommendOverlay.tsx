'use client';

import { BundleRecommendSheet } from '@app/design-system/web';
import { type ComponentProps, useState } from 'react';

type RecommendOverlayProps = Omit<
  ComponentProps<typeof BundleRecommendSheet>,
  'selectedId' | 'onSelect'
> & {
  initialPickedId: string | undefined;
  onPick: (_id: string) => void;
};

/** 시트가 열린 채 카드를 눌러도(사진이 사라진 추천) 선택 모양이 바뀌게 함(overlay는 열 때의 값으로 그려짐) */
export function RecommendOverlay({ initialPickedId, onPick, ...props }: RecommendOverlayProps) {
  const [pickedId, setPickedId] = useState(initialPickedId);
  return (
    <BundleRecommendSheet
      {...props}
      selectedId={pickedId}
      onSelect={(id) => {
        setPickedId(id);
        onPick(id);
      }}
    />
  );
}
