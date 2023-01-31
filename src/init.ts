import gpio from "rpi-gpio";

export enum RpiPin {
  PowerDetect = 27,
};

export async function init() {
  await gpio.promise.setup(RpiPin.PowerDetect, gpio.DIR_IN, gpio.EDGE_BOTH);
  gpio.on('change', (pin, value) => {
    
  });
}