const fs = require('fs');
const Tail = require('tail').Tail;

const CustomWatcher = require(`${__dirname}/../../libs/CustomWatcher.js`);

class FileWatcher extends CustomWatcher {
  constructor(application, name, config) {
    super(application, name, config);

    this.tails = {};
    this.retryTimers = {};
    this.stopped = false;
  }

  removeTail(path) {
    let tail = this.tails[path];
    if (tail) {
      try {
        tail.unwatch();
      } catch {
        // already stopped
      }
      delete this.tails[path];
    }
  }

  createTail(path) {
    if (this.stopped) {
      return;
    }

    this.removeTail(path);

    let tail = new Tail(path);
    this.tails[path] = tail;

    tail.on('error', (tailError) => {
      this.getApplication().notify(this.getLoggers(), {
        message: `Tail error for ${path}: ${tailError.toString()}`,
        isError: true,
      }, {
        Path: path,
      }, this);

      this.removeTail(path);

      if (!this.stopped && !this.retryTimers[path]) {
        this.retryTimers[path] = setTimeout(() => {
          delete this.retryTimers[path];
          this.watchPath(path);
        }, 5000);
      }
    });

    tail.on('line', (line) => {
      line = line.trim();
      if (line.length > 0) {
        if (this.getConfig().settings.rules) {
          for (let ruleName in this.getConfig().settings.rules) {
            let ruleConfig = this.getConfig().settings.rules[ruleName];
            for (let i = 0; i < ruleConfig.match.length; i++) {
              let matchRule = ruleConfig.match[i];
              let regexp = new RegExp(matchRule, 'im');
              let matches = regexp.exec(line);
              if (matches !== null) {
                let match = matches[0];
                let needsToBeReported = true;
                if (ruleConfig.except) {
                  for (let j = 0; j < ruleConfig.except.length; j++) {
                    let except = ruleConfig.except[j];
                    let regexpExcept = new RegExp(except, 'im');
                    matches = regexpExcept.exec(line);
                    if (matches !== null) {
                      needsToBeReported = false;
                      break;
                    }
                  }
                }
                if (needsToBeReported) {
                  let cacheKey = match;
                  if (ruleConfig.cacheKey) {
                    regexp = new RegExp(matchRule, 'im');
                    cacheKey = match.replace(regexp, ruleConfig.cacheKey);
                  }
                  this.getApplication().notify(this.getLoggers(ruleConfig.loggers), {
                    message: line,
                    cacheKey: cacheKey,
                  }, {
                    Path: path,
                    MatchRule: ruleName,
                  }, this);
                }
              }
            }
          }
        } else {
          this.getApplication().notify(this.getLoggers(), {
            message: line,
            cacheKey: line,
          }, {
            Path: path,
          }, this);
        }
      }
    });
  }

  watchPath(path) {
    if (this.stopped) {
      return;
    }

    fs.stat(path, (error) => {
      if (this.stopped) {
        return;
      }

      if (error) {
        if (this.getConfig().settings.retryIfNotExists) {
          if (!this.retryTimers[path]) {
            this.retryTimers[path] = setTimeout(() => {
              delete this.retryTimers[path];
              this.watchPath(path);
            }, 5 * 60 * 1000); // retry in 5 minutes
          }
        } else {
          this.getApplication().notify(this.getLoggers(), {
            message: error.toString(),
            isError: true,
          }, {
            Path: path,
          }, this);
        }
      } else {
        this.createTail(path);
      }
    });
  }

  watch() {
    this.stopped = false;
    let paths = this.getArrayValue(this.getConfig().settings.path);

    for (let i = 0; i < paths.length; i++) {
      this.watchPath(paths[i]);
    }
  }

  stop() {
    this.stopped = true;

    for (let path in this.retryTimers) {
      clearTimeout(this.retryTimers[path]);
    }
    this.retryTimers = {};

    for (let path in this.tails) {
      this.removeTail(path);
    }

    return super.stop();
  }
}

module.exports = FileWatcher;
