import { Injectable } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService {
  public readonly registry: client.Registry;

  public readonly apiRequestsTotal: client.Counter<string>;
  public readonly apiRequestErrorsTotal: client.Counter<string>;
  public readonly concurrentHttpRequests: client.Gauge<string>;
  public readonly apiRequestDuration: client.Histogram<string>;
  public readonly apiRequestsByUserAgent: client.Gauge<string>;
  public readonly apiRequestsByReferer: client.Gauge<string>;
  public readonly totalMobileRequests: client.Gauge<string>;
  public readonly totalWebRequests: client.Gauge<string>;

  constructor() {
    this.registry = new client.Registry();

    this.apiRequestsTotal = new client.Counter({
      name: 'api_requests_total',
      help: 'Total number of API requests',
      labelNames: ['method', 'path', 'status_code'],
      registers: [this.registry],
    });

    this.apiRequestErrorsTotal = new client.Counter({
      name: 'api_request_errors_total',
      help: 'Total number of API request errors (5xx)',
      labelNames: ['method', 'path'],
      registers: [this.registry],
    });

    this.concurrentHttpRequests = new client.Gauge({
      name: 'concurrent_http_requests',
      help: 'Number of concurrent HTTP requests being processed',
      registers: [this.registry],
    });

    this.apiRequestDuration = new client.Histogram({
      name: 'api_request_duration_seconds',
      help: 'API request duration in seconds',
      labelNames: ['method', 'path'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.apiRequestsByUserAgent = new client.Gauge({
      name: 'api_requests_by_user_agent',
      help: 'Request counts by user agent browser',
      labelNames: ['user_agent'],
      registers: [this.registry],
    });

    this.apiRequestsByReferer = new client.Gauge({
      name: 'api_requests_by_referer',
      help: 'Request counts by referer domain',
      labelNames: ['referer'],
      registers: [this.registry],
    });

    this.totalMobileRequests = new client.Gauge({
      name: 'total_mobile_requests',
      help: 'Total number of requests from mobile devices',
      registers: [this.registry],
    });

    this.totalWebRequests = new client.Gauge({
      name: 'total_web_requests',
      help: 'Total number of requests from web browsers',
      registers: [this.registry],
    });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}
