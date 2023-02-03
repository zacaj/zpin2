import { Board } from "./board";
import { machine, Machine } from "./machine";
import { frame } from "./time";


type Switch_<T extends {[name: string]: number}> = Switch&{[name in keyof T]: boolean};

export class Switch {
  _rawState = false;
  get rawState() {
    return this._rawState;
  }
  set rawState(state: boolean) {
    this._rawState = state;
    this.rawChange.stamp();
  }
  rawChange = frame.stamp();
  lastRawState = this.rawState;
  get closed() {
    return this.state && !this.lastState;
  } // this frame
  get opened() {
    return !this.state && this.lastState;
  }
  get state() {
    return this.rawState;
  }
  lastState = this.state;

  private _name?: string;
  get name(): string {
    if (!this._name) {
      this._name = Object.entries(machine).find(([k, s]) => s===this)![0].slice(1);
      this._name = this.name.slice(0,1).toLowerCase() + this.name.slice(1);
    }
    
    return this._name;
  }

  private constructor(
    public board: Board,
    public num: number,
    public inverted = false,
  ) {
    board.switches.push(this);
  }

  update() {
    this.lastRawState = this.rawState;
    this.lastState = this.state;
  }

  closedFor(ms: number): boolean {
    return this.state; // todo;
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
