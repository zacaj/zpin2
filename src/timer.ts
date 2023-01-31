import { Opaque, assert } from './util';

export type Time = Opaque<number, 'Time'>;

export class Timer {
  mockTime?: number;

  constructor(
    public name: string,
    public startTime = new Date().getTime(),
  ) {}

  _getTime(): Time {
    if (this.mockTime !== undefined) return this.mockTime as Time;

    return new Date().getTime() - this.startTime as Time;
  }

  get time(): Time {
    return this._getTime();
  }

}

export let Clock = new Timer("clock");
// let frame