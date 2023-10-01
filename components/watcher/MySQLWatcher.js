const mysql = require('mysql');

const CustomWatcher = require(`${__dirname}/../../libs/CustomWatcher.js`);

class MySQLWatcher extends CustomWatcher {
  constructor(application, name, config) {
    super(application, name, config);
  }

  getConnection(database, ruleName, callback) {
    const connection = mysql.createConnection({
      host: database.host,
      user: database.user,
      password: database.password,
      database: database.database,
      port: database.port,
    });

    let details = {
      RuleName: ruleName,
      Database: database.database,
    };

    connection.connect((error) => {
      if (error) {
        this.getApplication().notify(this.getLoggers(), {
          message: `Can not connect to database: ${error.toString()}`,
          isError: true,
        }, details, this);
      } else if (database.timezone) {
        connection.query(`SET time_zone = "${database.timezone}"`, (error) => {
          if (error) {
            this.getApplication().notify(this.getLoggers(), {
              message: `Can not change time zone: ${error.toString()}`,
              isError: true,
            }, details, this);
          } else {
            callback(connection);
          }
        });
      } else {
        callback(connection);
      }
    });
  }

  substitute(text, prefix, obj) {
    let result = text;

    for (let attrName in obj) {
      result = result.replace(`{${prefix}.${attrName}}`, obj[attrName]);
    }

    return result;
  }

  watchSQL(database, ruleName, ruleConfig, sql) {
    this.getConnection(database, ruleName, (connection) => {
      let runSQL = this.substitute(sql, 'settings.database', database);
      connection.query(runSQL, (error, results) => {
        let details = {
          RuleName: ruleName,
          Database: database.database,
          SQL: runSQL,
        };
        if (error) {
          this.getApplication().notify(this.getLoggers(ruleConfig.loggers), {
            message: `Can not run query: <pre>${error.toString()}</pre>`,
            isError: true,
          }, details, this);
        } else if (ruleConfig.format) {
          ruleConfig.format(results, (data) => {
            if (data) {
              if (Array.isArray(data)) {
                for (let i = 0; i < data.length; i++) {
                  this.getApplication().notify(this.getLoggers(ruleConfig.loggers), data[i], details, this);
                }
              } else {
                this.getApplication().notify(this.getLoggers(ruleConfig.loggers), data, details, this);
              }
            }
          }, {
            connection: connection,
            sql: runSQL,
          });
        }
        connection.end();
      });
    });
  }

  watchRule(database, ruleName, ruleConfig) {
    if (typeof ruleConfig.sql === 'string') {
      this.watchSQL(database, ruleName, ruleConfig, ruleConfig.sql);
    } else {
      this.getConnection(database, ruleName, (connection) => {
        let details = {
          RuleName: ruleName,
          Database: database.database,
        };
        ruleConfig.sql.call(this, connection, (error, results) => {
          if (error) {
            this.getApplication().notify(this.getLoggers(ruleConfig.loggers), {
              message: error.toString(),
              isError: true,
            }, details, this);
          } else {
            if (typeof results === 'string') {
              results = [results];
            }
            for (let i = 0; i < results.length; i++) {
              this.watchSQL(database, ruleName, ruleConfig, results[i]);
            }
          }
          connection.end();
        }, details);
      });
    }
  }

  watchDatabase(database) {
    for (let ruleName in this.getConfig().settings.rules) {
      let ruleConfig = this.getConfig().settings.rules[ruleName];
      this.watchRule(database, ruleName, ruleConfig);
    }
  }

  watch() {
    for (let i = 0; i < this.getConfig().settings.database.length; i++) {
      let database = this.getConfig().settings.database[i];
      this.watchDatabase(database);
    }
  }
}

module.exports = MySQLWatcher;