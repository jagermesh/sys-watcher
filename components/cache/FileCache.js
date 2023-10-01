const md5 = require('md5');
const parseDuration = require('parse-duration');
const fileCache = require('node-file-cache');
const os = require('os');

const CustomCache = require(`${__dirname}/../../libs/CustomCache.js`);

class FileCache extends CustomCache {
  constructor(application, name, config) {
    super(application, name, config);

    this.appId = 'a54c5178-d185-4113-8501-8bdaffcf5ab5';

    this.config.settings = Object.assign({
      lifespan: '5 min',
    }, this.config.settings);

    this.config.settings.lifespanSeconds = parseDuration(this.config.settings.lifespan) / 1000;

    this.cacheFileName = `${os.tmpdir()}/${this.appId}-${this.config.settings.lifespanSeconds}.cache`;
  }

  getKey(name) {
    return md5(name);
  }

  check(name) {
    return new Promise((resolve, reject) => {
      let cachedValue = this.instance.get(this.getKey(name));
      this.set(name, 1);
      if (cachedValue) {
        resolve(cachedValue);
      } else {
        reject();
      }
    });
  }

  get(name, callback) {
    callback(this.instance.get(this.getKey(name)));
  }

  set(name, value) {
    this.instance.set(this.getKey(name), value);
  }

  start() {
    return new Promise((resolve) => {
      this.instance = fileCache.create({
        file: this.cacheFileName,
        life: this.getConfig().settings.lifespanSeconds,
      });

      resolve();
    });
  }

  stop() {
    this.instance = null;
  }
}

module.exports = FileCache;