const colors = require('colors');
const bytes = require('bytes');
const parseDuration = require('parse-duration');
const mysql = require('mysql');

const CustomWatcher = require(__dirname + '/../../libs/CustomWatcher.js');

function MySQLWatcher(application, name, config) {

  CustomWatcher.call(this, application, name, config);

  const _this = this;

  function getConnection(database, ruleName, callback) {

    const connection = mysql.createConnection({
      host: database.host,
      user: database.user,
      password: database.password,
      database: database.database,
      port: database.port
    });

    let details = { RuleName: ruleName, Database: database.database };

    connection.connect(function(error) {
      if (error) {
        _this.getApplication().notify(_this.getLoggers(), { message: 'Can not connect to database: ' + error.toString(), isError: true }, details, _this);
      } else {
        if (database.timezone) {
          connection.query('SET time_zone = "' + database.timezone + '"', function(error) {
            if (error) {
              _this.getApplication().notify(_this.getLoggers(), { message: 'Can not change time zone: ' + error.toString(), isError: true }, details, _this);
            } else {
              callback(connection);
            }
          });
        } else {
          callback(connection);
        }
      }
    });

  }

  function substitute(text, prefix, obj) {

    let result = text;

    for(let attrName in obj) {
      result = result.replace('{' + prefix + '.' + attrName + '}', obj[attrName]);
    }

    return result;

  }

  function watchSQL(database, ruleName, ruleConfig, sql) {

    getConnection(database, ruleName, function(connection) {
      let runSQL = substitute(sql, 'settings.database', database);
      connection.query(runSQL, function(error, results, fields) {
        let details = { RuleName: ruleName, Database: database.database, SQL: runSQL };
        if (error) {
          _this.getApplication().notify(_this.getLoggers(ruleConfig.loggers), { message: 'Can not run query: <pre>' + error.toString() + '</pre>', isError: true }, details, _this);
        } else {
          if (ruleConfig.format) {
            ruleConfig.format(results, function(data) {
              if (data) {
                if (Array.isArray(data)) {
                  for(let i = 0; i < data.length; i++) {
                    _this.getApplication().notify(_this.getLoggers(ruleConfig.loggers), data[i], details, _this);
                  }
                } else {
                  _this.getApplication().notify(_this.getLoggers(ruleConfig.loggers), data, details, _this);
                }
              }
            }, { connection: connection, sql: runSQL });
          }
        }
        connection.end();
      });
    });

  }

  function watchRule(database, ruleName, ruleConfig) {

    if (typeof ruleConfig.sql === 'string') {
      watchSQL(database, ruleName, ruleConfig, ruleConfig.sql);
    } else {
      getConnection(database, ruleName, function(connection)  {
        let details = { RuleName: ruleName, Database: database.database };
        ruleConfig.sql.call(_this, connection, function(error, results) {
          if (error) {
            _this.getApplication().notify(_this.getLoggers(ruleConfig.loggers), { message: error.toString(), isError: true }, details, _this);
          } else {
            if (typeof results === 'string') {
              results = [results];
            }
            for(let i = 0; i < results.length; i++) {
              watchSQL(database, ruleName, ruleConfig, results[i]);
            }
          }
          connection.end();
        }, details);
      });
    }

  }

  function watchDatabase(database) {

    for(let ruleName in _this.config.settings.rules) {
      let ruleConfig = _this.config.settings.rules[ruleName];
      watchRule(database, ruleName, ruleConfig);
    }

  }

  _this.watch = function(scheduled) {

    for(let i = 0; i < _this.config.settings.database.length; i++) {
      let database = _this.config.settings.database[i];
      watchDatabase(database);
    }

  };

}

module.exports = MySQLWatcher;
