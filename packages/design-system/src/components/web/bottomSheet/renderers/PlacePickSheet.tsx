'use client';

import { Button } from '../../../core/button';
import { PlacePickItem } from '../../placePickItem';
import { BottomSheet, type BottomSheetRootProps } from '../BottomSheet';

export type PlacePickSheetItem = {
  id: string;
  name: string;
  address?: string | undefined;
  /** 현재 번치의 콕한 장소에 담겨 있음 */
  picked: boolean;
};

export type PlacePickSheetProps = Omit<
  BottomSheetRootProps,
  'children' | 'disablePointerDismissal'
> & {
  places: PlacePickSheetItem[];
  /** 「콕하기」·「콕 했어요」를 눌렀을 때(담기·취소 확인은 호출자 담당) */
  onPick: (_placeId: string) => void;
};

/**
 * 장소 콕하기 시트(Figma `5367:112296`): 「어느 장소를 콕할까요?」, 장소 줄 목록, 「취소」
 * 항목을 눌러도 자동으로 닫지 않음
 */
export const PlacePickSheet = ({ places, onPick, ...rootProps }: PlacePickSheetProps) => (
  <BottomSheet.Root {...rootProps}>
    <BottomSheet.Content>
      <BottomSheet.Header>
        <BottomSheet.Title className="text-text-secondary">어느 장소를 콕할까요?</BottomSheet.Title>
      </BottomSheet.Header>
      {/* 줄이 좌우 16px 패딩을 가져 Body 기본 패딩을 없앰 */}
      <BottomSheet.Body className="px-0">
        <ul>
          {places.map(({ id, name, address, picked }) => (
            <li key={id}>
              <PlacePickItem
                name={name}
                address={address}
                picked={picked}
                onPick={() => onPick(id)}
              />
            </li>
          ))}
        </ul>
      </BottomSheet.Body>
      <BottomSheet.Footer>
        <Button variant="secondary" onClick={() => rootProps.onOpenChange(false)}>
          취소
        </Button>
      </BottomSheet.Footer>
    </BottomSheet.Content>
  </BottomSheet.Root>
);
