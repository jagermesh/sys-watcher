const Slack = require('@slack/client');
// const _ = require('lodash');

const CustomLogger = require(__dirname + '/../../libs/CustomLogger.js');

function SlackLogger(application, name, config) {

  CustomLogger.call(this, application, name, config);

  const _this = this;

  _this.config.settings.recipients = _this.config.settings.recipients || [];
  _this.config.settings.webHooks   = _this.config.settings.webHooks || [];

  _this.getRecipients = function() {

    switch(_this.config.settings.kind) {
      case 'webhook':
        return _this.config.settings.webHooks.join(', ');
      case 'direct':
        return _this.config.settings.recipients.join(', ');
      default:
        return '';
    }

  };

  _this.log = function(data, details, senders, config) {

    return new Promise(function(resolve, reject) {

      if (data && data.message) {

        data.message = _this.cleanUpFromColoring(data.message);

        config.settings  = Object.assign({ }, _this.config.settings, config.settings);
        config.composing = Object.assign({ }, _this.config.composing, config.composing);

        details  = Object.assign({ }, details, config.composing.details);
        details.Senders = _this.expandSenders(senders);

        let formattedMessage = '';
        let formattedDetails = '';

        formattedMessage += data.message.replace(/<strong>/g, '*').replace(/<\/strong>/g, '*');

        formattedDetails += _this.packDetails(details, config.composing, 'text', { prefix: '*', suffix: '*' });

        formattedMessage = formattedMessage.trim();

        if (formattedDetails.length > 0) {
          formattedMessage += '\n\n' + formattedDetails;
        }

        switch(config.settings.kind) {
          case 'webhook':
            if (config.settings.webHooks.length > 0) {
              for(i = 0; i < config.settings.webHooks.length; i++) {
                let webHook = config.settings.webHooks[i];
                const transport = new Slack.IncomingWebhook(webHook);
                transport.send({ text: formattedMessage, parse: 'full' })
                  .then(function(result) {
                    _this.getApplication().getConsole().log(data.message, details, senders.concat([_this])).then(function() {
                      resolve();
                    });
                  })
                  .catch(function(error) {
                    _this.getApplication().reportError(error.toString(), details, senders, _this).then(function() {
                      resolve();
                    }).catch(function(error, senders, sender) {
                      resolve();
                    });
                  });
              }
            }

            if (config.settings.webHooks.length == 0) {
              if (_this.getApplication().isToolMode()) {
                reject({ error: 'Missing web hooks paramter', details: '{ webHooks: [ \'WEB_HOOK1\', \'WEB_HOOK2\', ... ] }' });
              }
              if (!_this.getApplication().isToolMode()) {
                _this.getApplication().reportError('Missing web hooks', details, senders, _this).then(function() {
                  resolve();
                });
              }
            }
            break;
          case 'direct':
            if (config.settings.token) {
              if (config.settings.recipients.length > 0) {
                const transport = new Slack.WebClient(config.settings.token);
                let results = [];
                for(i = 0; i < config.settings.recipients.length; i++) {
                  (function(recipient) {
                    results.push(new Promise(function(resolve, reject) {
                      let detailsTmp = JSON.parse(JSON.stringify(details));
                      detailsTmp.Recipient = recipient;
                      transport.chat.postMessage({ channel: recipient, text: formattedMessage, parse: 'full' })
                        .then(function(result) {
                          _this.getApplication().getConsole().log(data, detailsTmp, senders.concat([_this])).then(function() {
                            resolve();
                          });
                        })
                        .catch(function(error) {
                          _this.getApplication().reportError(error.toString(), detailsTmp, senders, _this).then(function() {
                            resolve();
                          }).catch(function(error) {
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

            if (config.settings.recipients.length == 0) {
              if (_this.getApplication().isToolMode()) {
                reject({ error: 'Missing recipients paramter', details: '{ recipients: [ \'RECIPIENT1\', \'RECIPIENT2\', ... ] }' });
              }
              if (!_this.getApplication().isToolMode()) {
                _this.getApplication().reportError('Missing recipients', details, senders, _this).then(function() {
                  resolve();
                });
              }
            }

            if (!config.settings.token) {
              if (_this.getApplication().isToolMode()) {
                reject({ error: 'Missing token paramter', details: '{ token: \'TOKEN\' }' });
              }
              if (!_this.getApplication().isToolMode()) {
                _this.getApplication().reportError('Missing token', details, senders, _this).then(function() {
                  resolve();
                });
              }
            }
            break;
          default:
            if (_this.getApplication().isToolMode()) {
              reject({ error: 'Missing kind parameter', details: '{ kind: \'webhook|direct\' }' });
            }
            if (!_this.getApplication().isToolMode()) {
              _this.getApplication().reportError('Missing kind paramtere', details, senders, _this).then(function() {
                resolve();
              });
            }
            break;
        }

      }

      if (!data || !data.message) {

        resolve();

      }

    });

  };

}

module.exports = SlackLogger;
