const url = require('url');
const querystring = require('querystring');

const WebWatcher = require(`${__dirname}/WebWatcher.js`);

function HTTPWatcher(application, name, config) {
  WebWatcher.call(this, application, name, config);

  const _this = this;

  _this.config.settings.rules = _this.config.settings.rules || Object.create({});
  _this.config.settings.routes = _this.config.settings.routes || Object.create({});

  function watch(method, route, config) {
    _this.server[method](route, function(request, response, next) {
      if (typeof config == 'function') {
        config.call(_this, request, response, next);
      } else {
        let message = '';
        let logAll = false;
        let requestValue;
        let requestSubValue;
        let requestSubAttribute;
        let requestAttribute;
        if (config.log) {
          if (typeof config.log == 'string') {
            if (config.log == '*') {
              logAll = true;
            } else {
              requestAttribute = config.log;
              requestValue = request[requestAttribute];
              if (requestValue) {
                if (typeof requestValue == 'string') {
                  message = message + (config.nonames ? '' : requestAttribute + ': ') + requestValue + '\n';
                } else {
                  message = message + (config.nonames ? '' : requestAttribute + ': ') + JSON.stringify(requestValue) + '\n';
                }
              }
            }
          } else
            for (requestAttribute in config.log) {
              requestValue = request[requestAttribute];
              requestSubAttribute = config.log[requestAttribute];
              if (requestSubAttribute == '*') {
                if (requestValue) {
                  if (typeof requestValue == 'string') {
                    message = message + (config.nonames ? '' : requestAttribute + ': ') + requestValue + '\n';
                  } else {
                    message = message + (config.nonames ? '' : requestAttribute + ': ') + JSON.stringify(requestValue) + '\n';
                  }
                }
              } else
              if (typeof requestSubAttribute == 'string') {
                requestSubValue = requestValue[requestSubAttribute];
                if (requestSubValue) {
                  if (typeof requestSubValue == 'string') {
                    message = message + (config.nonames ? '' : requestAttribute + '.' + requestSubAttribute + ': ') + requestSubValue + '\n';
                  } else {
                    message = message + (config.nonames ? '' : requestAttribute + '.' + requestSubAttribute + ': ') + JSON.stringify(requestSubValue) + '\n';
                  }
                }
              } else {
                let requestSubAttributes = JSON.parse(JSON.stringify(requestSubAttribute));
                for (let i = 0; i < requestSubAttributes.length; i++) {
                  requestSubAttribute = requestSubAttributes[i];
                  requestSubValue = requestValue[requestSubAttribute];
                  if (requestSubValue) {
                    if (typeof requestSubValue == 'string') {
                      message = message + (config.nonames ? '' : requestAttribute + '.' + requestSubAttribute + ': ') + requestSubValue + '\n';
                    } else {
                      message = message + (config.nonames ? '' : requestAttribute + '.' + requestSubAttribute + ': ') + JSON.stringify(requestSubValue) + '\n';
                    }
                  }
                }
              }
            }
        } else {
          logAll = true;
        }

        if (logAll) {
          message = request.method + ' ' + _this.getRequestUrl(request);
          if (request.body) {
            message += '\n\n' + JSON.stringify(request.body);
          }
        }

        if (config.except) {
          for (let j = 0; j < config.except.length; j++) {
            let except = config.except[j];
            let regexpExcept = new RegExp(except, 'im');
            matches = regexpExcept.exec(message);
            if (matches !== null) {
              message = '';
              break;
            }
          }
        }

        if (message.length > 0) {
          let details = _this.getRequestDetails(request);
          details.Method = method;
          details.Route = route;
          _this.getApplication().notify(_this.getLoggers(config.loggers), {
            message: message
          }, details, _this);
          response.send('ok');
        }

        if (message.length == 0) {
          response.send('skipped');
        }
      }
    });
  }

  _this.watch = function() {
    _this.getWebServer(_this.config.settings.port, function(server) {
      _this.server = server;
      for (let method in _this.config.settings.routes) {
        for (let route in _this.config.settings.routes[method]) {
          watch(method, route, _this.config.settings.routes[method][route]);
        }
      }
    });
  };
}

module.exports = HTTPWatcher;