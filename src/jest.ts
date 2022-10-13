import { clone, objectMap } from './util';

beforeEach(async () => {
  // jest.spyOn(Timer, 'schedule').mockRestore();
  // jest.spyOn(Events, 'listen').mockRestore();
  // jest.spyOn(Events, 'fire').mockRestore();
  // jest.spyOn(Timer, 'callIn').mockRestore();
  // jest.spyOn(Log, 'init').mockImplementation(() => { throw 'unexpected' });
  // jest.spyOn(Log, 'write').mockReturnValue();
  // jest.spyOn(Log, 'logMessage').mockReturnValue();
  // jest.spyOn(Log, 'trace').mockReturnValue();
  // Timer.reset();
  // Events.resetAll();
  // resetSwitchMatrix();
  // resetMachine();
  // jest.spyOn(machine, 'pfIsInactive').mockReturnValue(false);
  // await setTime(1);
  // jest.spyOn(MPU, 'sendCommandCode').mockImplementation(async (cmd) => {
  //     debugger;
      
  //     expect(cmd).toBe('mocked');

  //     return {
  //         code: 200,
  //         resp: 'mocked',
  //     };
  // });
});

afterEach(async () => {
  // Events.resetAll();
  // Timer.reset();
  // await setTime();
  // jest.spyOn(Timer, 'callIn').mockReturnValue({} as any);
  // jest.spyOn(Timer, 'schedule').mockReturnValue({} as any);
  // jest.spyOn(Events, 'listen').mockReturnValue({} as any);
  // jest.spyOn(Events, 'fire').mockReturnValue({} as any);
  // await new Promise(r => setTimeout(r, 50));
});
