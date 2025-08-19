import { createWebhook1 } from './webhooks/webhook1';
import { createWebhook2 } from './webhooks/webhook2';

// Default ports
const PORT1 = process.env.PORT1 || 3000;
const PORT2 = process.env.PORT2 || 3001;

// Start both webhook servers
createWebhook1(Number(PORT1));
createWebhook2(Number(PORT2));
