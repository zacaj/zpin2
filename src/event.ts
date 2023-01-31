import { DelimiterParser, SerialPort } from "serialport";
import { Log } from "./log";
import { machine } from "./machine";
import { Switch } from "./switch";
import { Clock } from "./timer";

export class EventSource {

}

export class Event {
  static eventCount = 0;
  num = ++Event.eventCount;

  constructor(
    public source: EventSource,
    public rawData: Buffer,
    public when = Clock.time,
  ) {
      
  }

  get name(): string {
    return this.constructor.name;
  }

  static new(
    source: EventSource,
    rawData: Buffer,
    when = Clock.time,
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

  static getPending(): Event[] {
    const p = this.pending;
    this.pending = [];
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
    source: EventSource,
    rawData: Buffer,
  ) {
    super(source, rawData);
  }
}

export class BoardBootEvent extends Event {

}