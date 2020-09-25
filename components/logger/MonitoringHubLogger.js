const socketClient = require('socket.io-client');
const uuid         = require('uuid');
const os           = require('os');

const CustomLogger = require(__dirname + '/../../libs/CustomLogger.js');

function MonitoringHubLogger(application, name, config) {

  CustomLogger.call(this, application, name, config);

  const _this = this;

  _this.config.settings.hubUrl = _this.config.settings.hubUrl || 'http://localhost:8082';

  let initialized;
  let hubConnection;
  let sensors = [];

  function initialize() {
    if (initialized) {
      return;
    }

    initialized = true;

    _this.getApplication().getConsole().log('Connecting to hub', { hubUrl: _this.config.settings.hubUrl }, _this);

    hubConnection = socketClient.connect(_this.config.settings.hubUrl, { reconnect: true });

    hubConnection.on('connect', function() {
      _this.getApplication().getConsole().log('Connected to hub', { hubUrl: _this.config.settings.hubUrl }, _this);
      for(let sensorUid in sensors) {
        let sensor = sensors[sensorUid];
        _this.getApplication().getConsole().log('Registering sensor', { sensorUid: sensorUid }, _this);
        hubConnection.emit('registerSensor', sensor.sensorInfo);
        hubConnection.emit('sensorData', sensor.sensorData);
      }
    });

    hubConnection.on('sensorRegistered', function(data) {
      let sensor = sensors[data.sensorInfo.sensorUid];
      if (sensor) {
        hubConnection.emit('sensorData', sensor.sensorData);
      }
    });

    hubConnection.on('disconnect', function(a) {
      _this.getApplication().getConsole().log('Disonnected from hub', { hubUrl: _this.config.settings.hubUrl }, _this);
    });
  }

  function sendData(sensorUid) {
    if (hubConnection && hubConnection.connected) {
      let sensor = sensors[sensorUid];
      if (sensor) {
        hubConnection.emit('sensorData', sensor.sensorData);
      }
    } else {
      initialize();
    }
  }

  _this.getRecipients = function() {

    // return _this.config.settings.exchangeName;

  };

  _this.log = function(data, details, senders, config) {

    return new Promise(function(resolve, reject) {

      if (data && data.sensorInfo && data.sensorData) {
        let sensorUid = data.sensorInfo.sensorUid;
        sensors[sensorUid] = { sensorInfo: data.sensorInfo
                             , sensorData: data.sensorData
                             };
        sendData(sensorUid);
      }

      resolve();

    });

  };

}

module.exports = MonitoringHubLogger;
