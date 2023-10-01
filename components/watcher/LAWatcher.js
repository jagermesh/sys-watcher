const os = require('os');

const CustomWatcher = require(`${__dirname}/../../libs/CustomWatcher.js`);

class LAWatcher extends CustomWatcher {
  constructor(application, name, config) {
    super(application, name, config);

    this.cpus = os.cpus().length;
    this.overload = this.cpus;
  }

  watch() {
    const la = os.loadavg();
    const value = la[0];

    let message = `LA ${la[0].toFixed(2)}, ${la[1].toFixed(2)}, ${la[2].toFixed(2)}`;

    this.getApplication().notify(this.getLoggers(), {
      message: message,
      value: value,
      units: 'Count',
      skipConsole: value < this.overload,
    }, {}, this);
  }
}

module.exports = LAWatcher;