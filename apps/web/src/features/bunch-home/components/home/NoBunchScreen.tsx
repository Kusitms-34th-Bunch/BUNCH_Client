import { Button } from '@app/design-system';
import { PageShell } from '@/shared/components/layout/PageShell';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';

/**
 * 참여 중인 번치가 없을 때의 번치 탭(기능명세 5.1.7, Figma 1892:36523): 헤더·「+」 없이 안내와 시작 버튼
 */
type NoBunchScreenProps = {
  onCreateBunch: () => void;
  onJoinBunch: () => void;
};

export function NoBunchScreen({ onCreateBunch, onJoinBunch }: NoBunchScreenProps) {
  return (
    <PageShell>
      {/* 안내 이미지와 문구 사이 18, 제목·설명 6, 문구와 버튼 사이 44, 버튼 사이 10(안내 이미지는 최종본 전달 전 자리표시) */}
      <div className="px-padding-p8 flex min-h-full items-center justify-center">
        <div className="gap-s17 flex w-full flex-col">
          <div className="gap-s9 flex flex-col items-center text-center">
            <div aria-hidden="true" className="bg-surface-tertiary h-36 w-43" />
            <div className="gap-s3 flex flex-col items-center">
              {/* 헤더가 없어 보이는 안내가 화면 제목 */}
              <h1 className="typography-body-1-medium text-text-secondary">
                {BUNCH_HOME_MESSAGES.noBunchTitle}
              </h1>
              <p className="typography-caption-1-regular text-text-tertiary">
                {BUNCH_HOME_MESSAGES.noBunchDescription}
              </p>
            </div>
          </div>
          <div className="gap-s5 flex flex-col">
            <Button className="w-full" onClick={onCreateBunch}>
              새 번치 만들기
            </Button>
            <Button variant="tertiary" className="w-full" onClick={onJoinBunch}>
              초대 링크 참여하기
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
