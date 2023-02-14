import { AminoGfx, AminoImage, Circle, fonts, Group, ImageView, Node, Polygon, Property, makeProps, Rect, Text, Texture } from 'aminogfx-gl';
import * as fs from 'fs';
import { Color, colorToHex, LightState, normalizeLight } from './light';
import { Log } from './log';
import { CoilOutputs, Light, LightOutputs, Machine, machine, resetMachine, TriggerCoil } from './machine';
import { Mode } from './mode';
import { assert, Dict, eq } from './util';
import yargs from "yargs/yargs";
import { Switch } from './switch';
import { Event, Events, EventSource, SwitchEvent } from './event';
import { clock, frame } from './time';
import { Coil } from './machine';
import { BoardTime } from './board';
const argv = yargs(process.argv.slice(2)).options({
  showPf: { type: 'boolean', default: false},
  split: { type: 'boolean', default: false},
  swap: { type: 'boolean', default: false},
  half: { type: 'boolean', default: false},
}).parseSync();

export let gfx: AminoGfx;
export let pfx: AminoGfx|undefined;
let screenW: number;
let screenH: number;
let playfield: Playfield|undefined;
export let screen: Screen;
let isRpi: any = false;
const showPf = argv.showPf;
const split = argv.split;
const swap = argv.swap;
const halfScreen = argv.half;
const showDisp = !isRpi && !split;

class ScreenSource extends EventSource {}
const screenSource = new ScreenSource();

export interface GfxNode {
  update(events: Event[]): void;
}

export class Screen extends Group {
  static readonly w = 1024;
  static readonly h = 600;
  static readonly pw = 8.26;
  static readonly ph = 4.96;

  circle!: Circle;

  constructor(g: AminoGfx) {
    super(g);
    // this.sx(this.w()/Screen.sw);
    // this.sy(-this.h()/Screen.sh);
    // this.originX(0.5).originY(.5);

    this.add(g.createRect().w(Screen.w).h(Screen.h).originX(.5).originY(.5).fill('#000000'));
    
    this.circle = g.createCircle().radius(11).x(0).y(Screen.h/2).z(90);
    // circle.x.anim({
    //   from: -400,
    //   to: 400,
    //   duration: 1000,
    //   loop: -1,
    //   timeFunc: 'linear',
    //   autoreverse: false,
    // }).start();
    // circle.z.anim({
    //   from: 100,
    //   to: -100,
    //   duration: 1000,
    //   loop: -1,
    //   timeFunc: 'linear',
    //   autoreverse: false,
    // }).start();
    this.add(this.circle);

    this.depth(true);

    // this.add(pfx.createRect().fill('#ffffff').w(100).h(100).z(100));
  }
}


export const gfxLights: { [name in keyof LightOutputs]: {
  x: number;
  y: number;
  l?: FxLight;
}&({
  d: number;
  a?: undefined;
  r?: undefined;
}|{
  d?: undefined;
  a: number;
  r: number;
})} = {
  lTrail1: { x: 13, y: 9, d: 1 },
};

