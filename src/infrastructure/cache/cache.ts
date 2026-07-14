import { createClient, RedisClientType } from "redis";
import config from "../../config";
import logger from "../../utils/logger";

class RedisCache {
  private client: RedisClientType;
  private isConnected = false;

  constructor() {
    this.client = createClient({
      url: config.redis.url,
    });

    this.client.on("connect", () => {
      this.isConnected = true;
      logger.info("Redis connected");
    });

    this.client.on("end", () => {
      this.isConnected = false;
      logger.warn("Redis disconnected");
    });

  this.client.on("error", (error) => {
    console.error(error);
    logger.error("Redis error", {
      message: error.message,
      stack: error.stack,
    });
  });
  }

  async connect() {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  async disconnect() {
    if (this.isConnected) {
      await this.client.quit();
    }
  }

  get clientInstance() {
    return this.client;
  }

  async get(key: string) {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number) {
    if (ttl) {
      await this.client.set(key, value, {
        EX: ttl,
      });
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string) {
    await this.client.del(key);
  }

  async exists(key: string) {
    return (await this.client.exists(key)) === 1;
  }

  async getJSON<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    return value ? JSON.parse(value) : null;
  }

  async setJSON(key: string, value: unknown, ttl?: number) {
    await this.set(key, JSON.stringify(value), ttl);
  }

  async incr(key: string) {
    return this.client.incr(key);
  }

  async decr(key: string) {
    return this.client.decr(key);
  }
}

export default new RedisCache();