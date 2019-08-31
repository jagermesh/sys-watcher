const HashMap = require('hashmap');

const CustomObject = require(__dirname + '/CustomObject.js');

function ConnectionsPool(application) {

  CustomObject.call(this, application, 'ConnectionsPool');

  const _this = this;

  const hash = new HashMap();

  _this.getEntries = function() {

    return hash;

  };

  _this.get = function(name) {

    return _this.getEntries().get(name);

  };

  _this.set = function(name, value) {

    return _this.getEntries().set(name, value);

  };

}

module.exports = ConnectionsPool;
