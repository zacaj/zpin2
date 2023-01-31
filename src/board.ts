import { SerialPort } from "serialport";
import { Log } from "./log";

export class SerialBoard {
  port: SerialPort;

  static StartByte = 0xFE;
  static EndByte = 0xFD;
  
  constructor(
    public path: string,
  ) {
    this.port = new SerialPort({ path, baudRate: 9600, stopBits: 2, parity: 'none' });
    this.port.on('error', err => {
      Log.error('mpu', '%s error: ', this.path, err);
    });
  }

  async sendCommand(cmd: Buffer) {
    const data = Buffer.alloc(cmd.length + 4);
    data.writeUint8(cmd.length+1, 1);
    cmd.copy(data, 2, 0);
    let checksum = data.reduce((prev, cur) => prev+cur, 0);
    checksum &= 0xFF;
    if (!checksum || checksum >= SerialBoard.EndByte) 
      checksum = 1;
    data.writeUInt8(SerialBoard.StartByte, 0);
    data.writeUInt8(checksum, cmd.length + 2);
    data.writeUInt8(SerialBoard.EndByte, cmd.length + 3);

    Log.info('mpu', 'Send command ', data.toString('hex'));
    await new Promise<void>((resolve, reject) =>
      this.port.write(data, undefined, (err) => err? reject(err) : resolve()));
    return new Promise<void>((resolve, reject) =>
      this.port.drain((err) => err? reject(err) : resolve()));
  }
}
