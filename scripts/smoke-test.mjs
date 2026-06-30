import { existsSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { ASSET_PATH, TARGET_ASSET_BYTES } from "./generate-asset-pack.mjs";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

run(process.execPath, ["scripts/build.mjs"]);
run(process.execPath, ["--check", "public/game.js"]);

const html = readFileSync("public/index.html", "utf8");
const js = readFileSync("public/game.js", "utf8");
const css = readFileSync("public/styles.css", "utf8");

assert(html.includes("./game.js"), "index.html must load game.js");
assert(html.includes("Starfall 20MB"), "index.html must name the game");
assert(js.includes("class StarfallGame"), "game.js must define the game loop");
assert(js.includes("AssetPack.load"), "game.js must load the 20MB asset pack");
assert(css.includes(".game-card"), "styles.css must style the game card");
assert(existsSync(ASSET_PATH), "asset pack must exist");
assert(statSync(ASSET_PATH).size === TARGET_ASSET_BYTES, "asset pack must be exactly 20,000,000 bytes");
assert(existsSync("dist/index.html"), "build must create dist/index.html");

console.log("Smoke test passed");
