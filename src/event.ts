import { DelimiterParser, SerialPort } from "serialport";
import { Log } from "./log";
import { Clock } from "./timer";

export class Event {
  static eventCount = 0;
  num = ++Event.eventCount;

  constructor(
    public source: any,
    public when = Clock.time,
  ) {
      
  }

  get name(): string {
    return this.constructor.name;
  }
}

class SerialListener {
  port: SerialPort;
  parser: DelimiterParser;

  static StartByte = 0xFE;
  static EndByte = 0xFD;

  constructor(
    public path: string,
    public onEvent: (ev: Event) => void,
  ) {
    this.port = new SerialPort({ path, baudRate: 9600, stopBits: 2, parity: 'none' });
    this.parser = this.port.pipe(new DelimiterParser({ delimiter: Buffer.from([SerialListener.EndByte]) }));
    this.parser.on('data', (buffer: Buffer) => {
      const dataStr = buffer.toString("ascii").trim();
      Log.info('mpu', 'Got data on UART %s: ', path, dataStr);
      const startIndex = buffer.lastIndexOf(SerialListener.StartByte)+1;
      if (startIndex === -1) {
        Log.error('mpu', 'got malformed data "%s", cannot find start byte. dropping', dataStr);
        return;
      }
      const cmd = buffer.subarray(startIndex);
      let checksum = 0;
      for (let i=0; i<cmd.length-1; i++)
        checksum += cmd[i];
      checksum &= 0xFF;
      if (!checksum || checksum >= SerialListener.EndByte) 
        checksum = 1;
      const correct = cmd[cmd.length - 1];
      if (checksum !== correct) {
        Log.error('mpu', 'got malformed data "%s", incorrect checksum (calculated %i, got %i).  dropping', dataStr, checksum, correct);
        return;
      }
      onEvent(new Event(cmd.subarray(1, cmd.length - 1)));
    });
    this.parser.on('error', err => {
      Log.error('mpu', '%s error: ', this.path, err);
    });
  }

  close() {
    this.port.close();
  }
}

export class Events {
  static pending: Event[] = [];
  static listeners: SerialListener[] = [];

  static startListening() {
    this.listeners.set(["/dev/ttyAMA0"/*, "/dev/ttyAMA1", "/dev/ttyAMA2", "/dev/ttyAMA3"*/].map(path => new SerialListener(path, ev => this.pending.push(ev))));
  }
  static getPending(): Event[] {
    const p = this.pending;
    this.pending = [];
    return p;
  }
}

if (require.main === module) {
  Log.init(false, false);
  Events.startListening();
  function loop(events: Event[]): ReturnType<typeof setImmediate> {
  
    if (events.length)
      console.log("events: ", events);
  
    return setImmediate(() => loop(Events.getPending()));
  }
  loop(Events.getPending());
}