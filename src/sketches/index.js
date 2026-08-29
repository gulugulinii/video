/* Registro degli sketch.
   L'ordine e quello in cui compaiono nella colonna del banco. Per aggiungere il
   settimo sketch: scrivi il modulo con lo stesso contratto create/step/draw e
   aggiungilo qui. Nient'altro va toccato. */

import { sketch as flow } from "./flow.js";
import { sketch as split } from "./split.js";
import { sketch as inside } from "./inside.js";
import { sketch as flow3d } from "./flow3d.js";
import { sketch as split3d } from "./split3d.js";
import { sketch as lattice } from "./lattice.js";

export const SKETCHES = { flow, split, inside, flow3d, split3d, lattice };
export const ORDINE = ["flow", "split", "inside", "flow3d", "split3d", "lattice"];
