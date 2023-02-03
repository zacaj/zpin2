import { DelimiterParser, SerialPort } from "serialport";
import { BoardBootEvent, Event, Events, EventSource, SwitchEvent } from "./event";
import { Log } from "./log";
import { Init, machine } from "./machine";
import { Coil } from "./machine";
import { Switch } from "./switch";
import { Clock } from "./time";


export class Board extends EventSource implements Init {
  coils: Coil[] = [];
  switches: Switch[] = [];
  isConnected = false;

  timeOffset = 0 as Clock; // add to remote time to get local
  adjust(time: number|string): Clock { // convert remote time to local
    if (typeof time === 'string') time = parseFloat(time);
    return (time + (this.timeOffset as number)) as Clock;
  };

  async init() {

  }

  async stop() {

  }  
}

export class SerialBoard extends Board {
  port: SerialPort;
  parser: DelimiterParser;

  static StartByte = 0xFE;
  static EndByte = 0xFD;

  lastInputState = 0;
  
  constructor(
    public path: string,
  ) {
    super();
    this.port = new SerialPort({ path: this.path, baudRate: 115200, stopBits: 2, parity: 'none', autoOpen: false });
    this.parser = this.port.pipe(new DelimiterParser({ delimiter: Buffer.from([SerialBoard.EndByte]) }));
  }

  override async init() {
    if (!machine.isLive) return;
    await new Promise<void>((resolve, reject) => this.port.open(err => err? reject(err) : resolve()));
    Log.log('mpu', 'opened connection to %s', this.path);
    this.parser.on('data', (buffer: Buffer) => {
      this.isConnected = true;
      const dataStr = `'${buffer.toString("ascii")}'/${buffer.toString('hex')}`;
      Log.info('mpu', 'Got data on UART %s: %s ', this.path, dataStr);
      const startIndex = buffer.lastIndexOf(SerialBoard.StartByte)+1;
      if (startIndex === -1) {
        Log.error('mpu', 'got malformed data %s, cannot find start byte. dropping', dataStr);
        return;
      }
      const cmd = buffer.subarray(startIndex+1, buffer.length-1);
      let checksum = buffer[startIndex];
      for (let i=0; i<cmd.length; i++)
        checksum += cmd[i];
      checksum &= 0xFF;
      if (!checksum || checksum >= SerialBoard.EndByte) 
        checksum = 1;
      const correct = buffer[buffer.length - 1];
      if (checksum !== correct) {
        Log.error('mpu', 'got malformed data %s, incorrect checksum (calculated %i, got %i).  dropping', dataStr, checksum, correct);
        return;
      }
      const str = cmd.toString('ascii');
      function onEvent(e: Event) {
        Events.pending.push(e);
      }
      if (str.startsWith('hello')) {
        onEvent(new BoardBootEvent(this, cmd));
      }
      else if (str.startsWith('de ') || str.startsWith('sw ')) {
        const inputs = Number.parseInt(str.substring(3), 16);
        if (inputs === this.lastInputState)
          Log.error('mpu', 'no changes detected from switch event');
        else {
          for (let i=0; i<32; i++) {
            const oldState = this.lastInputState & (1<<i);
            const newState = inputs & (1<<i);
            if (oldState !== newState) {
              const sw = this.switches.find(s => s.num === i);
              if (!sw)
                Log.error('mpu', 'got event for unknown switch %i -> %s on board %s', i, newState>0, this.path);
              else
                onEvent(new SwitchEvent(sw, (newState>0) !== sw.inverted, this, cmd));
            }
          }
          this.lastInputState = inputs;
        }
      }
      else
        Log.error('mpu', 'unrecognized command "%s"/%s from board %s', str, cmd.toString('hex'), this.path);
    });
    this.port.on('error', err => {
      Log.error('mpu', '%s error: ', this.path, err);
    });
    this.port.on('close', () => {
      Log.info('mpu', '%s closed', this.path);
      this.isConnected = false;
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

    Log.info('mpu', (machine.isLive?'(fake) ': '') + 'Send command ', data.toString('hex'));
    if (!machine.isLive) return;
    await new Promise<void>((resolve, reject) =>
      this.port.write(data, undefined, (err) => err? reject(err) : resolve()));
    return new Promise<void>((resolve, reject) =>
      this.port.drain((err) => err? reject(err) : resolve()));
  }

  override async stop() {
    await new Promise<void>((resolve, reject) => this.port.close(err => err? reject(err) : resolve()));
  }

  cleanLog() {
    return `Board ${this.path}`;
  }
}

if (require.main === module) {
  Log.init(false, false);
  const board = new SerialBoard('/dev/ttyAMA0');
  void board.init().then(async () => {
    
    function loop(events: Event[]): ReturnType<typeof setImmediate> {
    
      if (events.length)
        console.log("events: ", events);
    
      return setImmediate(() => loop(Events.getPending()));
    }
    loop(Events.getPending());
  });
}