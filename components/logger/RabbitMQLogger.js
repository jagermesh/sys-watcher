const amqpcb = require('amqplib/callback_api');

const CustomLogger = require(`${__dirname}/../../libs/CustomLogger.js`);

function RabbitMQLogger(application, name, config) {
  CustomLogger.call(this, application, name, config);

  const _this = this;

  _this.config.settings.routingKey = _this.config.settings.routingKey || '';

  _this.getRecipients = function() {
    return _this.config.settings.exchangeName;
  };

  _this.log = function(data, details, senders, config) {
    return new Promise(function(resolve) {
      if (data && data.message) {
        data.message = _this.cleanUpFromColoring(data.message);

        config.settings = Object.assign({}, _this.config.settings, config.settings);
        config.composing = Object.assign({}, _this.config.composing, config.composing);

        details = Object.assign({}, details, config.composing.details);
        details.Senders = _this.expandSenders(senders);

        let formattedMessage = '';
        let formattedDetails = '';

        formattedMessage += data.message;

        formattedDetails += _this.packDetails(details, config.composing, 'text');

        formattedMessage = formattedMessage.trim();

        if (formattedDetails.length > 0) {
          formattedMessage += '\n' + formattedDetails;
        }

        amqpcb.connect(_this.config.settings.connectString, function(error, connection) {
          if (error) {
            _this.getApplication().reportError('Can not connect to RabbitMQ server: ' + error.toString(), details, senders, _this).then(function() {
              resolve();
            }).catch(function() {
              resolve();
            });
          }

          if (!error) {
            connection.createChannel(function(error, channel) {
              if (error) {
                _this.getApplication().reportError('Can not create channel: ' + error.toString(), details, senders, _this).then(function() {
                  resolve();
                }).catch(function() {
                  resolve();
                });
              }
              if (!error) {
                channel.publish(_this.config.settings.exchangeName, _this.config.settings.routingKey, Buffer.from(formattedMessage));
                _this.getApplication().getConsole().log(data, details, senders.concat([_this])).then(function() {
                  resolve();
                });
              }
            });
          }
        });

      }

      if (!data || !data.message) {
        resolve();
      }
    });
  };
}

module.exports = RabbitMQLogger;