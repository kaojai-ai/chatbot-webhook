export const isDev = ["local", "dev"].includes(process.env.NODE_ENV || "");

export const serviceName = process.env.OTEL_SERVICE_NAME || 'kj-checkslip-bot';
