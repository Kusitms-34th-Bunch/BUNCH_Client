import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from './shared/monitoring/sentry';

Sentry.init(sentryOptions);
