const Slack = require('@slack/client');

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

  _this.preparePayload = function(formattedMessage, config) {
    let payload = {
      text: config.settings.subject ? '' : formattedMessage,
      as_user: true,
      link_names: true,
      type: 'mrkdwn',
      blocks: [],
    };
    if (!config.settings.unfurling) {
      payload.unfurl_links = false;
      payload.unfurl_media = false;
    }
    if (config.settings.subject) {
      payload.blocks.push({
        type: 'section',
        text: {
          text: config.settings.subject.substring(0, 3000),
          type: 'plain_text',
        }
      });
      payload.blocks.push({
        type: 'divider'
      });
      payload.blocks.push({
        type: 'section',
        text: {
          text: formattedMessage.substring(0, 3000),
          type: 'mrkdwn',
        }
      });
    }
    return payload;
  };

  _this.log = function(data, details, senders, config) {

    return new Promise(function(resolve, reject) {

      if (data && data.message) {

        data.message = _this.cleanUpFromColoring(data.message);

        config.settings  = Object.assign({ }, _this.config.settings, config.settings);
        config.composing = Object.assign({ }, _this.config.composing, config.composing);

        details  = Object.assign({ }, details, config.composing.details);
        details.Senders = _this.expandSenders(senders);

        let formattedMessage = _this.formatMessage(data.message, 'markdown');
        let formattedDetails = _this.packDetails(details, config.composing, 'markdown');

        // if (config.settings.body) {

        // }

        if (formattedDetails.length > 0) {
          formattedMessage += '\n\n' + formattedDetails;
        }

        switch(config.settings.kind) {
          case 'webhook':
            if (config.settings.webHooks.length > 0) {
              for(let i = 0; i < config.settings.webHooks.length; i++) {
                let webHook = config.settings.webHooks[i];
                let payload = _this.preparePayload(formattedMessage, config);
                const transport = new Slack.IncomingWebhook(webHook);
                transport.send(payload)
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
                for(let i = 0; i < config.settings.recipients.length; i++) {
                  (function(recipient) {
                    results.push(new Promise(function(resolve, reject) {
                      let detailsTmp = JSON.parse(JSON.stringify(details));
                      detailsTmp.Recipient = recipient;
                      let payload = _this.preparePayload(formattedMessage, config);
                      payload.channel = recipient;
                      transport.chat.postMessage(payload)
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
