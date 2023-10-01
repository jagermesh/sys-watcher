const colors = require('colors');
const moment = require('moment');

const CustomLogger = require(`${__dirname}/../../libs/CustomLogger.js`);

class ConsoleLogger extends CustomLogger {
  constructor(application, name, config) {
    super(application, name, config);
  }

  log(data, details, senders, config) {
    return new Promise((resolve) => {
      if (data && data.message && !data.skipConsole) {
        config.settings = Object.assign({}, this.getConfig().settings, config.settings);
        config.composing = Object.assign({}, this.getConfig().composing, config.composing);

        let senderNames = this.expandSenders(senders);

        details = Object.assign({}, details, config.composing.details);
        details.Senders = null;

        let formattedMessage = '';
        let formattedDetails = '';

        formattedMessage = colors.yellow(moment().format()) + ' ';

        if (senderNames) {
          for (let i = 0; i < senderNames.length; i++) {
            formattedMessage += colors.yellow('[' + senderNames[i] + '] ');
          }
        }

        if (data.isError) {
          formattedMessage += colors.red('[ERROR]') + ' ';
        }

        formattedMessage += this.formatMessage(data.message, 'text') + ' ';

        formattedDetails = this.packDetails(details, config.composing, 'json');

        if (formattedDetails) {
          formattedMessage += colors.green(formattedDetails) + ' ';
        }

        console.log(formattedMessage.trim());
      }

      resolve();
    });
  }
}

module.exports = ConsoleLogger;