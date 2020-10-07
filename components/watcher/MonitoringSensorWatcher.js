const colors = require('colors');
const path   = require('path');
const os     = require('os');
const uuid   = require('uuid');

const { MonitoringSensor} = require('monitoring-sensor');

const CustomWatcher = require(__dirname + '/../../libs/CustomWatcher.js');

class Logger {

  constructor(watcher) {
    this.watcher = watcher;
  }

  log(message, attributes) {
    this.watcher.getApplication().getConsole().log(message, attributes, this.watcher);
  }

}

function MonitoringSensorWatcher(application, name, config) {

  CustomWatcher.call(this, application, name, config);

  const _this = this;

  _this.watch = function() {

    const sensor = new MonitoringSensor(_this.config.settings, new Logger(_this));
    sensor.start();

  };

}

module.exports = MonitoringSensorWatcher;
