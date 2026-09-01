import { Queue } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

export const redisConnection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const prReviewQueue = new Queue('pr-review-queue', { 
  connection: redisConnection 
});