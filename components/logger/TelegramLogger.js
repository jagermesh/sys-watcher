const Slimbot = require('slimbot');

const CustomLogger = require(`${__dirname}/../../libs/CustomLogger.js`);

class TelegramLogger extends CustomLogger {
  constructor(application, name, config) {
    super(application, name, config);

    this.messageLength = 4096;

    this.config.settings = Object.assign({
      recipients: [],
    }, this.config.settings);
  }

  getRecipients() {
    return this.getConfig().settings.recipients.join(', ');
  }

  sendMessage(message, formattedDetails, data, details, senders, config) {
    return new Promise((resolve, reject) => {
      let formattedMessage = message;

      if (formattedDetails.length > 0) {
        formattedMessage += '\n\n' + formattedDetails;
      }

      formattedMessage = formattedMessage.trim();

      if (config.settings.token) {
        if (config.settings.recipients.length > 0) {
          const bot = new Slimbot(config.settings.token);
          let results = [];
          for (let i = 0; i < config.settings.recipients.length; i++) {
            ((recipient) => {
              results.push(new Promise((resolve) => {
                let detailsTmp = JSON.parse(JSON.stringify(details));
                let dataTmp = JSON.parse(JSON.stringify(data));
                dataTmp.message = message;
                detailsTmp.Recipient = recipient;
                bot.sendMessage(recipient, formattedMessage)
                  .then(() => {
                    this.getApplication().getConsole().log(dataTmp, detailsTmp, senders.concat([this])).then(() => {
                      resolve();
                    });
                  })
                  .catch((error) => {
                    this.getApplication().reportError(error.toString(), detailsTmp, senders, this).then(() => {
                      resolve();
                    }).catch(() => {
                      resolve();
                    });
                  });
              }));
            })(config.settings.recipients[i]);
          }
          Promise.all(results).then(() => {
            resolve();
          }).catch((error) => {
            reject(error);
          });
        }
      }
    });
  }

  log(data, details, senders, config) {
    return new Promise((resolve, reject) => {
      if (data && data.message) {
        data.message = this.cleanUpFromColoring(data.message);

        config.settings = Object.assign({}, this.getConfig().settings, config.settings);
        config.composing = Object.assign({}, this.getConfig().composing, config.composing);

        if (!config.settings.token) {
          if (this.getApplication().isToolMode()) {
            reject({
              error: 'Missing token paramter',
              details: JSON.stringify({
                token: 'TOKEN',
              }),
            });
          }
          if (!this.getApplication().isToolMode()) {
            this.getApplication().reportError('Missing token', details, senders, this).then(() => {
              resolve();
            });
          }
        }

        if (config.settings.recipients.length == 0) {
          if (this.getApplication().isToolMode()) {
            reject({
              error: 'Missing recipients paramter',
              details: JSON.stringify({
                recipients: [
                  'RECIPIENT1',
                  'RECIPIENT2',
                  '...',
                ],
              }),
            });
          }
          if (!this.getApplication().isToolMode()) {
            this.getApplication().reportError('Missing recipients', details, senders, this).then(() => {
              resolve();
            });
          }
        }

        if (config.settings.token) {
          if (config.settings.recipients.length > 0) {

            data.message = this.cleanUpFromColoring(data.message);

            details = Object.assign({}, details, config.composing.details);
            details.Senders = this.expandSenders(senders);

            let formattedMessage = this.formatMessage(data.message, 'text');
            let formattedDetails = this.packDetails(details, config.composing, 'text');
            let chunkLength = Math.max(2, this.messageLength - formattedDetails.length - 2); // 2 for new lines
            let chunks = formattedMessage.match(new RegExp('.{1,' + chunkLength + '}', 'gsm'));

            chunks.reduce((promise, chunk) => {
              return promise.then(() => {
                return this.sendMessage(chunk, formattedDetails, data, details, senders, config);
              });
            }, Promise.resolve())
              .then(resolve)
              .catch(reject);
          }
        }
      }

      if (!data || !data.message) {
        resolve();
      }
    });
  }
}

module.exports = TelegramLogger;