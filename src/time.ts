import { Event } from './event';
import { machine, Outputs } from './machine';
import { Node } from './node';
import { Opaque, assert } from './util';

type Time<T extends number> = (() => T) & {
  mockTime?: T;
  startTime: T;
  getTime: () => number;
  wait(val: number, context?: string): Promise<void>;
  // stamp(futureMs?: number): Timestamp<T>;
};

function wait<T extends number>(this: Time<T>, val: number, context?: string): Promise<void> {
  return new Promise(resolve => machine.timers.push(new Timer(this, context, val, () => resolve())));
}

function stamp<T extends number>(this: Time<T>, futureMs?: number): Timestamp<T> {
  return new Timestamp(this, futureMs? this()+futureMs as T : undefined);
}

function makeTime<T extends number>(getTime: () => number, startTime: T = 0 as T): Time<T> {
  const time: Time<T> = function(this: Time<T>) {
    return time.mockTime ?? (time.getTime() - time.startTime) as T;
  };
  time.startTime = startTime;
  time.getTime = getTime;
  time.wait = wait;
  // time.stamp = stamp;
  return time;
}

export type Clock = Opaque<number, 'Clock'>;
export const clock = makeTime<Clock>(() => new Date().getTime());

export type PlayTime = Opaque<number, 'PlayTime'>;
export const playtime = makeTime<PlayTime>(() => new Date().getTime());

export type Frame = Opaque<number, 'Frame'>;
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
export const frame = makeTime<Frame>(() => machine?.curFrame ?? 0 as Frame);

const times = [clock, playtime, frame];
type Times = ReturnType<(typeof times[number])>;

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

class Timestamp<T extends number> {
  constructor(
    public time: Time<T>,
    public last = time(),
  ) {
  }

  stamp(offsetIntoFuture?: number) {
    this.last = this.time() + (offsetIntoFuture ?? 0) as T;
  }

  set(time: number) {
    this.last = time as T;
  }

  get age(): number {
    return this.time() - this.last;
  }

  get now(): boolean {
    return this.last === this.time();
  }

  inFuture(): boolean {
    return this.time() < this.last;
  }

  before(t: T|Timestamp<T>): boolean {
    if (t instanceof Timestamp)
      t = t.last;
    return this.last < t;
  }

  wasWithin(t: T|number): boolean {
    return ((this.time() - this.last)|0) <= t;
  }

  notWithin(t: T|number): boolean {
    return !this.wasWithin(t);
  }
}

export class Instant {
  when = new Map<typeof times[number], Timestamp<Times>>();
  constructor(...overrides: [Time<any>, number][]) {
    this.stamp();
    for (const [t, n] of overrides)
      this.set(n, t);
  }

  age(time: Time<any>): number {
    return this.when.get(time)!.age;
  }

  now(time: Time<any>): boolean {
    return this.when.get(time)!.now;
  }

  inFuture(time: Time<any>): boolean {
    return this.when.get(time)!.inFuture();
  }

  before<T extends Times>(t: T|Timestamp<T>, time?: Time<T>): boolean {
    if (time)
      return this.when.get(time as Time<any>)!.before(t);
    else if (t instanceof Timestamp)
      return this.when.get(t.time as Time<any>)!.before(t);
    else
      throw new Error("T needs a time");
  }

  wasWithin<T extends Times>(t: T|number, time: Time<any>): boolean {
    return this.when.get(time as Time<any>)!.wasWithin(t);
  }

  notWithin<T extends Times>(t: T|number, time: Time<any>): boolean {
    return this.when.get(time as Time<any>)!.notWithin(t);
  }

  static now(...overrides: [Time<any>, number][]) {
    return new Instant(...overrides);
  }

  stamp(): this {
    for (const time of times)
      this.when.set(time, new Timestamp(time as any));
    return this;
  }

  set(when: number, time = clock) {
    this.when.get(time)!.set(when);
  }

  get(time = clock) {
    return this.when.get(time)!.last;
  }

  get clock(): Clock {
    return this.when.get(clock)!.last as Clock;
  }

  copy(i: Instant) {
    for (const [time] of this.when.entries())
      this.when.get(time)!.set(i.get(time as any));
  }
}