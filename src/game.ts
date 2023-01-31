import { Event } from "./event";
import { Outputs } from "./machine";
import { Node } from "./node";

export class Game extends Node {
  ball = 1;

  update(events: Event[], out: Partial<Outputs>): void {
    
  }
}