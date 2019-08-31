const child_process = require('child_process');

const CustomWatcher = require(__dirname + '/../libs/CustomWatcher.js');

function MailQueueWatcher(application, name, config) {

  CustomWatcher.call(this, application, name, config);

  const _this = this;

  _this.config.settings.threshold = _this.config.settings.threshold || 0;

  _this.watch = function() {

    _this.getApplication().getExecPull().exec('mailq').then(function(stdout) {
      let regexp = /([0-9]+) Requests/;
      let match = regexp.exec(stdout);
      let amount = 0;
      if (match) {
        amount = parseFloat(match[1]);
      }
      if ((_this.config.settings.threshold == 0) || (amount > _this.config.settings.threshold)) {
        let message = 'Mail queue has ' + amount + ' requests';
        if (_this.config.settings.threshold > 0) {
          message += ' which is more than threshold ' + _this.config.settings.threshold;
        }
        _this.getApplication().notify(_this.getLoggers(), { message: message, value: amount, units: 'Count', dimensions: Object.create({ }) }, Object.create({ }), _this);
      }
    }).catch(function(stdout) {
      _this.getApplication().reportError(stdout, Object.create({ }), _this);
    });

  };

}

module.exports = MailQueueWatcher;
