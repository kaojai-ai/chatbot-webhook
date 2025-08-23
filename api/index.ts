import { createWebhook } from './webhooks/webhook';

// Default ports
const PORT1 = process.env.PORT1 || 3000;

// Start both webhook servers
createWebhook(Number(PORT1));
