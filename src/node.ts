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
    this.prevOutputState = this.outputState;
    this.outputState = {};
    this.update(events, this.outputState);
    for (const node of this.nodes()) {
      node.update(events, this.outputState);
    }
  }

  abstract update(events: Event[], out: OutputState): void;

  nodes(): Node[] {
    return [];
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
}