const colors = require('colors');
const moment = require('moment');
const ip = require('ip');

const CustomLogger = require(__dirname + '/../../libs/CustomLogger.js');

function ConsoleLogger(application, name, config) {

  CustomLogger.call(this, application, name, config);

  const _this = this;

  _this.log = function(data, details, senders, config) {

    return new Promise(function(resolve, reject) {

      if (data && data.message) {

        config.settings  = Object.assign({ }, _this.config.settings, config.settings);
        config.composing = Object.assign({ }, _this.config.composing, config.composing);

        let senderNames = _this.expandSenders(senders);

        details  = Object.assign({ }, details, config.composing.details);
        details.Senders = null;

        let formattedMessage = '';
        let formattedDetails = '';

        formattedMessage = colors.yellow(moment().format()) + ' ';

        if (senderNames) {
          for(let i = 0; i < senderNames.length; i++) {
            formattedMessage += colors.yellow('[' + senderNames[i] + '] ');
          }
        }

        if (data.isError) {
          formattedMessage += colors.red('[ERROR]') + ' ';
        }

        formattedMessage += _this.formatMessage(data.message, 'text') + ' ';

        formattedDetails = _this.packDetails(details, config.composing, 'json');

        if (formattedDetails) {
          formattedMessage += colors.green(formattedDetails) + ' ';
        }

        console.log(formattedMessage.trim());

      }

      resolve();

    });

  };

}

module.exports = ConsoleLogger;
