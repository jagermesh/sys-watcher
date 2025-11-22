const fs = require('fs');
const parseDuration = require('parse-duration');
const moment = require('moment');

const CustomWatcher = require(`${__dirname}/../../libs/CustomWatcher.js`);

class DirectoryWatcher extends CustomWatcher {
  constructor(application, name, config) {
    super(application, name, config);

    this.config.settings = Object.assign({
      match: [],
      except: [],
      filters: [],
      reportEmpty: true,
    }, this.config.settings);
  }

  check(fileInfo, match, except, filters) {
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
            let ageThreshold = parseDuration.default(match[1]) / 1000;
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

  walk(dir, match, except, filters, done) {
    let results = [];

    fs.readdir(dir, (err, list) => {
      if (err) {
        return done(err);
      }
      let pending = list.length;
      if (!pending) {
        return done(null, results);
      }
      list.forEach((fileName) => {
        fileName = dir + fileName;
        fs.stat(fileName, (error, stat) => {
          if (!error && stat) {
            if (stat && stat.isDirectory()) {
              this.walk(fileName + '/', match, except, filters, (err, res) => {
                results = results.concat(res);
                if (!--pending) {
                  done(null, results);
                }
              });
            } else {
              let fileInfo = {
                fileName: fileName,
                creationTime: stat.mtimeMs / 1000,
                creationTimeStr: moment(stat.mtimeMs).format(),
              };
              if (this.check(fileInfo, match, except, filters)) {
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
  }

  watchPath(path, match, except, filters) {
    if (path[path.length - 1] != '/') {
      path += '/';
    }

    fs.stat(path, (error) => {
      if (error) {
        if (this.getConfig().settings.retryIfNotExists) {
          setTimeout(() => {
            this.watchPath(path, match, except, filters);
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
        this.walk(path, match, except, filters, (error, results) => {
          if (error) {
            this.getApplication().notify(this.getLoggers(), {
              message: error.toString(),
              isError: true,
            }, {
              Path: path,
            }, this);
          } else {
            if ((results.length > 0) || this.getConfig().settings.reportEmpty) {
              results = results.sort((a, b) => {
                if (a.creationTime > b.creationTime) {
                  return 1;
                } else {
                  return -1;
                }
              });
              let details = {
                Path: path,
                Files: results,
              };
              let message;
              if (this.getConfig().settings.formatMessage) {
                message = this.getConfig().settings.formatMessage(details);
              }
              if (!message) {
                message = `Folder ${path} contain ${results.length} file(s)`;
                if (match.length > 0) {
                  message += ` matching the regular expression(s) ${match.join(',')}`;
                }
                if (except.length > 0) {
                  message += ` except ${except.join(',')}`;
                }
                if (filters.length > 0) {
                  message += ` filtered by ${filters.join(',')}`;
                }
              }
              this.getApplication().notify(this.getLoggers(), {
                message: message,
                value: results.length,
                units: 'Count',
                dimensions: {
                  Path: path,
                },
              }, details, this);
            }
          }
        });
      }
    });
  }

  watch() {
    let paths = this.getArrayValue(this.getConfig().settings.path);

    for (let i = 0; i < paths.length; i++) {
      this.watchPath(paths[i], this.getConfig().settings.match, this.getConfig().settings.except, this.getConfig().settings.filters);
    }
  }
}

module.exports = DirectoryWatcher;