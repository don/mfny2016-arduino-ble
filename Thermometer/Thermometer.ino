// Adafruit MCP9808 break out board on Arduino Uno with RedBear BLE Shield
#include <BLEPeripheral.h>
#include "Adafruit_MCP9808.h"

// RedBear Lab BLE Shield v2
// See https://github.com/sandeepmistry/arduino-BLEPeripheral#pinouts
#define BLE_REQ   9
#define BLE_RDY   8
#define BLE_RST   -1

// create peripheral instance, see pinouts above
BLEPeripheral blePeripheral = BLEPeripheral(BLE_REQ, BLE_RDY, BLE_RST);
BLEService thermometerService("BBB0");
BLEFloatCharacteristic temperatureCharacteristic("BBB1", BLERead | BLENotify);
BLEDescriptor temperatureDescriptor("2901", "degrees C");

Adafruit_MCP9808 tempSensor = Adafruit_MCP9808();

long previousMillis = 0;  // will store last time temperature was updated
long interval = 2000;     // interval at which to read temperature (milliseconds)
void setup()
{
  Serial.begin(9600);
  Serial.println(F("Bluetooth Low Energy Thermometer"));

  // set advertised name and service
  blePeripheral.setLocalName("Thermometer");
  blePeripheral.setDeviceName("Thermometer");
  blePeripheral.setAdvertisedServiceUuid(thermometerService.uuid());

  // add service and characteristic
  blePeripheral.addAttribute(thermometerService);
  blePeripheral.addAttribute(temperatureCharacteristic);
  blePeripheral.addAttribute(temperatureDescriptor);

  blePeripheral.begin();

  if (!tempSensor.begin()) {
    Serial.println("Couldn't find MCP9808!");
    while (1);
  }
  
  // reset the mcp9808 configuration flags to system default 0x0000
  tempSensor.write16(MCP9808_REG_CONFIG, 0x0000);
}

void loop()
{
  // Tell the bluetooth radio to do whatever it should be working on
  blePeripheral.poll();

  // limit how often we read the sensor
  if(millis() - previousMillis > interval) {
    readTemperatureSensor();
    previousMillis = millis();
  }
}

void readTemperatureSensor() {
    float temperature = tempSensor.readTempC();
    
    // only set the characteristic value if the temperature has changed
    if (temperatureCharacteristic.value() != temperature) {
      temperatureCharacteristic.setValue(temperature);
      Serial.println(temperature);
    }
}

