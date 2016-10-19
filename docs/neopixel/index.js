document.querySelector('#startButton').addEventListener('click', function(event) {
    event.stopPropagation();
    event.preventDefault();

    if (isWebBluetoothEnabled()) {
        ChromeSamples.clearLog();
        onStartButtonClick();
    }
});

var bluetoothDevice;
var colorCharacteristic;
var brightnessCharacteristic;
var powerSwitchCharacteristic;
var log = ChromeSamples.log;

document.querySelector('#controlsDiv').hidden = true;

document.querySelector('#red').addEventListener('change', onColorChange);
document.querySelector('#green').addEventListener('change', onColorChange);
document.querySelector('#blue').addEventListener('change', onColorChange);

document.querySelector('#brightness').addEventListener('change', onBrightnessChange);
document.querySelector('#powerswitch').addEventListener('click', onPowerSwitchChange);
document.querySelector('#disconnectButton').addEventListener('click', disconnect);

function onColorChange() {
  // read every color whenever one changes
  // combine into a 3 byte Uint8 array
  let color = new Uint8Array(3);
  color[0] = document.querySelector('#red').value;
  color[1] = document.querySelector('#green').value;
  color[2] = document.querySelector('#blue').value;
  colorCharacteristic.writeValue(new Uint8Array(color));
}

function onBrightnessChange(event) { 
  let brightness = event.target.value;
  brightnessCharacteristic.writeValue(new Uint8Array([brightness]));
}

function onPowerSwitchChange(event) {
  let checked = event.target.checked;

  if (checked) {
    powerSwitchCharacteristic.writeValue(new Uint8Array([1]));
  } else {
    powerSwitchCharacteristic.writeValue(new Uint8Array([0]));
  }
}

function onStartButtonClick() {
  let serviceUuid = BluetoothUUID.getCharacteristic(0xCCC0);
  let colorCharacteristicUuid = BluetoothUUID.getCharacteristic(0xCCC1);
  let brightnessCharacteristicUuid = BluetoothUUID.getCharacteristic(0xCCC2);
  let powerSwitchCharacteristicUuid = BluetoothUUID.getCharacteristic(0xCCC3);
  
  log('Requesting Bluetooth Device...');
  navigator.bluetooth.requestDevice({filters: [{services: [serviceUuid]}]})
  .then(device => {
    bluetoothDevice = device; // save a copy
    document.querySelector('#startButton').hidden = true;
    document.querySelector('#controlsDiv').hidden = false;
    log('Connecting to GATT Server...');
    return device.gatt.connect();
  })
  .then(server => {
    log('Getting Service...');
    return server.getPrimaryService(serviceUuid);
  })
  .then(service => {
    log('Getting Characteristics...');
    return service.getCharacteristics();
  })
  .then(characteristics => {
    let queue = Promise.resolve();
      
    // save references to the characteristics we care about
    characteristics.forEach(c => {

      switch(c.uuid) {
        case colorCharacteristicUuid:
          log('Color Characteristic');
          colorCharacteristic = c;          
          queue = queue.then(_ => colorCharacteristic.readValue().then(updateColorSliders));
          break;
        
        case brightnessCharacteristicUuid:
          log('Brightness Characteristic');
          brightnessCharacteristic = c;
          queue = queue.then(_ => brightnessCharacteristic.readValue().then(updateBrightnessSlider));
          break;

        case powerSwitchCharacteristicUuid:
          log('Power Switch Characteristic');
          powerSwitchCharacteristic = c;
          queue = queue.then(_ => function() {
            return powerSwitchCharacteristic.startNotifications().then(_ => {
              log('Power Switch Notifications started');
              powerSwitchCharacteristic.addEventListener('characteristicvaluechanged', powerSwitchCharacteristicChanged);
              return powerSwitchCharacteristic.readValue().then(updatePowerSwitch);
            });
          });
          break;
        
        default:
          log('Skipping ' + c.uuid);
      }
      return queue;
    });
  })
  .catch(error => {
    log('Argh! ' + error);
  });
}

// expecting a value buffer with 3 uint8
function updateColorSliders(value) {
  document.querySelector('#red').value = value.getUint8(0);
  document.querySelector('#green').value = value.getUint8(1);
  document.querySelector('#blue').value = value.getUint8(2);
}

function updateBrightnessSlider(value) {
  document.querySelector('#brightness').value = value.getUint8(0);
}

function updatePowerSwitch(value) {
  // expecting DataView with uint8: 1 for on, 0 for off
  document.querySelector('#powerswitch').checked = value.getUint8(0);
}

function powerSwitchCharacteristicChanged(event) {
  let value = event.target.value;
  console.log('Power Switch Value Changed', value.getUint8(0));
  updatePowerSwitch(value);
}

function disconnect() {
  if (bluetoothDevice && !bluetoothDevice.gatt.connected) {
    bluetoothDevice.gatt.disconnect().then(_ => { 
      document.querySelector('#startButton').hidden = false;
      document.querySelector('#controlsDiv').hidden = true;
    })
  } else {
    document.querySelector('#startButton').hidden = false;
    document.querySelector('#controlsDiv').hidden = true;
  }
}
