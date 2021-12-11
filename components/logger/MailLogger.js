const nodemailer = require('nodemailer');

const CustomLogger = require(`${__dirname}/../../libs/CustomLogger.js`);

function MailLogger(application, name, config) {
  CustomLogger.call(this, application, name, config);

  const _this = this;

  _this.config.settings.recipients = _this.config.settings.recipients || [];
  _this.config.settings.sendmail = _this.config.settings.sendmail || '/usr/sbin/sendmail';
  _this.config.settings.subject = _this.config.settings.subject || '';

  _this.getRecipients = function() {
    return _this.config.settings.recipients.join(', ');
  };

  _this.log = function(data, details, senders, config) {
    return new Promise(function(resolve, reject) {
      if (data && data.message) {
        data.message = _this.cleanUpFromColoring(data.message);

        config.settings = Object.assign({}, _this.config.settings, config.settings);
        config.composing = Object.assign({}, _this.config.composing, config.composing);

        details = Object.assign({}, details, config.composing.details);
        details.Senders = _this.expandSenders(senders);

        let formattedMessage = data.message;
        let formattedSubject = '';
        let formattedDetails = '';

        if (config.composing.locationInSubject) {
          formattedSubject += '[' + _this.getApplication().getLocation() + '] ';
        }

        formattedSubject += config.composing.subject;

        if (config.composing.messageInSubject && data.message) {
          if (formattedSubject) {
            formattedSubject += ' (' + data.message + ')';
          } else {
            formattedSubject += data.message;
          }
        }

        // formattedSubject = formattedSubject.replace(/<[^>]*?>/g, '').replace(/\n/g, ' ');
        formattedSubject = formattedSubject.replace(/\n/g, ' ').substring(0, 512);

        if (config.settings.sender) {
          if (config.settings.recipients.length > 0) {
            let mailMessage = {
              from: config.settings.sender,
              to: config.settings.recipients,
              subject: formattedSubject
            };

            switch (config.composing.format) {
              case 'html':
                formattedMessage = _this.formatMessage(formattedMessage, 'html');
                formattedDetails = _this.packDetails(details, config.composing, 'html');

                if (formattedDetails.length > 0) {
                  formattedMessage += '<br /><br />' + formattedDetails;
                }

                mailMessage.html = formattedMessage;
                break;
              default:
                formattedMessage = _this.formatMessage(formattedMessage, 'text');
                formattedDetails = _this.packDetails(details, config.composing, 'text');

                if (formattedDetails.length > 0) {
                  formattedMessage += '\n\n' + formattedDetails;
                }

                mailMessage.text = formattedMessage;
                break;
            }

            const transporter = nodemailer.createTransport({
              sendmail: true,
              newline: 'unix',
              path: config.settings.sendmail
            });

            transporter.sendMail(mailMessage)
              .then(function(result) {
                _this.getApplication().getConsole().log(data, details, senders.concat([_this])).then(function() {
                  resolve();
                }).catch(function() {
                  resolve();
                });
              })
              .catch(function(error) {
                _this.getApplication().reportError(error.toString(), details, senders, _this).then(function() {
                  resolve();
                }).catch(function() {
                  resolve();
                });
              });
          }
        }

        if (config.settings.recipients.length == 0) {
          if (_this.getApplication().isToolMode()) {
            reject({
              error: 'Missing recipients paramter',
              details: '{ recipients: [ \'RECIPIENT1\', \'RECIPIENT2\', ... ] }'
            });
          }
          if (!_this.getApplication().isToolMode()) {
            _this.getApplication().reportError('Missing recipients', details, senders, _this).then(function() {
              resolve();
            }).catch(function() {
              resolve();
            });
          }
        }

        if (!config.settings.sender) {
          if (_this.getApplication().isToolMode()) {
            reject({
              error: 'Missing sender paramter',
              details: '{ sender: \'SENDER\' }'
            });
          }
          if (!_this.getApplication().isToolMode()) {
            _this.getApplication().reportError('Missing sender', details, senders, _this).then(function() {
              resolve();
            }).catch(function() {
              resolve();
            });
          }
        }

      }

      if (!data || !data.message) {
        resolve();
      }
    });
  };
}

module.exports = MailLogger;