const gfxCoils: { [name in keyof CoilOutputs]?: {
  x: number;
  y: number;
  c?: FxCoil;
};} = {
  rightScoop: { x: 19.342499999999998, y: 23.5025 },
  rightFlipperPower:  { x: 15.4325, y: 6.460000000000001 },
  rightFlipperHold:  { x: 16.07, y:5.737500000000001 },
  leftFlipperPower:  { x: 9.525, y: 6.672500000000003 },
  leftFlipperHold:  { x: 9.0575, y: 5.907500000000002 },
  upperFlipperPower:  { x: 2.3000000000000003, y: 19.805 },
  upperFlipperHold:  { x: 1.5350000000000001, y: 19.295 },
  rightSling:  { x: 17.345, y: 11.092500000000001 },
  leftSling:  { x: 7.824999999999999, y: 11.177500000000002 },
  rightPop:  { x: 15.985, y: 21.207500000000003 },
  leftPop:  { x: 4.1275, y: 13.1325 },
  kickback:  { x: 21.2125, y: 10.497500000000002 },
  rightVuk:  { x: 19.895, y: 8.8825 },
  leftVuk:  { x: 5.4025, y: 9.2225 },
  leftScoop:  { x: 6.89, y: 31.0675 },
  trough:  { x: 18.279999999999998, y: 3.145000000000003 },
  rightDropReset:  { x: 21.68, y: 20.9525 },
  leftDropReset:  { x: 5.6575, y: 24.6075 },
};
type RemoveLeadingSAndLowercase<S extends string> = S extends `s${infer Name}`? Uncapitalize<Name> : never;
const gfxSwitches: { [name in keyof Machine as RemoveLeadingSAndLowercase<name>]?: {
  x: number;
  y: number;
  s?: FxSwitch;
};} = {
  rightScoop: { x: 19.342499999999998, y: 22.567500000000003 },
  upperFlipperTarget:  { x: 3.5325, y: 16.872500000000002 },
  leftScoop:  { x: 7.6125, y: 30.3875 },
  centerCaptiveBall:  { x: 11.522499999999999, y: 28.73 },
  popShot:  { x: 15.049999999999999, y: 18.8275 },
  trough1:  { x: 17.685, y: 1.1475000000000009 },
  trough2:  { x: 16.7075, y: 1.5300000000000011 },
  trough3:  { x: 15.6025, y: 1.9550000000000054 },
  trough4:  { x: 14.54, y: 2.3800000000000026 },
  troughJam:  { x: 17.897499999999997, y: 2.167500000000004 },
  spinner:  { x: 14.667499999999999, y: 29.240000000000002 },
  behindRightDropsTarget: { x: 22.572499999999998, y: 19.9325 },
};


abstract class FxLight extends Group implements GfxNode {
  shape!: Polygon;
  timer?: any;
  lastState = '';

  constructor(
    public light: Light,
    public name: keyof LightOutputs = light.name,
  ) {
    super(pfx!);
    const {x, y} = gfxLights[name];
    this.x(x);
    this.y(y);
  }

  set(val: LightState[]) {
    const jState = JSON.stringify(val);
    if (jState === this.lastState) return;
    this.lastState = jState;

    this.shape.opacity.curAnim?.stop();
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    val = val.truthy();
    if (val.length) {
      const setShape = (s: LightState) => {
        this.shape.opacity.curAnim?.stop();
        this.shape.opacity(1);
        const state = normalizeLight(s)!;
        this.shape.fill(colorToHex(state.color)!);
        switch (state.type) {
          case 'flashing':
          case 'pulsing':
            this.shape.opacity.anim({
              autoreverse: true,
              duration: 1000/state.freq / 2,
              from: 1-state.phase,
              to: state.phase,
              loop: -1,

            }).start();
            break;
          case 'solid':
            break;
        }
      };
      setShape(val[0]);
      if (val.length > 1) {
        let i = 1;
        this.timer = setInterval(() => {
          setShape(val[i++]);
          if (i >= val.length)
            i = 0;
        }, 500);
      }
    } else {
      this.shape.fill('#FFFFFF');
    }
    this.shape.filled(val.length !== 0);
  }

  update(events: Event[]): void {
    if (this.light.lastActualChange.now(frame))
      this.set(this.light.actual);
  }
}

class CircleLight extends FxLight {
  declare shape: Circle;

  constructor(
    light: Light,
  ) {
    super(light);
    const {d} = gfxLights[this.name];
    this.shape = pfx!.createCircle().radius(d!/2).opacity(1);
    this.add(this.shape);
    this.set([]);
  }
}
class ArrowLight extends FxLight {

  constructor(
    light: Light,
  ) {
    super(light);
    const {a, r} = gfxLights[this.name];
    this.shape = pfx!.createPolygon();
    const points = new Float32Array(6);
    points[0] = 0;
    points[1] = a!/3*2;

    points[2] = a!/4;
    points[3] = -a!/3;

    points[4] = -a!/4;
    points[5] = -a!/3;

    this.shape.geometry(points);
    this.shape.rz(r!);
    this.add(this.shape);
    this.set([]);
  }
}

