const colors = require('colors');
const fs = require('fs');
const parseDuration = require('parse-duration');
const moment = require('moment');

const CustomWatcher = require(`${__dirname}/../../libs/CustomWatcher.js`);

function DirectoryWatcher(application, name, config) {
  CustomWatcher.call(this, application, name, config);

  const _this = this;

  _this.config.settings.match = _this.config.settings.match || [];
  _this.config.settings.except = _this.config.settings.except || [];
  _this.config.settings.filters = _this.config.settings.filters || [];

  _this.config.settings.reportEmpty = _this.config.settings.reportEmpty == undefined ? true : _this.config.settings.reportEmpty;

  function check(fileInfo, match, except, filters) {
    let result = true;

    if (match.length > 0) {
      result = false;
      for (let i = 0; i < match.length; i++) {
        let regexp = new RegExp(match[i], 'im');
        if (regexp.test(fileInfo.fileName)) {
          result = true;
          break;
        }
      }
    }

    if (result) {
      if (except.length > 0) {
        for (let i = 0; i < except.length; i++) {
          let regexp = new RegExp(except[i], 'im');
          if (regexp.test(fileInfo.fileName)) {
            result = false;
            break;
          }
        }
      }
    }

    if (result && filters) {
      if (filters.length > 0) {
        for (let i = 0; i < filters.length; i++) {
          let regexp = new RegExp('age older (.+)', 'im');
          let match = regexp.exec(filters[i]);
          if (match) {
            let ageThreshold = parseDuration(match[1]) / 1000;
            let age = moment().unix() - fileInfo.creationTime;
            if (age < ageThreshold) {
              result = false;
              break;
            }
          }
        }
      }
    }

    return result;
  }

  let walk = function(dir, match, except, filters, done) {
    let results = [];

    fs.readdir(dir, function(err, list) {
      if (err) {
        return done(err);
      }
      let pending = list.length;
      if (!pending) {
        return done(null, results);
      }
      list.forEach(function(fileName) {
        fileName = dir + fileName;
        fs.stat(fileName, function(error, stat) {
          if (!error && stat) {
            if (stat && stat.isDirectory()) {
              walk(fileName + '/', match, except, filters, function(err, res) {
                results = results.concat(res);
                if (!--pending) {
                  done(null, results);
                }
              });
            } else {
              let fileInfo = {
                fileName: fileName,
                creationTime: stat.mtimeMs / 1000,
                creationTimeStr: moment(stat.mtimeMs).format()
              };
              if (check(fileInfo, match, except, filters)) {
                results.push(fileInfo);
              }
              if (!--pending) {
                done(null, results);
              }
            }
          }
        });
      });
    });
  };

  function watchPath(path, match, except, filters) {
    if (path[path.length - 1] != '/') {
      path += '/';
    }

    fs.stat(path, function(error, results) {
      if (error) {
        if (_this.config.settings.retryIfNotExists) {
          setTimeout(function() {
            watchPath(path, match, except, filters);
          }, 5 * 60 * 1000); // retry in 5 minutes
        } else {
          _this.getApplication().notify(_this.getLoggers(), {
            message: error.toString(),
            isError: true
          }, {
            Path: path
          }, _this);
        }
      } else {
        walk(path, match, except, filters, function(error, results) {
          if (error) {
            _this.getApplication().notify(_this.getLoggers(), {
              message: error.toString(),
              isError: true
            }, {
              Path: path
            }, _this);
          } else {
            if ((results.length > 0) || _this.config.settings.reportEmpty) {
              let files = [];
              results = results.sort(function(a, b) {
                if (a.creationTime > b.creationTime) {
                  return 1;
                } else {
                  return -1;
                }
              });
              let details = {
                Path: path,
                Files: results
              };
              let message;
              if (_this.config.settings.formatMessage) {
                message = _this.config.settings.formatMessage(details);
              }
              if (!message) {
                message = 'Folder ' + path + ' contain ' + results.length + ' file(s)';
                if (match.length > 0) {
                  message += ' matching the regular expression(s) ' + match.join(',');
                }
                if (except.length > 0) {
                  message += ' except ' + except.join(',');
                }
                if (filters.length > 0) {
                  message += ' filtered by ' + filters.join(',');
                }
              }
              _this.getApplication().notify(_this.getLoggers(), {
                message: message,
                value: results.length,
                units: 'Count',
                dimensions: {
                  Path: path
                }
              }, details, _this);
            }
          }
        });
      }
    });
  }

  _this.watch = function() {
    let paths = _this.getArrayValue(_this.config.settings.path);

    for (let i = 0; i < paths.length; i++) {
      watchPath(paths[i], _this.config.settings.match, _this.config.settings.except, _this.config.settings.filters);
    }
  };
}

module.exports = DirectoryWatcher;