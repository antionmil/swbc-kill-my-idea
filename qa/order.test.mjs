/* The ordering is the page's central promise, so it has a test.
 *
 * Run it with:  pnpm test:order
 * Every case here came from something real: "the live failure" is the answer
 * that shipped with a one-hour experiment sitting behind a two-hour one. */
// Exercise the ordering directly, including the cases the model will produce.
const { order, weigh } = await import("../src/lib/order.ts");
const E = (h, m, needs = null) => ({ action: `${h}h`, hours: h, money: m, kills: "5 of 50", needs });

const cases = {
  "already sorted":        [E(1,0), E(2,0), E(3,50), E(10,150), E(40,500)],
  "the live failure":      [E(2,0), E(1,0), E(3,0), E(6,0), E(4,150)],
  "cheap one depends":     [E(2,0), E(4,0), E(1,0,2), E(6,0), E(20,300)],
  "chain of three":        [E(20,500), E(10,0,3), E(1,0), E(3,0), E(2,0,2)],
  "self reference":        [E(3,0,1), E(1,0), E(2,0), E(5,0), E(8,0)],
  "cycle":                 [E(3,0,2), E(1,0,1), E(2,0), E(5,0), E(8,0)],
  "out of range needs":    [E(3,0,99), E(1,0), E(2,0), E(5,0), E(8,0)],
};

let failures = 0;
for (const [name, list] of Object.entries(cases)) {
  const out = order(list);
  const costs = out.map(weigh);
  const pos = new Map(out.map((e, i) => [list.indexOf(e), i]));
  let ok = out.length === list.length;
  // every dependency placed before its dependent
  for (const e of out) {
    const i = list.indexOf(e);
    if (e.needs && e.needs - 1 !== i && list[e.needs - 1]) {
      if (pos.get(e.needs - 1) > pos.get(i)) ok = false;
    }
  }
  /* A circle cannot be satisfied by any order; the contract there is to drop
     the dependencies and sort by cost alone. */
  if (name === "cycle") ok = costs.join() === [...costs].sort((a, b) => a - b).join();
  else {
    const forced = out.some((e) => e.needs);
    if (!forced && costs.join() !== [...costs].sort((a, b) => a - b).join()) ok = false;
  }
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name.padEnd(20)} -> ${costs.join(", ")}`);
}
console.log(failures ? `${failures} FAILURES` : "\nall ordering cases pass");
if (failures) process.exit(1);
