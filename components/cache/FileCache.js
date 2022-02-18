const md5 = require('md5');
const parseDuration = require('parse-duration');
const fileCache = require('node-file-cache');
const os = require('os');

const CustomCache = require(`${__dirname}/../../libs/CustomCache.js`);

function FileCache(application, name, config) {
  CustomCache.call(this, application, name, config);

  const AppId = 'a54c5178-d185-4113-8501-8bdaffcf5ab5';

  const _this = this;

  _this.config.settings.lifespan = _this.config.settings.lifespan || '5 min';
  _this.config.settings.lifespanSeconds = parseDuration(_this.config.settings.lifespan) / 1000;

  const cacheFileName = os.tmpdir() + '/' + AppId + '-' + _this.config.settings.lifespanSeconds + '.cache';

  function getKey(name) {
    return md5(name);
  }

  _this.check = function(name) {
    return new Promise(function(resolve, reject) {
      let cachedValue = _this.cacheImpl.get(getKey(name));
      _this.set(name, 1);
      if (cachedValue) {
        resolve(cachedValue);
      } else {
        reject();
      }
    });
  };

  _this.get = function(name, callback) {
    callback(_this.cacheImpl.get(getKey(name)));
  };

  _this.set = function(name, value) {
    _this.cacheImpl.set(getKey(name), value);
  };

  _this.start = function() {
    return new Promise(function(resolve) {
      _this.cacheImpl = fileCache.create({
        file: cacheFileName,
        life: _this.config.settings.lifespanSeconds
      });

      resolve();
    });
  };

  _this.stop = function() {
    _this.cacheImpl = null;
  };
}

module.exports = FileCache;