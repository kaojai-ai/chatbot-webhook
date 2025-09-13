import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { type Counter, type Histogram, type Attributes, MetricOptions } from '@opentelemetry/api';
import { getTenantStore } from './tenantContext';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

const metricExporter = new OTLPMetricExporter();
const serviceName = process.env.OTEL_SERVICE_NAME || 'kj-checkslip-bot';

const resource = new Resource({
  [ATTR_SERVICE_NAME]: serviceName,
});

const meterProvider = new MeterProvider({
  resource,
  readers: [
    new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 60000, // every 60s
    })
  ]
});

const meter = meterProvider.getMeter(serviceName);

function createTenantAwareCounter(name: string, options: MetricOptions): Counter {
  const counter = meter.createCounter(name, options);
  return new Proxy(counter, {
    get(target, prop, receiver) {
      if (prop === 'add') {
        return (value: number, attributes: Attributes = {}) => {
          const tenantStore = getTenantStore();
          if (tenantStore?.tenantId) {
            attributes = { [ATTR_SERVICE_NAME]: serviceName, tenant_id: tenantStore.tenantId, tenant_slug: tenantStore.tenantSlug, ...attributes };
          }
          return (target as Counter).add(value, attributes);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

function createTenantAwareHistogram(name: string, options: MetricOptions): Histogram {
  const histogram = meter.createHistogram(name, options);
  return new Proxy(histogram, {
    get(target, prop, receiver) {
      if (prop === 'record') {
        return (value: number, attributes: Attributes = {}) => {
          const tenantStore = getTenantStore();
          attributes = { ...attributes, env: process.env.NODE_ENV || 'development' };
          if (tenantStore?.tenantId) {
            attributes = { [ATTR_SERVICE_NAME]: serviceName, tenant_id: tenantStore.tenantId, tenant_slug: tenantStore.tenantSlug, ...attributes };
          }
          return (target as Histogram).record(value, attributes);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

export const emailReadCounter = createTenantAwareCounter('email_read', {
  description: 'Number of emails read',
});

export const emailProcessedCounter = createTenantAwareCounter('email_processed', {
  description: 'Number of emails processed',
});

export const replyEmailCounter = createTenantAwareCounter('reply_email', {
  description: 'Number of reply emails sent',
});

export const paymentSlipVerificationCounter = createTenantAwareCounter('payment_slip_verification_result', {
  description: 'Payment slip verification results',
});

export const externalApiCallCounter = createTenantAwareCounter('external_api_call', {
  description: 'Number of external API calls',
});

export const externalApiDuration = createTenantAwareHistogram('external_api_response_time', {
  description: 'External API response time',
  unit: 'milliseconds',
});

export default {
  emailReadCounter,
  emailProcessedCounter,
  replyEmailCounter,
  paymentSlipVerificationCounter,
  externalApiCallCounter,
  externalApiDuration,
};
