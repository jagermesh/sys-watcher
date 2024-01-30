const {
  SQS,
} = require('@aws-sdk/client-sqs');

const CustomWatcher = require(`${__dirname}/../../libs/CustomWatcher.js`);
const Scheduler = require(`${__dirname}/../../libs/Scheduler.js`);

class AWSSQSWatcher extends CustomWatcher {
  constructor(application, name, config, owner) {
    super(application, name, config, owner);

    this.schedulers = [];

    this.config.settings = Object.assign({
      queues: {},
    }, this.config.settings);
  }

  deleteMessage(sqs, queueName, queueConfig, receiptHandle, line, details, loggers) {
    let sqsParams = {
      QueueUrl: queueConfig.queueUrl,
      ReceiptHandle: receiptHandle,
    };

    sqs.deleteMessage(sqsParams, (error) => {
      if (error) {
        this.getApplication().notify(this.getLoggers(loggers), {
          message: error.toString(),
          isError: true,
        }, details, this);
      } else {
        this.getApplication().getConsole().log(`Message "${line}" deleted`, details, this);
      }
    });
  }

  processMatch(sqs, queueName, queueConfig, receiptHandle, line, details, loggers, cacheKey, config) {
    if (config.cmd) {
      this.getApplication().getExecPool().exec(config.cmd, config.cwd, config.cmdGroup).then((result) => {
        let stdout = result.stdout;
        let message = line + '\n\n' + config.cmd + '\n\n' + stdout;
        this.getApplication().notify(this.getLoggers(loggers), {
          message: message,
          cacheKey: cacheKey,
        }, details, this);
        this.deleteMessage(sqs, queueName, queueConfig, receiptHandle, line, details, loggers);
      }).catch((result) => {
        let stdout = result.stdout;
        let message = line + '\n\n' + config.cmd + '\n\n' + stdout;
        this.getApplication().notify(this.getLoggers(loggers), {
          message: message,
          isError: true,
        }, details, this);
      });
    } else {
      this.getApplication().notify(this.getLoggers(loggers), {
        message: line,
        cacheKey: cacheKey,
      }, details, this);
      this.deleteMessage(sqs, queueName, queueConfig, receiptHandle, line, details, loggers);
    }
  }

  watchRule(sqs, queueName, queueConfig) {
    let sqsParams = {
      QueueUrl: queueConfig.queueUrl,
      AttributeNames: ['All'],
      MaxNumberOfMessages: 10,
      VisibilityTimeout: 30,
      WaitTimeSeconds: 3,
    };

    let details = {
      Rule: queueName,
    };

    sqs.receiveMessage(sqsParams, (error, response) => {
      if (error) {
        this.getApplication().notify(this.getLoggers(), {
          message: `Can not retrieve message: ${error.toString()}`,
          isError: true,
        }, details, this);
      } else if (response.Messages) {
        if (response.Messages.length > 0) {
          for (let i = 0; i < response.Messages.length; i++) {
            let line = response.Messages[i].Body;
            let receiptHandle = response.Messages[i].ReceiptHandle;
            if (line.length > 0) {
              if (queueConfig.rules) {
                for (let ruleName in queueConfig.rules) {
                  let ruleConfig = this.getConfig().settings.rules[ruleName];
                  for (let j = 0; j < ruleConfig.match.length; j++) {
                    let matchRule = ruleConfig.match[j];
                    let regexp = new RegExp(matchRule, 'im');
                    let matches = regexp.exec(line);
                    if (matches !== null) {
                      let match = matches[0];
                      let needsToBeReported = true;
                      if (ruleConfig.except) {
                        for (let k = 0; k < ruleConfig.except.length; k++) {
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
                        this.processMatch(sqs, queueName, queueConfig, receiptHandle, line, details, ruleConfig.loggers ? ruleConfig.loggers : queueConfig.loggers, cacheKey, ruleConfig);
                      }
                    }
                  }
                }
              } else {
                this.processMatch(sqs, queueName, queueConfig, receiptHandle, line, details, queueConfig.loggers, line, queueConfig);
              }
            }
          }
        }
      }
    });
  }

  watchRules(sqs, ruleName, ruleConfig) {
    ruleConfig.scheduling = Object.assign({
      interval: '30 sec',
    }, ruleConfig.scheduling);

    this.getApplication().getConsole().log('Waiting for messages', {
      Rule: ruleName,
    }, this);

    let scheduler = new Scheduler(this.getApplication(), `${this.getName()}: Scheduler`, {
      settings: ruleConfig.scheduling,
    }, this);

    scheduler.start(() => {
      this.watchRule(sqs, ruleName, ruleConfig);
    });

    this.schedulers.push(scheduler);
  }

  watch() {
    let sqs = new SQS({
      region: this.getConfig().settings.AWS.region,

      credentials: {
        accessKeyId: this.getConfig().settings.AWS.accessKeyId,
        secretAccessKey: this.getConfig().settings.AWS.secretAccessKey,
      },
    });

    for (let ruleName in this.getConfig().settings.rules) {
      let ruleConfig = this.getConfig().settings.rules[ruleName];
      this.watchRules(sqs, ruleName, ruleConfig);
    }
  }

  stop() {
    for (let i = 0; i < this.schedulers.length; i++) {
      this.schedulers[i].stop();
    }
  }
}

module.exports = AWSSQSWatcher;