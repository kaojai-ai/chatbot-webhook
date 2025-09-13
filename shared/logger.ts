import pino from 'pino';
import PinoPretty from 'pino-pretty';
import pinoLoki, { LokiOptions } from 'pino-loki';
import { getTenantStore } from './tenantContext';
import { isDev, serviceName } from './development';

const isVercel = Boolean(process.env.VERCEL);

const LOG_LEVEL = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'); // what app emits
const PRINT_LEVEL = process.env.PRINT_LEVEL || LOG_LEVEL;                  // what we send to OTLP

const lokiHost = process.env.GRAFANA_LOKI_HOST;
const lokiUsername = process.env.GRAFANA_LOKI_USERNAME;
const lokiPassword = process.env.GRAFANA_LOKI_PASSWORD;

const logStreams = (isVercel) ?
  [{
    level: LOG_LEVEL as pino.Level, stream: PinoPretty({
      colorize: false,
      singleLine: true,
      ignore: 'pid,hostname,env,service,version',   // hide noise
      messageFormat: "{msg}"
    })
  }] : [{
    level: LOG_LEVEL as pino.Level, stream: PinoPretty({
      colorize: true,
      // singleLine: true,
      translateTime: 'HH:MM:ss.l',
      ignore: 'pid,hostname,env,service,version',   // hide noise
    })
  }]


if (lokiHost && lokiPassword && lokiUsername) {
  logStreams.push({
    level: LOG_LEVEL as pino.Level, stream: pinoLoki({
      batching: true,
      interval: 5,
      host: lokiHost,
      basicAuth: {
        username: lokiUsername,
        password: lokiPassword,
      },
      structuredMetaKey: 'meta',
      convertArrays: true,
      labels: {
        service: serviceName,
        env: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || 'unknown',
      },
      propsToLabels: ['tenant_id', 'tenant_slug', 'tenant_id_short', 'tenant_slug_short'],
      logFormat: '[{tenant_slug_short}] {msg}',
    } as LokiOptions
    )
  });
} else {
  console.log(
    'LOKI LOGS NOT CONFIGURED PROPERLY, Need GRAFANA_LOKI_HOST, GRAFANA_LOKI_USERNAME, GRAFANA_LOKI_PASSWORD environment variables'
  );
}

// Create Pino logger
const logger = pino(
  {
    level: PRINT_LEVEL,
    base: {
      service: serviceName,
      env: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version,
    },
    redact: {
      paths: [
        'req.headers.authorization',
        'authorization',
        '*.password',
        '*.token',
        '*.secret',
      ],
      remove: true,
    },
    mixin() {
      const tenantStore = getTenantStore();
      return {
        tenant_id: tenantStore?.tenantId || 'global',
        tenant_id_short: tenantStore?.tenantId?.substring(0, 8) || 'global',
        tenant_slug: tenantStore?.tenantSlug || 'global',
        tenant_slug_short: tenantStore?.tenantSlug?.substring(0, 8) || 'global',
      };
    },
    hooks: {
      logMethod(inputArgs, method, level) {
        if (inputArgs.length >= 2) {
          const arg1 = inputArgs.shift()
          let newArg = arg1
          if (typeof arg1 === "object" && !('meta' in (arg1 as object)) && !(arg1 instanceof Error)) {
            const { err, ...rest } = arg1 as Record<string, unknown>
            const nonNullRess = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, String(v)]).filter(([_, v]) => v != null))
            newArg = err instanceof Error
              ? { meta: { ...nonNullRess, errorMessage: err.message, errorStack: err.stack, errorName: err.name } }
              : { meta: nonNullRess }
          } else if (arg1 instanceof Error) {
            newArg = { meta: { errorMessage: arg1.message, errorStack: arg1.stack, errorName: arg1.name } }
          }
          const arg2 = inputArgs.shift() as string
          return method.apply(this, [newArg, arg2, ...inputArgs])
        }
        return method.apply(this, inputArgs);
      },
    },
  },
  pino.multistream(logStreams)
);

export default logger;

