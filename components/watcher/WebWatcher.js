const express = require('express');
const bodyparser = require('body-parser');
const multer = require('multer');
const querystring = require('querystring');

const CustomWatcher = require(`${__dirname}/../../libs/CustomWatcher.js`);

class WebWatcher extends CustomWatcher {
  constructor(application, name, config, owner) {
    super(application, name, config, owner);
  }

  getRequestUrl(request) {
    let url = request.path;

    if (request.query) {
      let s = querystring.stringify(request.query);
      if (s) {
        if (s.length > 0) {
          url += '?' + s;
        }
      }
    }

    return url;
  }

  getRequestDetails(request) {
    let details = JSON.parse(JSON.stringify(request.headers));
    details.ClientIP = request.connection.remoteAddress;

    return details;
  }

  getWebServer(port, done) {
    let tag = `WebServer:${port}`;
    let result = this.getApplication().getConnectionsPool().get(tag);

    if (result) {
      this.getApplication().getConsole().log(`Started at http://localhost:${port}`, {}, this);
      done.call(this, result);
    } else {
      let server = express();
      this.getApplication().getConnectionsPool().set(tag, server);
      server.use(bodyparser.json({
        limit: '50mb',
        extended: true,
        type: [
          'application/json',
          'application/csp-report',
        ],
        verify: (req, res, buf) => {
          req.rawBody = buf;
        },
      }));
      server.use(bodyparser.urlencoded({
        limit: '50mb',
        extended: true,
        verify: (req, res, buf) => {
          req.rawBody = buf;
        },
      }));
      let upload = multer();
      server.use(upload.fields([]));
      server.listen(port, () => {
        this.getApplication().getConsole().log(`Attached to http://localhost:${port}`, {}, this);
        done.call(this, server);
      });
      server.all(/.*/, (request, response, next) => {
        let details = this.getRequestDetails(request);
        this.getApplication().getConsole().log(`${request.method} ${this.getRequestUrl(request)}`, details, this);
        if (
          (request.method == 'POST') ||
          (request.method == 'PUT')
        ) {
          this.getApplication().getConsole().log(`${request.method} ${JSON.stringify(request.body)}`, details, this);
        }
        next();
      });
    }
  }
}

module.exports = WebWatcher;