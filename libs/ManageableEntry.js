const fs = require('fs');

const CustomObject = require(`${__dirname}/CustomObject.js`);

function ManageableEntry(application, name, config, classFile, owner) {
  CustomObject.call(this, application, name, config, owner);

  const _this = this;

  let instance;

  _this.getInstance = function() {
    if (!instance) {
      try {
        fs.statSync(classFile);
        let classImpl = require(classFile);
        instance = new classImpl(_this.getApplication(), name, config);
      } catch (error) {
        _this.getApplication().fatalError('Can not create instance of  ' + name + ': ' + error.toString(), _this);
      }
    }

    return instance;
  };

  _this.isInitialized = function() {
    return !!instance;
  };
}

module.exports = ManageableEntry;