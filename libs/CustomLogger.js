const moment = require('moment');
const ip = require('ip');

const CustomLoggable = require(`${__dirname}/CustomLoggable.js`);

class CustomLogger extends CustomLoggable {
  constructor(application, name, config) {
    super(application, name, config);

    this.config = Object.assign({
      composing: {},
    }, this.config);
  }

  packDetails2(details) {
    let result = '';

    if (Array.isArray(details)) {
      let complex = false;
      for (let i = 0; i < details.length; i++) {
        if (Array.isArray(details[i]) || (typeof details[i] === 'object')) {
          complex = true;
          break;
        }
      }
      if (complex) {
        result += JSON.stringify(details);
      }
      if (!complex) {
        result += details.join(', ');
      }
    } else if (typeof details === 'object') {
      result += JSON.stringify(details);
    } else {
      result += details;
    }

    return result;
  }

  packDetails1(details, options) {
    let result = '';

    for (let name in details) {
      result += `${options.prefix}${name}:${options.suffix} ${this.packDetails2(details[name], options)}${options.eol}`;
    }

    return result;
  }

  cleanUpFromColoring(value) {
    // eslint-disable-next-line no-control-regex
    return value.replace(/[\u001b]\[[0-9]{1,2}m/g, '');
  }

  expandSenders(senders) {
    let result = [];

    if (senders) {
      for (let i = 0; i < senders.length; i++) {
        result.push(senders[i].getName());
      }
    }

    return result;
  }

  formatMessage(message, format) {
    switch (format) {
      case 'html':
        message = message.replace(/\n/g, '<br />');
        break;
      case 'text':
        message = message.replace(/<br[^>]*?>/g, '\n');
        message = message.replace(/<[^>]*?>/g, '');
        break;
      case 'markdown':
        message = message.replace(/<strong>/g, '*');
        message = message.replace(/<\/strong>/g, '*');
        message = message.replace(/<pre>/g, '```');
        message = message.replace(/<\/pre>/g, '```');
        break;
    }

    return message.trim();
  }

  packDetails(details, composing, format, options) {
    let packableDetails = {};
    let name;

    for (name in details) {
      let value = details[name];
      if (value && (!Array.isArray(value) || (value.length > 0))) {
        packableDetails[name] = value;
      }
    }

    if (composing.hostInfo) {
      if (this.getApplication().getLocation()) {
        packableDetails.Location = this.getApplication().getLocation();
      }
      packableDetails['Date/Time'] = moment().format();
      packableDetails.IP = ip.address();
    }

    if (this.getConfig().composing.details) {
      for (name in this.getConfig().composing.details) {
        packableDetails[name] = this.getConfig().composing.details[name];
      }
    }

    let result = '';

    switch (format) {
      case 'text':
        options = options || {};
        options.prefix = options.prefix || '';
        options.suffix = options.suffix || '';
        options.eol = options.eol || '\n';
        result = this.packDetails1(packableDetails, options);
        break;
      case 'html':
        options = options || {};
        options.prefix = options.prefix || '<strong>';
        options.suffix = options.suffix || '</strong>';
        options.eol = options.eol || '<br />';
        result = this.packDetails1(packableDetails, options);
        break;
      case 'markdown':
        options = options || {};
        options.prefix = options.prefix || '*';
        options.suffix = options.suffix || '*';
        options.eol = options.eol || '\n';
        result = this.packDetails1(packableDetails, options);
        break;
      case 'json':
        result = JSON.stringify(packableDetails);
        if (result == '{}') {
          result = '';
        }
        break;
    }

    return result;
  }

  getDescription() {
    if (this.getRecipients()) {
      return `Send message to ${this.getRecipients()} using ${this.getConfig().type}`;
    } else {
      return `Send message using ${this.getConfig().type}, --extra paramater must be provided`;
    }
  }

  getRecipients() {
    return 'unknown';
  }
}

module.exports = CustomLogger;