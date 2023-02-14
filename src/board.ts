import { DelimiterParser, SerialPort } from "serialport";
import { BoardBootEvent, Event, Events, EventSource, SwitchEvent } from "./event";
import { Log } from "./log";
import { Init, machine, Outputs } from "./machine";
import { Coil } from "./machine";
import { Switch } from "./switch";
import { clock, Clock, Timer } from "./time";
import { Opaque } from "./util";

export type BoardTime = Opaque<number, 'BoardTime'>;

export class Board extends EventSource implements Init {
  coils: Coil[] = [];
  switches: Switch[] = [];
  isConnected = false;

  // timeOffset = 0 as Clock; // add to remote time to get local
  // protected adjustTime(time: Clock): Clock { // convert remote time to local
  //   return (time + (this.timeOffset)) as Clock;
  // };

  async init() {

  }

  async stop() {

  }  
}

class BoardAckEvent extends Event {
  constructor(
    public number: number,
    public dms: number,
    source: EventSource,
    rawData: any,
  ) {
    super(source, rawData);
  }
}

class BoardConnectEvent extends Event {

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
        if (this.isConnected)
          Log.error('mpu', 'driver board %s rebooted!', this.path);
        onEvent(new BoardBootEvent(this, cmd));
        void this.sayHello("hello");
      }
      else if (str.startsWith('ack')) {
        const [num, dms] = str.substring(4).split(' ').map(s => Number.parseInt(s, 16));
        onEvent(new BoardAckEvent(num, dms, this, cmd));
      }
      else if (str.startsWith('iq ') || str.startsWith('sw ')) {
        const [inputs, dms, triggered, untriggered] = str.substring(3).split(' ').map(s => Number.parseInt(s, 16));
        // const inputs = cmd.readUInt32BE(4);
        // const dms = cmd.readUInt32BE(8);
        // const triggered = cmd.readUInt8(12);
        // const untriggered = cmd.readUInt8(13);
        // const ts = (dms/10).toFixed(1);
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
                onEvent(new SwitchEvent(sw, (newState>0) !== sw.inverted, dms/10 as BoardTime, this, cmd));
            }
          }
          if (triggered !== 255)
            Log.log('console', "coil %i triggered at %s (%s)", triggered, (dms/10).toFixed(1).slice(-5), this.path);
          if (untriggered !== 255)
            Log.log('console', "coil %i untriggered at %s (%s)", untriggered, (dms/10).toFixed(1).slice(-5), this.path);
          Log.log('console', "switch event at %s remote (%s)", (dms/10).toFixed(1).slice(-5), this.path);
          this.lastInputState = inputs;
        }
      }
      else
        Log.error('mpu', 'unrecognized command "%s"/%s from board %s', str, cmd.toString('hex'), this.path);
    });
    this.port.on('error', err => this.onError(err));
    this.port.on('close', () => {
      Log.info('mpu', '%s closed', this.path);
      this.isConnected = false;
    });

    void this.sayHello();
  }

  async sayHello(source = "ack") {
    Log.info("mpu", "saying hello... (%s)", this.path);
    return this.ack(undefined, true)
      .then((dmsOffset) => {
        Log.log('mpu', 'connected to board %s', this.path);
        // this.timeOffset = dmsOffset / 10 as Clock;
        // Log.info('mpu', '%s time offset: ', this.path, this.timeOffset);
        Events.pending.push(new BoardConnectEvent(this, source));
        void this.onConnect();
      })
      .catch(() => {
        Log.error('mpu', 'no response from board %s', this.path);
        this.isConnected = false;
      });
  }

  async onConnect() {
    this.isConnected = true;
    Log.log('machine', 'configuring board %s...', this.path);
    for (const coil of this.coils) {
      await coil.init();
    }
    Log.log('machine', 'configured %i coils for board %s', this.coils.length, this.path);
  }

  protected onError(err: Error) {
    Log.error('mpu', '%s error: ', this.path, err);
  }

  async ack(timeout = 200, force = false): Promise<number> {
    const num = Math.floor(Math.random()*9);
    const buf = Buffer.alloc(3);
    buf.write('AK');
    buf.writeUint8(num, 2);
    Log.log('mpu', 'sending ack %i to %s', num, this.path);
    
    const [ev, dms] = await Promise.all([
      new Promise<BoardAckEvent>((resolve, reject) => {
        machine.timers.push(new class extends Timer<Clock> {
          override update(events: Event[], out: Partial<Outputs>): "remove" | undefined {
            const eve = events.find(e => e instanceof BoardAckEvent && e.number === num) as BoardAckEvent | undefined;
            if (eve) {
              resolve(eve);
              return 'remove';
            }
            return super.update(events, out);
          }
        }(clock, `board ${this.path} ack ${num}`, timeout as Clock, () => {
          reject(`ack timed out after ${timeout} ms`);
          return 'remove';
        }));
      }),
      this.sendCommand(buf, force),
    ]);
    return dms - ev.dms;
  }

  sendCommand(cmd: Buffer, force = false): number {
    const data = Buffer.alloc(cmd.length + 4);
    data.writeUint8(cmd.length+1, 1);
    cmd.copy(data, 2, 0);
    let checksum = data.reduce((prev, cur) => prev+cur, 0);
    checksum &= 0xFF;
    if (!checksum || checksum >= SerialBoard.EndByte) 
      checksum = 1;
    data.writeUInt8(SerialBoard.StartByte, 0);
    // data.writeUInt8((Math.random()*100+32)|0, 1);
    data.writeUInt8(checksum, cmd.length + 2);
    data.writeUInt8(SerialBoard.EndByte, cmd.length + 3);

    Log.info('mpu', (!machine.isLive?'(fake) ' : !this.isConnected? '(not connected) ' : '') + 'Send command %s to %s', data.toString('hex'), this.path);
    if ((!machine.isLive || !this.isConnected) && !force) return 0;
    const sendTime = process.hrtime()[1]/100000;
    // await new Promise<void>((resolve, reject) =>
    //   this.port.write(data, undefined, (err) => err? reject(err) : resolve()));
    this.port.write(data, undefined, err => err && this.onError(err));
    // await new Promise<void>((resolve, reject) =>
    //   this.port.drain((err) => err? reject(err) : resolve()));
    this.port.drain(err => err && this.onError(err));
    return sendTime;
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