import { machine } from "os";
import { buffer } from "stream/consumers";
import { config } from "yargs";
import { SerialBoard } from "./board";
import { Log } from "./log";
import { CoilOutputs, Output, Outputs } from "./machine";
import { Switch, SwitchBank } from "./switch";
import { Time } from "./timer";
import { assert } from "./util";

export type CoilConfig = {
  strokeLength: number;
  strokeOnDms: number;
  strokeOffDms: number;
  holdLength: number;
  holdOnDms: number;
  holdOffDms: number;
};

export abstract class Solenoid extends Output<boolean> {

  static firingUntil?: Time;
  config!: CoilConfig;

  constructor(
    name: keyof CoilOutputs,
    public num: number,
    public board: SerialBoard,
    cfg?: Partial<CoilConfig>,
  ) {
    super(false, name);

    this.config = {
      holdLength: 0,
      holdOffDms: 0,
      holdOnDms: 1,
      strokeLength: 0,
      strokeOffDms: 0,
      strokeOnDms: 1,
      ...cfg,
    };
  }

  async updateConfig() {
    const buf = Buffer.alloc(11);
    buf.write('CS');
    buf.writeUint8(this.num, 2);
    buf.writeUInt16BE(this.config.strokeLength, 3);
    buf.writeUint8(this.config.strokeOnDms, 5);
    buf.writeUint8(this.config.strokeOffDms, 6);
    buf.writeUInt16BE(this.config.holdLength, 7);
    buf.writeUint8(this.config.holdOnDms, 9);
    buf.writeUint8(this.config.holdOffDms, 10);
    await this.board.sendCommand(buf);
  }
}

export class MomentarySolenoid extends Solenoid {
  lastFired?: Time;

  constructor(
    name: keyof CoilOutputs,
    num: number,
    board: SerialBoard,
    public readonly ms = 25, // fire time
    cfg?: Partial<CoilConfig>,
    public wait = 1000, // min time between fire attempts
    public fake?: () => void,
  ) {
    super(name, num, board, { strokeLength: ms, ...cfg });
  }

  async init() {
    if (this.num < 0) return;
    // if (!machine.sDetect3.state) {
    //   Log.log(['mpu', 'solenoid'], 'skip initializing solenoid %s, no power', this.name);
    //   return;
    // }
    Log.info(['machine', 'solenoid'], 'init %s as momentary, pulse %i', this.name, this.ms);
    await this.updateConfig();
  }

  async fire(ms?: number): Promise<boolean|number> {
    if (this.num < 0) return true;
    // if (this.lastFired && time() < this.lastFired + this.wait) {
    //   Log.trace(['machine', 'solenoid'], 'skip firing solenoid %s, too soon', this.name);
    //   return this.lastFired + this.wait - time() + 3 + Math.floor(Math.random()*10);
    // }
    // if (Solenoid.firingUntil) {
    //   if (time() <= Solenoid.firingUntil) {
    //     Log.info(['machine', 'solenoid', 'console'], 'skip firing solenoid %s, global too soon', this.name);
    //     return Solenoid.firingUntil - time() + Math.floor(Math.random()*10);
    //   }
    //   Solenoid.firingUntil = undefined;
    // }

    // this.lastFired = time();
    // Solenoid.firingUntil = time() + (ms ?? this.ms)+100 + Math.floor(Math.random()*10) as Time;
    Log.log(['machine', 'solenoid'], 'fire solenoid %s for %i', this.name, ms ?? this.ms);
    // Events.fire(new SolenoidFireEvent(this));

    // if (!MPU.isLive && gfx && !curRecording && this.fake) void wait(100).then(() => this.fake!());
    {
      const buf = Buffer.alloc(3);
      buf.write('CS');
      buf.writeUint8(this.num, 1);
      await this.board.sendCommand(buf);
    }

    return (ms ?? this.ms) + this.wait + 3 + Math.floor(Math.random()*10);
  }

  async set(on: boolean) {
    if (on) return this.fire();
    else if (this.config.holdLength === -1 || this.config.strokeLength === -1)
      await this.turnOff();

    return true;
  }

  async turnOff() {
    const buf = Buffer.alloc(3);
    buf.write('OS');
    buf.writeUint8(this.num, 1);
    await this.board.sendCommand(buf);
  }

  // onFire = (e: Event) => e instanceof SolenoidFireEvent && e.coil === this;
}
// export class SolenoidFireEvent extends Event {
//   constructor(
//     public coil: MomentarySolenoid,
//   ) {
//     super();
//   }
// }

