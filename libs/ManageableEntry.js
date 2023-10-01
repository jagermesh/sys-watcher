const fs = require('fs');

const CustomObject = require(`${__dirname}/CustomObject.js`);

class ManageableEntry extends CustomObject {
  constructor(application, name, config, classFile, owner) {
    super(application, name, config, owner);

    this.classFile = classFile;
    this.instance = null;
  }

  getInstance() {
    if (!this.instance) {
      try {
        fs.statSync(this.classFile);
        let classImpl = require(this.classFile);
        this.instance = new classImpl(this.getApplication(), this.getName(), this.getConfig());
      } catch (error) {
        this.getApplication().fatalError(`Can not create instance of  ${this.getName()}: ${error.toString()}`, this);
      }
    }

    return this.instance;
  }

  isInitialized() {
    return !!this.instance;
  }
}

module.exports = ManageableEntry;