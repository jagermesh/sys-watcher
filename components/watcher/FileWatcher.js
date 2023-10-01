const fs = require('fs');
const Tail = require('tail').Tail;

const CustomWatcher = require(`${__dirname}/../../libs/CustomWatcher.js`);

class FileWatcher extends CustomWatcher {
  constructor(application, name, config) {
    super(application, name, config);
  }

  watchPath(path) {
    fs.stat(path, (error) => {
      if (error) {
        if (this.getConfig().settings.retryIfNotExists) {
          setTimeout(() => {
            this.watchPath(path);
          }, 5 * 60 * 1000); // retry in 5 minutes
        } else {
          this.getApplication().notify(this.getLoggers(), {
            message: error.toString(),
            isError: true,
          }, {
            Path: path,
          }, this);
        }
      } else {
        let tail = new Tail(path);
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
    });
  }

  watch() {
    let paths = this.getArrayValue(this.getConfig().settings.path);

    for (let i = 0; i < paths.length; i++) {
      this.watchPath(paths[i]);
    }
  }
}

module.exports = FileWatcher;