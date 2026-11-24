import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { sentryOptions } from './shared/config/sentry';

// zod의 파서 컴파일(new Function) 끄기. CSP가 eval을 막아 매 화면 위반 보고가 생김(#558)
// schema를 만들 때 읽는 값이라 schema를 만드는 import보다 먼저 실행
z.config({ jitless: true });

Sentry.init(sentryOptions);
