const SSLChecker = require('ssl-checker');

const CustomWatcher = require(`${__dirname}/../../libs/CustomWatcher.js`);

class SSLCertificateWatcher extends CustomWatcher {
  constructor(application, name, config) {
    super(application, name, config);
  }

  checkHostname(hostname) {
    let details = Object.create(null);
    details.hostname = hostname;

    this.getApplication().getConsole().log(`Checking SSL certificate of ${hostname}`, {}, this);

    SSLChecker(hostname).then((result) => {
      result.hostname = hostname;
      if (result.days_remaining < this.getConfig().settings.threshold) {
        this.getApplication().notify(this.getLoggers(), {
          message: `SLL certificate of ${hostname} is expiring soon. ${result.days_remaining} days remaining`,
        }, result, this);
      } else {
        this.getApplication().getConsole().log(`SSL certificate of ${hostname} is valid, ${result.days_remaining} days remaining`, result, this);
      }
    }).catch((error) => {
      this.getApplication().notify(this.getLoggers(), {
        message: `SSL check of ${hostname} failed: ${error.toString()}`,
        isError: true,
      }, details, this);
    });
  }

  watch() {
    let hostnames = this.getArrayValue(this.getConfig().settings.hostnames);

    for (let i = 0; i < hostnames.length; i++) {
      this.checkHostname(hostnames[i]);
    }
  }
}

module.exports = SSLCertificateWatcher;