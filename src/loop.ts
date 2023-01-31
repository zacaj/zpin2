import { Events, Event } from "./event";
import { machine, Machine } from "./machine";


export function loop(events: Event[]): ReturnType<typeof setImmediate> {
  for (const sw of machine.switches) {
    sw.closed = false;
    sw.opened = false;  
  }

  machine.root.loop(events);

  return setImmediate(() => loop(Events.getPending()));
}