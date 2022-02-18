const md5 = require('md5');
const redis = require('redis');
const parseDuration = require('parse-duration');

const CustomCache = require(`${__dirname}/../../libs/CustomCache.js`);

function RedisCache(application, name, config) {
  CustomCache.call(this, application, name, config);

  const AppId = '8ad4edee-4482-4124-8169-03fd856de190';

  const _this = this;

  _this.config.settings.lifespan = _this.config.settings.lifespan || '5 min';
  _this.config.settings.lifespanSeconds = parseDuration(_this.config.settings.lifespan) / 1000;
  _this.config.settings.connectString = _this.config.settings.connectString || '';

  _this.cacheImpl = null;

  function getKey(name) {
    return AppId + ':' + md5(name);
  }

  _this.check = function(name) {
    return new Promise(function(resolve, reject) {
      if (_this.cacheImpl) {
        _this.cacheImpl.getset(getKey(name), 1, function(error, cachedValue) {
          try {
            _this.set(name, 1);
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
  };

  _this.get = function(name, callback) {
    if (_this.cacheImpl) {
      try {
        _this.cacheImpl.get(getKey(name), function(error, value) {
          callback(value);
        });
      } catch (Error) {
        callback(null);
      }
    } else {
      callback(null);
    }
  };

  _this.set = function(name, value) {
    if (_this.cacheImpl) {
      _this.cacheImpl.set(getKey(name), value, 'EX', _this.config.settings.lifespanSeconds);
    }
  };

  _this.start = function() {
    let inStart = true;

    return new Promise(function(resolve, reject) {
      const redisClient = redis.createClient(_this.config.settings.connectString);

      redisClient.on('connect', function() {
        if (!inStart) {
          _this.getApplication().getConsole().log('Redis re-connected', Object.create({}), _this);
        }
        if (inStart) {
          inStart = false;
          _this.getApplication().getConsole().log('Redis connected', Object.create({}), _this);
          resolve();
        }
        _this.cacheImpl = redisClient;
      });

      redisClient.on('error', function(error) {
        if (!inStart) {
          _this.getApplication().getConsole().error('Redis error ' + error.toString(), Object.create({}), _this);
        }
        if (inStart) {
          inStart = false;
          reject('Redis error: ' + error.toString(), _this);
        }
      });

      redisClient.on('end', function() {
        _this.cacheImpl = null;
      });
    });
  };

  _this.stop = function() {
    if (_this.cacheImpl) {
      _this.cacheImpl.quit();
    }
  };
}

module.exports = RedisCache;