class FxSwitch extends Rect implements GfxNode {
  constructor(
    public sw: Switch,
  ) {
    super(pfx!);
    assert(sw);
    this.acceptsMouseEvents = true;

    this.originX(0.5).originY(0.5);
    this.w(0.5).h(0.5);

    const {x, y} = gfxSwitches[sw.name as keyof typeof gfxSwitches]!;
    this.x(x).y(y);

    this.fill(sw.state? '#ff0000' : '#ffffff');

    pfx!.on('press', this, (e) => {
      Log.info(['gfx', 'switch', 'console'], 'force state of %s to %s', sw.name, !sw.state? 'on':'off');
      // sw.changeState(!sw.state, 'force');
      Events.pending.push(new SwitchEvent(sw, !sw.state, clock() as any, screenSource, e));
      if (e.button === 1)
        void clock.wait(250).then(() => Events.pending.push(new SwitchEvent(sw, !sw.state, clock() as any, screenSource, e)));
    });
  }

  update(events: Event[]): void {
    for (const e of events)
      if (e instanceof SwitchEvent && e.sw === this.sw)
        this.fill(this.sw.rawState? '#ff0000' : '#fffff');
  }
}

class FxCoil extends Rect implements GfxNode {
  constructor(
    public coil: Coil,
  ) {
    super(pfx!);
    assert(coil);

    this.originX(0.5).originY(0.5);
    this.w(0.5).h(0.5);
    this.rz(45);

    const {x, y} = gfxCoils[coil.name]!;
    this.x(x).y(y);

    this.fill(coil.actual? '#ff0000' : '#ffffff');
  }

  update(events: Event[]): void {
    if (this.coil instanceof TriggerCoil)
      this.fill(this.coil.actual || (this.coil.pending && this.coil.disabled)? '#ff0066' : (this.coil.pending? '#ff6666' : '#fffff'));
    else
      this.fill(this.coil.actual || (this.coil.pending && this.coil.disabled)? '#ff0000' : (this.coil.pending? '#ff6600' : '#fffff'));
  }
}


export function makeImage(name: string, w: number, h: number, flip = true, g = gfx): Image {
  const img = new Image(g).opacity(1.0).w(w).h(h);
  if (flip) img.top(1).bottom(0);
  img.size('stretch');
  img.set(name);
  return img;
}

// export class ModeGroup extends Group {
//   listener!: EventListener;

//   constructor(
//     public mode: Mode,
//   ) {
//     super(gfx);

//     this.listener = Events.listen(() => this.visible(machine.getChildren().includes(mode)), e => e instanceof TreeChangeEvent);
//     Events.listen(() => {
//       this.parent?.remove(this);
//       Events.cancel(this.listener);
//       return 'remove';
//     }, mode.onEnd());
//   }
// }

// export function addToScreen(cb: () => ModeGroup) {
//   if (!screen) return;
//   const node = cb();
//   node.mode.gfx = node;

//   const modes = screen.children.filter(n => n instanceof ModeGroup) as ModeGroup[];
//   if (modes.length === 0) {
//     screen.add(node);
//     return;
//   }

//   for (const mode of modes) {
//     if (mode.mode.gPriority >= node.mode.gPriority) {
//       screen.insertBefore(node, mode);
//       return;
//     }
//   }
//   screen.add(node);
// }

