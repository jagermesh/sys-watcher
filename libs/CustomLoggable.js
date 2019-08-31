const CustomObject = require(__dirname + '/CustomObject.js');

function CustomLoggable(application, name, config, owner) {

  CustomObject.call(this, application, name, config, owner);

  const _this = this;

  _this.config.settings          = _this.config.settings          || Object.create({ });
  _this.config.overrides         = _this.config.overrides         || Object.create({ });
  _this.config.overrides.loggers = _this.config.overrides.loggers || Object.create({ });
  _this.config.loggers           = _this.config.loggers           || [];
  _this.config.scheduling        = _this.config.scheduling        || null;

  if (typeof _this.config.loggers === 'string') {
    _this.config.loggers = _this.config.loggers.split(',');
  }

  let scheduler;

  _this.start = function() {

    return Promise.resolve();

  };

  _this.stop = function() {

  };

  _this.getLoggers = function(including) {

    let result = _this.getConfig().loggers;

    if (including) {
      if (typeof including === 'string') {
        including = including.split(',');
      }
      result = result.concat(including);
    }

    result = result.filter(function (value, index, self) {
      return (self.indexOf(value) === index);
    });

    return result;

  };

  _this.needScheduler = function() {

    return !!_this.getConfig().scheduling;

  };

  _this.getScheduler = function() {

    if (!scheduler) {
      const Scheduler = require(__dirname + '/Scheduler.js');
      scheduler = new Scheduler(_this.getApplication(), _this.getName() + ': Scheduler', { settings: _this.getConfig().scheduling }, _this);
    }

    return scheduler;

  };

  _this.getCache = function(isError) {

    if (_this.getConfig().cache) {
      let cacheCfg = Object.create({ });
      if (typeof _this.getConfig().cache == 'string') {
        cacheCfg.regular = _this.getConfig().cache;
      } else {
        cacheCfg = _this.getConfig().cache;
      }
      let cacheName;
      if (isError) {
        cacheName = cacheCfg.error ? cacheCfg.error : cacheCfg.regular;
      } else {
        cacheName = cacheCfg.regular;
      }
      if (cacheName) {
        return _this.getApplication().getCacheManager().getInstance(cacheName);
      }
    }

    return null;

  };

}

module.exports = CustomLoggable;
