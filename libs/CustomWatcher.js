const CustomLoggable = require(`${__dirname}/CustomLoggable.js`);

function CustomWatcher(application, name, config) {
  CustomLoggable.call(this, application, name, config);

  const _this = this;

  _this.watch = function() {

  };

  _this.start = function() {
    return new Promise(function(resolve) {
      if (_this.needScheduler()) {
        _this.getScheduler().start(function() {
          return _this.watch();
        });
      } else {
        _this.watch();
      }

      _this.getApplication().getConsole().log('Started', Object.create({}), _this);

      resolve();
    });
  };

  _this.stop = function() {
    if (_this.needScheduler()) {
      return _this.getScheduler().stop();
    }
  };
}

module.exports = CustomWatcher;