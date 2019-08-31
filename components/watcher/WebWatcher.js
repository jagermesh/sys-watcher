const express = require('express');
const bodyparser = require('body-parser');
const multer = require('multer');
const querystring = require('querystring');

const CustomWatcher = require(__dirname + '/../libs/CustomWatcher.js');

function WebWatcher(application, name, config, owner) {

  CustomWatcher.call(this, application, name, config, owner);

  const _this = this;

  _this.getRequestUrl = function(request) {

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

  };

  _this.getRequestDetails = function(request) {

    let details = JSON.parse(JSON.stringify(request.headers));
    details.ClientIP = request.connection.remoteAddress;

    return details;

  };

  _this.getWebServer = function(port, done) {

    let tag = 'WebServer:' + port;
    let result = _this.getApplication().getConnectionsPool().get(tag);

    if (result) {
      _this.getApplication().getConsole().log('Started at http://localhost:' + port, Object.create({ }), _this);
      done.call(_this, result);
    } else {
      let server = express();
      _this.getApplication().getConnectionsPool().set(tag, server);
      server.use(bodyparser.json({ limit: '50mb', extended: true, verify: function(req,res,buf) { req.rawBody = buf; } }));
      server.use(bodyparser.urlencoded({ limit: '50mb', extended: true, verify: function(req,res,buf) {req.rawBody = buf; } }));
      let upload = multer();
      server.use(upload.fields([]));
      server.listen(port, function() {
        _this.getApplication().getConsole().log('Attached to http://localhost:' + port, Object.create({ }), _this);
        done.call(_this, server);
      });
      server.all(/.*/, function(request, response, next) {
        let details = _this.getRequestDetails(request);
        _this.getApplication().getConsole().log(request.method + ' ' + _this.getRequestUrl(request), details, _this);
        if (request.method == 'POST') {
          _this.getApplication().getConsole().log(request.method + ' ' + JSON.stringify(request.body), details, _this);
        }
        next();
      });
    }

  };

}

module.exports = WebWatcher;
