import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

const MOBILE_UA_REGEX = /mobile|android|iphone|ipad|ipod|blackberry|windows phone/i;

function parseBrowser(ua: string): string {
  if (!ua) return 'unknown';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('OPR') || ua.includes('Opera')) return 'Opera';
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('curl')) return 'curl';
  return 'other';
}

function parseRefererDomain(referer: string): string {
  if (!referer) return 'direct';
  try {
    return new URL(referer).hostname;
  } catch {
    return 'unknown';
  }
}

function normalizePath(url: string): string {
  const path = url.split('?')[0];
  return path.replace(/\/\d+/g, '/:id');
}

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metrics: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    if (req.originalUrl === '/metrics') {
      return next();
    }

    const start = process.hrtime.bigint();
    const method = req.method;
    const path = normalizePath(req.originalUrl);

    this.metrics.concurrentHttpRequests.inc();

    const ua = (req.headers['user-agent'] as string) || '';
    const referer = (req.headers['referer'] as string) || '';

    const browser = parseBrowser(ua);
    this.metrics.apiRequestsByUserAgent.labels(browser).inc();

    const domain = parseRefererDomain(referer);
    this.metrics.apiRequestsByReferer.labels(domain).inc();

    if (MOBILE_UA_REGEX.test(ua)) {
      this.metrics.totalMobileRequests.inc();
    } else {
      this.metrics.totalWebRequests.inc();
    }

    res.on('finish', () => {
      const durationNs = process.hrtime.bigint() - start;
      const durationSec = Number(durationNs) / 1e9;
      const statusCode = res.statusCode.toString();

      this.metrics.apiRequestsTotal.labels(method, path, statusCode).inc();
      this.metrics.apiRequestDuration.labels(method, path).observe(durationSec);
      this.metrics.concurrentHttpRequests.dec();

      if (res.statusCode >= 500) {
        this.metrics.apiRequestErrorsTotal.labels(method, path).inc();
      }
    });

    next();
  }
}
