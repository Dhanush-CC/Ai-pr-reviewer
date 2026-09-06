import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisConnection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

// CHANGED: Queue name updated to 'pr-review-v2'
export const prReviewQueue = new Queue('pr-review-v2', { 
  connection: redisConnection 
});