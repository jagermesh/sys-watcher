const HashMap = require('hashmap');

const CustomObject = require(`${__dirname}/CustomObject.js`);
const ManageableEntry = require(`${__dirname}/ManageableEntry.js`);

function CustomManager(application, name, config, owner, folder) {
  CustomObject.call(this, application, name, config, owner);

  const _this = this;

  const hash = new HashMap();

  _this.getEntries = function() {
    return hash;
  };

  _this.appendEntry = function(name, config) {
    if (_this.getEntry(name)) {
      _this.getApplication().console().error(name + ' already exists, skipping', Object.create({}), _this);
    } else {
      let entry = new ManageableEntry(_this.getApplication(), name, config, __dirname + '/../' + folder + '/' + config.type + '.js', _this);
      _this.getEntries().set(name, entry);
    }
  };

  _this.getEntry = function(entryName) {
    return _this.getEntries().get(entryName);
  };

  _this.getInstance = function(entryName) {
    let entry = _this.getEntry(entryName);

    if (entry) {
      return entry.getInstance();
    } else {
      // throw 'Entry ' + entryName + ' not found';
      _this.getApplication().fatalError('Can not find entry ' + entryName, _this);
    }
  };

  _this.start = function() {
    let promises = [];

    _this.getEntries().forEach(function(entry) {
      try {
        promises.push(entry.getInstance().start());
      } catch (error) {
        promises.push(Promise.reject(error));
      }
    });

    return Promise.all(promises);
  };

  _this.stop = function() {
    _this.getEntries().forEach(function(entry) {
      if (entry.isInitialized()) {
        entry.getInstance().stop();
      }
    });
  };

  for (let entryName in _this.config) {
    _this.appendEntry(entryName, _this.config[entryName]);
  }
}

module.exports = CustomManager;