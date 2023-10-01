class CustomObject {
  constructor(application, name, config, owner) {
    this.application = application;
    this.name = name;
    this.owner = owner;
    this.config = Object.assign({}, config);
  }

  getApplication() {
    return this.application;
  }

  getName() {
    return this.name;
  }

  getConfig() {
    return this.config;
  }

  getOwner() {
    return this.owner;
  }

  getScalarValue(value) {
    let result = value;

    if (typeof result == 'function') {
      result = result.call(this);
    }

    return result;
  }

  getArrayValue(value) {
    let result = this.getScalarValue(value);

    if ((result === null) && (result === undefined)) {
      result = [];
    }
    if ((result !== null) && (result !== undefined) && !Array.isArray(result)) {
      result = [result];
    }

    return result;
  }

  getOverrides(entryType, entryName) {
    if (this.getConfig().overrides) {
      if (this.getConfig().overrides[entryType]) {
        if (this.getConfig().overrides[entryType][entryName]) {
          return this.getConfig().overrides[entryType][entryName];
        }
      }
    }

    return {};
  }
}

module.exports = CustomObject;