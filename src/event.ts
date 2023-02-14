import { DelimiterParser, SerialPort } from "serialport";
import { BoardTime } from "./board";
import { Log } from "./log";
import { machine } from "./machine";
import { Switch } from "./switch";
import { Clock, clock, Instant } from "./time";

export class EventSource {

}

export class Event {
  static eventCount = 0;
  _num = ++Event.eventCount;

  constructor(
    public source: EventSource,
    public rawData: any,
    public when = Instant.now(),
  ) {
      
  }

  get name(): string {
    return this.constructor.name;
  }

  static new(
    source: EventSource,
    rawData: any,
    when?: Instant,
  ): Event {
    return new Event(source, rawData, when);
  }
}

export class Events {
  static pending: Event[] = [];
  // static listeners: SerialListener[] = [];

  // static startListening() {
  //   this.listeners.set(["/dev/ttyAMA0"/*, "/dev/ttyAMA1", "/dev/ttyAMA2", "/dev/ttyAMA3"*/].map((path, i) => 
  //     new SerialListener(path, buf => this.pending.push(Event.new(Object.values(EventSource)[i] as EventSource, buf)))));
  // }

  static resetAll() {
    this.pending = [];
  }

  static getPending(): Event[] {
    const p = this.pending;
    this.pending = [];
    // p.sort((a, b) => a.when - b.when);
    return p;
  }
}

if (require.main === module) {
  Log.init(false, false);
  // Events.startListening();
  function loop(events: Event[]): ReturnType<typeof setImmediate> {
  
    if (events.length)
      console.log("events: ", events);
  
    return setImmediate(() => loop(Events.getPending()));
  }
  loop(Events.getPending());
}

export class SwitchEvent extends Event {
  constructor(
    public sw: Switch,
    public state: boolean,
    public remoteWhen: BoardTime,
    source: EventSource,
    rawData: any,
    when?: Instant,
  ) {
    super(source, rawData, when);
  }
}

export class BoardBootEvent extends Event {

}