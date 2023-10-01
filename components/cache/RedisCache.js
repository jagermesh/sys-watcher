const md5 = require('md5');
const redis = require('redis');
const parseDuration = require('parse-duration');

const CustomCache = require(`${__dirname}/../../libs/CustomCache.js`);

class RedisCache extends CustomCache {
  constructor(application, name, config) {
    super(application, name, config);

    this.appId = '8ad4edee-4482-4124-8169-03fd856de190';

    this.config.settings = Object.assign({
      lifespan: '5 min',
      connectString: '',
    }, this.config.settings);

    this.config.settings.lifespanSeconds = parseDuration(this.config.settings.lifespan) / 1000;
  }

  getKey(name) {
    return this.appId + ':' + md5(name);
  }

  check(name) {
    return new Promise((resolve, reject) => {
      if (this.instance) {
        this.instance.getset(this.getKey(name), 1, (error, cachedValue) => {
          try {
            this.set(name, 1);
            if (cachedValue) {
              resolve(cachedValue);
            } else {
              reject();
            }
          } catch (ex) {
            reject();
          }
        });
      } else {
        reject();
      }
    });
  }

  get(name, callback) {
    if (this.instance) {
      try {
        this.instance.get(this.getKey(name), (error, value) => {
          callback(value);
        });
      } catch (Error) {
        callback(null);
      }
    } else {
      callback(null);
    }
  }

  set(name, value) {
    if (this.instance) {
      this.instance.set(this.getKey(name), value, 'EX', this.getConfig().settings.lifespanSeconds);
    }
  }

  start() {
    let inStart = true;

    return new Promise((resolve, reject) => {
      const redisClient = redis.createClient(this.getConfig().settings.connectString);

      redisClient.on('connect', () => {
        redisClient.stream.setKeepAlive(true, 60 * 1000);
        if (!inStart) {
          this.getApplication().getConsole().log('Redis re-connected', {}, this);
        }
        if (inStart) {
          inStart = false;
          this.getApplication().getConsole().log('Redis connected', {}, this);
          resolve();
        }
        this.instance = redisClient;
      });

      redisClient.on('error', (error) => {
        if (!inStart) {
          this.getApplication().getConsole().error('Redis error ' + error.toString(), {}, this);
        }
        if (inStart) {
          inStart = false;
          reject('Redis error: ' + error.toString(), this);
        }
      });

      redisClient.on('end', () => {
        this.instance = null;
      });
    });
  }

  stop() {
    if (this.cacheImpl) {
      this.cacheImpl.quit();
    }
  }
}

module.exports = RedisCache;