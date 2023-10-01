const aws = require('aws-sdk');
const ip = require('ip');

const CustomLogger = require(`${__dirname}/../../libs/CustomLogger.js`);

class AWSCloudWatchLogger extends CustomLogger {
  constructor(application, name, config) {
    super(application, name, config);

    this.config.settings = Object.assign({
      nameSpace: 'Watcher',
      dimensions: [],
    }, this.config.settings);
  }

  getRecipients() {
    return '';
  }

  log(data, details, senders, config) {
    return new Promise((resolve) => {
      if (data && (data.value != undefined)) {
        config.settings = Object.assign({}, this.getConfig().settings, config.settings);
        config.composing = Object.assign({}, this.getConfig().composing, config.composing);

        details = Object.assign({}, details, config.composing.details);
        details.Senders = this.expandSenders(senders);

        let dimensions = JSON.parse(JSON.stringify(this.getConfig().settings.dimensions));

        if (config.composing.locationInfo) {
          dimensions.push({
            Name: 'Location',
            Value: this.getApplication().getLocation(),
          });
        }

        if (config.composing.hostInfo) {
          dimensions.push({
            Name: 'IP Address',
            Value: ip.address(),
          });
        }

        if (data.dimensions) {
          for (let name in data.dimensions) {
            dimensions.push({
              Name: name,
              Value: data.dimensions[name],
            });
          }
        }

        let params = {
          MetricData: [{
            MetricName: this.getConfig().settings.metricName,
            Dimensions: dimensions,
            Timestamp: new Date(),
            Unit: data.units,
            Value: data.value,
          }],
          Namespace: this.getConfig().settings.nameSpace,
        };

        let cloudwatch = new aws.CloudWatch({
          region: this.getConfig().settings.AWS.region,
          accessKeyId: this.getConfig().settings.AWS.accessKeyId,
          secretAccessKey: this.getConfig().settings.AWS.secretAccessKey,
        });

        cloudwatch.putMetricData(params, (error) => {
          if (error) {
            this.getApplication().reportError(error.toString(), details, senders, this).then(() => {
              resolve();
            }).catch(() => {
              resolve();
            });
          }

          if (!error) {
            this.getApplication().getConsole().log(data, details, senders.concat([this])).then(() => {
              resolve();
            }).catch(() => {
              resolve();
            });
          }
        });
      }

      if (!data || (data.value == undefined)) {
        resolve();
      }
    });
  }
}

module.exports = AWSCloudWatchLogger;