import { Event } from './event';
import { machine, Outputs } from './machine';
import { Node } from './node';
import { Opaque, assert } from './util';

type Time<T extends number> = (() => T) & {
  mockTime?: T;
  startTime: T;
  getTime: () => number;
  wait(val: number, context?: string): Promise<void>;
  stamp(): Timestamp<T>;
};

function wait<T extends number>(this: Time<T>, val: number, context?: string): Promise<void> {
  return new Promise(resolve => new Timer(this, context, val, () => resolve()));
}

function stamp<T extends number>(this: Time<T>): Timestamp<T> {
  return new Timestamp(this);
}

export function makeTime<T extends number>(getTime: () => number, startTime: T = 0 as T): Time<T> {
  const time: Time<T> = function(this: Time<T>) {
    return time.mockTime ?? (time.getTime() - time.startTime) as T;
  };
  time.startTime = startTime;
  time.getTime = getTime;
  time.wait = wait;
  time.stamp = stamp;
  return time;
}

export type Clock = Opaque<number, 'Clock'>;
export const clock = makeTime<Clock>(() => new Date().getTime());

export type PlayTime = Opaque<number, 'PlayTime'>;
export const playtime = makeTime<PlayTime>(() => new Date().getTime());

export type Frame = Opaque<number, 'Frame'>;
export const frame = makeTime<Frame>(() => machine?.curFrame ?? 0 as Frame);


export class Timer<T extends number> extends Node {
  constructor(
    public time: Time<T>,
    public context?: string,
    length?: T,
    public onEnd?: (timer: Timer<T>) => 'remove'|void,
    public start = time(),
    public end = length? start + length : undefined,
  ) {
    super();
  }

  override update(events: Event[], out: Partial<Outputs>) {
    if (this.end && this.time() >= this.end) {
      if (this.onEnd?.(this) === 'remove') {
        return this.remove();
      }
    }
  }

  get length(): number {
    return this.time() - this.start;
  }

  override get name() {
    return `Timer(${this.context})`;
  }
}

export class Timestamp<T extends number> {
  constructor(
    public time: Time<T>,
    public last = time(),
  ) {
  }

  stamp() {
    this.last = this.time();
  }

  get age(): number {
    return this.time() - this.last;
  }

  get now(): boolean {
    return this.last === this.time();
  }
}