import { AttractMode } from "./attract";
import { Board, SerialBoard } from "./board";
import { Event } from "./event";
import { Game } from "./game";
import { LightState } from "./light";
import { Log } from "./log";
import { Node } from "./node";
import { Solenoid } from "./solenoid";
import { Switch, SwitchBank } from "./switch";
import { eq, objectMap, then } from "./util";

export abstract class Output<T, Outs = Outputs> {
  static id = 1;
  id = Output.id++;
  pending!: T;

  constructor(
    public actual: T,
    public name: keyof Outs,
  ) {
    this.pending = actual;
  }

  trySet(): Promise<void>|void {
    if (eq(this.pending, this.actual)) {
      return undefined;
    }
    // if (MPU.isLive && !machine.sDetect3.state) {
    //   this.timer = Timer.callIn(() => this.trySet(), 100, `delayed no-power retry set ${this.name} to ${this.val}`);
    //   return undefined;
    // }
    Log[this instanceof Solenoid? 'log':'trace'](['machine'], 'try set %s to ', this.name, this.pending);
    return then(this.set(this.pending), success => {
      try {
        if (success instanceof Error) throw success;
        if (success === true) {
          Log.info('machine', '%s successfully set to ', this.name, this.pending);
          this.actual = this.pending;
        } else {
          if (!success) {
            Log.log('machine', 'failed to %s set to ', this.name, this.pending);
            success = 5;
          } else 
            Log.info('machine', 'will retry %s set to ', this.name, this.pending);
          // if (!this.timer)
          //   this.timer = Timer.callIn(() => this.trySet(), success, `delayed retry set ${this.name} to ${this.val}`);
        }
      } catch (err) {
        Log.error(['machine'], 'error setting output %s to ', this.name, this.pending, err);
        // debugger;
        // if (!this.timer)
        //   this.timer = Timer.callIn(() => this.trySet(), 5, `delayed retry set ${this.name} to ${this.val}`);
      }
    });
  }

  abstract init(): Promise<void>;

  abstract set(val: T): Promise<boolean|number>|boolean|number;
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

export type CoilOutputs = {
  rightScoop: boolean;
};

export type LightOutputs = {
  lTrail1: LightState;
};

const defaultOutputs: Outputs = {
  lTrail1: null,
  rightScoop: false,
};

export class Machine {
  node1 = new SerialBoard("/dev/ttyAMA0");
  node2 = new SerialBoard("/dev/ttyAMA1");
  node3 = new SerialBoard("/dev/ttyAMA2");
  boards: Board[] = [
    this.node1,
    this.node2,
    this.node3,
  ];
  sPower = Switch.new(SwitchBank.MPU, -1);
  sRightSling = Switch.new(SwitchBank.A, 0);
  sRightScoop = Switch.new(SwitchBank.A, 0, { settled: 250 });

  // override update(events: Event[], out: Partial<Outputs>): void {
  // }

  prevOutputState = {...defaultOutputs};
  outputState = {...defaultOutputs};

  constructor(
    public root: AttractMode|Game = new AttractMode(),
  ) {
  // super();
  }

  private _switches?: Switch[];
  get switches(): Switch[] {
    if (!this._switches)
      this._switches = Object.values(this).filter(s => s instanceof Switch) as Switch[];
    return this.switches;
  }

  // override nodes(): Node[] {
  //   return [this.root];
  // }

  loop(events: Event[]) {
    this.prevOutputState = this.outputState;
    this.outputState = {...defaultOutputs, ...this.root.calcGlobalOutputs()};
    for (const name of this.outputState.keys()) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const prev = (this.prevOutputState as any)[name];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const cur = (this.outputState as any)[name];
      if (!eq(prev, cur)) {
        Log.info('machine', "%s changed to ", name, cur);
      }
    }
  }
}

export let machine: Machine;
export function resetMachine(): Machine {
  machine = new Machine();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  (global as any).machine = machine;

  return machine;
}
