const amqpcb = require('amqplib/callback_api');

const CustomLogger = require(`${__dirname}/../../libs/CustomLogger.js`);

class RabbitMQLogger extends CustomLogger {
  constructor(application, name, config) {
    super(application, name, config);

    this.config.settings = Object.assign({
      routingKey: '',
    }, this.config.settings);
  }

  getRecipients() {
    return this.getConfig().settings.exchangeName;
  }

  log(data, details, senders, config) {
    return new Promise((resolve) => {
      if (data && data.message) {
        data.message = this.cleanUpFromColoring(data.message);

        config.settings = Object.assign({}, this.getConfig().settings, config.settings);
        config.composing = Object.assign({}, this.getConfig().composing, config.composing);

        details = Object.assign({}, details, config.composing.details);
        details.Senders = this.expandSenders(senders);

        let formattedMessage = '';
        let formattedDetails = '';

        formattedMessage += data.message;

        formattedDetails += this.packDetails(details, config.composing, 'text');

        formattedMessage = formattedMessage.trim();

        if (formattedDetails.length > 0) {
          formattedMessage += '\n' + formattedDetails;
        }

        amqpcb.connect(this.getConfig().settings.connectString, (error, connection) => {
          if (error) {
            this.getApplication().reportError('Can not connect to RabbitMQ server: ' + error.toString(), details, senders, this).then(() => {
              resolve();
            }).catch(() => {
              resolve();
            });
          }

          if (!error) {
            connection.createChannel((error, channel) => {
              if (error) {
                this.getApplication().reportError('Can not create channel: ' + error.toString(), details, senders, this).then(() => {
                  resolve();
                }).catch(() => {
                  resolve();
                });
              }
              if (!error) {
                channel.publish(this.getConfig().settings.exchangeName, this.getConfig().settings.routingKey, Buffer.from(formattedMessage));
                this.getApplication().getConsole().log(data, details, senders.concat([this])).then(() => {
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
  }
}

module.exports = RabbitMQLogger;