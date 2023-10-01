const path = require('path');

const LoggersManager = require(`${__dirname}/../libs/LoggersManager.js`);
const CacheManager = require(`${__dirname}/../libs/CacheManager.js`);
const WatchersManager = require(`${__dirname}/../libs/WatchersManager.js`);
const ScriptsManager = require(`${__dirname}/../libs/ScriptsManager.js`);
const AppEventsWatcher = require(`${__dirname}/../components/watcher/AppEventsWatcher.js`);
const CustomObject = require(`${__dirname}/CustomObject.js`);
const ExecPool = require(`${__dirname}/ExecPool.js`);
const ConnectionsPool = require(`${__dirname}/ConnectionsPool.js`);

class Application extends CustomObject {
  constructor(configFilePath) {
    super(null, 'Application', require(configFilePath));

    this.application = this;

    this.config = Object.assign({
      caching: {},
      loggers: {},
      watchers: {},
      scripts: {},
      globals: {},
    }, this.config);

    this.config.globals = Object.assign({
      onStart: {},
      onError: {},
    }, this.config.globals);

    this.config.globals.onStart = Object.assign({
      composing: {},
    }, this.config.globals.onStart);

    this.config.globals.onError = Object.assign({
      composing: {},
    }, this.config.globals.onError);

    this.config.globals.onStart.composing = Object.assign({
      hostInfo: false,
    }, this.config.globals.onStart.composing);

    this.config.globals.onError.composing = Object.assign({
      hostInfo: false,
    }, this.config.globals.onError.composing);

    this.configFilePath = configFilePath;
    this.connectionsPool = null;
    this.execPool = null;
    this.loggersManager = null;
    this.cacheManager = null;
    this.watchersManager = null;
    this.scriptsManager = null;
    this.appStartWatcher = null;
    this.appErrorsWatcher = null;
    this.toolMode = true;
    this.processingFatalError = false;
    this.gcRoutines = [];
  }

  // get

  getConfigFileName() {
    return path.basename(this.configFilePath);
  }

  getConfigFilePath() {
    return this.configFilePath;
  }

  getConnectionsPool() {
    if (!this.connectionsPool) {
      this.connectionsPool = new ConnectionsPool(this);
    }

    return this.connectionsPool;
  }

  getExecPool() {
    if (!this.execPool) {
      this.execPool = new ExecPool(this);
    }

    return this.execPool;
  }

  getLoggersManager() {
    if (!this.loggersManager) {
      this.loggersManager = new LoggersManager(this, this.getConfig().loggers);
    }

    return this.loggersManager;
  }

  getCacheManager() {
    if (!this.cacheManager) {
      this.cacheManager = new CacheManager(this, this.getConfig().caching);
    }

    return this.cacheManager;
  }

  getWatchersManager() {
    if (!this.watchersManager) {
      this.watchersManager = new WatchersManager(this, this.getConfig().watchers);
    }

    return this.watchersManager;
  }

  getScriptsManager() {
    if (!this.scriptsManager) {
      this.scriptsManager = new ScriptsManager(this, this.getConfig().scripts);
    }

    return this.scriptsManager;
  }

  getLocation() {
    return this.getScalarValue(this.getConfig().globals.location);
  }

  isToolMode() {
    return this.isToolMode;
  }

  getAppStartWatcher() {
    if (!this.appStartWatcher) {
      this.appStartWatcher = new AppEventsWatcher(this, 'AppStartWatcher', this.getConfig().globals.onStart);
    }

    return this.appStartWatcher;
  }

  getAppErrorsWatcher() {
    if (!this.appErrorsWatcher) {
      this.appErrorsWatcher = new AppEventsWatcher(this, 'AppErrorsWatcher', this.getConfig().globals.onError);
    }

    return this.appErrorsWatcher;
  }

  start() {
    this.toolMode = false;

    this.getLoggersManager().start().then(() => {
      return this.getCacheManager().start();
    }).then(() => {
      return this.getScriptsManager().start();
    }).then(() => {
      return this.getWatchersManager().start();
    }).then(() => {
      return this.notify(this.getAppStartWatcher().getLoggers(), {
        message: 'Watcher started',
      }, {}, this.getAppStartWatcher());
    }).catch((initializationError) => {
      console.log(initializationError);
      this.reportError(initializationError).then(() => {
        this.die();
      }).catch((additionalError) => {
        this.getConsole().error(additionalError);
        this.die();
      });
    });

    setInterval(() => {
      this.gcRoutines.forEach((callback) => {
        callback.call(this);
      });
    }, 5 * 60 * 1000);
  }

  stop() {
    if (this.watchersManager) {
      this.watchersManager.stop();
    }

    if (this.scriptsManager) {
      this.scriptsManager.stop();
    }

    if (this.loggersManager) {
      this.loggersManager.stop();
    }

    if (this.cacheManager) {
      this.cacheManager.stop();
    }

    if (this.execPool) {
      this.execPool.stop();
    }

    if (this.connectionsPool) {
      this.connectionsPool.stop();
    }
  }

