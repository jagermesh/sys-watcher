const aws = require('aws-sdk');
const ip = require('ip');

const CustomLogger = require(`${__dirname}/../../libs/CustomLogger.js`);

function AWSCloudWatchLogger(application, name, config) {
  CustomLogger.call(this, application, name, config);

  const _this = this;

  _this.config.settings.nameSpace = _this.config.settings.nameSpace || 'Watcher';
  _this.config.settings.dimensions = _this.config.settings.dimensions || [];

  _this.getRecipients = function() {
    return '';
  };

  _this.log = function(data, details, senders, config) {
    return new Promise(function(resolve) {
      if (data && (data.value != undefined)) {
        config.settings = Object.assign({}, _this.config.settings, config.settings);
        config.composing = Object.assign({}, _this.config.composing, config.composing);

        details = Object.assign({}, details, config.composing.details);
        details.Senders = _this.expandSenders(senders);

        let dimensions = JSON.parse(JSON.stringify(_this.config.settings.dimensions));

        if (config.composing.locationInfo) {
          dimensions.push({
            Name: 'Location',
            Value: _this.getApplication().getLocation()
          });
        }

        if (config.composing.hostInfo) {
          dimensions.push({
            Name: 'IP Address',
            Value: ip.address()
          });
        }

        if (data.dimensions) {
          for (let name in data.dimensions) {
            dimensions.push({
              Name: name,
              Value: data.dimensions[name]
            });
          }
        }

        let params = {
          MetricData: [{
            MetricName: _this.config.settings.metricName,
            Dimensions: dimensions,
            Timestamp: new Date(),
            Unit: data.units,
            Value: data.value
          }],
          Namespace: _this.config.settings.nameSpace
        };

        let cloudwatch = new aws.CloudWatch({
          region: _this.config.settings.AWS.region,
          accessKeyId: _this.config.settings.AWS.accessKeyId,
          secretAccessKey: _this.config.settings.AWS.secretAccessKey
        });

        cloudwatch.putMetricData(params, function(error) {
          if (error) {
            _this.getApplication().reportError(error.toString(), details, senders, _this).then(function() {
              resolve();
            }).catch(function() {
              resolve();
            });
          }

          if (!error) {
            _this.getApplication().getConsole().log(data, details, senders.concat([_this])).then(function() {
              resolve();
            }).catch(function() {
              resolve();
            });
          }
        });
      }

      if (!data || (data.value == undefined)) {
        resolve();
      }
    });
  };
}

module.exports = AWSCloudWatchLogger;