// export function makeText<T extends Color|undefined = undefined>(text: string, height: number,
//   align: 'corner'|'center'|'left'|'right' = 'center',
//   vAlign: 'baseline'|'top'|'middle'|'bottom'|undefined = undefined,
//   g = gfx,
//   colorSwatch?: T | (() => T),
// ): T extends Color? Group : Text {
//   const t = g.createText().fontName('card').sy(1).sx(1).text(text).fontSize(height)
//     .align(align === 'corner' ? 'left' : align)
//     .vAlign(align === 'corner' ? 'top' : (vAlign !== undefined ? vAlign : 'middle'));
//   if (colorSwatch) {
//     const group = g.createGroup();
//     group.add(t);
//     const r = g.createRect().fill(colorToHex(typeof colorSwatch==='function'? colorSwatch()! : colorSwatch!)!);
//     r.h(height*.8);
//     r.y(-height*.05);
//     r.w(height*.5);
//     const padding = text.startsWith(':')? 0 : height*.15;
//     r.originX(0).originY(vAlign==='middle'? 0.5 : (vAlign==='bottom'? .97 : 0));
//     t.lineW.watch(w => {
//       r.x((align==='center'? -w/2 : (align === 'right'? -w : 0))-padding);
//       group.w(r.w() + w + padding);
//     }, true);
//     t.x(r.w() + padding);
//     group.add(r);
//     return group as any;
//   } else {
//     return t as any;
//   }
// }

class FakeGroup implements Pick<Group, 'add'|'remove'|'clear'> {
  add(...nodes: Node[]): Group {
    return this as unknown as Group;
  }
  remove(...nodes: Node[]): Group {
    return this as unknown as Group;
  }
  clear(): Group {
    return this as unknown as Group;
  }
}


export async function gWait(ms: number, context: string) {
  // if (machine.sBothFlippers.state) return;
  await Promise.race([
    clock.wait(ms, context),
    // machine.await(onSwitchClose(machine.sBothFlippers)),
  ]);
}

// const popups: Node[] = [];
// export async function popup(node: Node, ms = 3500, hidePrevious = false) {
//   // if (!pfx) return;
//   // node.x(Screen.w/2);
//   // node.y(Screen.h/2);
//   if (gfx) {
//     node.z(100);
//     screen.add(node);
//     if (hidePrevious)
//       popups.forEach(n => n.visible(false));
//   }
//   popups.push(node);
//   if (ms)
//     await gWait(ms, 'popup');
//   if (gfx && ms) screen.remove(node);
//   popups.remove(node);
//   return;
// }


// export function alert(text: string, ms?: number, subtext?: string): [Group, Promise<void>] {
//   let g: Group;
//   if (gfx) {
//     Log.log(['gfx', 'console'], 'alert message %s / %s', text, subtext);
//     g = gfx.createGroup().y(-Screen.h * .32);
//     const t = makeText(text, 70, 'center', 'top').wrap('word').w(Screen.w *.6).x(-Screen.w*0.6/2);
//     const t2 = subtext? makeText(subtext, 40, 'center', 'top').wrap('word').w(t.w()).x(t.x()) : undefined;

//     // g.add(pfx.createRect().x(t.x()).w(t.w()).h(50).fill('#ff0000').z(-2));
//     const r = gfx.createRect().fill('#555555').z(-.1).y(-20);
//     function setW() {
//       r.w(Math.max(t.lineW(), t2?.lineW() ?? 0)+40);
//       r.x((t.w()-r.w())/2 + t.x());
//     }
//     t.lineW.watch(setW);
//     t2?.lineW.watch(setW);
//     setW();
//     function setH() {
//       r.h(t.lineNr()*t.fontSize()+(t2?.lineNr()??0)*(t2?.fontSize()??0)+40);
//       t2?.y(t.lineNr()*t.fontSize());
//     }
//     t.lineNr.watch(setH);
//     t2?.lineNr.watch(setH);
//     setH();
//     g.add(r, t);
//     if (t2)
//       g.add(t2);
//   } else {
//     g = new FakeGroup() as any;
//   }

//   return [g, popup(g, ms, true)]; 
// }

// export function notify(text: string, ms = 2000): [Group, Promise<void>] {
//   let g: Group;
//   if (gfx) {
//     Log.log(['gfx', 'console'], 'notify message %s / %s', text);
//     g = gfx.createGroup().y(Screen.h/2);
//     const t = makeText(text, 50, 'center', 'bottom').w(Screen.w).x(-Screen.w/2).y(-10);
//     const r = gfx.createRect().fill('#444444').z(-.1);
//     function setW() {
//       r.w(t.lineW()+50);
//       r.x((t.w()-r.w())/2 + t.x());
//     }
//     t.lineW.watch(setW);
//     setW();
//     function setH() {
//       r.h(t.lineNr()*t.fontSize()*1.25);
//       r.y(-r.h());
//     }
//     t.lineNr.watch(setH);
//     setH();
//     g.add(r, t);
//   } else {
//     g = new FakeGroup() as any;
//   }

