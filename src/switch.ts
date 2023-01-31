import { machine, Machine } from "./machine";

export enum SwitchBank {
  MPU = -1,
  A = 0,
  B = 1,
  C = 2,
};

type SwitchExt<T extends {[name: string]: number}> = Switch&{[name in keyof T]: () => boolean};

export class Switch {
  state = false;
  closed = false; // this frame
  opened = false;

  private _name?: string;
  get name(): string {
    if (!this._name)
      this._name = Object.entries(machine).find(([k, s]) => s===this)![0].slice(1);
    return this._name;
  }

  private constructor(
    public bank: SwitchBank,
    public num: number,
    public inverted = false,
  ) {

  }

  closedFor(ms: number): boolean {
    return this.closed; // todo;
  }

  static new<T extends {[name: string]: number} = {}>(bank: SwitchBank, num: number, ext?: T): SwitchExt<T> {
    const sw = new Switch(bank, num) as SwitchExt<T>;
    if (ext)
      for (const e of Object.keys(ext)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (sw as any)[e] = () => sw.closedFor(ext[e]);
      }
    return sw;
  }
}