  getConsole() {
    return {
      log: (message, details, senders) => {
        return this.notifyLogger('ConsoleLogger', (typeof message == 'string' ? {
          message: message,
        } : message), details, senders);
      },
      error: (message, details, senders) => {
        return this.notifyLogger('ConsoleLogger', (typeof message == 'string' ? {
          message: message,
          isError: true,
        } : message), details, senders);
      },
    };
  }

  convertLoggerNamesToLoggers(loggersOrNames, except) {
    loggersOrNames = loggersOrNames || [];

    if (loggersOrNames && !Array.isArray(loggersOrNames)) {
      loggersOrNames = [loggersOrNames];
    }

    let result = [];
    let logger;

    for (let i = 0; i < loggersOrNames.length; i++) {
      logger = loggersOrNames[i];
      if (typeof logger == 'string') {
        logger = this.getLoggersManager().getInstance(logger);
      }
      if ((result.indexOf(logger) == -1) && (!except || (logger != except))) {
        result.push(logger);
      }
    }

    return result;
  }

  registerGCRoutine(callback) {
    this.gcRoutines.push(callback);
  }

  die() {
    process.exit(1);
  }

  fatalError(message, sender) {
    if (this.processingFatalError) {
      return;
    }

    this.processingFatalError = true;

    if (this.isToolMode()) {
      throw message;
    } else {
      let data = (typeof message == 'string' ? {
        message: message,
      } : message);

      data.isFatalError = true;
      this.reportError(data, {}, sender).then(() => {
        this.die();
      }).catch(() => {
        this.die();
      });
    }
  }

  reportError(message, details, senders, sender) {
    senders = senders || [];

    let data = (typeof message == 'string' ? {
      message: message,
    } : message);

    data.isError = true;
    data.isAppError = true;

    if (senders && !Array.isArray(senders)) {
      senders = [senders];
    }

    if (senders.indexOf(this.getAppErrorsWatcher()) == -1) {
      senders = [this.getAppErrorsWatcher()].concat(senders);
    }

    // check if sender already in the list of senders - so he already reported this error
    if (!sender || (senders.indexOf(sender) == -1)) {

      if (sender) {
        senders.push(sender);
      }

      let loggers = this.convertLoggerNamesToLoggers(this.getAppErrorsWatcher().getLoggers(), sender);

      return this.notify(loggers, data, details, senders);
    }

    // and if so - do nothing
    return Promise.resolve();
  }

  notifyLogger(loggerOrName, data, details, senders, config) {
    return new Promise((resolve, reject) => {
      if (data) {
        senders = senders || [];

        if (senders && !Array.isArray(senders)) {
          senders = [senders];
        }

        let logger = loggerOrName;

        if (typeof logger == 'string') {
          logger = this.getLoggersManager().getInstance(logger);
        }

        if (!config && (senders.length > 0)) {
          config = config || senders[0].getOverrides('loggers', logger.getName());
        }

        data = data || {};
        details = details || {};
        config = config || {};

        details = JSON.parse(JSON.stringify(details));
        config = JSON.parse(JSON.stringify(config));

        let cache = logger.getCache(data.isError);

        if (data.message && !this.getApplication().isToolMode() && cache) {
          let cacheKey = data.cacheKey || data.message;
          cache.check(cacheKey).then(() => {
            resolve();
          }).catch(() => {
            logger.log(data, details, senders, config).then(() => {
              resolve();
            }).catch((error) => {
              reject(error);
            });
          });
        } else {
          logger.log(data, details, senders, config).then(() => {
            resolve();
          }).catch((error) => {
            reject(error);
          });
        }
      } else {
        resolve();
      }
    });
  }

  notify(loggersOrNames, data, details, senders, config) {
    return new Promise((resolve, reject) => {
      if (data) {
        senders = senders || [];

        if (senders && !Array.isArray(senders)) {
          senders = [senders];
        }

        this.notifyLogger('ConsoleLogger', data, details, senders);

        let loggers = this.convertLoggerNamesToLoggers(loggersOrNames);

        if (loggers.length > 0) {
          details = Object.assign({}, details);

          let cache = senders[0].getCache(data.isError);

          if (data.message && senders && cache) {
            let cacheKey = data.cacheKey || data.message;
            cache.check(cacheKey).then(() => {
              resolve();
            }).catch(() => {
              let results = [];
              for (let i = 0; i < loggers.length; i++) {
                results.push(this.notifyLogger(loggers[i], data, details, senders, config));
              }
              Promise.all(results).then(() => {
                resolve();
              }).catch((error) => {
                reject(error);
              });
            });
          } else {
            let results = [];
            for (let i = 0; i < loggers.length; i++) {
              results.push(this.notifyLogger(loggers[i], data, details, senders, config));
            }
            Promise.all(results).then(() => {
              resolve();
            }).catch((error) => {
              reject(error);
            });
          }
        } else {
          resolve();
        }
      } else {
        resolve();
      }
    });
  }
}

module.exports = Application;