//   return [g, popup(g, ms)]; 
// }

// export function textBox(settings: {maxWidth?: number; padding?: number; bgColor?: Color}, 
//   ...lines: [text: string, size: number, spacing?: number, swatch?: Color][]
// ): Group {
//   let g: Group;
//   const maxWidth = settings.maxWidth ?? 0.6;
//   const padding = settings.padding ?? 30;
//   const bgColor = settings.bgColor? colorToHex(settings.bgColor)! : '#555555'; 
//   if (gfx) {
//     g = gfx.createGroup().y(-Screen.h * .2).originX(0).originY(0);

//     const r = gfx.createRect().fill(bgColor).z(-.1).w(Screen.w/2).h(Screen.h/2).originX(0.5);
//     g.add(r);

//     const texts = lines.map(([text, size, _, swatch]) => {
//       const group = makeText(text, size, 'center', 'top', gfx, swatch);
//       const t = (swatch? group.children[0] : group) as Text;
//       t.wrap('word').w(Screen.w*maxWidth).x(-Screen.w*maxWidth/2);
//       g.add(group);
//       return t;
//     });


//     function setW() {
//       r.w(texts.map(t => t.lineW()).reduce((a,b) => Math.max(a,b), 0) + padding * 2);
//       g.w(r.w());
//     }
//     texts.forEach(t => t.lineW.watch(setW));
//     setW();
//     function setH() {
//       let y = 0;
//       let i = 0;
//       for (const t of texts) {
//         t.y(y);
//         y += t.lineNr()*t.fontSize();
//         y += lines[i++][2] ?? 0.1;
//       }
//       r.y(-padding);
//       r.h(y + padding * 2);
//       g.y(-y/2);
//     }
//     texts.forEach(t => t.lineNr.watch(setH));
//     setH();
//   } else {
//     g = new FakeGroup() as any;
//   }

//   return g;
// }

// export function leftAlign(...lines: (Text|Group)[]): Group {
//   const group = gfx.createGroup().originX(0.5).originY(0);
//   function wChanged() {
//     const maxW = Math.max(...lines.map(l => l instanceof Text? l.lineW() : l.w()));
//     group.w(maxW);
//   }
//   for (const line of lines) {
//     group.add(line);
//     if (line instanceof Text)
//       line.lineW.watch(wChanged);
//     else
//       line.w.watch(wChanged);
//   }
//   wChanged();
//   // group.add(gfx.createCircle().fill('#00FF00').radius(4));
//   return group;
// }

export class Pie extends Polygon {
  start!: Property<this>;
  percent!: Property<this>;
  radius!: Property<this>;
  steps!: Property<this>;

  constructor(aminoGfx: AminoGfx) {
    super(aminoGfx);
  }

  override init() {
    super.init();

    makeProps<Pie>(this, {
      start: 0,
      percent: 0.25,
      radius: 0,
      steps: 30,
    });

    this.radius.watch(() => this.generateGeometry());
    this.start.watch(() => this.generateGeometry());
    this.percent.watch(() => this.generateGeometry());
  }

  override initDone() {
    this.radius(50);
  }

  generateGeometry() {
    const steps = this.steps();
    const points = new Float32Array(steps * 2 + 2);
    let pos = 0;
    const r = this.radius();
    const start = this.start();
    const percent = this.percent();

    points[pos++] = 0;
    points[pos++] = 0;
    for (let i = 0; i < steps; i++) {
      const theta = -(start + percent*Math.PI * 2) / steps * i;

      points[pos++] = Math.sin(theta) * r;
      points[pos++] = Math.cos(theta) * r;
    }

    this.geometry(points);
  }
}



export class Playfield extends Group {
  static readonly w = 25;
  static readonly h = 34;

