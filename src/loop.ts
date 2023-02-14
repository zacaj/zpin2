import { Events, Event } from "./event";
import { gfxLoop } from "./gfx";
import { Log } from "./log";
import { machine, Machine } from "./machine";

// let over = 0;
// const times: number[] = [];
let lastLoopEnd = 0;
export function loop(events = Events.getPending()): ReturnType<typeof setImmediate> {
  const start = process.hrtime()[1];

  machine.loop(events);
  gfxLoop(events);

  const end = process.hrtime()[1]; 
  if (((end-lastLoopEnd)/1000000)>15)
    Log.log('game', "loop %i in %sms, total %sms"+ (((end-lastLoopEnd)/1000000)>5? " !!!":""), machine.curFrame, ((end-start)/1000000).toFixed(1), ((end-lastLoopEnd)/1000000).toFixed(1));
  // times.push(((end-lastLoopEnd)/1000000));
  // if (((end-lastLoopEnd)/1000000)>5)
  //   over++;
  // else
  //   lastLoopEnd = 0;
  //   if (over > 10) {
  //     console.log('over!', times);
  //     over = 0;
  //   }
  lastLoopEnd = end;

  return setImmediate(() => loop());
}