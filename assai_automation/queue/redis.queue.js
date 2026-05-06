const { createClient } = require('redis');

class CatalogRedisQueue {
  constructor(redisConfig) {
    this.redisConfig = redisConfig;
    this.client = null;
  }

  async connect() {
    if (this.client) return;

    this.client = createClient({
      url: this.redisConfig.url,
      password: this.redisConfig.password,
      database: this.redisConfig.database,
    });

    this.client.on('error', (err) => {
      console.error('[REDIS] erro de conexao:', err.message);
    });

    await this.client.connect();
  }

  async close() {
    if (!this.client) return;
    await this.client.quit();
    this.client = null;
  }

  async enqueueCatalogs(catalogs) {
    const queueKey = this.redisConfig.queueKey;
    const dedupeSetKey = this.redisConfig.dedupeSetKey;

    let inserted = 0;

    for (const catalog of catalogs) {
      const payload = JSON.stringify(catalog);
      const alreadyExists = await this.client.sIsMember(dedupeSetKey, catalog.code);
      if (alreadyExists) continue;

      await this.client.sAdd(dedupeSetKey, catalog.code);
      await this.client.rPush(queueKey, payload);
      inserted += 1;
    }

    return inserted;
  }

  async resetRunKeys() {
    await this.client.del(this.redisConfig.queueKey);
    await this.client.del(this.redisConfig.dedupeSetKey);
  }

  async popCatalog() {
    const payload = await this.client.lPop(this.redisConfig.queueKey);
    if (!payload) return null;

    return JSON.parse(payload);
  }

  async getStats() {
    const [pending, dedupe] = await Promise.all([
      this.client.lLen(this.redisConfig.queueKey),
      this.client.sCard(this.redisConfig.dedupeSetKey),
    ]);

    return {
      pending,
      dedupe,
    };
  }
}

module.exports = {
  CatalogRedisQueue,
};
