import { Event } from "./event";
import { machine, Outputs } from "./machine";
import { Mode } from "./mode";

export class AttractMode extends Mode {
  update(events: Event[], out: Partial<Outputs>): void {
    out.rightScoop = machine.sRightScoop.settled;
  }
}