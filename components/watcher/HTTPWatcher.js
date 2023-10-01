const WebWatcher = require(`${__dirname}/WebWatcher.js`);

class HTTPWatcher extends WebWatcher {
  constructor(application, name, config) {
    super(application, name, config);

    this.config.settings = Object.assign({
      rules: {},
      routes: {},
    }, this.config.settings);
  }

  watchRoute(method, route, config) {
    this.server[method](route, function(request, response, next) {
      if (typeof config == 'function') {
        config.call(this, request, response, next);
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
              } else if (typeof requestSubAttribute == 'string') {
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
          message = `${request.method} ${this.getRequestUrl(request)}`;
          if (request.body) {
            message += '\n\n' + JSON.stringify(request.body);
          }
        }

        if (config.except) {
          for (let j = 0; j < config.except.length; j++) {
            let except = config.except[j];
            let regexpExcept = new RegExp(except, 'im');
            let matches = regexpExcept.exec(message);
            if (matches !== null) {
              message = '';
              break;
            }
          }
        }

        if (message.length > 0) {
          let details = this.getRequestDetails(request);
          details.Method = method;
          details.Route = route;
          this.getApplication().notify(this.getLoggers(config.loggers), {
            message: message,
          }, details, this);
          response.send('ok');
        }

        if (message.length == 0) {
          response.send('skipped');
        }
      }
    });
  }

  watch() {
    this.getWebServer(this.getConfig().settings.port, function(server) {
      this.server = server;
      for (let method in this.getConfig().settings.routes) {
        for (let route in this.getConfig().settings.routes[method]) {
          this.watchRoute(method, route, this.getConfig().settings.routes[method][route]);
        }
      }
    });
  }
}

module.exports = HTTPWatcher;