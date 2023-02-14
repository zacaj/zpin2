import { boolean } from "yargs";
import { AttractMode } from "./attract";
import { Board, SerialBoard } from "./board";
import { Event, SwitchEvent } from "./event";
import { Game } from "./game";
import { LightState } from "./light";
import { Log } from "./log";
import { MPU } from "./mpu";
import { Node } from "./node";
import { Switch } from "./switch";
import { Clock, frame, Timer, clock, Instant } from "./time";
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
  lastActualChange = Instant.now();
  tryStartedAt?: Instant;

  constructor(
    public actual: T,
    public name: keyof Outs,
  ) {
    this.pending = actual;
  }

  trySet(): Promise<void>|void {
    // this.pending = val;
    if (this.tryStartedAt) return;
    if (eq(this.pending, this.actual)) {
      return;
    }
    // if (MPU.isLive && !machine.sDetect3.state) {
    //   this.timer = Timer.callIn(() => this.trySet(), 100, `delayed no-power retry set ${this.name} to ${this.val}`);
    //   return undefined;
    // }
    Log[this instanceof Coil? 'info':'trace'](['machine'], 'try set %s to ', this.name, this.pending);
    this.tryStartedAt = Instant.now();
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
        Log.log('machine', 'failed to %s set to %s, will retry', this.name, this.pending);
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
      this.tryStartedAt = undefined;
    });
  }

  update() {
    if (this.disabled) return;
    void this.trySet();
  }

  abstract init(): Promise<void>;

  abstract set(val: T): Promise<boolean>|boolean;

  get disabled(): boolean {
    return false;
  }
}
class VarOutput<T> extends Output<T> {
  override async init() {}
  override async set(val: T) {
    return true;
  }
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

export class Coil extends Output<boolean, CoilOutputs> {
  static dontFireBefore = Instant.now();
  protected config!: CoilConfig;
  lastFired?: Instant;
  protected configDirty = true;
  static MaxLen = 0xFFFF;

  constructor(
    name: keyof CoilOutputs,
    public num: number,
    public board: SerialBoard,
    cfg?: Partial<CoilConfig>,
    public wait = 1000 as Clock, // min time between fire attempts
    public fake?: () => void,
  ) {
    super(false, name);

    this.config = {
      holdLength: 0,
      holdOffDms: 0,
      holdOnDms: 10,
      strokeLength: 0,
      strokeOffDms: 0,
      strokeOnDms: 10,
      ...cfg,
    };

    this.board.coils.push(this);
  }

  ms(ms: number, off?: number, on?: number): this {
    this.config.strokeLength = ms;
    if (off !== undefined)
      this.config.strokeOffDms = off;
    if (on !== undefined)
      this.config.strokeOnDms = on;
    this.configDirty = true;
    return this;
  }

  hold(ms: number, off?: number, on?: number): this {
    this.config.holdLength = ms;
    if (off !== undefined)
      this.config.holdOffDms = off;
    if (on !== undefined)
      this.config.holdOnDms = on;
    this.configDirty = true;
    return this;
  }

  async init() {
    if (this.num < 0) return;
    this.configDirty = true;
    // if (!machine.sDetect3.state) {
    //   Log.log(['mpu', 'solenoid'], 'skip initializing solenoid %s, no power', this.name);
    //   return;
    // }
    // Log.info(['machine', 'solenoid'], 'init %s as momentary, pulse %i', this.name, this.ms);
    // await this.updateConfig();
  }

  fire(): boolean {
    if (this.num < 0) return true;
    if (this.lastFired?.wasWithin(this.wait, clock)) {
      Log.trace(['machine', 'solenoid'], 'skip firing solenoid %s, too soon', this.name);
      return false;
    }
    if (Coil.dontFireBefore.inFuture(clock)) {
      Log.info(['machine', 'solenoid', 'console'], 'skip firing solenoid %s, global too soon', this.name);
      return false;
    }

    if (this.configDirty)
      this.updateConfig();

    if (!this.config.holdLength && !this.config.strokeLength) {
      Log.error('solenoid', 'solenoid %s has no time!', this.name);
      return true;
    }

    this.lastFired = Instant.now();
    Coil.dontFireBefore.set(this.config.strokeLength + Math.floor(Math.random()*10) + 100, clock);
    Log.log(['machine', 'solenoid'], 'fire solenoid %s', this.name);
    // Events.fire(new SolenoidFireEvent(this));

    // if (!MPU.isLive && gfx && !curRecording && this.fake) void wait(100).then(() => this.fake!());
    {
      const buf = Buffer.alloc(3);
      buf.write('CS');
      buf.writeUint8(this.num, 1);
      this.board.sendCommand(buf);
    }

    // return (ms ?? this.ms) + this.wait + 3 + Math.floor(Math.random()*10);
    return true;
  }

