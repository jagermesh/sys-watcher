const LoggersManager = require(__dirname + '/../libs/LoggersManager.js');
const CacheManager = require(__dirname + '/../libs/CacheManager.js');
const WatchersManager = require(__dirname + '/../libs/WatchersManager.js');
const ScriptsManager = require(__dirname + '/../libs/ScriptsManager.js');
const AppEventsWatcher = require(__dirname + '/../components/watcher/AppEventsWatcher.js');
const CustomObject = require(__dirname + '/CustomObject.js');
const ExecPool = require(__dirname + '/ExecPool.js');
const ConnectionsPool = require(__dirname + '/ConnectionsPool.js');

function Application(configFile) {

  const _this = this;

  _this.configFile = configFile;

  let config = require(_this.configFile);

  CustomObject.call(this, this, 'Application', config);

  _this.config.globals = _this.config.globals || Object.create({ });

  _this.config.globals.onStart = _this.config.globals.onStart || Object.create({ });
  _this.config.globals.onStart.composing = _this.config.globals.onStart.composing || Object.create({ });
  _this.config.globals.onStart.composing.hostInfo = _this.config.globals.onStart.composing.hostInfo || false;

  _this.config.globals.onError = _this.config.globals.onError || Object.create({ });
  _this.config.globals.onError.composing = _this.config.globals.onError.composing || Object.create({ });
  _this.config.globals.onError.composing.hostInfo = _this.config.globals.onError.composing.hostInfo || false;

  _this.config.caching  = _this.config.caching  || Object.create({ });
  _this.config.loggers  = _this.config.loggers  || Object.create({ });
  _this.config.watchers = _this.config.watchers || Object.create({ });
  _this.config.scripts  = _this.config.scripts  || Object.create({ });

  let connectionsPool, execPool, loggersManager, cacheManager, watchersManager, scriptsManager, appStartWatcher, appErrorsWatcher;
  let isToolMode = true;
  let processingFatalError = false;
  let gcRoutines = [];

  // get

  _this.getConfigFile = function() {

    return _this.configFile;

  };

  _this.getConnectionsPool = function() {

    if (!connectionsPool) {
      connectionsPool = new ConnectionsPool(_this);
    }

    return connectionsPool;

  };

  _this.getExecPool = function() {

    if (!execPool) {
      execPool = new ExecPool(_this);
    }

    return execPool;

  };

  _this.getLoggersManager = function() {

    if (!loggersManager) {
      loggersManager = new LoggersManager(_this, _this.config.loggers);
    }

    return loggersManager;

  };

  _this.getCacheManager = function() {

    if (!cacheManager) {
      cacheManager = new CacheManager(_this, _this.config.caching);
    }

    return cacheManager;

  };

  _this.getWatchersManager = function() {

    if (!watchersManager) {
      watchersManager = new WatchersManager(_this, _this.config.watchers);
    }

    return watchersManager;

  };

  _this.getScriptsManager = function() {

    if (!scriptsManager) {
      scriptsManager = new ScriptsManager(_this, _this.config.scripts);
    }

    return scriptsManager;

  };

  _this.getConfig = function() {

    return _this.config;

  };

  _this.getLocation = function() {

    return _this.getScalarValue(_this.config.globals.location);

  };

  _this.isToolMode = function() {

    return isToolMode;

  };

  _this.getAppStartWatcher = function() {

    if (!appStartWatcher) {
      appStartWatcher = new AppEventsWatcher(_this, 'AppStartWatcher', _this.config.globals.onStart);
    }

    return appStartWatcher;

  };

  _this.getAppErrorsWatcher = function() {

    if (!appErrorsWatcher) {
      appErrorsWatcher = new AppEventsWatcher(_this, 'AppErrorsWatcher', _this.config.globals.onError);
    }

    return appErrorsWatcher;

  };

  _this.start = function() {

    isToolMode = false;

    _this.getLoggersManager().start().then(function() {
      return _this.getCacheManager().start();
    }).then(function() {
      return _this.getScriptsManager().start();
    }).then(function(result) {
      return _this.getWatchersManager().start();
    }).then(function(result) {
      return _this.notify(_this.getAppStartWatcher().getLoggers(), { message: 'Watcher started' }, Object.create({ }), _this.getAppStartWatcher());
    }).catch(function(initializationError) {
      _this.reportError(initializationError).then(function() {
        _this.die();
      }).catch(function(additionalError) {
        _this.getConsole().error(additionalError);
        _this.die();
      });
    });

    setInterval(function() {
      gcRoutines.forEach(function(callback) {
        callback.call(_this);
      });
    }, 5*60*1000);

  };

  _this.stop = function() {

    if (watchersManager) {
      watchersManager.stop();
    }

    if (scriptsManager) {
      scriptsManager.stop();
    }

    if (loggersManager) {
      loggersManager.stop();
    }

    if (cacheManager) {
      cacheManager.stop();
    }

    if (execPool) {
      execPool.stop();
    }

    if (connectionsPool) {
      connectionsPool.stop();
    }

  };

  _this.getConsole = function() {

    return {
      log: function (message, details, senders) {
        return _this.notifyLogger('ConsoleLogger', (typeof message == 'string' ? { message: message } : message), details, senders);
      }
    , error: function(message, details, senders) {
        return _this.notifyLogger('ConsoleLogger', (typeof message == 'string' ? { message: message, isError: true } : message), details, senders);
      }
    };

  };

  function convertLoggerNamesToLoggers(loggersOrNames, except) {

    loggersOrNames = loggersOrNames || [];

    if (loggersOrNames && !Array.isArray(loggersOrNames)) {
      loggersOrNames = [loggersOrNames];
    }

    let result = [];
    let logger;

    for(let i = 0; i < loggersOrNames.length; i++) {
      logger = loggersOrNames[i];
      if (typeof logger == 'string') {
        logger = _this.getLoggersManager().getInstance(logger);
      }
      if ((result.indexOf(logger) == -1) && (!except || (logger != except))) {
        result.push(logger);
      }
    }

    return result;

  }

  _this.registerGCRoutine = function(callback) {

    gcRoutines.push(callback);

  };

  _this.die = function() {

    process.exit(1);

  };

  _this.fatalError = function(message, sender) {

    if (processingFatalError) {
      return;
    }

    processingFatalError = true;

    if (_this.isToolMode()) {
      throw message;
    } else {
      let data = (typeof message == 'string' ? { message: message } : message);

      data.isFatalError = true;

      _this.reportError(data, Object.create({ }), sender).then(function() {
        _this.die();
      }).catch(function() {
        _this.die();
      });
    }

  };

  _this.reportError = function(message, details, senders, sender) {

    senders = senders || [];

    let data = (typeof message == 'string' ? { message: message } : message);

    data.isError = true;
    data.isAppError = true;

    if (senders && !Array.isArray(senders)) {
      senders = [senders];
    }

    if (senders.indexOf(_this.getAppErrorsWatcher()) == -1) {
      senders = [_this.getAppErrorsWatcher()].concat(senders);
    }

    // check if sender already in the list of senders - so he already reported this error
    if (!sender || (senders.indexOf(sender) == -1)) {

      if (sender) {
        senders.push(sender);
      }

      let loggers = convertLoggerNamesToLoggers(_this.getAppErrorsWatcher().getLoggers(), sender);

      if (loggers.length > 0) {
        return _this.notify(loggers, data, details, senders);
      }
    }

    // and if so - do nothing
    return Promise.resolve();

  };

  _this.notifyLogger = function(loggerOrName, data, details, senders, config) {

    return new Promise(function(resolve, reject) {

      if (data) {
        senders = senders || [];

        if (senders && !Array.isArray(senders)) {
          senders = [senders];
        }

        let logger = loggerOrName;

        if (typeof logger == 'string') {
          logger = _this.getLoggersManager().getInstance(logger);
        }

        if (!config && (senders.length > 0)) {
          config = config || senders[0].getOverrides('loggers', logger.getName());
        }

        data    = data    || Object.create({ });
        details = details || Object.create({ });
        config  = config  || Object.create({ });

        details = JSON.parse(JSON.stringify(details));
        config  = JSON.parse(JSON.stringify(config));

        let cache = logger.getCache(data.isError);

        if (data.message && !_this.getApplication().isToolMode() && cache) {
          let cacheKey = data.cacheKey || data.message;
          cache.check(cacheKey).then(function() {
            resolve();
          }).catch(function(error) {
            logger.log(data, details, senders, config).then(function() {
              resolve();
            }).catch(function(error) {
              reject(error);
            });
          });
        } else {
          logger.log(data, details, senders, config).then(function() {
            resolve();
          }).catch(function(error) {
            reject(error);
          });
        }
      } else {
        resolve();
      }

    });

  };

  _this.notify = function(loggersOrNames, data, details, senders, config) {

    return new Promise(function(resolve, reject) {

      if (data) {
        senders = senders || [];

        if (senders && !Array.isArray(senders)) {
          senders = [senders];
        }

        _this.notifyLogger('ConsoleLogger', data, details, senders);

        let loggers = convertLoggerNamesToLoggers(loggersOrNames);

        if (loggers.length > 0) {

          details = details || Object.create({ });

          let cache = senders[0].getCache(data.isError);

          if (data.message && senders && cache) {
            let cacheKey = data.cacheKey || data.message;
            cache.check(cacheKey).then(function() {
              resolve();
            }).catch(function() {
              let results = [];
              for(let i = 0; i < loggers.length; i++) {
                results.push(_this.notifyLogger(loggers[i], data, details, senders, config));
              }
              Promise.all(results).then(function(res) {
                resolve();
              }).catch(function(error) {
                reject(error);
              });
            });
          } else {
            let results = [];
            for(let i = 0; i < loggers.length; i++) {
              results.push(_this.notifyLogger(loggers[i], data, details, senders, config));
            }
            Promise.all(results).then(function() {
              resolve();
            }).catch(function(error) {
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

  };

}

module.exports = Application;
