import { AttractMode } from "./attract";
import { Board, SerialBoard } from "./board";
import { Event, SwitchEvent } from "./event";
import { Game } from "./game";
import { LightState } from "./light";
import { Log } from "./log";
import { MPU } from "./mpu";
import { Node } from "./node";
import { Switch } from "./switch";
import { Clock, frame, Timer } from "./time";
import { assert, eq, id, Obj, objectFilter, objectFilterMap, objectMap, then } from "./util";

export interface Init {
  init(): Promise<void>;
}

export abstract class Output<T, Outs = Outputs> implements Init {
  static id = 1;
  id = Output.id++;
  pending!: T;
  // lastActualChange = frame();
  // lastPendingChange = frame();
  lastActualChange = frame.stamp();

  constructor(
    public actual: T,
    public name: keyof Outs,
  ) {
    this.pending = actual;
  }

  trySet(): Promise<void>|void {
    // this.pending = val;
    if (eq(this.pending, this.actual)) {
      return;
    }
    // if (MPU.isLive && !machine.sDetect3.state) {
    //   this.timer = Timer.callIn(() => this.trySet(), 100, `delayed no-power retry set ${this.name} to ${this.val}`);
    //   return undefined;
    // }
    Log[this instanceof Solenoid? 'log':'trace'](['machine'], 'try set %s to ', this.name, this.pending);
    return then(this.set(this.pending), success => {
      // try {
      if (success instanceof Error) {
        Log.error(['machine'], 'error setting output %s to ', this.name, this.pending, success);
      }
      else if (success === true) {
        Log.info('machine', '%s successfully set to ', this.name, this.pending);
        this.actual = this.pending;
        this.lastActualChange.stamp();
      } else {
        // if (!success) {
        Log.log('machine', 'failed to %s set to ', this.name, this.pending);
        // success = 5;
        // } else 
        //   Log.info('machine', 'will retry %s set to ', this.name, this.pending);
        // if (!this.timer)
        //   this.timer = Timer.callIn(() => this.trySet(), success, `delayed retry set ${this.name} to ${this.val}`);
      }
      // } catch (err) {
      //   Log.error(['machine'], 'error setting output %s to ', this.name, this.pending, err);
      //   // debugger;
      //   // if (!this.timer)
      //   //   this.timer = Timer.callIn(() => this.trySet(), 5, `delayed retry set ${this.name} to ${this.val}`);
      // }
    });
  }

  loop() {
    void this.trySet();
  }

  abstract init(): Promise<void>;

  abstract set(val: T): Promise<boolean>|boolean;
}

// export class OutputState {

//   private constructor() {}

//   static new(): OutputState & Partial<Outputs> {
//   return new OutputState();
//   }
// }
// export type OutputState = _OutputState & Partial<Outputs>;
// declare class _OutputState {}
export type OutputState = Partial<Outputs>;

export type Outputs = CoilOutputs&LightOutputs&{
  
};

export type CoilConfig = {
  strokeLength: number;
  strokeOnDms: number;
  strokeOffDms: number;
  holdLength: number;
  holdOnDms: number;
  holdOffDms: number;
};

export abstract class Solenoid extends Output<boolean, CoilOutputs> {

  static firingUntil?: Clock;
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
  lastFired?: Clock;

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

