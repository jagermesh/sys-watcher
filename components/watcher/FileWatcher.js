const colors = require('colors');
const fs = require('fs');
const Tail = require('tail').Tail;
const parseDuration = require('parse-duration');

const CustomWatcher = require(__dirname + '/../../libs/CustomWatcher.js');

function FileWatcher(application, name, config) {

  CustomWatcher.call(this, application, name, config);

  const _this = this;

  function watchPath(path) {

    fs.stat(path, function(error, results) {
      if (error) {
        if (_this.config.settings.retryIfNotExists) {
          setTimeout(function() {
            watchPath(path);
          }, 5*60*1000); // retry in 5 minutes
        } else {
          _this.getApplication().notify(_this.getLoggers(), { message: error.toString(), isError: true}, { Path: path }, _this);
        }
      } else {
        let tail = new Tail(path);
        tail.on('line', function (line) {
          line = line.trim();
          if (line.length > 0) {
            if (_this.config.settings.rules) {
              for(let ruleName in _this.config.settings.rules) {
                let ruleConfig = _this.config.settings.rules[ruleName];
                for(let i = 0; i < ruleConfig.match.length; i++) {
                  let matchRule = ruleConfig.match[i];
                  let regexp = new RegExp(matchRule, 'im');
                  let matches = regexp.exec(line);
                  if (matches !== null) {
                    let match = matches[0];
                    let needsToBeReported = true;
                    if (ruleConfig.except) {
                      for(let j = 0; j < ruleConfig.except.length; j++) {
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
                      _this.getApplication().notify(_this.getLoggers(ruleConfig.loggers), { message: line, cacheKey: cacheKey }, { Path: path, MatchRule: ruleName }, _this);
                    }
                  }
                }
              }
            } else {
              _this.getApplication().notify(_this.getLoggers(), { message: line, cacheKey: line }, { Path: path }, _this);
            }
          }
        });
      }
    });

  }

  _this.watch = function() {

    let paths = _this.getArrayValue(_this.config.settings.path);
    for(let i = 0; i < paths.length; i++) {
      watchPath(paths[i]);
    }

  };

}

module.exports = FileWatcher;
