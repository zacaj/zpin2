/* eslint-disable @typescript-eslint/no-floating-promises */
import { MPU } from './mpu';
import { machine, resetMachine } from './machine';
import { Events } from './event';
import { Log } from './log';
import { initGfx } from './gfx';
import { Game } from './game';
// import { initRecording, playRecording } from './recording';
// import { initAudio } from './sound';
import { AttractMode } from './attract';
import { loop } from './loop';

const argv = require('yargs').argv;

export let initialized = false;

// eslint-disable-next-line complexity
export async function initMachine(live: boolean, gfx = live || argv.showPf, game = false, trace = true, recording?: string, toPoint?: string) {
  try {
    initialized = false;
    if (argv.live !== undefined) live = argv.live;
    if (argv.gfx !== undefined) gfx = argv.gfx;
    if (argv.game !== undefined) game = argv.game;
    if (argv.trace !== undefined) trace = argv.trace;
    if (argv.recording !== undefined) recording = argv.recording;
    // const sound = argv.sound ?? live;
    Log.init(trace);
    Log.log(['console'], 'Initializing....');
    Events.resetAll();
    resetMachine(live);
    // if (recording) {
    //   initRecording(recording);
    // }

    // if (!MPU.isLive)
    //   machine.sDetect3.changeState(true, 'fake');
            

    // if (sound)
    //   await initAudio();
    if (gfx)
      await initGfx();

    await machine.init();

    initialized = true;
    // if (game)
    //   Game.start();
    // else
    //   AttractMode.start();
    // if (recording) {
    //   await new Promise(r => setTimeout(r, 100));
    //   await playRecording(toPoint);
    // }

    loop();
  } catch (err) {
    console.error('init error', err);
    debugger;
  }
}

process.on('unhandledRejection', (err, promise) => {
  Log.error(['console', 'machine'], 'Unhandled rejection (promise: ', promise, ', reason: ', err, ').');
});


if (require.main === module) {
  initMachine(false);
}