import { Events, Event } from "./event";
import { gfxLoop } from "./gfx";
import { machine, Machine } from "./machine";


export function loop(events = Events.getPending()): ReturnType<typeof setImmediate> {

  machine.loop(events);
  gfxLoop(events);

  return setImmediate(() => loop());
}