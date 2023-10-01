const ip = require('ip');
const amqpcb = require('amqplib/callback_api');

const CustomWatcher = require(`${__dirname}/../../libs/CustomWatcher.js`);

class RabbitMQWatcher extends CustomWatcher {
  constructor(application, name, config) {
    super(application, name, config);

    this.config.settings = Object.assign({
      queues: {},
    }, this.config.settings);
  }

  processMatch(line, details, loggers, cacheKey, config) {
    if (config.cmd) {
      this.getApplication().getExecPool().exec(config.cmd, config.cwd, config.cmdGroup).then((result) => {
        let stdout = result.stdout;
        this.getApplication().notify(this.getLoggers(loggers), {
          message: `${line}\n\n${config.cmd}\n\n${stdout}`,
          cacheKey: cacheKey,
        }, details, this);
      }).catch((result) => {
        let stdout = result.stdout;
        this.getApplication().notify(this.getLoggers(loggers), {
          message: `${line}\n\n${config.cmd}\n\n${stdout}`,
          isError: true,
        }, details, this);
      });
    } else {
      this.getApplication().notify(this.getLoggers(loggers), {
        message: line,
        cacheKey: cacheKey,
      }, details, this);
    }
  }

  watchRule(amqpConnection, queueName, queueConfig) {
    queueConfig = Object.assign({
      exchangeType: 'fanout',
      queueName: '',
      bindingKey: '',
      exchangeSettings: {
        durable: true,
      },
      queueSettings: {
        exclusive: true,
        durable: true,
        auto_delete: true,
      },
      consumingSettings: {
        noAck: true,
      },
    }, queueConfig);

    queueConfig.queueName = queueConfig.queueName.replace('{ip}', ip.address());

    let details = {
      Rule: queueName,
      Exchange: queueConfig.exchangeName,
      Queue: queueConfig.queueName,
    };

    amqpConnection.createChannel((error, channel) => {
      if (error) {
        this.getApplication().notify(this.getLoggers(), {
          message: `Can not create channel: ${error.toString()}`,
          isError: true,
        }, details, this);
      } else {
        channel.assertExchange(queueConfig.exchangeName, queueConfig.exchangeType, queueConfig.exchangeSettings, (error) => {
          if (error) {
            this.getApplication().notify(this.getLoggers(), {
              message: `Can not create exchange: ${error.toString()}`,
              isError: true,
            }, details, this);
          } else {
            channel.assertQueue(queueConfig.queueName, queueConfig.queueSettings, (error, queue) => {
              if (error) {
                this.getApplication().notify(this.getLoggers(), {
                  message: `Can not create queue: ${error.toString()}`,
                  isError: true,
                }, details, this);
              } else {
                channel.bindQueue(queue.queue, queueConfig.exchangeName, queueConfig.bindingKey, null, (error) => {
                  if (error) {
                    this.getApplication().notify(this.getLoggers(), {
                      message: `Can not create binding: ${error.toString()}`,
                      isError: true,
                    }, details, this);
                  } else {
                    this.getApplication().getConsole().log('Waiting for messages', details, this);
                    channel.consume(queue.queue, (message) => {
                      if (message.content) {
                        let line = message.content.toString();
                        if (line.length > 0) {
                          if (queueConfig.rules) {
                            for (let ruleName in queueConfig.rules) {
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
                                    details.MatchRule = ruleName;
                                    this.processMatch(line, details, ruleConfig.loggers ? ruleConfig.loggers : queueConfig.loggers, cacheKey, ruleConfig);
                                  }
                                }
                              }
                            }
                          } else {
                            this.processMatch(line, details, queueConfig.loggers, line, queueConfig);
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

  watchRules(ruleName, ruleConfig) {
    let details = {
      Rule: ruleName,
    };

    amqpcb.connect(this.getConfig().settings.connectString, (error, connection) => {
      if (error) {
        this.getApplication().notify(this.getLoggers(), {
          message: `Can not connect to RabbitMQ server, retrying in 30 seconds: ${error.toString()}`,
          isError: true,
        }, details, this);
        setTimeout(() => {
          this.watchRules(ruleName, ruleConfig);
        }, 30000);
      } else {
        connection.on('error', (error) => {
          this.getApplication().notify(this.getLoggers(), {
            message: `Error during communication with RabbitMQ server: ${error.toString()}`,
            isError: true,
          }, details, this);
        });
        connection.on('close', (error) => {
          this.getApplication().notify(this.getLoggers(), {
            message: `Lost connection with RabbitMQ server, reconnecting in 30 seconds: ${error.toString()}`,
            isError: true,
          }, details, this);
          setTimeout(() => {
            this.watchRules(ruleName, ruleConfig);
          }, 30000);
        });
        this.watchRule(connection, ruleName, ruleConfig);
      }
    });
  }

  watch() {
    for (let ruleName in this.getConfig().settings.rules) {
      let ruleConfig = this.getConfig().settings.rules[ruleName];
      this.watchRules(ruleName, ruleConfig);
    }
  }
}

module.exports = RabbitMQWatcher;