  set(on: boolean) {
    if (on) {
      if (this.lastFired?.wasWithin(this.wait, clock))
        return false;
      return this.fire();
    }
    else
      this.turnOff();

    return true;
  }

  turnOff() {
    if (this.num < 0) return;
    const buf = Buffer.alloc(3);
    buf.write('OS');
    buf.writeUint8(this.num, 1);
    this.board.sendCommand(buf);
  }

  updateConfig() {
    if (this.num < 0) return;
    const buf = Buffer.alloc(11);
    buf.write('CS');
    buf.writeUint8(this.num, 2);
    buf.writeUInt16BE(this.config.strokeLength, 3);
    buf.writeUint8(this.config.strokeOnDms, 5);
    buf.writeUint8(this.config.strokeOffDms, 6);
    buf.writeUInt16BE(this.config.holdLength, 7);
    buf.writeUint8(this.config.holdOnDms, 9);
    buf.writeUint8(this.config.holdOffDms, 10);
    this.board.sendCommand(buf);
    this.configDirty = false;
  }

  override get disabled(): boolean {
    return !this.board.isConnected;
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

export class IncreaseCoil extends Coil {
  i = 0;
  tries = 0;

  constructor(
    name: keyof CoilOutputs,
    num: number,
    board: SerialBoard,
    public initial: number = 25,
    public max: number = 50,
    public steps = 3,
    cfg?: Partial<CoilConfig>,
    wait?: number,
    public resetPeriod = 2000,
    fake?: () => void,
  ) {
    super(name, num, board, cfg, wait as Clock, fake);
    assert(steps >= 2);
  }

  override fire(): boolean {
    let fired: boolean = false;
    if (!this.lastFired) {
      this.ms(this.initial);
      fired = super.fire();
    }
    else {
      if (!this.lastFired.wasWithin(this.resetPeriod, clock)) {
        this.i = 0;
        this.tries = 0;
        this.ms(this.initial);
        fired = super.fire();
      } else {
        this.ms((this.max - this.initial)/(this.steps-1) * this.i + this.initial);
        fired = super.fire();
      }
    } 
    if (fired) {
      this.tries++;
      if (this.tries > this.steps+3)
        return true;
    }
    if (fired && this.i < this.steps - 1)
      this.i++;
    return fired;
  }
}

// export class CoilTrigger extends Output<boolean, CoilOutputs> {
//   constructor(
//     name: keyof CoilOutputs,
//     public coil: Coil,
//     public sw: Switch,
//     public minOffDms = 1,
//   ) {
//     super(false, name);
//   }

//   override async set(enabled: boolean): Promise<boolean> {
//     const buf = Buffer.alloc(12);
//     buf.write('TS');
//     buf.writeUint8(this.coil.num, 2);
//     buf.writeUInt8(this.minOffDms, 11);
//     if (enabled) {
//       buf.writeUInt32BE(1 << this.sw.num, 3);
//       // buf.writeUInt32BE(1 << this.sw.num, 7);
//     }
//     await this.coil.board.sendCommand(buf);
//     return true;
//   }

//   override async init(): Promise<void> {
      
//   }
// }

export class TriggerCoil extends Coil {
  constructor(
    name: keyof CoilOutputs,
    num: number,
    board: SerialBoard,
    public sw: Switch,
    public minOffDms = 1,
    cfg?: Partial<CoilConfig>,
  ) {
    super(name, num, board, cfg);
  }

  // overrideasync init() {
  //   if (this.num < 0) return;
  //   // if (!machine.sDetect3.state) {
  //   //   Log.log(['mpu', 'solenoid'], 'skip initializing solenoid %s, no power', this.name);
  //   //   return;
  //   // }
  //   // Log.info(['machine', 'solenoid'], 'init %s as triggered, pulse %i', this.name, this.ms);
  //   // await this.updateConfig();
  //   await this.set(this.actual)
  // }

  override set(enabled: boolean): boolean {
    if (this.configDirty)
      this.updateConfig();

    const buf = Buffer.alloc(12);
    buf.write('TS');
    buf.writeUint8(this.num, 2);
    buf.writeUInt8(this.minOffDms, 11);
    if (enabled) {
      buf.writeUInt32BE(1 << this.sw.num, 3);
      // buf.writeUInt32BE(1 << this.sw.num, 7);
      Log.info('solenoid', 'solenoid %s trigger enabled', this.name);
    }
    else
      Log.info('solenoid', 'solenoid %s trigger disabled', this.name);
    this.board.sendCommand(buf);
    return true;
  }
}

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
  enableKickers: boolean;
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
  enableKickers: false,
};

export class Machine {
  node1 = new SerialBoard("/dev/ttyAMA1");
  // node1 = new SerialBoard("/dev/ttyAMA0");
  node2 = new SerialBoard("/dev/ttyAMA1");
  node3 = new SerialBoard("/dev/ttyAMA2");
  node4 = new SerialBoard("/dev/ttyAMA3");
  mpu = new MPU();
  boards: Board[] = [
    this.mpu,
    this.node1,
    // this.node2,
    // this.node3,
    // this.node4,
  ];

