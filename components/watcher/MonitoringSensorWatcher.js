const {
  MonitoringSensor,
} = require('monitoring-sensor');

const CustomWatcher = require(`${__dirname}/../../libs/CustomWatcher.js`);

class Logger {
  constructor(watcher) {
    this.watcher = watcher;
  }

  log(message, attributes) {
    this.watcher.getApplication().getConsole().log(message, attributes, this.watcher);
  }
}

class MonitoringSensorWatcher extends CustomWatcher {
  constructor(application, name, config) {
    super(application, name, config);
  }

  watch() {
    const sensor = new MonitoringSensor(this.getConfig().settings, new Logger(this));
    sensor.start();
  }
}

module.exports = MonitoringSensorWatcher;