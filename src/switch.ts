import { Board, BoardTime } from "./board";
import { SwitchEvent } from "./event";
import { Log } from "./log";
import { machine, Machine } from "./machine";
import { clock, Clock, frame, Instant } from "./time";


type Switch_<T extends {[name: string]: number}> = Switch&{[name in keyof T]: boolean};

export class Switch {
  private _rawState = false;
  get rawState() {
    return this._rawState;
  }
  rawChange = Instant.now();
  remoteRawChange = 0 as BoardTime;
  lastRawState = this.rawState;
  get closed() {
    return this.state && !this.lastState;
  } // this frame
  get opened() {
    return !this.state && this.lastState;
  }
  // get state() {
  //   return this.rawState;
  // }
  state = false;
  lastState = this.state;
  stateChange = Instant.now();
  lastOpened = Instant.now();
  lastClosed = Instant.now();

  private _name?: string;
  get name(): string {
    if (!this._name) {
      this._name = Object.entries(machine).find(([k, s]) => s===this)![0].slice(1);
      this._name = this.name.slice(0, 1).toLowerCase() + this.name.slice(1);
    }
    
    return this._name;
  }

  private constructor(
    public board: Board,
    public num: number,
    public closeTime = 0,
    public openTime = 25,
    public inverted = false,
  ) {
    board.switches.push(this);
  }

  update() {
    this.lastRawState = this.rawState;
    if (this.rawState !== this.state && this.rawChange.notWithin(this.rawState? this.closeTime : this.openTime, clock)) 
      this.rawSettled();
  }

  closedFor(ms: number): boolean {
    return this.state && !this.lastClosed.wasWithin(ms, clock);
  }

  openedFor(ms: number): boolean {
    return !this.state && !this.lastOpened.wasWithin(ms, clock);
  }

  invert(): this {
    this.inverted = true;
    return this;
  }

  private rawSettled(fromRaw = false) {
    const delay = this._rawState? this.closeTime : this.openTime;
    this.stateChange.stamp();
    if (!this.state)
      this.lastClosed.copy(this.stateChange);
    else
      this.lastOpened.copy(this.stateChange);
    this.lastState = this.state;
    this.state = this.rawState;
    // Log.log('switch', "%s: SW %s %s -> %s", this.stateChange.clock.toFixed(1).slice(-5), fromRaw? 'r':' ', this.name, this.state);
    Log.log('switch', "%s %s %s @ %s", this.state? 'CLOSE' : ' open', this.name, fromRaw? 'r':' ', (this.remoteRawChange+delay).toFixed(1).slice(-5));
  }

  onEvent(ev: SwitchEvent) {
    this.rawChange.copy(ev.when);
    this.remoteRawChange = ev.remoteWhen;
    this._rawState = ev.state;
    if (this._rawState === this.state)
      Log.info('switch', "%s: rdb %s -> %s", ev.remoteWhen.toFixed(1).slice(-5), ev.sw.name, ev.state);
    else if (this._rawState? this.closeTime : this.openTime)
      Log.info('switch', "%s: raw %s -> %s", ev.remoteWhen.toFixed(1).slice(-5), ev.sw.name, ev.state);
    else 
      this.rawSettled(true);
  }

  static new<T extends {[name: string]: number} = {}>(board: Board, num: number, ext?: T): Switch_<T> {
    const sw = new Switch(board, num) as Switch_<T>;
    if (ext)
      for (const e of Object.keys(ext)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        // (sw as any)[e] = () => sw.closedFor(ext[e]);
        Object.defineProperty(sw, e, {
          get() {
            return sw.closedFor(ext[e]);
          },
        });
      }
    return sw;
  }
}
