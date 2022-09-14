const crypto = require('crypto');

const WebWatcher = require(`${__dirname}/WebWatcher.js`);

function GitHubWebHookWatcher(application, name, config) {
  WebWatcher.call(this, application, name, config);

  const _this = this;

  _this.config.settings.events = _this.config.settings.events || Object.create({});

  function sendResponse(response, code, responseMessage, loggers, details, config, logMessage) {
    logMessage = logMessage || responseMessage;

    if (code >= 400) {
      _this.getApplication().notify(_this.getLoggers(loggers), {
        message: logMessage,
        isError: true
      }, details, _this, config);
    } else {
      _this.getApplication().notify(_this.getLoggers(loggers), {
        message: logMessage
      }, details, _this, config);
    }

    response.status(code);
    response.send(responseMessage);
  }

  _this.watch = function() {
    _this.getWebServer(_this.config.settings.port, function(server) {
      _this.server = server;
      _this.server.post(_this.config.settings.path, function(request, response, next) {
        let signature = request.headers['x-hub-signature'];
        if (signature) {
          if (_this.config.settings.secret) {
            signature = signature.replace(/^sha1=/, '');
            let data = request.rawBody.toString();
            let digest = crypto.createHmac('sha1', _this.config.settings.secret).update(data).digest('hex');
            if (signature == digest) {
              if (request.body) {
                if (request.body.ref) {
                  request.body.branch = request.body.ref.split('/');
                  request.body.branch = request.body.branch[request.body.branch.length - 1];
                }
              }
              let event = request.headers['x-github-event'];
              let eventHandler = _this.config.settings.events[event];
              if (!eventHandler) {
                eventHandler = _this.config.settings.events['*'];
              }
              if (eventHandler) {
                if (typeof eventHandler == 'function') {
                  eventHandler.call(_this, request, response, next);
                } else {
                  let requestHandler;
                  if (request.body.branch) {
                    requestHandler = eventHandler[request.body.branch];
                    if (!requestHandler) {
                      requestHandler = eventHandler['*'];
                    }
                  } else {
                    requestHandler = eventHandler;
                  }
                  if (requestHandler) {
                    let config = Object.create({});
                    if (requestHandler.subject) {
                      config.composing = config.settings || Object.create({});
                      config.composing.subject = requestHandler.subject;
                    }
                    let details = _this.getRequestDetails(request);
                    if (requestHandler.cmd) {
                      requestHandler.cwd = requestHandler.cwd || process.cwd();
                      details.Cmd = requestHandler.cmd;
                      details.Cwd = requestHandler.cwd;

                      let cmd = requestHandler.cmd;
                      cmd = cmd.replace('{branch}', request.body.branch);

                      _this.getApplication().getExecPool().exec(cmd, requestHandler.cwd, requestHandler.cmdGroup).then(function(result) {
                        let stdout = result.stdout;
                        sendResponse(response, 200, 'Success', requestHandler.loggers, details, config, stdout);
                      }).catch(function(result) {
                        let stdout = result.stdout;
                        sendResponse(response, 500, 'Processing failed', requestHandler.loggers, details, config, stdout);
                      });
                    } else {
                      sendResponse(response, 200, 'Success', requestHandler.loggers, details, config);
                    }
                  } else {
                    sendResponse(response, 403, 'No handler for branch ' + request.body.branch);
                  }
                }
              } else {
                sendResponse(response, 403, 'No handler for ' + event + ' event');
              }
            } else {
              sendResponse(response, 403, 'Incorrect signature');
            }
          } else {
            sendResponse(response, 403, 'Secret not configured');
          }
        } else {
          sendResponse(response, 403, 'Signature missing');
        }
      });
    });
  };
}

module.exports = GitHubWebHookWatcher;