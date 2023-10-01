const md5 = require('md5');
const parseDuration = require('parse-duration');
const moment = require('moment');

const CustomCache = require(`${__dirname}/../../libs/CustomCache.js`);

class SessionCache extends CustomCache {
  constructor(application, name, config) {
    super(application, name, config);

    this.cacheData = {};

    this.config.settings = Object.assign({
      lifespan: '5 min',
    }, this.config.settings);

    this.config.settings.lifespanSeconds = parseDuration(this.config.settings.lifespan) / 1000;
  }

  getKey(name) {
    return md5(name);
  }

  check(name) {
    return new Promise((resolve, reject) => {
      let cachedValue = this.cacheData[this.getKey(name)];
      let found = false;

      if (cachedValue) {
        found = (moment().unix() - cachedValue.timestamp < this.getConfig().settings.lifespanSeconds);
      }

      cachedValue = {
        timestamp: moment().unix(),
        value: 1,
      };

      this.cacheData[this.getKey(name)] = cachedValue;

      if (found) {
        resolve();
      } else {
        reject();
      }
    });
  }

  get(name, callback) {
    let cachedValue = this.cacheData[this.getKey(name)];

    callback(cachedValue ? cachedValue.value : cachedValue);
  }

  set(name, value) {
    this.cacheData[this.getKey(name)] = {
      timestamp: moment().unix(),
      value: value,
    };
  }

  start() {
    return Promise.resolve();
  }

  stop() {

  }
}

module.exports = SessionCache;