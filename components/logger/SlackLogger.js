const Slack = require('@slack/client');

const CustomLogger = require(`${__dirname}/../../libs/CustomLogger.js`);

class SlackLogger extends CustomLogger {
  constructor(application, name, config) {
    super(application, name, config);

    this.config.settings = Object.assign({
      recipients: [],
      webHooks: [],
    }, this.config.settings);
  }

  getRecipients() {
    switch (this.getConfig().settings.kind) {
      case 'webhook':
        return this.getConfig().settings.webHooks.join(', ');
      case 'direct':
        return this.getConfig().settings.recipients.join(', ');
      default:
        return '';
    }
  }

  preparePayload(formattedMessage, config) {
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
          type: 'mrkdwn',
        },
      });
      payload.blocks.push({
        type: 'divider',
      });
      payload.blocks.push({
        type: 'section',
        text: {
          text: formattedMessage.substring(0, 3000),
          type: 'mrkdwn',
        },
      });
    }
    return payload;
  }

  log(data, details, senders, config) {
    return new Promise((resolve, reject) => {
      if (data && data.message) {
        data.message = this.cleanUpFromColoring(data.message);

        config.settings = Object.assign({}, this.getConfig().settings, config.settings);
        config.composing = Object.assign({}, this.getConfig().composing, config.composing);

        details = Object.assign({}, details, config.composing.details);
        details.Senders = this.expandSenders(senders);

        let formattedMessage = this.formatMessage(data.message, 'markdown');
        let formattedDetails = this.packDetails(details, config.composing, 'markdown');

        if (formattedDetails.length > 0) {
          formattedMessage += '\n\n' + formattedDetails;
        }

        switch (config.settings.kind) {
          case 'webhook':
            if (config.settings.webHooks.length > 0) {
              for (let i = 0; i < config.settings.webHooks.length; i++) {
                let webHook = config.settings.webHooks[i];
                let payload = this.preparePayload(formattedMessage, config);
                const transport = new Slack.IncomingWebhook(webHook);
                transport.send(payload)
                  .then(() => {
                    this.getApplication().getConsole().log(data.message, details, senders.concat([this])).then(() => {
                      resolve();
                    });
                  })
                  .catch((error) => {
                    this.getApplication().reportError(error.toString(), details, senders, this).then(() => {
                      resolve();
                    }).catch(() => {
                      resolve();
                    });
                  });
              }
            }

            if (config.settings.webHooks.length == 0) {
              if (this.getApplication().isToolMode()) {
                reject({
                  error: 'Missing web hooks paramter',
                  details: '{ webHooks: [ \'WEB_HOOK1\', \'WEB_HOOK2\', ... ] }',
                });
              }
              if (!this.getApplication().isToolMode()) {
                this.getApplication().reportError('Missing web hooks', details, senders, this).then(() => {
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
                for (let i = 0; i < config.settings.recipients.length; i++) {
                  ((recipient) => {
                    results.push(new Promise((resolve) => {
                      let detailsTmp = JSON.parse(JSON.stringify(details));
                      detailsTmp.Recipient = recipient;
                      let payload = this.preparePayload(formattedMessage, config);
                      payload.channel = recipient;
                      transport.chat.postMessage(payload)
                        .then(() => {
                          this.getApplication().getConsole().log(data, detailsTmp, senders.concat([this])).then(() => {
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

            if (config.settings.recipients.length == 0) {
              if (this.getApplication().isToolMode()) {
                reject({
                  error: 'Missing recipients paramter',
                  details: '{ recipients: [ \'RECIPIENT1\', \'RECIPIENT2\', ... ] }',
                });
              }
              if (!this.getApplication().isToolMode()) {
                this.getApplication().reportError('Missing recipients', details, senders, this).then(() => {
                  resolve();
                });
              }
            }

            if (!config.settings.token) {
              if (this.getApplication().isToolMode()) {
                reject({
                  error: 'Missing token paramter',
                  details: '{ token: \'TOKEN\' }',
                });
              }
              if (!this.getApplication().isToolMode()) {
                this.getApplication().reportError('Missing token', details, senders, this).then(() => {
                  resolve();
                });
              }
            }
            break;
          default:
            if (this.getApplication().isToolMode()) {
              reject({
                error: 'Missing kind parameter',
                details: '{ kind: \'webhook|direct\' }',
              });
            }
            if (!this.getApplication().isToolMode()) {
              this.getApplication().reportError('Missing kind paramtere', details, senders, this).then(() => {
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
  }
}

module.exports = SlackLogger;