// Renders one duel teaser and uploads it back to Convex.
//
//   CONVEX_SITE_URL=https://<deployment>.convex.site \
//   TEASER_RENDER_SECRET=... \
//   node render.mjs <teaserId> [--no-upload]
//
// GitHub Actions runs this (.github/workflows/render-teaser.yml). With
// --no-upload it only writes out/<teaserId>.mp4, for previewing locally.
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const teaserId = process.argv[2] ?? process.env.TEASER_ID;
const upload = !process.argv.includes("--no-upload");
const site = (process.env.CONVEX_SITE_URL ?? "").replace(/\/$/, "");
const secret = process.env.TEASER_RENDER_SECRET;

if (!teaserId || !site || !secret) {
  console.error(
    "Usage: CONVEX_SITE_URL=... TEASER_RENDER_SECRET=... node render.mjs <teaserId> [--no-upload]",
  );
  process.exit(1);
}

const auth = { Authorization: `Bearer ${secret}` };

async function call(route, init = {}) {
  const response = await fetch(`${site}${route}`, {
    ...init,
    headers: {
      ...auth,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(`${route} ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

async function report(result) {
  await call("/teasers/render-result", {
    method: "POST",
    body: JSON.stringify({ teaserId, ...result }),
  });
}

try {
  const inputProps = await call(
    `/teasers/render-props?teaserId=${encodeURIComponent(teaserId)}`,
  );
  console.log(
    `Rendering ${inputProps.segments.length} segments for ${inputProps.wizards.map((w) => w.name).join(" vs ")}`,
  );

  const serveUrl = await bundle({
    entryPoint: path.join(here, "src/index.ts"),
  });
  const composition = await selectComposition({
    serveUrl,
    id: "DuelTeaser",
    inputProps,
  });
  await mkdir(path.join(here, "out"), { recursive: true });
  const outputLocation = path.join(here, "out", `${teaserId}.mp4`);
  let lastLogged = -1;
  await renderMedia({
    serveUrl,
    composition,
    inputProps,
    codec: "h264",
    crf: 20,
    outputLocation,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 10) * 10;
      if (pct !== lastLogged) {
        lastLogged = pct;
        console.log(`  ${pct}%`);
      }
    },
  });
  console.log(`Rendered ${outputLocation}`);

  if (upload) {
    const { uploadUrl } = await call("/teasers/upload-url", { method: "POST" });
    const stored = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": "video/mp4" },
      body: await readFile(outputLocation),
    });
    if (!stored.ok)
      throw new Error(`Upload failed: ${stored.status} ${await stored.text()}`);
    const { storageId } = await stored.json();
    const { accepted } = await call("/teasers/render-result", {
      method: "POST",
      body: JSON.stringify({ teaserId, storageId }),
    });
    console.log(
      accepted
        ? "Uploaded. It's waiting for review."
        : "Uploaded, but the teaser had moved on; Convex discarded it.",
    );
  }
} catch (error) {
  console.error(error);
  if (upload) {
    await report({
      error: error instanceof Error ? error.message : String(error),
    }).catch((e) => console.error("Couldn't report the failure:", e));
  }
  process.exit(1);
}
