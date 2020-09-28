const bytes  = require('bytes');
const memory = require('free-memory');
const si     = require('systeminformation');
const uuid   = require('uuid');

const CustomWatcher = require(__dirname + '/../../libs/CustomWatcher.js');

function FreeRAMWatcher(application, name, config) {

  CustomWatcher.call(this, application, name, config);

  const _this = this;

  const sensorUid = uuid.v4();
  const metricUid = uuid.v4();

  _this.config.settings.threshold      = _this.config.settings.threshold || '0 b';
  _this.config.settings.thresholdBytes = bytes.parse(_this.config.settings.threshold);

  let metricConfig = {
    lineColor: 'green'
  , fillColor: 'lightgreen'
  };

  let sensorInfo = {
    sensorUid:   sensorUid
  , sensorName:  _this.getApplication().getLocation()
  , metricsList: [ {
        uid:          metricUid
      , name:         'Free RAM'
      , rendererName: 'FilledLineChart'
      , metricConfig: metricConfig
      }
    ]
  };

  si.mem().then(function(stats) {
    let total    = stats.total;
    let overload = (total * 90 / 100);
    let critical = (total * 95 / 100);

    while(overload > 1024) {
      overload = overload / 1024;
    }

    while(critical > 1024) {
      critical = critical / 1024;
    }

    metricConfig.ranges = [ {
        value:      90
      , title:     `Overload (>${critical.toFixed(2)})`
      , lineColor: 'chocolate'
      , fillColor: 'orange'
      }
    , { value:      95
      , title:     `Critical (>${overload.toFixed(2)})`
      , lineColor: 'red'
      , fillColor: 'lightcoral' }
    ];

    sensorInfo.metricsList[0].metricConfig = metricConfig;

  });

  _this.watch = function() {

    si.mem().then(function(stats) {
      let usable = stats.available;
      let total  = stats.total;
      if ((_this.config.settings.thresholdBytes == 0) || (usable < _this.config.settings.thresholdBytes)) {
        let usableBytes = bytes(usable);
        let totalBytes  = bytes(total);
        let percent     = (usable * 100 / total).toFixed();

        let message = `Free RAM ${usableBytes} out of ${totalBytes}`;
        if (_this.config.settings.thresholdBytes > 0) {
          message += ' which is less than threshold ' + _this.config.settings.threshold;
        }

        const title    = `Free RAM (${_this.getApplication().getLocation()})`;
        const subTitle = `${usableBytes} out of ${totalBytes} (${percent}%)`;

        let value = usable;
        while(value > 1024) {
          value = value / 1024;
        }
        value = value.toFixed(2);

        let sensorData = {
          sensorUid: sensorUid
        , metricUid: metricUid
        , metricData: {
            title:    title
          , subTitle: subTitle
          , value:    value
          }
        };

        _this.getApplication().notify(_this.getLoggers(), { message: message, value: usable, units: 'Bytes', dimensions: Object.create({ }), sensorInfo: sensorInfo, sensorData: sensorData, skipConsole: (_this.config.settings.thresholdBytes == 0) }, Object.create({ }), _this);
      }
    }).catch(function(error) {
      _this.getApplication().notify(_this.getLoggers(), { message: 'Can not retrive RAM information: ' + error.toString(), isError: true }, Object.create({ }), _this);
    });

  };

}

module.exports = FreeRAMWatcher;
