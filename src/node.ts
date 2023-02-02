import { Event } from "./event";
import { Outputs, OutputState } from "./machine";

export abstract class Node {
  private static count = 0;
  num = ++Node.count;

  outputState: OutputState = {};
  prevOutputState: OutputState = {};

  constructor(
  ) {

  }

  loop(events: Event[]) {
    if (this.isEnded)
      return;
    this.prevOutputState = this.outputState;
    this.outputState = {};
    this.update(events, this.outputState);
    for (const node of this.nodes().slice()) {
      node.loop(events);
      if (node.isEnded && this._nodes.includes(node))
        this._nodes.remove(node);
    }
  }

  abstract update(events: Event[], out: OutputState): void;

  // eslint-disable-next-line @typescript-eslint/prefer-readonly
  private _nodes: Node[] = [];
  nodes(): Node[] {
    return this._nodes;
  }
  
  get name(): string {
    return this.constructor.name;
  }

  calcGlobalOutputs(): OutputState {
    let s: OutputState = {...this.outputState};
    for (const node of this.nodes())
      s = {...s, ...node.calcGlobalOutputs()};
    return s;
  }

  protected isEnded = false;
  remove(): 'remove' {
    this.isEnded = true;
    return 'remove';
  }
}