  //#region switches
  sLeftFlipperSwitch = Switch.new(this.node1, 0);
  sRightPop = Switch.new(this.node1, 1);
  sRightFlipperSwitch = Switch.new(this.node1, 2);
  sBehindRightDropsTarget = Switch.new(this.node1, 3);
  sUpperSling = Switch.new(this.node1, 4);
  sRightSling = Switch.new(this.node1, 5);
  sLeftFlipperEos = Switch.new(this.node1, 6);
  sRightFlipperEos = Switch.new(this.node1, 7);
  sRightVuk = Switch.new(this.node1, 8);
  sRightVukJam = Switch.new(this.node1, 9);
  sRightLock1 = Switch.new(this.node1, 10);
  sRightLock2 = Switch.new(this.node1, 11);
  sRightScoop = Switch.new(this.node1, 12, {settled: 500});
  sRightScoopJam = Switch.new(this.node1, 13);
  sRightScoopEntry = Switch.new(this.node1, 14);
  sRightScoopExit = Switch.new(this.node1, 15);
  sShooterLane = Switch.new(this.node1, 16);
  sSkillshotUpper = Switch.new(this.node1, 17);
  sSkillshotLower = Switch.new(this.node1, 18);
  sRightOutlane = Switch.new(this.node1, 19);
  sKickback = Switch.new(this.node1, 20).invert();
  sRightDrop1 = Switch.new(this.node1, 21);
  sRightDrop2 = Switch.new(this.node1, 22);
  sRightDrop3 = Switch.new(this.node1, 23);
  sTrough1 = Switch.new(this.node1, 24);
  sTrough2 = Switch.new(this.node1, 25);
  sTrough3 = Switch.new(this.node1, 26);
  sTrough4 = Switch.new(this.node1, 27);
  sTroughJam = Switch.new(this.node1, 28);
  sRightInlaneTop = Switch.new(this.node1, 29);
  sRightInlaneMiddle = Switch.new(this.node1, 30);
  sRightInlaneBottom = Switch.new(this.node1, 31);
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
  sLeftLock1 = Switch.new(this.node2, 10);
  sLeftLock2 = Switch.new(this.node2, 11);
  sDiverterExitLeft = Switch.new(this.node2, 12);
  sDiverterExitRight = Switch.new(this.node2, 13);
  sSideHoleEntry = Switch.new(this.node2, 14);
  sLeftOutlane = Switch.new(this.node2, 15);
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
  sRollover6 = Switch.new(this.node2, 26);
  sRollover7 = Switch.new(this.node2, 27);
  sRollover8 = Switch.new(this.node2, 28);
  sLeftInlaneTop = Switch.new(this.node2, 29);
  sLeftInlaneMiddle = Switch.new(this.node2, 30);
  sLeftInlaneBottom = Switch.new(this.node2, 31);
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
  sCenterTarget3 = Switch.new(this.node3, 10);
  sCenterTarget4 = Switch.new(this.node3, 11);
  sCenterTarget5 = Switch.new(this.node3, 12);
  sLeftScoopRightTarget = Switch.new(this.node3, 13);
  sCenterCaptiveBall = Switch.new(this.node3, 14);
  sLeftScoopLeftTarget = Switch.new(this.node3, 15);
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
  sSideScoop3 = Switch.new(this.node3, 26);
  sSkillshotLeftHole = Switch.new(this.node3, 27);
  sSkillshotRightHole = Switch.new(this.node3, 28);
  sSkillshotBottomHole = Switch.new(this.node3, 29);
  sCaptiveBall3 = Switch.new(this.node3, 30);
  sLeftScoopExit = Switch.new(this.node3, 31);
  //#endregion
  //#region coils
  cLeftFlipperPower = new TriggerCoil('leftFlipperPower', 0, this.node1, this.sLeftFlipperSwitch).ms(12).hold(30);
  cLeftFlipperHold = new TriggerCoil('leftFlipperHold', 1, this.node1, this.sLeftFlipperSwitch).ms(12).hold(Coil.MaxLen);
  cRightPop = new TriggerCoil('rightPop', 2, this.node1, this.sRightPop).ms(40);
  cRightVuk = new IncreaseCoil('rightVuk', 3, this.node1).ms(40);
  cRightScoop = new IncreaseCoil('rightScoop', 4, this.node1).ms(40);
  cKickback = new TriggerCoil('kickback', 5, this.node1, this.sKickback).ms(40);
  cUpperSling = new TriggerCoil('upperSling', 6, this.node1, this.sUpperSling).ms(40);
  cRightFlipperPower = new TriggerCoil('rightFlipperPower', 8, this.node1, this.sRightFlipperSwitch).ms(12).hold(30);
  cRightFlipperHold = new TriggerCoil('rightFlipperHold', 9, this.node1, this.sRightFlipperSwitch).ms(12).hold(Coil.MaxLen);
  cRightSling = new TriggerCoil('rightSling', 10, this.node1, this.sRightSling).ms(40);
  cRightDropReset = new IncreaseCoil('rightDropReset', 11, this.node1).ms(40);
  cTrough = new Coil('trough', 12, this.node1).ms(40);
  cLeftDropReset = new IncreaseCoil('leftDropReset', 0, this.node2).ms(50);
  cLeftDrop1 = new IncreaseCoil('leftDrop1', 1, this.node2).ms(30);
  cLeftDrop2 = new IncreaseCoil('leftDrop2', 2, this.node2).ms(30);
  cLeftDrop3 = new IncreaseCoil('leftDrop3', 3, this.node2);
  cLeftDrop4 = new IncreaseCoil('leftDrop4', 4, this.node2);
  cLeftDrop5 = new IncreaseCoil('leftDrop5', 5, this.node2);
  cLeftDrop6 = new IncreaseCoil('leftDrop6', 6, this.node2);
  cUpperFlipperPower = new TriggerCoil('upperFlipperPower', 8, this.node2, this.sUpperFlipperSwitch);
  cUpperFlipperHold = new TriggerCoil('upperFlipperHold', 9, this.node2, this.sUpperFlipperSwitch);
  cLeftPop = new TriggerCoil('leftPop', 10, this.node2, this.sLeftPop);
  cLeftVuk = new IncreaseCoil('leftVuk', 11, this.node2);
  cLeftSling = new TriggerCoil('leftSling', 12, this.node2, this.sLeftSling);
  cSubwayDiverter = new Coil('subwayDiverter', 13, this.node2);
  cMagnet = new Coil('magnet', 0, this.node3).ms(50);
  cLeftScoop = new IncreaseCoil('leftScoop', 1, this.node3).ms(50);
  cFrontDrop1 = new IncreaseCoil('frontDrop1', 2, this.node3).ms(50);
  cFrontDrop2 = new IncreaseCoil('frontDrop2', 3, this.node3);
  cBackDrop1 = new IncreaseCoil('backDrop1', 4, this.node3);
  cBackDrop2 = new IncreaseCoil('backDrop2', 5, this.node3);
  cBackDrop3 = new IncreaseCoil('backDrop3', 6, this.node3);
  cChime1 = new Coil('chime1', 8, this.node3);
  cChime2 = new Coil('chime2', 9, this.node3);
  cChime3 = new Coil('chime3', 10, this.node3);
  cKnocker = new Coil('knocker', 11, this.node3);
  cBell = new Coil('bell', 12, this.node3);
  cReel = new Coil('reel', 13, this.node3);
  //#endregion

