import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from './src/shared/monitoring/sentry';

Sentry.init(sentryOptions);
