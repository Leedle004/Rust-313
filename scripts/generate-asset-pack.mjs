import { createWriteStream, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const TARGET_ASSET_BYTES = 20_000_000;
export const ASSET_PATH = resolve("public/assets/starfall-20mb.pack");

const HEADER = new TextEncoder().encode(
  "STARFALL-20MB deterministic asset pack v1\n" +
    "Generated locally for procedural stars, palettes, pacing, and repeatable tests.\n"
);

function fillChunk(chunk, startOffset, state) {
  for (let index = 0; index < chunk.length; index += 1) {
    const absolute = startOffset + index;
    state.value ^= state.value << 13;
    state.value ^= state.value >>> 17;
    state.value ^= state.value << 5;
    const wave = Math.sin((absolute + 1) * 0.00073) * 127 + 128;
    chunk[index] = (state.value + absolute * 31 + wave) & 255;
  }
}

export async function generateAssetPack({ force = false } = {}) {
  mkdirSync(dirname(ASSET_PATH), { recursive: true });

  if (!force && existsSync(ASSET_PATH)) {
    const size = statSync(ASSET_PATH).size;
    if (size === TARGET_ASSET_BYTES) {
      console.log(`Asset pack already exists: ${ASSET_PATH} (${size} bytes)`);
      return;
    }
    console.log(`Regenerating asset pack with incorrect size: ${size} bytes`);
  }

  const stream = createWriteStream(ASSET_PATH, { flags: "w" });
  const state = { value: 0x5eed20bb };
  let written = 0;

  await new Promise((resolvePromise, rejectPromise) => {
    stream.on("error", rejectPromise);
    stream.on("finish", resolvePromise);

    const writeNext = () => {
      while (written < TARGET_ASSET_BYTES) {
        const remaining = TARGET_ASSET_BYTES - written;
        const size = Math.min(1_048_576, remaining);
        const chunk = new Uint8Array(size);

        if (written === 0) {
          chunk.set(HEADER.slice(0, Math.min(HEADER.length, chunk.length)));
          if (chunk.length > HEADER.length) {
            fillChunk(chunk.subarray(HEADER.length), HEADER.length, state);
          }
        } else {
          fillChunk(chunk, written, state);
        }

        written += chunk.length;
        if (!stream.write(chunk)) {
          stream.once("drain", writeNext);
          return;
        }
      }
      stream.end();
    };

    writeNext();
  });

  const size = statSync(ASSET_PATH).size;
  if (size !== TARGET_ASSET_BYTES) {
    throw new Error(`Expected ${TARGET_ASSET_BYTES} bytes, wrote ${size} bytes`);
  }

  console.log(`Generated ${ASSET_PATH} (${size} bytes)`);
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isCli) {
  generateAssetPack({ force: process.argv.includes("--force") }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
