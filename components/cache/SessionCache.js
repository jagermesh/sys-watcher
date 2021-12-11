const md5 = require('md5');
const parseDuration = require('parse-duration');
const moment = require('moment');

const CustomCache = require(`${__dirname}/../../libs/CustomCache.js`);

function SessionCache(application, name, config) {
  CustomCache.call(this, application, name, config);

  const _this = this;

  let cacheData = Object.create({});

  _this.config.settings.lifespan = _this.config.settings.lifespan || '5 min';
  _this.config.settings.lifespanSeconds = parseDuration(_this.config.settings.lifespan) / 1000;

  function getKey(name) {
    return md5(name);
  }

  _this.check = function(name) {
    return new Promise(function(resolve, reject) {
      let cachedValue = cacheData[getKey(name)];
      let found = false;

      if (cachedValue) {
        found = (moment().unix() - cachedValue.timestamp < _this.config.settings.lifespanSeconds);
      }

      cachedValue = {
        timestamp: moment().unix(),
        value: 1
      };

      cacheData[getKey(name)] = cachedValue;

      if (found) {
        resolve();
      } else {
        reject();
      }
    });
  };

  _this.get = function(name, callback) {
    let cachedValue = cacheData[getKey(name)];

    callback(cachedValue ? cachedValue.value : cachedValue);
  };

  _this.set = function(name, value) {
    cacheData[getKey(name)] = {
      timestamp: moment().unix(),
      value: value
    };
  };

  _this.start = function() {
    return Promise.resolve();
  };

  _this.stop = function() {

  };
}

module.exports = SessionCache;