import { describe, expect, it } from 'vitest';
import { GET } from './route';

describe('apple-app-site-association', () => {
  it('초대 링크 경로만 앱(팀 ID.번들 ID)에 연결한다', async () => {
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.json()).toEqual({
      applinks: {
        details: [
          {
            appIDs: ['9CGCR9499H.kr.bunch.app'],
            components: [{ '/': '/invite/*', comment: '초대 링크' }],
          },
        ],
      },
    });
  });
});