  lTrail1 = new Light('lTrail1');

  oEnableKickers = new VarOutput(false, "enableKickers");

  prevOutputState = {...defaultOutputs};
  outputState = {...defaultOutputs};

  constructor(
    public isLive: boolean,
    public root: AttractMode|Game = new AttractMode(),
  ) {
  // super();
  }

  async init() {
    await Promise.all([...this.boards].map(x => x.init()));
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

  private _coils?: Coil[];
  get coils(): Coil[] {
    if (!this._coils)
      this._coils = Object.values(this).filter(s => s instanceof Coil) as Coil[];
    return this._coils!;
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
        if (ev instanceof SwitchEvent) {
          ev.sw.onEvent(ev);
        }      
      }
    }

    this.root.loop(events);
    this.timers.filter(t => t.update(events, {}) === 'remove').forEach(t => this.timers.remove(t));

    {
      const outputState = this.root.calcGlobalOutputs();
      this.coils.filter(c => c instanceof TriggerCoil).forEach(c => {
        outputState[c.name] ??= outputState.enableKickers;
      });
      this.outputState = {...defaultOutputs, ...outputState};

      for (const name of this.outputState.keys()) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const prev = (this.prevOutputState as any)[name];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const cur = (this.outputState as any)[name];
        if (!eq(prev, cur)) {
          Log.info('machine', "%s changed to %s" + (this.outputs[name].disabled? ", but output is disabled" : ""), name, cur);
          this.outputs[name].pending = cur;
        }
      }
      for (const out of Object.values(this.outputs)) {
        out.update();
      }
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
