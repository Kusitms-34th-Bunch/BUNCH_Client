import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import manifest from './manifest';

const publicDir = join(process.cwd(), 'public');

describe('홈 화면 추가(PWA) 매니페스트', () => {
  const data = manifest();

  it('이름은 bunch이고 주소창 없는 앱으로 번치 탭에서 시작한다', () => {
    expect(data).toMatchObject({
      name: 'BUNCH',
      short_name: 'BUNCH',
      start_url: '/bunch',
      display: 'standalone',
      orientation: 'portrait',
    });
  });

  it('설치 가능 조건인 192·512 아이콘과 maskable 아이콘이 있고 파일이 실제로 있다', () => {
    const icons = data.icons ?? [];

    expect(icons.map((icon) => icon.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
    for (const icon of icons) {
      expect(existsSync(join(publicDir, icon.src))).toBe(true);
    }
  });

  it('iOS 홈 화면 아이콘(apple-touch-icon) 파일이 있다', () => {
    expect(existsSync(join(publicDir, 'icons', 'apple-touch-icon.png'))).toBe(true);
  });
});
