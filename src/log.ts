/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import * as fs from 'fs';
import * as util from 'util';
import { frame } from './time';
import { OrArray, arrayify, getCallerLoc, clone } from './util';
const argv = require('yargs').argv;
// const truncate = require('truncate-logs');

enum Levels {
  Trace = -1,
  Info = 0,
  Log = 1,
  Error = 2,
}
export type LogCategory = 
'console' |
'switch' |
'mpu' |
// 'lpu' |
// 'cpu' |
'solenoid' |
'machine' |
'gfx' |
'game' |
'assert' |
'sound';
const files = [
  'console',
  'switch',
  'mpu',
  // 'lpu',
  // 'cpu',
  'solenoid',
  'machine',
  'gfx',
  'game',
  'assert',
  'sound',
];

export class Log {
  static files: { [name: string]: number} = {};
  
  static timestamp(): string {
    const hr = process.hrtime();
    const d = new Date(hr[0]*1000);
    const ms = (hr[1]).toFixed(0).padStart(9, '0');
    return frame().toFixed(0).slice(-2)+'|'+d.getMinutes().toFixed().padStart(2, '0')+':'+d.getSeconds().toFixed().padStart(2, '0')+
    '.'/*+d.getMilliseconds().toFixed().padStart(3, '0')*/+ms.slice(0, 3)+'.'+ms.slice(6, 7);
  }
  
  static cleanParams(params: any[], maxDepth = 2): any[] {
    return params.map(p => {  
      if (!p) return p;
      switch (typeof p) {
        case 'object':
          if (p.cleanLog)
            return p.cleanLog();
          else if ((maxDepth || Object.keys(p).length < 5) && Object.keys(p).length < 10) {
            const r = clone(p);
            for (const key of Object.keys(p)) {
              r[key] = this.cleanParams([p[key]], maxDepth - 1)[0];
            }
            return r;
          } else
            return `${p.constructor?.name ?? Object.keys(p)}`;
          break;
      }
      return p;
    });
  }
  
  static logMessage(level: Levels, categories: OrArray<LogCategory>, message: string, ...params: any[]) {
    params = Log.cleanParams(params);
    // Log.write(Log.files.all, JSON.stringify({level, categories, message, params: util.inspect(params)}));
    const ts = Log.timestamp()+' '+(level >= Levels.Error? 'ERR ': level < Levels.Log? '  ' : '');
    if (categories.includes('switch') || categories.includes('game') || level >= Levels.Log)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      console[level >= Levels.Error? 'error' : 'log'](ts+message, ...params);
    Log.write(Log.files.all, ts+Log.format(message, params)+'; \t\t'+JSON.stringify(categories)+' ');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    Log.trace(categories, message, ...params);
    for (const cat of arrayify(categories)) {
      Log.write(Log.files[cat], ts+Log.format(message, params));
    }
  }
  
  static trace(categories: OrArray<LogCategory>, message: string, ...params: any[]) {
    if (!Log.files.trace) return;
    params = Log.cleanParams(params);
    // Log.write(Log.files.trace, JSON.stringify({categories, message, params: util.inspect(params)}));
    const ts = Log.timestamp()+' ';
    Log.write(Log.files.trace, ts+JSON.stringify(categories)+' '+Log.format(message, params)+'\t\t\t@'+getCallerLoc(true));
  }
  
  static info(categories: OrArray<LogCategory>, message: string, ...params: any[]) {
    Log.logMessage(Levels.Info, categories, message, ...params);
  }
  
  static log(categories: OrArray<LogCategory>, message: string, ...params: any[]) {
    Log.logMessage(Levels.Log, categories, message, ...params);
  }
  
  static error(categories: OrArray<LogCategory>, message: string, ...params: any[]) {
    Log.logMessage(Levels.Error, categories, message, ...params);
  }
  
  static format(message: string, params: any): string {
    if (params.length === 0)
      return message;
    return util.format.apply(util, [message, ...params]);
  }
  
  static write(fil: number, message: string) {
    if (!fil) return;
    fs.writeSync(fil, message+'\n');
    // fs.write(fil, message+'\n', err => err && console.error('log write error ', err));
  }
  
  static init(trace = true, append = false, logFiles = true) {
    if (!logFiles) return;
    for (const f of files) {
      Log.files[f] = fs.openSync(f+'.log', append? 'a+' : 'w');
      Log.write(Log.files[f], `${new Date()}`);
    }
    Log.files.all= fs.openSync('all.log', append? 'a+' : 'w');
    Log.write(Log.files.all, `${new Date()}`);
    if (trace) {
      Log.files.trace= fs.openSync('trace.log', append? 'a+' : 'w');
      Log.write(Log.files.trace, `${new Date()}`);
    }
  }
  
  static closeFiles() {
    for (const file of Object.keys(Log.files)) {
      fs.closeSync(Log.files[file]);
    }
    Log.files = {};
  }
}