const crypto = require('crypto');
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

    this.config.settings.lifespanSeconds = parseDuration.default(this.config.settings.lifespan) / 1000;
  }

  getKey(name) {
    return crypto.createHash('sha1').update(name, 'utf8').digest('hex');
  }

  purgeExpired() {
    let now = moment().unix();
    let lifespan = this.getConfig().settings.lifespanSeconds;

    for (let key in this.cacheData) {
      if (now - this.cacheData[key].timestamp >= lifespan) {
        delete this.cacheData[key];
      }
    }
  }

  check(name) {
    return new Promise((resolve, reject) => {
      let key = this.getKey(name);
      let cachedValue = this.cacheData[key];
      let found = false;

      if (cachedValue) {
        found = (moment().unix() - cachedValue.timestamp < this.getConfig().settings.lifespanSeconds);
      }

      this.cacheData[key] = {
        timestamp: moment().unix(),
        value: 1,
      };

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
    this.getApplication().registerGCRoutine(() => {
      this.purgeExpired();
    });

    return Promise.resolve();
  }

  stop() {
    this.cacheData = {};
  }
}

module.exports = SessionCache;
