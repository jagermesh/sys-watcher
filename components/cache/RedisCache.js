const crypto = require('crypto');
const redis = require('redis');
const parseDuration = require('parse-duration');

const CustomCache = require(`${__dirname}/../../libs/CustomCache.js`);

class RedisCache extends CustomCache {
  constructor(application, name, config) {
    super(application, name, config);

    this.APP_ID = '8ad4edee-4482-4124-8169-03fd856de190';

    this.config.settings = Object.assign({
      lifespan: '5 min',
      connectString: '',
    }, this.config.settings);

    this.config.settings.lifespanSeconds = parseDuration.default(this.config.settings.lifespan) / 1000;
  }

  getKey(name) {
    const hash = crypto.createHash('sha1').update(name, 'utf8').digest('hex');
    return `${this.APP_ID}:${hash}`;
  }

  check(name) {
    return new Promise((resolve, reject) => {
      if (this.instance) {
        this.instance.get(this.getKey(name), 1).then((value) => {
          this.instance.set(this.getKey(name), 1, {
            EX: this.getConfig().settings.lifespanSeconds
          });
          if (value) {
            resolve(value);
          } else {
            reject('Value not found in cache');
          }
        }).catch((error) => {
          reject(error);
        });
      } else {
        reject('Redis not connected');
      }
    });
  }

  get(name, callback) {
    if (this.instance) {
      try {
        this.instance.get(this.getKey(name)).then((value) => {
          callback(value);
        }).catch(() => {
          callback(null);
        });
      } catch {
        callback(null);
      }
    } else {
      callback(null);
    }
  }

  set(name, value) {
    if (this.instance) {
      this.instance.set(this.getKey(name), value, {
        EX: this.getConfig().settings.lifespanSeconds
      });
    }
  }

  start() {
    let inStart = true;

    return new Promise((resolve, reject) => {
      const redisClient = redis.createClient({
        url: this.getConfig().settings.connectString,
      });
      redisClient.on('connect', () => {
        if (inStart) {
          inStart = false;
          this.getApplication().getConsole().log('Redis connected', {}, this);
          resolve();
        } else {
          this.getApplication().getConsole().log('Redis re-connected', {}, this);
        }
        this.instance = redisClient;
      });
      redisClient.on('error', (error) => {
        if (inStart) {
          inStart = false;
          reject(error);
        } else {
          this.getApplication().getConsole().error('Redis error', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            errors: error.errors, // важное поле у AggregateError
          }, this);
        }
      });
      redisClient.on('reconnecting', () => {
        this.instance = null;
      });
      redisClient.on('end', () => {
        this.instance = null;
      });
      redisClient.connect();
    });
  }

  stop() {
    if (this.instance) {
      this.instance.quit();
    }
  }
}

module.exports = RedisCache;