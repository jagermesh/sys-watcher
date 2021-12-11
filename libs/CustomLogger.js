const moment = require('moment');
const ip = require('ip');

const CustomLoggable = require(`${__dirname}/CustomLoggable.js`);

function CustomLogger(application, name, config) {
  CustomLoggable.call(this, application, name, config);

  const _this = this;

  _this.config.composing = _this.config.composing || Object.create({});

  function packDetails2(details, options) {
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
    } else
    if (typeof details === 'object') {
      result += JSON.stringify(details);
    } else {
      result += details;
    }

    return result;
  }

  function packDetails(details, options) {
    let result = '';

    for (let name in details) {
      result += options.prefix + name + ':' + options.suffix + ' ' + packDetails2(details[name], options) + options.eol;
    }

    return result;
  }

  _this.cleanUpFromColoring = function(value) {
    return value.replace(/[\u001b]\[[0-9]{1,2}m/g, '');
  };

  _this.expandSenders = function(senders) {
    let result = [];

    if (senders) {
      for (let i = 0; i < senders.length; i++) {
        result.push(senders[i].getName());
      }
    }

    return result;
  };

  _this.formatMessage = function(message, format) {
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
  };

  _this.packDetails = function(details, composing, format, options) {
    let packableDetails = Object.create({});
    let name;

    for (name in details) {
      let value = details[name];
      if (value && (!Array.isArray(value) || (value.length > 0))) {
        packableDetails[name] = value;
      }
    }

    if (composing.hostInfo) {
      if (_this.getApplication().getLocation()) {
        packableDetails.Location = _this.getApplication().getLocation();
      }
      packableDetails['Date/Time'] = moment().format();
      packableDetails.IP = ip.address();
    }

    if (_this.config.composing.details) {
      for (name in _this.config.composing.details) {
        packableDetails[name] = _this.config.composing.details[name];
      }
    }

    let result = '';

    switch (format) {
      case 'text':
        options = options || Object.create({});
        options.prefix = options.prefix || '';
        options.suffix = options.suffix || '';
        options.eol = options.eol || '\n';
        result = packDetails(packableDetails, options);
        break;
      case 'html':
        options = options || Object.create({});
        options.prefix = options.prefix || '<strong>';
        options.suffix = options.suffix || '</strong>';
        options.eol = options.eol || '<br />';
        result = packDetails(packableDetails, options);
        break;
      case 'markdown':
        options = options || Object.create({});
        options.prefix = options.prefix || '*';
        options.suffix = options.suffix || '*';
        options.eol = options.eol || '\n';
        result = packDetails(packableDetails, options);
        break;
      case 'json':
        result = JSON.stringify(packableDetails);
        if (result == '{}') {
          result = '';
        }
        break;
    }

    return result;
  };

  _this.getDescription = function() {
    if (_this.getRecipients()) {
      return 'Send message to ' + _this.getRecipients() + ' using ' + _this.config.type;
    } else {
      return 'Send message using ' + _this.config.type + ', --extra paramater must be provided';
    }
  };

  _this.getRecipients = function() {
    return 'unknown';
  };
}

module.exports = CustomLogger;