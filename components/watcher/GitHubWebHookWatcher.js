const crypto = require('crypto');

const WebWatcher = require(`${__dirname}/WebWatcher.js`);

class GitHubWebHookWatcher extends WebWatcher {
  constructor(application, name, config) {
    super(application, name, config);

    this.config.settings = Object.assign({
      events: {},
    }, this.config.settings);
  }

  sendResponse(response, code, responseMessage, loggers, details, config, logMessage) {
    logMessage = logMessage || responseMessage;

    if (code >= 400) {
      this.getApplication().notify(this.getLoggers(loggers), {
        message: logMessage,
        isError: true,
      }, details, this, config);
    } else {
      this.getApplication().notify(this.getLoggers(loggers), {
        message: logMessage,
      }, details, this, config);
    }

    response.status(code);
    response.send(responseMessage);
  }

  watch() {
    this.getWebServer(this.getConfig().settings.port, (server) => {
      this.server = server;
      this.server.post(this.getConfig().settings.path, (request, response, next) => {
        let signature = request.headers['x-hub-signature'];
        if (signature) {
          if (this.getConfig().settings.secret) {
            signature = signature.replace(/^sha1=/, '');
            let data = request.rawBody.toString();
            let digest = crypto.createHmac('sha1', this.getConfig().settings.secret).update(data).digest('hex');
            if (signature == digest) {
              if (request.body) {
                if (request.body.ref) {
                  request.body.branch = request.body.ref.split('/');
                  request.body.branch = request.body.branch[request.body.branch.length - 1];
                }
              }
              let event = request.headers['x-github-event'];
              let eventHandler = this.getConfig().settings.events[event];
              if (!eventHandler) {
                eventHandler = this.getConfig().settings.events['*'];
              }
              if (eventHandler) {
                if (typeof eventHandler == 'function') {
                  eventHandler.call(this, request, response, next);
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
                    let config = {};
                    if (requestHandler.subject) {
                      config.composing = Object.assign({
                        subject: requestHandler.subject,
                      }, config.composing);
                    }
                    let details = this.getRequestDetails(request);
                    if (requestHandler.cmd) {
                      requestHandler.cwd = requestHandler.cwd || process.cwd();
                      details.Cmd = requestHandler.cmd;
                      details.Cwd = requestHandler.cwd;

                      let cmd = requestHandler.cmd;
                      cmd = cmd.replace('{branch}', request.body.branch);

                      this.getApplication().getExecPool().exec(cmd, requestHandler.cwd, requestHandler.cmdGroup).then((result) => {
                        let stdout = result.stdout;
                        this.sendResponse(response, 200, 'Success', requestHandler.loggers, details, config, stdout);
                      }).catch((result) => {
                        let stdout = result.stdout;
                        this.sendResponse(response, 500, 'Processing failed', requestHandler.loggers, details, config, stdout);
                      });
                    } else {
                      this.sendResponse(response, 200, 'Success', requestHandler.loggers, details, config);
                    }
                  } else {
                    this.sendResponse(response, 403, `No handler for branch ${request.body.branch}`);
                  }
                }
              } else {
                this.sendResponse(response, 403, `No handler for ${event} event`);
              }
            } else {
              this.sendResponse(response, 403, 'Incorrect signature');
            }
          } else {
            this.sendResponse(response, 403, 'Secret not configured');
          }
        } else {
          this.sendResponse(response, 403, 'Signature missing');
        }
      });
    });
  }
}

module.exports = GitHubWebHookWatcher;