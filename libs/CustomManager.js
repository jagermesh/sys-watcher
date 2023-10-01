const HashMap = require('hashmap');

const CustomObject = require(`${__dirname}/CustomObject.js`);
const ManageableEntry = require(`${__dirname}/ManageableEntry.js`);

class CustomManager extends CustomObject {
  constructor(application, name, config, owner, folder) {
    super(application, name, config, owner);

    this.folder = folder;
    this.hash = new HashMap();

    for (let entryName in this.getConfig()) {
      this.appendEntry(entryName, this.getConfig()[entryName]);
    }
  }

  getEntries() {
    return this.hash;
  }

  appendEntry(name, config) {
    if (this.getEntry(name)) {
      this.getApplication().console().error(`${name} already exists, skipping`, {}, this);
    } else {
      let entry = new ManageableEntry(this.getApplication(), name, config, `${__dirname}/../${this.folder}/${config.type}.js`, this);
      this.getEntries().set(name, entry);
    }
  }

  getEntry(entryName) {
    return this.getEntries().get(entryName);
  }

  getInstance(entryName) {
    let entry = this.getEntry(entryName);

    if (entry) {
      return entry.getInstance();
    } else {
      // throw 'Entry ' + entryName + ' not found';
      this.getApplication().fatalError(`Can not find entry ${entryName}`, this);
    }
  }

  start() {
    let promises = [];

    this.getEntries().forEach((entry) => {
      try {
        promises.push(entry.getInstance().start());
      } catch (error) {
        promises.push(Promise.reject(error));
      }
    });

    return Promise.all(promises);
  }

  stop() {
    this.getEntries().forEach((entry) => {
      if (entry.isInitialized()) {
        entry.getInstance().stop();
      }
    });
  }
}

module.exports = CustomManager;