export class IncreaseSolenoid extends MomentarySolenoid {
  i = 0;
  tries = 0;

  constructor(
    name: keyof CoilOutputs,
    num: number,
    board: SerialBoard,
    public initial: number,
    public max: number,
    public steps = 3,
    cfg?: Partial<CoilConfig>,
    wait?: number,
    public resetPeriod = 2000,
    fake?: () => void,
  ) {
    super(name, num, board, initial, cfg, wait, fake);
    assert(steps >= 2);
  }

  override async fire(): Promise<boolean|number> {
    let fired: boolean|number = false;
    // if (!this.lastFired)
      fired = await super.fire(this.initial);
    // else {
    //   if (time() > (this.lastFired + this.resetPeriod)) {
    //     this.i = 0;
    //     this.tries = 0;
    //     fired = await super.fire(this.initial);
    //   } else {
    //     fired = await super.fire((this.max - this.initial)/(this.steps-1) * this.i + this.initial);
    //   }
    // } 
    // if (fired) {
    //   this.tries++;
    //   if (this.tries > this.steps+3)
    //   return true;
    // }
    // if (fired && this.i < this.steps - 1)
    //   this.i++;
    return fired;
  }
}

export class TriggerSolenoid extends MomentarySolenoid {
  constructor(
    name: keyof CoilOutputs,
    num: number,
    board: SerialBoard,
    public sw: Switch,
    ms = 25, // fire time
    public minOffDms = 1,
    cfg?: Partial<CoilConfig>,
    wait = 1, // min time between fire attempts
    fake?: () => void,
  ) {
    super(name, num, board, ms, cfg, wait, fake);
  }

  override async set(enabled: boolean): Promise<boolean|number> {
    const buf = Buffer.alloc(12);
    buf.write('TS');
    buf.writeUint8(this.num, 2);
    buf.writeUInt8(this.minOffDms, 11);
    if (enabled) {
      buf.writeUInt32BE(1 << this.sw.num, 3);
      // buf.writeUInt32BE(1 << this.sw.num, 7);
    }
    await this.board.sendCommand(buf);
    return true;
  }
}

// export class OnOffSolenoid extends Solenoid {
//   constructor(
//     name: keyof CoilOutputs,
//     num: number,
//     board: SerialBoard,
//     public maxOnTime?: number,
//     public pulseOffTime?: number,
//     public pulseOnTime?: number,
//     public fake?: (on: boolean) => void,
//   ) {
//     super(name, num, board);
//   }
//   async init() {
//     if (!machine.sDetect3.state) {
//       Log.log(['mpu', 'solenoid'], 'skip initializing solenoid %s, no power', this.name);
//       return;
//     }
//     Log.info(['machine', 'solenoid'], 'init %s as on off, max %i %i', this.name, this.maxOnTime, this.pulseOffTime);
//     await this.board.initOnOff(this.num, this.maxOnTime, this.pulseOffTime, this.pulseOnTime);
//   }

//   async set(on: boolean) {
//     if (!MPU.isLive && gfx && !curRecording && this.fake) void wait(100).then(() => this.fake!(on));
//     if (on) {
//       if (Solenoid.firingUntil) {
//         if (time() <= Solenoid.firingUntil) {
//           Log.info(['machine', 'solenoid', 'console'], 'skip turning on solenoid %s, global too soon', this.name);
//           return Solenoid.firingUntil - time() + 1;
//         }
//         Solenoid.firingUntil = undefined;
//       }
  
//       Solenoid.firingUntil = time() + (this.pulseOffTime? this.maxOnTime! : 100)+0 as Time;
//       Log.log(['machine', 'solenoid'], `turn ${this.name} ` + (on? 'on':'off'));
//       await this.board.turnOnSolenoid(this.num);
//     }
//     else {
//       Log.log(['machine', 'solenoid'], `turn ${this.name} ` + (on? 'on':'off'));
//       await this.board.turnOffSolenoid(this.num);
//     }
//     return true;
//   }

//   async toggle() {
//     return this.board.toggleSolenoid(this.num);
//   }
// }


if (require.main === module) {
  Log.init(false, false);
  const board = new SerialBoard('/dev/ttyAMA0');
  const coil = new TriggerSolenoid('rightScoop', 0, board, Switch.new(SwitchBank.A, 3), 100, 2, {

  });
  void coil.init().then(() => {
    return coil.set(true)
  })
}