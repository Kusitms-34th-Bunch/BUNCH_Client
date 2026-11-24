import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { APP_STORE_URL } from '@/shared/constants/site';
import { AppInstallGuide } from './AppInstallGuide';

describe('AppInstallGuide', () => {
  it('제목과 App Store 설치 링크를 보여 주고 Android 설치는 두지 않는다', () => {
    render(<AppInstallGuide />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      '함께한 순간은휴대폰에서 모여요',
    );
    expect(screen.getByRole('link', { name: 'iOS 앱 설치하기' })).toHaveAttribute(
      'href',
      APP_STORE_URL,
    );
    expect(screen.queryByText(/Android/)).not.toBeInTheDocument();
  });
});
