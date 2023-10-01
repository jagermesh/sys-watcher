const Slimbot = require('slimbot');

const CustomLogger = require(`${__dirname}/../../libs/CustomLogger.js`);

function TelegramLogger(application, name, config) {
  CustomLogger.call(this, application, name, config);

  const _this = this;

  const MESSAGE_LENGTH = 4096;

  _this.config.settings = Object.assign({
    recipients: [],
  }, _this.config.settings);

  _this.getRecipients = function() {
    return _this.config.settings.recipients.join(', ');
  };

  function sendMessage(message, formattedDetails, data, details, senders, config) {
    return new Promise(function(resolve, reject) {
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
            (function(recipient) {
              results.push(new Promise(function(resolve) {
                let detailsTmp = JSON.parse(JSON.stringify(details));
                let dataTmp = JSON.parse(JSON.stringify(data));
                dataTmp.message = message;
                detailsTmp.Recipient = recipient;
                bot.sendMessage(recipient, formattedMessage)
                  .then(function() {
                    _this.getApplication().getConsole().log(dataTmp, detailsTmp, senders.concat([_this])).then(function() {
                      resolve();
                    });
                  })
                  .catch(function(error) {
                    _this.getApplication().reportError(error.toString(), detailsTmp, senders, _this).then(function() {
                      resolve();
                    }).catch(function() {
                      resolve();
                    });
                  });
              }));
            })(config.settings.recipients[i]);
          }
          Promise.all(results).then(function() {
            resolve();
          }).catch(function(error) {
            reject(error);
          });
        }
      }
    });
  }

  _this.log = function(data, details, senders, config) {
    return new Promise(function(resolve, reject) {
      if (data && data.message) {
        data.message = _this.cleanUpFromColoring(data.message);

        config.settings = Object.assign({}, _this.config.settings, config.settings);
        config.composing = Object.assign({}, _this.config.composing, config.composing);

        if (!config.settings.token) {
          if (_this.getApplication().isToolMode()) {
            reject({
              error: 'Missing token paramter',
              details: JSON.stringify({
                token: 'TOKEN'
              }),
            });
          }
          if (!_this.getApplication().isToolMode()) {
            _this.getApplication().reportError('Missing token', details, senders, _this).then(function() {
              resolve();
            });
          }
        }

        if (config.settings.recipients.length == 0) {
          if (_this.getApplication().isToolMode()) {
            reject({
              error: 'Missing recipients paramter',
              details: JSON.stringify({
                recipients: [
                  'RECIPIENT1',
                  'RECIPIENT2',
                  '...'
                ]
              }),
            });
          }
          if (!_this.getApplication().isToolMode()) {
            _this.getApplication().reportError('Missing recipients', details, senders, _this).then(function() {
              resolve();
            });
          }
        }

        if (config.settings.token) {
          if (config.settings.recipients.length > 0) {

            data.message = _this.cleanUpFromColoring(data.message);

            details = Object.assign({}, details, config.composing.details);
            details.Senders = _this.expandSenders(senders);

            let formattedMessage = _this.formatMessage(data.message, 'text');
            let formattedDetails = _this.packDetails(details, config.composing, 'text');
            let chunkLength = Math.max(2, MESSAGE_LENGTH - formattedDetails.length - 2); // 2 for new lines
            let chunks = formattedMessage.match(new RegExp('.{1,' + chunkLength + '}', 'gsm'));

            chunks.reduce(function(promise, chunk) {
              return promise.then(function() {
                return sendMessage(chunk, formattedDetails, data, details, senders, config);
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
  };
}

module.exports = TelegramLogger;