const CustomLoggable = require(__dirname + '/CustomLoggable.js');

function CustomScript(application, name, config) {

  CustomLoggable.call(this, application, name, config);

  const _this = this;

  _this.exec = function() {

  };

  _this.start = function() {

    return new Promise(function(resolve, reject) {

      if (_this.needScheduler()) {
        _this.getScheduler().start(function() {
          _this.exec();
        });
      }

      resolve();

    });

  };

  _this.stop = function() {

    if (_this.needScheduler()) {
      _this.getScheduler().stop();
    }

  };

}

module.exports = CustomScript;
