function CustomObject(application, name, config, owner) {

  const _this = this;

  _this.config = config || Object.create({ });

  _this.getApplication = function() {

    return application;

  };

  _this.getName = function() {

    return name;

  };

  _this.getConfig = function() {

    return _this.config;

  };

  _this.getOwner = function() {

    return owner;

  };

  _this.getScalarValue = function(value) {

    let result = value;
    if (typeof result == 'function') {
      result = result.call(_this);
    }
    return result;

  };

  _this.getArrayValue = function(value) {

    let result = _this.getScalarValue(value);
    if ((result === null) && (result === undefined)) {
      result = [];
    }
    if ((result !== null) && (result !== undefined) && !Array.isArray(result)) {
      result = [result];
    }
    return result;

  };

  _this.getOverrides = function(entryType, entryName) {

    if (_this.getConfig().overrides) {
      if (_this.getConfig().overrides[entryType]) {
        if (_this.getConfig().overrides[entryType][entryName]) {
          return _this.getConfig().overrides[entryType][entryName];
        }
      }
    }

    return Object.create({ });

  };

}

module.exports = CustomObject;