  bg = makeImage('pf', Playfield.w, Playfield.h, undefined, this.amino);

  constructor() {
    super(pfx!);
    this.w(Playfield.w);
    this.h(Playfield.h);
    this.originX(0).originY(1);
    this.rz(0);
    this.sx(screenH/Playfield.h);
    this.sy(screenH/Playfield.h);
    if (isRpi) {
      this.x(-((Playfield.w*screenH/Playfield.h)+pfx!.h())/2);
      this.y(0);

      try {
        const json = fs.readFileSync('projector.json', 'utf8');
        const adj = JSON.parse(json) as Dict<number|undefined>; // {} as any; // 
        this.x(adj.x ?? this.x());
        this.y(adj.y ?? this.y());
        this.sx(adj.sx ?? this.sx());
        this.sy(adj.sy ?? this.sy());
        this.rz(adj.rz ?? this.rz());
      } catch (e) {
        debugger;
      }
    } else {
      this.x(-((Playfield.w*screenH/Playfield.h)-screenW)/2).y(0);
    }
    this.add(pfx!.createRect().w(Playfield.w).h(Playfield.h).originX(0).originY(0).fill('#000000'));
    // if (split) {
    this.bg.opacity(.8);
    this.add(this.bg);
    // }

    for (const name of Object.keys(gfxLights) as (keyof LightOutputs)[]) {
      const light = machine.lights.find(s => s.name === name);
      if (!light) {
        Log.error('gfx', 'no light found for %s', name);
        continue;
      }
      gfxLights[name].l = new (gfxLights[name].d? CircleLight: ArrowLight)(light);
      this.add(gfxLights[name].l!);
    }

    for (const name of Object.keys(gfxSwitches) as (keyof typeof gfxSwitches)[]) {
      const sw = machine.switches.find(s => s.name === name);
      if (!sw) {
        Log.error('gfx', 'no switch found for %s', name);
        continue;
      }
      gfxSwitches[name]!.s = new FxSwitch(sw);
      this.add(gfxSwitches[name]!.s!);
    }

    for (const name of Object.keys(gfxCoils) as (keyof typeof gfxCoils)[]) {
      const coil = Object.values(machine).find(v => v instanceof Coil && v.name === name);
      if (!coil) {
        Log.error('gfx', 'no coil found for %s', name);
        continue;
      }
      gfxCoils[name]!.c = new FxCoil(coil);
      this.add(gfxCoils[name]!.c!);
    }
  }
}

