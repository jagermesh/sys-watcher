const colors = require('colors');
const SSLChecker = require('ssl-checker');

const CustomWatcher = require(__dirname + '/../../libs/CustomWatcher.js');

function SSLCertificateWatcher(application, name, config) {

  CustomWatcher.call(this, application, name, config);

  const _this = this;

  function checkHostname(hostname) {

    let details = Object.create(null);
    details.hostname = hostname;

    _this.getApplication().getConsole().log('Checking SSL certificate of ' + hostname, Object.create({ }), _this);

    SSLChecker(hostname).then(function(result) {
      result.hostname = hostname;
      if (result.days_remaining < _this.config.settings.threshold) {
        _this.getApplication().notify(_this.getLoggers(), { message: 'SLL certificate of ' + hostname + ' is expiring soon. ' + result.days_remaining + ' days remaining' }, result, _this);
      } else {
        _this.getApplication().getConsole().log('SSL certificate of ' + hostname + ' is valid, ' + result.days_remaining + ' days remaining', result, _this);
      }
    }).catch(function(error) {
      _this.getApplication().notify(_this.getLoggers(), { message: 'SSL check of ' + hostname + ' failed: ' + error.toString(), isError: true }, details, _this);
    });

  }

  _this.watch = function() {

    let hostnames = _this.getArrayValue(_this.config.settings.hostnames);
    for(let i = 0; i < hostnames.length; i++) {
      checkHostname(hostnames[i]);
    }

  };

}

module.exports = SSLCertificateWatcher;
