import test from "node:test";
import assert from "node:assert/strict";
import {
  act,
  tick,
  initialPet,
  readPet,
  readFace,
  constrainFace,
} from "./pet.ts";
test("awake time drains needs, sleeping restores energy", () => {
  assert.deepEqual(tick(initialPet, 60), {
    fullness: 78,
    happiness: 79,
    energy: 78,
    sleeping: false,
  });
  assert.equal(tick({ ...initialPet, sleeping: true }, 60).energy, 92);
});
test("actions respect sleeping and clamp values", () => {
  assert.equal(act({ ...initialPet, fullness: 99 }, "feed").fullness, 100);
  assert.deepEqual(act({ ...initialPet, sleeping: true }, "pet"), {
    ...initialPet,
    sleeping: true,
  });
  assert.equal(act({ ...initialPet, sleeping: true }, "sleep").sleeping, false);
  assert.equal(tick(initialPet, 100000).energy, 0);
});
test("saved state is validated without offline decay", () => {
  assert.deepEqual(readPet(initialPet), initialPet);
  assert.equal(readPet({ energy: NaN, fullness: 200 }).fullness, 100);
  assert.equal(readPet({ energy: NaN }).energy, 80);
  assert.equal(readFace({ uri: "x", width: 0 }), null);
});
test("crop never exposes blank edges", () => {
  const f = constrainFace({
    uri: "x",
    width: 400,
    height: 200,
    zoom: 1,
    x: 999,
    y: 999,
  });
  assert.ok(Math.abs(f.x - 110) < 1e-9);
  assert.ok(Math.abs(f.y) < 1e-9);
});
