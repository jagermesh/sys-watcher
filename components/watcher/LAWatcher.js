const colors = require('colors');
const path   = require('path');
const os     = require('os');
const uuid   = require('uuid');

const CustomWatcher = require(__dirname + '/../../libs/CustomWatcher.js');

function LAWatcher(application, name, config) {

  CustomWatcher.call(this, application, name, config);

  const _this = this;

  const sensorUid = uuid.v4();
  const metricUid = uuid.v4();

  const cpus     = os.cpus().length;
  const critical = cpus * 0.75;
  const overload = cpus;

  let metricConfig = {
    lineColor: 'green'
  , suggestedMax: overload
  , min: 0
  , datasets: ['LA']
  , ranges: [ {
        value: critical
      , title: `Critical (>${critical.toFixed(2)})`
      , lineColor: 'chocolate'
      }
    , { value: overload
      , title: `Critical (>${overload.toFixed(2)})`
      , lineColor: 'red'
      }
    ]
  };

  let sensorInfo = {
    sensorUid:   sensorUid
  , sensorName:  _this.getApplication().getLocation()
  , metricsList: [ {
      uid:          metricUid
    , name:         'LA'
    , rendererName: 'Chart'
    , metricConfig: metricConfig
    } ]
  };

  function writeValue(value, critical, overload) {
    let message = '<b';
    if (value > overload) {
      message += ' style="color:red;"';
    } else
    if (value > critical) {
      message += ' style="color:rgb(180, 0, 180);"';
    }
    message += `>${value.toFixed(2)}</b>`;
    return message;
  }

  _this.watch = function() {

    const la       = os.loadavg();
    const title    = `LA ${cpus} CPUs (${_this.getApplication().getLocation()})`;
    const value    = la[0];
    const subTitle = writeValue(la[0], critical, overload) + ' · ' + writeValue(la[1], critical, overload) + ' · ' + writeValue(la[2], critical, overload);

    let sensorData = {
      sensorUid: sensorUid
    , metricUid: metricUid
    , metricData: {
        title:    title
      , subTitle: subTitle
      , values:   [value]
      }
    };

    let message = `LA ${subTitle}`;

    _this.getApplication().notify(_this.getLoggers(), { message: message, value: value, units: 'Count', sensorInfo: sensorInfo, sensorData: sensorData, skipConsole: true }, Object.create({ }), _this);

  };

}

module.exports = LAWatcher;
