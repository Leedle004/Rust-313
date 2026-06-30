import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { ASSET_PATH, TARGET_ASSET_BYTES, generateAssetPack } from "./generate-asset-pack.mjs";

const PUBLIC_DIR = resolve("public");
const DIST_DIR = resolve("dist");
const MAX_DISTRIBUTION_BYTES = 20_500_000;

function copyDirectory(source, target) {
  mkdirSync(target, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const sourcePath = join(source, entry.name);
    const targetPath = join(target, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else {
      mkdirSync(dirname(targetPath), { recursive: true });
      copyFileSync(sourcePath, targetPath);
    }
  }
}

function directorySize(path) {
  let total = 0;
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const entryPath = join(path, entry.name);
    total += entry.isDirectory() ? directorySize(entryPath) : statSync(entryPath).size;
  }
  return total;
}

await generateAssetPack();

if (!existsSync(ASSET_PATH)) {
  throw new Error(`Missing generated asset pack at ${ASSET_PATH}`);
}

const assetBytes = statSync(ASSET_PATH).size;
if (assetBytes !== TARGET_ASSET_BYTES) {
  throw new Error(`Asset pack must be ${TARGET_ASSET_BYTES} bytes, found ${assetBytes}`);
}

rmSync(DIST_DIR, { recursive: true, force: true });
copyDirectory(PUBLIC_DIR, DIST_DIR);

const distBytes = directorySize(DIST_DIR);
if (distBytes > MAX_DISTRIBUTION_BYTES) {
  throw new Error(`Distribution is too large: ${distBytes} bytes`);
}

console.log(`Built ${relative(process.cwd(), DIST_DIR)} (${distBytes} bytes)`);
console.log(`Verified ${relative(process.cwd(), ASSET_PATH)} (${assetBytes} bytes)`);
