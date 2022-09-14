const ip = require('ip');
const amqpcb = require('amqplib/callback_api');

const CustomWatcher = require(`${__dirname}/../../libs/CustomWatcher.js`);

function RabbitMQWatcher(application, name, config) {
  CustomWatcher.call(this, application, name, config);

  const _this = this;

  _this.config.settings = _this.config.settings || Object.create({});
  _this.config.settings.queues = _this.config.settings.queues || Object.create({});

  function processMatch(line, details, loggers, cacheKey, config) {
    if (config.cmd) {
      _this.getApplication().getExecPool().exec(config.cmd, config.cwd, config.cmdGroup).then(function(result) {
        let stdout = result.stdout;
        _this.getApplication().notify(_this.getLoggers(loggers), {
          message: line + '\n\n' + config.cmd + '\n\n' + stdout,
          cacheKey: cacheKey
        }, details, _this);
      }).catch(function(result) {
        let stdout = result.stdout;
        _this.getApplication().notify(_this.getLoggers(loggers), {
          message: line + '\n\n' + config.cmd + '\n\n' + stdout,
          isError: true
        }, details, _this);
      });
    } else {
      _this.getApplication().notify(_this.getLoggers(loggers), {
        message: line,
        cacheKey: cacheKey
      }, details, _this);
    }
  }

  function watchRule(amqpConnection, queueName, queueConfig) {
    queueConfig.exchangeType = queueConfig.exchangeType || 'fanout';
    queueConfig.exchangeSettings = queueConfig.exchangeSettings || {
      durable: true
    };
    queueConfig.queueName = queueConfig.queueName || '';
    queueConfig.queueSettings = queueConfig.queueSettings || {
      exclusive: true,
      durable: true,
      auto_delete: true
    };
    queueConfig.consumingSettings = queueConfig.consumingSettings || {
      noAck: true
    };
    queueConfig.bindingKey = queueConfig.bindingKey || '';

    queueConfig.queueName = queueConfig.queueName.replace('{ip}', ip.address());

    let details = {
      Rule: queueName,
      Exchange: queueConfig.exchangeName,
      Queue: queueConfig.queueName
    };

    amqpConnection.createChannel(function(error, channel) {
      if (error) {
        _this.getApplication().notify(_this.getLoggers(), {
          message: 'Can not create channel: ' + error.toString(),
          isError: true
        }, details, _this);
      } else {
        channel.assertExchange(queueConfig.exchangeName, queueConfig.exchangeType, queueConfig.exchangeSettings, function(error) {
          if (error) {
            _this.getApplication().notify(_this.getLoggers(), {
              message: 'Can not create exchange: ' + error.toString(),
              isError: true
            }, details, _this);
          } else {
            channel.assertQueue(queueConfig.queueName, queueConfig.queueSettings, function(error, queue) {
              if (error) {
                _this.getApplication().notify(_this.getLoggers(), {
                  message: 'Can not create queue: ' + error.toString(),
                  isError: true
                }, details, _this);
              } else {
                channel.bindQueue(queue.queue, queueConfig.exchangeName, queueConfig.bindingKey, null, function(error) {
                  if (error) {
                    _this.getApplication().notify(_this.getLoggers(), {
                      message: 'Can not create binding: ' + error.toString(),
                      isError: true
                    }, details, _this);
                  } else {
                    _this.getApplication().getConsole().log('Waiting for messages', details, _this);
                    channel.consume(queue.queue, function(message) {
                      if (message.content) {
                        let line = message.content.toString();
                        if (line.length > 0) {
                          if (queueConfig.rules) {
                            for (let ruleName in queueConfig.rules) {
                              let ruleConfig = _this.config.settings.rules[ruleName];
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
                                    details.MatchRule = ruleName;
                                    processMatch(line, details, ruleConfig.loggers ? ruleConfig.loggers : queueConfig.loggers, cacheKey, ruleConfig);
                                  }
                                }
                              }
                            }
                          } else {
                            processMatch(line, details, queueConfig.loggers, line, queueConfig);
                          }
                        }
                      }
                    }, queueConfig.consumingSettings);
                  }
                });
              }
            });
          }
        });
      }
    });
  }

  function watch(ruleName, ruleConfig) {
    let details = {
      Rule: ruleName
    };

    amqpcb.connect(_this.config.settings.connectString, function(error, connection) {
      if (error) {
        _this.getApplication().notify(_this.getLoggers(), {
          message: 'Can not connect to RabbitMQ server, retrying in 30 seconds: ' + error.toString(),
          isError: true
        }, details, _this);
        setTimeout(function() {
          watch(ruleName, ruleConfig);
        }, 30000);
      } else {
        connection.on('error', function(error) {
          _this.getApplication().notify(_this.getLoggers(), {
            message: 'Error during communication with RabbitMQ server: ' + error.toString(),
            isError: true
          }, details, _this);
        });
        connection.on('close', function(error) {
          _this.getApplication().notify(_this.getLoggers(), {
            message: 'Lost connection with RabbitMQ server, reconnecting in 30 seconds: ' + error.toString(),
            isError: true
          }, details, _this);
          setTimeout(function() {
            watch(ruleName, ruleConfig);
          }, 30000);
        });
        watchRule(connection, ruleName, ruleConfig);
      }
    });
  }

  _this.watch = function() {
    for (let ruleName in _this.config.settings.rules) {
      let ruleConfig = _this.config.settings.rules[ruleName];
      watch(ruleName, ruleConfig);
    }
  };
}

module.exports = RabbitMQWatcher;