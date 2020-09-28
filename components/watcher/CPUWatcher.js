const bytes  = require('bytes');
const memory = require('free-memory');
const si     = require('systeminformation');
const uuid   = require('uuid');

const CustomWatcher = require(__dirname + '/../../libs/CustomWatcher.js');

function CPUWatcher(application, name, config) {

  CustomWatcher.call(this, application, name, config);

  const _this = this;

  const sensorUid = uuid.v4();
  const metricUid = uuid.v4();

  _this.config.settings.threshold = _this.config.settings.threshold || 0;

  let overload  = 75;
  let critical = 100;

  let sensorInfo = {
    sensorUid:   sensorUid
  , sensorName:  _this.getApplication().getLocation()
  , metricsList: [ {
        uid:          metricUid
      , name:         'CPU Load'
      , rendererName: 'FilledLineChart'
      , metricConfig: {
          lineColor: 'green'
        , fillColor: 'lightgreen'
        , ranges: [ {
              value:      critical
            , title:     `Overload (>${critical.toFixed(2)})`
            , lineColor: 'chocolate'
            , fillColor: 'orange'
            }
          , { value:      overload
            , title:     `Critical (>${overload.toFixed(2)})`
            , lineColor: 'red'
            , fillColor: 'lightcoral' }
          ]
        }
      }
    ]
  };

  _this.watch = function() {

    si.currentLoad().then(function(stats) {
      if (stats.currentload > _this.config.settings.threshold) {

        let message = `CPU Load ${stats.currentload.toFixed()}%`;

        if (_this.config.settings.threshold > 0) {
          message += ' which is more than threshold ' + _this.config.settings.threshold;
        }

        const title    = `CPU Load ${stats.currentload.toFixed()}% (${_this.getApplication().getLocation()})`;
        const subTitle = `User ${stats.currentload_user.toFixed()}%, System ${stats.currentload_system.toFixed()}%, Idle ${stats.currentload_idle.toFixed()}%`;

        let sensorData = {
          sensorUid: sensorUid
        , metricUid: metricUid
        , metricData: {
            title:    title
          , subTitle: subTitle
          , value:    stats.currentload
          }
        };

        _this.getApplication().notify(_this.getLoggers(), { message: message, value: stats.currentload, units: 'Percent', dimensions: Object.create({ }), sensorInfo: sensorInfo, sensorData: sensorData, skipConsole: (_this.config.settings.threshold == 0) }, Object.create({ }), _this);
      }
    }).catch(function(error) {
      _this.getApplication().notify(_this.getLoggers(), { message: 'Can not retrive CPU information: ' + error.toString(), isError: true }, Object.create({ }), _this);
    });

  };

}

module.exports = CPUWatcher;
