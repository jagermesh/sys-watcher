const os = require('os');

const CustomWatcher = require(`${__dirname}/../../libs/CustomWatcher.js`);

function LAWatcher(application, name, config) {
  CustomWatcher.call(this, application, name, config);

  const _this = this;

  const cpus = os.cpus().length;
  const overload = cpus;

  _this.watch = function() {
    const la = os.loadavg();
    const value = la[0];

    let message = `LA ${la[0].toFixed(2)}, ${la[1].toFixed(2)}, ${la[2].toFixed(2)}`;

    _this.getApplication().notify(_this.getLoggers(), {
      message: message,
      value: value,
      units: 'Count',
      skipConsole: value < overload
    }, Object.create({}), _this);
  };
}

module.exports = LAWatcher;