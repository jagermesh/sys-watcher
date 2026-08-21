const amqpcb = require('amqplib/callback_api');

const CustomLogger = require(`${__dirname}/../../libs/CustomLogger.js`);

class RabbitMQLogger extends CustomLogger {
  constructor(application, name, config) {
    super(application, name, config);

    this.config.settings = Object.assign({
      routingKey: '',
    }, this.config.settings);

    this.connection = null;
    this.channel = null;
    this.connecting = null;
  }

  getRecipients() {
    return this.getConfig().settings.exchangeName;
  }

  closeChannel() {
    if (this.channel) {
      try {
        this.channel.close();
      } catch {
        // already closed
      }
      this.channel = null;
    }
  }

  closeConnection() {
    this.closeChannel();
    if (this.connection) {
      try {
        this.connection.close();
      } catch {
        // already closed
      }
      this.connection = null;
    }
  }

  getChannel() {
    if (this.channel) {
      return Promise.resolve(this.channel);
    }

    if (this.connecting) {
      return this.connecting;
    }

    this.connecting = new Promise((resolve, reject) => {
      amqpcb.connect(this.getConfig().settings.connectString, (error, connection) => {
        if (error) {
          this.connecting = null;
          reject(error);
          return;
        }

        connection.on('error', () => {
          this.closeConnection();
        });

        connection.on('close', () => {
          this.connection = null;
          this.channel = null;
          this.connecting = null;
        });

        connection.createChannel((error, channel) => {
          if (error) {
            try {
              connection.close();
            } catch {
              // ignore
            }
            this.connecting = null;
            reject(error);
            return;
          }

          channel.on('error', () => {
            this.closeChannel();
          });

          channel.on('close', () => {
            this.channel = null;
          });

          this.connection = connection;
          this.channel = channel;
          this.connecting = null;
          resolve(channel);
        });
      });
    });

    return this.connecting;
  }

  log(data, details, senders, config) {
    return new Promise((resolve) => {
      if (data && data.message) {
        data.message = this.cleanUpFromColoring(data.message);

        config.settings = Object.assign({}, this.getConfig().settings, config.settings);
        config.composing = Object.assign({}, this.getConfig().composing, config.composing);

        details = Object.assign({}, details, config.composing.details);
        details.Senders = this.expandSenders(senders);

        let formattedMessage = data.message.trim();
        let formattedDetails = this.packDetails(details, config.composing, 'text');

        if (formattedDetails.length > 0) {
          formattedMessage += '\n' + formattedDetails;
        }

        this.getChannel().then((channel) => {
          channel.publish(this.getConfig().settings.exchangeName, this.getConfig().settings.routingKey, Buffer.from(formattedMessage));
          this.getApplication().getConsole().log(data, details, senders.concat([this])).then(() => {
            resolve();
          }).catch(() => {
            resolve();
          });
        }).catch((error) => {
          this.closeConnection();
          this.getApplication().reportError('Can not connect to RabbitMQ server: ' + error.toString(), details, senders, this).then(() => {
            resolve();
          }).catch(() => {
            resolve();
          });
        });
      } else {
        resolve();
      }
    });
  }

  stop() {
    this.closeConnection();
  }
}

module.exports = RabbitMQLogger;
