const colors = require('colors');
const path   = require('path');
const os     = require('os');
const uuid   = require('uuid');

const CustomWatcher = require(__dirname + '/../../libs/CustomWatcher.js');

function LAWatcher(application, name, config) {

  CustomWatcher.call(this, application, name, config);

  const _this = this;

  let sensorUid = uuid.v4();
  let metricUid = uuid.v4();

  const cpus     = os.cpus().length;
  const critical = cpus * 0.75;
  const overload = cpus;

  let metricConfig = Object.create({ });
  metricConfig.lineColor = 'green';
  metricConfig.fillColor = 'lightgreen';
  metricConfig.ranges = [];
  metricConfig.ranges.push({ value: overload
                           , title: `Overload (>${critical.toFixed(2)})`
                           , lineColor: 'chocolate'
                           , fillColor: 'orange'
                           });
  metricConfig.ranges.push({ value: critical
                           , title: `Critical (>${overload.toFixed(2)})`
                           , lineColor: 'red'
                           , fillColor: 'lightcoral'
                           });

  let sensorInfo = { sensorUid:   sensorUid
                   , sensorName:  _this.getApplication().getLocation()
                   , metricsList: [ { uid:          metricUid
                                    , name:         'LA'
                                    , rendererName: 'FilledLineChart'
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
    , metricData: { title:    title
                  , subTitle: subTitle
                  , value:    value
                  }
    };

    let message = title;

    _this.getApplication().notify(_this.getLoggers(), { message: null, sensorInfo: sensorInfo, sensorData: sensorData }, Object.create({ }), _this);

  };

}

module.exports = LAWatcher;