// eslint-disable-next-line complexity, sonarjs/cognitive-complexity
export async function initGfx() {
  gfx = new AminoGfx({display: isRpi? (swap? 'HDMI-A-2':'HDMI-A-1') : undefined});
  await new Promise<void>((resolve, reject) => {
    gfx.start((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  gfx.fill('#FFFF00');
  gfx.showFPS(false);
  gfx.title('Screen');
  if (gfx.screen.fullscreen) isRpi = true;

  if (isRpi) {
    // gfx.w(1280);
    // gfx.h(720);
  } else {
    if (split) {
      gfx.w(Screen.w*2/3);
      gfx.h(Screen.h*2/3);
    } else {
      gfx.w(600+Screen.w/2+10);
      gfx.h(800);
    }
  }

  if (showPf) {
    if (split) {
      pfx = new AminoGfx({display: isRpi? (!swap? 'HDMI-A-2':'HDMI-A-1') : undefined});
      pfx.showFPS(false);
      pfx.title('Playfield');
      await new Promise<void>((resolve, reject) => {
        pfx!.start((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      pfx.fill('#FFFF00');
      if (isRpi) {
        // pfx.w(1280);
        // pfx.h(720);
      } else {
        pfx.w(600);
        pfx.h(800);
        pfx.x.watch(() => gfx.x(pfx!.x()+pfx!.w()+20), true);
        pfx.y.watch(() => gfx.y(pfx!.y()+pfx!.h()/4), true);
      }
    } else {
      pfx = gfx;
      gfx.title('Z-Pin');
    }
  }
  
  Log.info('gfx', 'amino initialized');

  fonts.registerFont({
    name: 'card',
    path: './media/',
    weights: {
      400: {
        normal: 'CardCharacters.ttf',
      },
    },
  });

  Log.log('gfx', 'precaching images...');
  await Promise.all(fs.readdirSync('./media').map(async file => {
    if (file.endsWith('.png'))
      await Image.cacheTexture(file.slice(0, file.length - 4));
  }));
  Log.log('gfx', 'precached');


  screen = new Screen(gfx);
  if (split || !showPf) {
    gfx.setRoot(screen);
    if (halfScreen) {
      screen.w(gfx.w()/1.7);
      screen.h(gfx.h()/1.7);
      screen.x(screen.w()/2);
      screen.y(screen.h()*.85);
      screen.sx(screen.w()/Screen.w);
      screen.sy(screen.h()/Screen.h);
    } else {
      screen.w(gfx.w());
      screen.h(gfx.h());
      screen.x(screen.w()/2);
      screen.y(screen.h()/2);
      screen.sx(screen.w()/Screen.w);
      screen.sy(screen.h()/Screen.h);
    }
  }

  
  if (pfx) {
    const root = pfx.createGroup();
    root.sy(-1);
    pfx.setRoot(root);
    root.acceptsKeyboardEvents = true;

    if (isRpi) {
      root.rz(90);
    }
  
    if (isRpi) {
      console.log('size: %i, %i', pfx.w(), pfx.h());
      screenW = pfx.h();
      screenH = pfx.w();
    } else {
      if (split) {
        pfx.w(600);
        pfx.h(800);
      }
      // pfx.h(360);
      // pfx.w(640);
      screenW = 600;
      screenH = 800;
    }

    playfield = new Playfield();
    root.add(playfield);
    
    if (!split) {
      if (!isRpi) {
        root.add(screen);
        screen.w(Screen.w/2);
        screen.h(Screen.h/2);
        screen.x(screenW+screen.w()/2);
        screen.y(-screenH/4*3);
      } else {
        playfield.add(screen);
        screen.w(Screen.pw+2);
        screen.h(Screen.ph+2);
        screen.x(5.5+Screen.pw/2);
        screen.y(22.7-Screen.ph/2);
      }
      screen.sx(screen.w()/Screen.w);
      screen.sy(-screen.h()/Screen.h);
    }
    
    // root.add(pfx.createCircle().radius(10).x(screenW).y(screenH/-2));
    
    playfield.acceptsMouseEvents = true;
    playfield.acceptsKeyboardEvents = true;
    pfx.on('press', playfield, (e) => {
      console.log('playfield location: ', { x: e.point.x, y: e.point.y });
    });

    // eslint-disable-next-line complexity
    pfx.on('key.press', null, (e) => {
      if (!playfield) return;
      console.log('key press', e.char, e.keycode, e.key);
      // if (e.char) {
      //   let letter: number|undefined;
      //   let number: number|undefined;
      //   const qwerty = [81, 87, 69, 82, 84, 89, 85, 73, 79, 80];
      //   const numbers = [49, 50, 51, 52, 53, 54, 55, 56, 57, 48];
      //   if (qwerty.includes(e.keycode))
      //     letter = qwerty.indexOf(e.keycode);
      //   if (numbers.includes(e.keycode))
      //     number = numbers.indexOf(e.keycode);
      //   if (!letter) 
      //     letter = qwerty.findIndex(q => pfx!.inputHandler.statusObjects.keyboard.state[q]);
      //   if (!number)
      //     number = numbers.findIndex(q => pfx!.inputHandler.statusObjects.keyboard.state[q]);
      //   if (letter >= 0 && number >= 0) {
      //     const sw = matrix[letter][number];  
      //     if (!sw) 
      //       Log.error(['gfx', 'switch'], 'no active switch at %i, %i', letter, number);
      //     else {  
      //       Log.info(['gfx', 'switch', 'console'], 'force state of %s to %s', sw.name, !sw.state? 'on':'off');
      //       sw.changeState(!sw.state, 'force');
      //     }
      //   }
      // }

      switch (e.key) {
        case 'LEFT':
          playfield.x(playfield.x()-2);
          break;
        case 'RIGHT':
          playfield.x(playfield.x()+2);
          break;
        case 'DOWN':
          playfield.y(playfield.y()-2);
          break;
        case 'UP':
          playfield.y(playfield.y()+2);
          break;
      }
      switch (e.char) {
        case 'j':
          playfield.sx(playfield.sx()-.02);
          break;
        case 'l':
          playfield.sx(playfield.sx()+.02);
          break;
        case 'k':
          playfield.sy(playfield.sy()+.01);
          break;
        case 'i':
          playfield.sy(playfield.sy()-.01);
          break;
        case 'u':
          playfield.rz(playfield.rz()-.1);
          break;
        case 'o':
          playfield.rz(playfield.rz()+.1);
          break;

        
        case 'a': {
          const adj = {x: playfield.x(), y: playfield.y(), sx: playfield.sx(), sy: playfield.sy(), rz: playfield.rz()};
          Log.log('console', 'adjustments', adj);
          fs.writeFileSync('projector.json', JSON.stringify(adj, null, 2));
          break;
        }
        // case 'd':
        //   machine.out!.debugPrint();
        //   break;
        case 'm':
          Log.log(['console', 'switch', 'mpu', 'solenoid', 'machine', 'gfx', 'game'], 'MARKER');
          break;
        // case 's':
        //   fs.copyFileSync('./switch.log', './recordings/'+time());
        //   break;
      }
    });
  }

  Log.log('gfx', 'graphics initialized');
}

export function gfxLoop(events: Event[], node?: Node) {
  if (!node && pfx)
    gfxLoop(events, pfx.root);
  if (!node && gfx !== pfx)
    gfxLoop(events, gfx.root);
  if (!node) return;

  if ('update' in node) {
    const n: GfxNode = node;
    n.update(events);
  }

  if (node instanceof Group)
    node.children.forEach(c => gfxLoop(events, c));
}


export class Image extends ImageView {
  curVal?: string;
  targetVal?: string;

  set(val: string): void {
    this.targetVal = val;
    const image = this;
    image.visible(val.length > 0);

    if (val.length > 0) {
      const cache = Image.getCache(this.amino);
      if ('then' in cache[val]) {
        debugger;
      } else {
        Log.trace('gfx', 'use cached image for "%s"', val);
        image.image(cache[val]);
        this.curVal = val;
      }
    } else {
      this.curVal = val;
    }
    return undefined;
  }

  static async cacheTexture(val: string): Promise<any> {
    Log.info('gfx', 'new image load for %s', val);
    const img = await Image.loadImage(val);
    await Promise.all([gfx, pfx].truthy().map(g => new Promise((resolve, reject) => {
      const texture = g.createTexture();
      texture.loadTextureFromImage(img, (err) => {
        if (err) {
          Log.error('gfx', 'error loading image "%s": ', val, err);
          // debugger;
          reject(err);
          return;
        }
        Image.getCache(g)[val] = texture;
        resolve(texture);
      });
    })));
  }

  static loadImage(val: string): Promise<AminoImage> {
    Log.info('gfx', 'new image load for %s', val);
    return new Promise((resolve, reject) => {
      const img = new AminoImage();

      img.onload = (err) => {
        if (err) {
          Log.error('gfx', 'error loading image "%s": ', val, err);
          // debugger;
          reject(err);
          return;
        }

        resolve(img);
        Log.info('gfx', 'image %s loaded', val);
      };

      img.src = 'media/'+val+'.png';
    });
  }

  static getCache(g: any): { [name: string]: Texture } {
    if (!g.cache)
      g.cache = {};
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return g.cache;
  }
}


if (require.main === module) {
  // prom
  // initMachine().then(() => initGfx());
  Log.init();
  // resetSwitchMatrix();
  resetMachine(false);
  // prom
  // MPU.init('localhost').then(() => 
  void initGfx().then(() => {
    // const game = Game.start();
  });//);
}