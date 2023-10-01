const CustomObject = require(`${__dirname}/CustomObject.js`);

class CustomLoggable extends CustomObject {
  constructor(application, name, config, owner) {
    super(application, name, config, owner);

    this.config = Object.assign({
      settings: {},
      overrides: {},
      loggers: [],
      scheduling: null,
    }, this.config);

    this.config.overrides = Object.assign({
      loggers: {},
    }, this.config.overrides);

    if (typeof this.config.loggers === 'string') {
      this.config.loggers = this.config.loggers.split(',');
    }

    this.scheduler = null;
  }

  start() {
    return Promise.resolve();
  }

  stop() {

  }

  getLoggers(including) {
    let result = this.getConfig().loggers;

    if (including) {
      if (typeof including === 'string') {
        including = including.split(',');
      }
      result = result.concat(including);
    }

    result = result.filter((value, index, self) => {
      return (self.indexOf(value) === index);
    });

    return result;
  }

  getErrorLoggers(including) {
    let result = this.getLoggers(including);

    if (result.length == 0) {
      result = this.getApplication().getAppErrorsWatcher().getLoggers();
    }

    return result;
  }

  needScheduler() {
    return !!this.getConfig().scheduling;
  }

  getScheduler() {
    if (!this.scheduler) {
      const Scheduler = require(`${__dirname}/Scheduler.js`);
      this.scheduler = new Scheduler(this.getApplication(), `${this.getName()}: Scheduler`, {
        settings: this.getConfig().scheduling,
      }, this);
    }

    return this.scheduler;
  }

  getCache(isError) {
    if (this.getConfig().cache) {
      let cacheCfg = {};
      if (typeof this.getConfig().cache == 'string') {
        cacheCfg.regular = this.getConfig().cache;
      } else {
        cacheCfg = this.getConfig().cache;
      }
      let cacheName;
      if (isError) {
        cacheName = cacheCfg.error ? cacheCfg.error : cacheCfg.regular;
      } else {
        cacheName = cacheCfg.regular;
      }
      if (cacheName) {
        return this.getApplication().getCacheManager().getInstance(cacheName);
      }
    }

    return null;
  }
}

module.exports = CustomLoggable;