  async fire(ms?: number): Promise<boolean> {
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

    // return (ms ?? this.ms) + this.wait + 3 + Math.floor(Math.random()*10);
    return true;
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

  override async fire(): Promise<boolean> {
    let fired: boolean = false;
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

  override async set(enabled: boolean): Promise<boolean> {
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

export class Light extends Output<LightState[], LightOutputs> {
  constructor(
    name: keyof LightOutputs,
  ) {
    super([], name);
  }
  async init(): Promise<void> {
    
  }
  set(val: LightState[]): boolean | Promise<boolean> {
    return true;
  }  
}

export type CoilOutputs = {
  leftFlipperPower: boolean;
  leftFlipperHold: boolean;
  rightPop: boolean;
  rightVuk: boolean;
  rightScoop: boolean;
  kickback: boolean;
  upperSling: boolean;
  rightFlipperPower: boolean;
  rightFlipperHold: boolean;
  rightSling: boolean;
  rightDropReset: boolean;
  trough: boolean;
  leftDropReset: boolean;
  leftDrop1: boolean;
  leftDrop2: boolean;
  leftDrop3: boolean;
  leftDrop4: boolean;
  leftDrop5: boolean;
  leftDrop6: boolean;
  upperFlipperPower: boolean;
  upperFlipperHold: boolean;
  leftPop: boolean;
  leftVuk: boolean;
  leftSling: boolean;
  subwayDiverter: boolean;
  magnet: boolean;
  leftScoop: boolean;
  frontDrop1: boolean;
  frontDrop2: boolean;
  backDrop1: boolean;
  backDrop2: boolean;
  backDrop3: boolean;
  chime1: boolean;
  chime2: boolean;
  chime3: boolean;
  knocker: boolean;
  bell: boolean;
  reel: boolean;
};

export type LightOutputs = {
  lTrail1: LightState;
};

const defaultOutputs: Outputs = {
  lTrail1: null,
  leftFlipperPower: false,
  leftFlipperHold: false,
  rightPop: false,
  rightVuk: false,
  rightScoop: false,
  kickback: false,
  upperSling: false,
  rightFlipperPower: false,
  rightFlipperHold: false,
  rightSling: false,
  rightDropReset: false,
  trough: false,
  leftDropReset: false,
  leftDrop1: false,
  leftDrop2: false,
  leftDrop3: false,
  leftDrop4: false,
  leftDrop5: false,
  leftDrop6: false,
  upperFlipperPower: false,
  upperFlipperHold: false,
  leftPop: false,
  leftVuk: false,
  leftSling: false,
  subwayDiverter: false,
  magnet: false,
  leftScoop: false,
  frontDrop1: false,
  frontDrop2: false,
  backDrop1: false,
  backDrop2: false,
  backDrop3: false,
  chime1: false,
  chime2: false,
  chime3: false,
  knocker: false,
  bell: false,
  reel: false,
};

export class Machine {
  node1 = new SerialBoard("/dev/ttyAMA0");
  node2 = new SerialBoard("/dev/ttyAMA1");
  node3 = new SerialBoard("/dev/ttyAMA2");
  mpu = new MPU();
  boards: Board[] = [
    this.mpu,
    this.node1,
    this.node2,
    this.node3,
  ];
  sLeftFlipperSwitch = Switch.new(this.node1, 0);
  sRightPop = Switch.new(this.node1, 1);
  sRightFlipperSwitch = Switch.new(this.node1, 2);
  sKickback = Switch.new(this.node1, 3);
  sUpperSling = Switch.new(this.node1, 4);
  sRightSling = Switch.new(this.node1, 5);
  sLeftFlipperEos = Switch.new(this.node1, 6);
  sRightFlipperEos = Switch.new(this.node1, 7);
  sRightVuk = Switch.new(this.node1, 8);
  sRightVukJam = Switch.new(this.node1, 9);
  sRightLock1 = Switch.new(this.node1, 0);
  sRightLock2 = Switch.new(this.node1, 1);
  sRightScoop = Switch.new(this.node1, 2, { settled: 500 });
  sRightScoopJam = Switch.new(this.node1, 3);
  sRightScoopEntry = Switch.new(this.node1, 4);
  sRightScoopExit = Switch.new(this.node1, 5);
  sShooterLane = Switch.new(this.node1, 16);
  sSkillshotUpper = Switch.new(this.node1, 17);
  sSkillshotLower = Switch.new(this.node1, 18);
  sRightOutlane = Switch.new(this.node1, 19);
  sBehindRightDropsTarget = Switch.new(this.node1, 20);
  sRightDrop1 = Switch.new(this.node1, 21);
  sRightDrop2 = Switch.new(this.node1, 22);
  sRightDrop3 = Switch.new(this.node1, 23);
  sTrough1 = Switch.new(this.node1, 24);
  sTrough2 = Switch.new(this.node1, 25);
  sTrough3 = Switch.new(this.node1, 16);
  sTrough4 = Switch.new(this.node1, 17);
  sTroughJam = Switch.new(this.node1, 18);
  sRightInlaneTop = Switch.new(this.node1, 19);
  sRightInlaneMiddle = Switch.new(this.node1, 20);
  sRightInlaneBottom = Switch.new(this.node1, 21);
  sUpperFlipperSwitch = Switch.new(this.node2, 0);
  sLeftPop = Switch.new(this.node2, 1);
  sLeftSling = Switch.new(this.node2, 2);
  sPopShot = Switch.new(this.node2, 3);
  sUpperFlipperTarget = Switch.new(this.node2, 4);
  sRollover1 = Switch.new(this.node2, 5);
  sRollover2 = Switch.new(this.node2, 6);
  sRollover3 = Switch.new(this.node2, 7);
  sLeftVuk = Switch.new(this.node2, 8);
  sLeftVukJam = Switch.new(this.node2, 9);
  sLeftLock1 = Switch.new(this.node2, 0);
  sLeftLock2 = Switch.new(this.node2, 1);
  sDiverterExitLeft = Switch.new(this.node2, 2);
  sDiverterExitRight = Switch.new(this.node2, 3);
  sSideHoleEntry = Switch.new(this.node2, 4);
  sLeftOutlane = Switch.new(this.node2, 5);
  sLeftDrop1 = Switch.new(this.node2, 16);
  sLeftDrop2 = Switch.new(this.node2, 17);
  sLeftDrop3 = Switch.new(this.node2, 18);
  sLeftDrop4 = Switch.new(this.node2, 19);
  sLeftDrop5 = Switch.new(this.node2, 20);
  sLeftDrop6 = Switch.new(this.node2, 21);
  sLeftmostTarget = Switch.new(this.node2, 22);
  sLeftBonusTarget = Switch.new(this.node2, 23);
  sRollover4 = Switch.new(this.node2, 24);
  sRollover5 = Switch.new(this.node2, 25);
  sRollover6 = Switch.new(this.node2, 16);
  sRollover7 = Switch.new(this.node2, 17);
  sRollover8 = Switch.new(this.node2, 18);
  sLeftInlaneTop = Switch.new(this.node2, 19);
  sLeftInlaneMiddle = Switch.new(this.node2, 20);
  sLeftInlaneBottom = Switch.new(this.node2, 21);
  sLeftScoop = Switch.new(this.node3, 0);
  sLeftScoopJam = Switch.new(this.node3, 1);
  sLeftScoopEntry = Switch.new(this.node3, 2);
  sRightBonusTarget = Switch.new(this.node3, 3);
  sCaptiveBall1 = Switch.new(this.node3, 4);
  sCaptiveBall2 = Switch.new(this.node3, 5);
  sBonusLaneTarget = Switch.new(this.node3, 6);
  sCaptiveTarget = Switch.new(this.node3, 7);
  sCenterTarget1 = Switch.new(this.node3, 8);
  sCenterTarget2 = Switch.new(this.node3, 9);
  sCenterTarget3 = Switch.new(this.node3, 0);
  sCenterTarget4 = Switch.new(this.node3, 1);
  sCenterTarget5 = Switch.new(this.node3, 2);
  sLeftScoopRightTarget = Switch.new(this.node3, 3);
  sCenterCaptiveBall = Switch.new(this.node3, 4);
  sLeftScoopLeftTarget = Switch.new(this.node3, 5);
  sFrontDrop1 = Switch.new(this.node3, 16);
  sFrontDrop2 = Switch.new(this.node3, 17);
  sBackDrop1 = Switch.new(this.node3, 18);
  sBackDrop2 = Switch.new(this.node3, 19);
  sBackDrop3 = Switch.new(this.node3, 20);
  sSpinner = Switch.new(this.node3, 21);
  sTilt1 = Switch.new(this.node3, 22);
  sTilt2 = Switch.new(this.node3, 23);
  sSideScoop1 = Switch.new(this.node3, 24);
  sSideScoop2 = Switch.new(this.node3, 25);
  sSideScoop3 = Switch.new(this.node3, 16);
  sSkillshotLeftHole = Switch.new(this.node3, 17);
  sSkillshotRightHole = Switch.new(this.node3, 18);
  sSkillshotBottomHole = Switch.new(this.node3, 19);
  sCaptiveBall3 = Switch.new(this.node3, 20);
  sLeftScoopExit = Switch.new(this.node3, 21);
  // sRightScoop = Switch.new(SwitchBank.A, 0, { settled: 250 });

  // override update(events: Event[], out: Partial<Outputs>): void {
  // }

  cLeftFlipperPower = new MomentarySolenoid('leftFlipperPower', 0, this.node1);
  cLeftFlipperHold = new MomentarySolenoid('leftFlipperHold', 1, this.node1);
  cRightPop = new MomentarySolenoid('rightPop', 2, this.node1);
  cRightVuk = new MomentarySolenoid('rightVuk', 3, this.node1);
  cRightScoop = new MomentarySolenoid('rightScoop', 4, this.node1);
  cKickback = new MomentarySolenoid('kickback', 5, this.node1);
  cUpperSling = new MomentarySolenoid('upperSling', 6, this.node1);
  cRightFlipperPower = new MomentarySolenoid('rightFlipperPower', 8, this.node1);
  cRightFlipperHold = new MomentarySolenoid('rightFlipperHold', 9, this.node1);
  cRightSling = new MomentarySolenoid('rightSling', 10, this.node1);
  cRightDropReset = new MomentarySolenoid('rightDropReset', 11, this.node1);
  cTrough = new MomentarySolenoid('trough', 12, this.node1);
  cLeftDropReset = new MomentarySolenoid('leftDropReset', 0, this.node2);
  cLeftDrop1 = new MomentarySolenoid('leftDrop1', 1, this.node2);
  cLeftDrop2 = new MomentarySolenoid('leftDrop2', 2, this.node2);
  cLeftDrop3 = new MomentarySolenoid('leftDrop3', 3, this.node2);
  cLeftDrop4 = new MomentarySolenoid('leftDrop4', 4, this.node2);
  cLeftDrop5 = new MomentarySolenoid('leftDrop5', 5, this.node2);
  cLeftDrop6 = new MomentarySolenoid('leftDrop6', 6, this.node2);
  cUpperFlipperPower = new MomentarySolenoid('upperFlipperPower', 8, this.node2);
  cUpperFlipperHold = new MomentarySolenoid('upperFlipperHold', 9, this.node2);
  cLeftPop = new MomentarySolenoid('leftPop', 10, this.node2);
  cLeftVuk = new MomentarySolenoid('leftVuk', 11, this.node2);
  cLeftSling = new MomentarySolenoid('leftSling', 12, this.node2);
  cSubwayDiverter = new MomentarySolenoid('subwayDiverter', 13, this.node2);
  cMagnet = new MomentarySolenoid('magnet', 0, this.node3);
  cLeftScoop = new MomentarySolenoid('leftScoop', 1, this.node3);
  cFrontDrop1 = new MomentarySolenoid('frontDrop1', 2, this.node3);
  cFrontDrop2 = new MomentarySolenoid('frontDrop2', 3, this.node3);
  cBackDrop1 = new MomentarySolenoid('backDrop1', 4, this.node3);
  cBackDrop2 = new MomentarySolenoid('backDrop2', 5, this.node3);
  cBackDrop3 = new MomentarySolenoid('backDrop3', 6, this.node3);
  cChime1 = new MomentarySolenoid('chime1', 8, this.node3);
  cChime2 = new MomentarySolenoid('chime2', 9, this.node3);
  cChime3 = new MomentarySolenoid('chime3', 10, this.node3);
  cKnocker = new MomentarySolenoid('knocker', 11, this.node3);
  cBell = new MomentarySolenoid('bell', 12, this.node3);
  cReel = new MomentarySolenoid('reel', 13, this.node3);

  lTrail1 = new Light('lTrail1');

  prevOutputState = {...defaultOutputs};
  outputState = {...defaultOutputs};

  constructor(
    public isLive: boolean,
    public root: AttractMode|Game = new AttractMode(),
  ) {
  // super();
  }

  async init() {
    await Promise.all([...this.boards, ...Object.values(this.outputs)].map(x => x.init()));
  }

  private _switches?: Switch[];
  get switches(): Switch[] {
    if (!this._switches)
      this._switches = Object.values(this).filter(s => s instanceof Switch) as Switch[];
    return this._switches!;
  }

  private _lights?: Light[];
  get lights(): Light[] {
    if (!this._lights)
      this._lights = Object.values(this).filter(s => s instanceof Light) as Light[];
    return this._lights!;
  }

  private _outputs?: {[name: string]: Output<any>};
  get outputs(): {[name: string]: Output<any>} {
    if (!this._outputs)
      this._outputs = objectFilterMap(this as unknown as Obj<Output<any>>, (o) => o instanceof Output? o.name : false, id);
    return this._outputs!;
  }

  // override nodes(): Node[] {
  //   return [this.root];
  // }
  timers: Timer<any>[] = [];

  curFrame = 0;
  loop(events: Event[]) {
    this.prevOutputState = this.outputState;

    {   
      for (const sw of this.switches) {
        sw.update();
      }
      for (const ev of events) {
        if (ev instanceof SwitchEvent)
          ev.sw.rawState = ev.state;          
      }
    }

    this.root.loop(events);
    this.timers.filter(t => t.update(events, {}) === 'remove').forEach(t => this.timers.remove(t));

    this.outputState = {...defaultOutputs, ...this.root.calcGlobalOutputs()};
    for (const name of this.outputState.keys()) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const prev = (this.prevOutputState as any)[name];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const cur = (this.outputState as any)[name];
      if (!eq(prev, cur)) {
        Log.info('machine', "%s changed to ", name, cur);
        this.outputs[name].pending = cur;
      }
    }
    for (const out of Object.values(this.outputs)) {
      out.loop();
    }
    this.curFrame++;
  }
}

export let machine: Machine;
export function resetMachine(isLive: boolean): Machine {
  machine = new Machine(isLive);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  (global as any).machine = machine;

  return machine;
}
