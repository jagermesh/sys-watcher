const aws = require('aws-sdk');

const CustomWatcher = require(__dirname + '/../libs/CustomWatcher.js');
const Scheduler = require(__dirname + '/../libs/Scheduler.js');

function AWSSQSWatcher(application, name, config, owner) {

  CustomWatcher.call(this, application, name, config, owner);

  const _this = this;

  let schedulers = [];

  _this.config.settings.queues = _this.config.settings.queues || Object.create({ });

  function deleteMessage(sqs, queueName, queueConfig, receiptHandle, line, details, loggers) {

    let sqsParams = {
      QueueUrl: queueConfig.queueUrl
    , ReceiptHandle: receiptHandle
    };
    sqs.deleteMessage(sqsParams, function(error, response) {
      if (error) {
        _this.getApplication().notify(_this.getLoggers(loggers), { message: error.toString(), isError: true}, details, _this);
      } else {
        _this.getApplication().getConsole().log('Message "' + line + '" deleted', details, _this);
      }
    });

  }

  function processMatch(sqs, queueName, queueConfig, receiptHandle, line, details, loggers, cacheKey, config) {

    if (config.cmd) {
      _this.getApplication().getExecPool().exec(config.cmd, config.cwd, config.cmdGroup)
        .then(function(stdout) {
          let message = line + '\n\n' + config.cmd + '\n\n' + stdout;
            _this.getApplication().notify(_this.getLoggers(loggers), { message: message, cacheKey: cacheKey}, details, _this);
            deleteMessage(sqs, queueName, queueConfig, receiptHandle, line, details, loggers);
        })
        .catch(function(stdout) {
          let message = line + '\n\n' + config.cmd + '\n\n' + stdout;
          _this.getApplication().notify(_this.getLoggers(loggers), { message: message, isError: true}, details, _this);
        });
    } else {
      _this.getApplication().notify(_this.getLoggers(loggers), { message: message, cacheKey: cacheKey}, details, _this);
      deleteMessage(sqs, queueName, queueConfig, receiptHandle, line, details, loggers);
    }

  }

  function watchRule(sqs, queueName, queueConfig) {

    let sqsParams = {
      QueueUrl: queueConfig.queueUrl
    , AttributeNames: [ 'All' ]
    , MaxNumberOfMessages: 10
    , VisibilityTimeout: 30
    , WaitTimeSeconds: 3
    };

    let details = { Rule: queueName };

    sqs.receiveMessage(sqsParams, function(error, response) {
      if (error) {
      _this.getApplication().notify(_this.getLoggers(), { message: 'Can not retrieve message: ' + error.toString(), isError: true}, details, _this);
      } else
      if (response.Messages) {
        if (response.Messages.length > 0) {
          for(let i = 0; i < response.Messages.length; i++) {
            let line = response.Messages[i].Body;
            let receiptHandle = response.Messages[i].ReceiptHandle;
            if (line.length > 0) {
              if (queueConfig.rules) {
                for(let ruleName in queueConfig.rules) {
                  let ruleConfig = _this.config.settings.rules[ruleName];
                  for(let j = 0; j < ruleConfig.match.length; j++) {
                    let matchRule = ruleConfig.match[j];
                    let regexp = new RegExp(matchRule, 'im');
                    let matches = regexp.exec(line);
                    if (matches !== null) {
                      let match = matches[0];
                      let needsToBeReported = true;
                      if (ruleConfig.except) {
                        for(let k = 0; k < ruleConfig.except.length; k++) {
                          let except = ruleConfig.except[k];
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
                        processMatch(sqs, queueName, queueConfig, receiptHandle, line, details, ruleConfig.loggers ? ruleConfig.loggers : queueConfig.loggers, cacheKey, ruleConfig);
                      }
                    }
                  }
                }
              } else {
                processMatch(sqs, queueName, queueConfig, receiptHandle, line, details, queueConfig.loggers, line, queueConfig);
              }
            }
          }
        }
      }
    });

  }

  function watch(sqs, ruleName, ruleConfig) {

    ruleConfig.scheduling          = ruleConfig.scheduling          || Object.create({ });
    ruleConfig.scheduling.interval = ruleConfig.scheduling.interval || '30 sec';

    _this.getApplication().getConsole().log('Waiting for messages', { Rule: ruleName }, _this);

    let scheduler = new Scheduler(_this.getApplication(), _this.getName() + ': Scheduler', { settings: ruleConfig.scheduling }, _this);

    scheduler.start(function() {
      watchRule(sqs, ruleName, ruleConfig);
    });

    schedulers.push(scheduler);

  }

  _this.watch = function() {

    let sqs = new aws.SQS({ region: _this.config.settings.AWS.region, accessKeyId: _this.config.settings.AWS.accessKeyId, secretAccessKey: _this.config.settings.AWS.secretAccessKey});

    for(let ruleName in _this.config.settings.rules) {
      let ruleConfig = _this.config.settings.rules[ruleName];
      watch(sqs, ruleName, ruleConfig);
    }

  };

  _this.stop = function() {

    for(let i = 0; i < schedulers.length; i++) {
      schedulers[i].stop();
    }

  };

}

module.exports = AWSSQSWatcher;
