const CustomLoggable = require(`${__dirname}/CustomLoggable.js`);

function CustomCache(application, name, config) {
  CustomLoggable.call(this, application, name, config);

  const _this = this;

  _this.check = function() {
    return Promise.resolve();
  };

  _this.get = function(name, callback) {
    callback(null);
  };

  _this.set = function() {

  };
}

module.exports = CustomCache;