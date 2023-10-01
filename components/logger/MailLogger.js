const nodemailer = require('nodemailer');

const CustomLogger = require(`${__dirname}/../../libs/CustomLogger.js`);

class MailLogger extends CustomLogger {
  constructor(application, name, config) {
    super(application, name, config);

    this.config.settings = Object.assign({
      recipients: [],
      sendmail: '/usr/sbin/sendmail',
      subject: '',
    }, this.config.settings);
  }

  getRecipients() {
    return this.getConfig().settings.recipients.join(', ');
  }

  log(data, details, senders, config) {
    return new Promise((resolve, reject) => {
      if (data && data.message) {
        data.message = this.cleanUpFromColoring(data.message);

        config.settings = Object.assign({}, this.getConfig().settings, config.settings);
        config.composing = Object.assign({}, this.getConfig().composing, config.composing);

        details = Object.assign({}, details, config.composing.details);
        details.Senders = this.expandSenders(senders);

        let formattedMessage = data.message;
        let formattedSubject = '';
        let formattedDetails = '';

        if (config.composing.locationInSubject) {
          formattedSubject += '[' + this.getApplication().getLocation() + '] ';
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
              subject: formattedSubject,
            };

            switch (config.composing.format) {
              case 'html':
                formattedMessage = this.formatMessage(formattedMessage, 'html');
                formattedDetails = this.packDetails(details, config.composing, 'html');

                if (formattedDetails.length > 0) {
                  formattedMessage += '<br /><br />' + formattedDetails;
                }

                mailMessage.html = formattedMessage;
                break;
              default:
                formattedMessage = this.formatMessage(formattedMessage, 'text');
                formattedDetails = this.packDetails(details, config.composing, 'text');

                if (formattedDetails.length > 0) {
                  formattedMessage += '\n\n' + formattedDetails;
                }

                mailMessage.text = formattedMessage;
                break;
            }

            const transporter = nodemailer.createTransport({
              sendmail: true,
              newline: 'unix',
              path: config.settings.sendmail,
            });

            transporter.sendMail(mailMessage)
              .then(() => {
                this.getApplication().getConsole().log(data, details, senders.concat([this])).then(() => {
                  resolve();
                }).catch(() => {
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
            }).catch(() => {
              resolve();
            });
          }
        }

        if (!config.settings.sender) {
          if (this.getApplication().isToolMode()) {
            reject({
              error: 'Missing sender paramter',
              details: '{ sender: \'SENDER\' }',
            });
          }
          if (!this.getApplication().isToolMode()) {
            this.getApplication().reportError('Missing sender', details, senders, this).then(() => {
              resolve();
            }).catch(() => {
              resolve();
            });
          }
        }

      }

      if (!data || !data.message) {
        resolve();
      }
    });
  }
}

module.exports = MailLogger;