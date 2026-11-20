#!/usr/bin/env node
/**
 * Side-by-side comparison of image models on real wizards and duel scenes.
 *
 * It mirrors how production builds image requests (convex/generateImageWithGemini.ts,
 * convex/lib/bflImage.ts, convex/generateWizardIllustration.ts,
 * convex/generateRoundIllustration.ts) but calls each provider directly, so it
 * changes no data in your deployment. Keep the prompt builders below in sync
 * with those files if you change them.
 *
 * Wizard test: for each model, make the plain-background portrait, then the
 * themed scene using that model's own portrait as the reference (as production
 * does). The same text prompts are used for every model.
 *
 * Duel test: every model gets the same prompt, the same stored wizard portraits
 * and the same stored previous-round image, so differences come from the model.
 *
 * API keys are read from the environment or from your Convex dev deployment
 * (`npx convex env get`). They are never printed or written to disk.
 *
 * Usage:
 *   node scripts/compare-image-models.mjs \
 *     --wizards <wizardId,wizardId> \
 *     --scenes <duelId>:0,1,2 --scenes <duelId>:0,2 \
 *     [--models gemini-nano-banana-2.1,flux-3-image] [--run my-run]
 *
 * Re-running with the same --run skips images that already succeeded.
 * Output: image-comparison/<run>/report.html
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEXT_MODEL = "gemini-3.5-flash-lite";

// USD per 1M tokens. Image output is billed at the image rate; thinking and
// text output at the text rate (https://ai.google.dev/pricing).
const GEMINI_PRICES = {
  "gemini-nano-banana-2.1": { input: 1.5, text: 7.5, image: 30 },
  "gemini-3.1-flash-lite-image": { input: 0.25, text: 1.5, image: 30 },
};

const bflInputs = (max) => (prompt, images) => {
  const body = { prompt, width: 1024, height: 1024, output_format: "png" };
  images.slice(0, max).forEach((img, i) => {
    body[i === 0 ? "input_image" : `input_image_${i + 1}`] = img;
  });
  return body;
};

const MODELS = {
  "gemini-nano-banana-2.1": { kind: "gemini", label: "Nano Banana 2.1 (current)" },
  "gemini-3.1-flash-lite-image": { kind: "gemini", label: "3.1 Flash Lite Image" },
  "flux-3-image-klein": {
    kind: "bfl",
    label: "FLUX 3 Image Klein",
    body: (prompt, images) => ({
      prompt,
      ...(images.length ? { images } : {}),
      aspect_ratio: "1:1",
      resolution: "1k",
      output_format: "png",
    }),
  },
  "flux-3-image": {
    kind: "bfl",
    label: "FLUX 3 Image",
    body: (prompt, images) => ({
      prompt,
      ...(images.length ? { images } : {}),
      aspect_ratio: "1:1",
      resolution: "1k",
    }),
  },
  "flux-2-klein-9b": { kind: "bfl", label: "FLUX.2 [klein] 9B", body: bflInputs(4) },
  "flux-2-pro": { kind: "bfl", label: "FLUX.2 [pro]", body: bflInputs(8) },
};
const DEFAULT_MODELS = [
  "gemini-nano-banana-2.1",
  "gemini-3.1-flash-lite-image",
  "flux-2-klein-9b",
  "flux-3-image",
];

// ---------------------------------------------------------------- arguments
function parseArgs(argv) {
  const args = { wizards: [], scenes: [], models: DEFAULT_MODELS, run: null };
  for (let i = 0; i < argv.length; i++) {
    const [flag, value] = [argv[i], argv[i + 1]];
    if (flag === "--wizards") args.wizards.push(...value.split(","));
    else if (flag === "--scenes") {
      const [duelId, rounds] = value.split(":");
      args.scenes.push({ duelId, rounds: rounds.split(",").map(Number) });
    } else if (flag === "--models") args.models = value.split(",");
    else if (flag === "--run") args.run = value;
    else continue;
    i++;
  }
  for (const m of args.models) {
    if (!MODELS[m]) throw new Error(`Unknown model "${m}". Known: ${Object.keys(MODELS).join(", ")}`);
  }
  return args;
}

// ----------------------------------------------------------------- plumbing
function convexRun(fn, fnArgs) {
  const cmd = ["convex", "run", fn, JSON.stringify(fnArgs)];
  const out = execFileSync("npx", cmd, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(out.trim() || "null");
}

function getKey(name) {
  if (process.env[name]) return process.env[name];
  return execFileSync("npx", ["convex", "env", "get", name], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${url}`);
  const mime = (res.headers.get("content-type") || "image/png").split(";")[0];
  return { mime, buffer: Buffer.from(await res.arrayBuffer()) };
}

const extFor = (mime) => (mime.includes("jpeg") ? "jpg" : mime.includes("webp") ? "webp" : "png");
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// ------------------------------------------------------------------ prompts
// Mirrors generateImageWithGemini.ts / bflImage.ts.
function buildPrompt(prompt, { refs, previous, descriptions, bflNotes }) {
  if (refs.length === 0 && !previous) return prompt;
  const instructions = [prompt, ...(bflNotes ?? [])];
  if (refs.length > 0) {
    instructions.push(
      "Create ONE single full-frame illustration of ONE scene, as described above, with the wizard(s) drawn from the appearance reference image(s). Keep each wizard's face, fur or skin, hair, clothing, colors, props and overall design exactly as in their reference. Change only the pose, lighting and surroundings. The reference images only show what the character looks like: do NOT reproduce their layout, white or gray background, or framing. Do NOT make a character sheet, turnaround, multiple views, panels, collage, labels, or any text. The scene background must fill the entire image edge to edge.",
    );
  }
  if (previous) {
    instructions.push(
      "Keep the same arena setting and wizard designs as the previous scene, but this is a NEW comic book panel: use the camera angle and composition described in the prompt and do NOT copy the previous image's framing, viewpoint or wizard positions.",
    );
  }
  if (descriptions?.length) {
    instructions.push(`The wizards are: ${descriptions.map((w) => `${w.name}: ${w.description}`).join(". ")}.`);
  }
  instructions.push("Generate a new image in low poly art style.");
  return instructions.join(" ");
}

// --------------------------------------------------------------- providers
function geminiCost(modelId, usage) {
  const p = GEMINI_PRICES[modelId];
  if (!p || !usage) return null;
  const details = usage.candidatesTokensDetails ?? [];
  const imageTokens = details.length
    ? details.filter((d) => d.modality === "IMAGE").reduce((n, d) => n + d.tokenCount, 0)
    : (usage.candidatesTokenCount ?? 0);
  const textTokens = details.length
    ? details.filter((d) => d.modality !== "IMAGE").reduce((n, d) => n + d.tokenCount, 0)
    : 0;
  const thinking = usage.thoughtsTokenCount ?? 0;
  return (
    ((usage.promptTokenCount ?? 0) * p.input +
      (textTokens + thinking) * p.text +
      imageTokens * p.image) /
    1_000_000
  );
}

async function generateGemini(modelId, key, prompt, refs, previous, descriptions) {
  const parts = [];
  for (const r of refs) {
    parts.push({ text: `Appearance reference for ${r.label}. Use it only to copy the character's look:` });
    parts.push({ inlineData: { mimeType: r.mime, data: r.b64 } });
  }
  if (previous) {
    parts.push({ text: "Previous scene of the duel (for setting and continuity only, do not repeat its camera angle):" });
    parts.push({ inlineData: { mimeType: previous.mime, data: previous.b64 } });
  }
  const text = buildPrompt(prompt, { refs, previous, descriptions });
  parts.push({ text });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 4096, responseModalities: ["IMAGE"] },
      }),
    },
  );
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(json?.error ?? json).slice(0, 300)}`);

  const usage = json.usageMetadata;
  const candidate = json.candidates?.[0];
  const image = candidate?.content?.parts?.find((p) => p.inlineData?.data);
  const costUsd = geminiCost(modelId, usage);
  if (!image) {
    const said = candidate?.content?.parts?.find((p) => p.text)?.text;
    const reason = candidate?.finishReason ?? json.promptFeedback?.blockReason ?? "unknown";
    const err = new Error(`No image returned (${reason})${said ? `: ${said.slice(0, 160)}` : ""}`);
    err.costUsd = costUsd; // tokens are billed even on refusals
    throw err;
  }
  return {
    buffer: Buffer.from(image.inlineData.data, "base64"),
    mime: image.inlineData.mimeType || "image/png",
    costUsd,
    usage: usage && {
      input: usage.promptTokenCount,
      output: usage.candidatesTokenCount,
      thinking: usage.thoughtsTokenCount ?? 0,
    },
  };
}

async function generateBfl(modelId, key, prompt, refs, previous, descriptions) {
  const notes = [];
  const images = [];
  for (const r of refs) {
    images.push(r.url ?? r.b64);
    notes.push(`Image ${images.length} is the appearance reference for ${r.label}. Use it only to copy the character's look.`);
  }
  if (previous) {
    images.push(previous.url ?? previous.b64);
    notes.push(`Image ${images.length} is the previous scene of the duel, for setting and continuity only. Do not repeat its camera angle.`);
  }
  const text = buildPrompt(prompt, { refs, previous, descriptions, bflNotes: notes });
  const submit = await fetch(`https://api.bfl.ai/v1/${modelId}`, {
    method: "POST",
    headers: { "x-key": key, "content-type": "application/json" },
    body: JSON.stringify(MODELS[modelId].body(text, images)),
  });
  if (!submit.ok) throw new Error(`BFL request failed (${submit.status}): ${(await submit.text()).slice(0, 300)}`);
  const submitted = await submit.json();
  const costUsd = typeof submitted.cost === "number" ? submitted.cost * 0.01 : null;

  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    const poll = await fetch(submitted.polling_url, { headers: { "x-key": key } });
    const body = await poll.json().catch(() => null);
    if (!body?.status) throw new Error(`BFL poll failed (HTTP ${poll.status})`);
    if (["Pending", "Reasoning", "Generating"].includes(body.status)) continue;
    if (body.status !== "Ready") {
      throw new Error(`BFL ended with "${body.status}" ${JSON.stringify(body.details ?? "").slice(0, 200)}`);
    }
    const file = await download(body.result.sample);
    return { ...file, costUsd };
  }
  throw new Error("BFL timed out");
}

// ------------------------------------------------------------------- runner
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.wizards.length && !args.scenes.length) {
    console.error("Nothing to do. Pass --wizards and/or --scenes (see the header of this file).");
    process.exit(1);
  }
  const runName = args.run ?? `run-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`;
  const outDir = path.join(ROOT, "image-comparison", runName);
  const imgDir = path.join(outDir, "img");
  fs.mkdirSync(imgDir, { recursive: true });

  const cachePath = path.join(outDir, "results.json");
  const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, "utf8")) : { prompts: {}, results: {} };
  const save = () => fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));

  const keys = { google: getKey("GOOGLE_API_KEY") };
  if (args.models.some((m) => MODELS[m].kind === "bfl")) keys.bfl = getKey("BFL_API_KEY");

  const sections = [];

  async function storedImage(storageId, label) {
    if (!storageId) return null;
    const url = convexRun("wizards:getIllustrationUrl", { storageId });
    if (!url) return null;
    const { mime, buffer } = await download(url);
    const file = `stored-${slug(label)}-${storageId.slice(0, 6)}.${extFor(mime)}`;
    fs.writeFileSync(path.join(imgDir, file), buffer);
    return { url, mime, b64: buffer.toString("base64"), file, label };
  }

  async function run(itemId, modelId, prompt, refs, previous, descriptions) {
    const cacheKey = `${itemId}|${modelId}`;
    const hit = cache.results[cacheKey];
    if (hit?.ok && fs.existsSync(path.join(imgDir, hit.file))) return hit;
    const started = Date.now();
    try {
      const m = MODELS[modelId];
      const out =
        m.kind === "gemini"
          ? await generateGemini(modelId, keys.google, prompt, refs, previous, descriptions)
          : await generateBfl(modelId, keys.bfl, prompt, refs, previous, descriptions);
      const file = `${itemId}__${modelId}.${extFor(out.mime)}`;
      fs.writeFileSync(path.join(imgDir, file), out.buffer);
      const result = { ok: true, file, mime: out.mime, costUsd: out.costUsd, usage: out.usage, ms: Date.now() - started };
      cache.results[cacheKey] = result;
      save();
      console.log(`  ok    ${itemId} / ${modelId}  ${(result.ms / 1000).toFixed(1)}s  $${(out.costUsd ?? 0).toFixed(4)}`);
      return result;
    } catch (error) {
      const result = { ok: false, error: String(error.message ?? error), costUsd: error.costUsd ?? 0, ms: Date.now() - started };
      cache.results[cacheKey] = result;
      save();
      console.log(`  FAIL  ${itemId} / ${modelId}  ${result.error.slice(0, 120)}`);
      return result;
    }
  }

  async function textPrompt(cacheId, request) {
    if (cache.prompts[cacheId]) return cache.prompts[cacheId];
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": keys.google, "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: request }] }] }),
    });
    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
    if (!text) throw new Error(`Text prompt generation failed: ${JSON.stringify(json).slice(0, 300)}`);
    cache.prompts[cacheId] = text;
    save();
    return text;
  }

  // ---- wizards
  for (const wizardId of args.wizards) {
    const w = convexRun("wizards:getWizardInternal", { wizardId });
    if (!w) {
      console.warn(`Wizard ${wizardId} not found, skipping`);
      continue;
    }
    console.log(`\nWizard: ${w.name}`);
    const plainRequest = `Create a very detailed image prompt for a low poly illustration of a wizard named "${w.name}" that would fit this type of wizard. The wizard has this description: ${w.description}. Show the full body, centered, in a neutral standing pose facing the viewer, with all clothing, face, hair, colors, and any magical implement or familiar clearly visible. The background must be a completely plain solid white background with no scenery, no ground, no shadows cast on the background, and no spell effects or particles that extend into the background. Only give me the image prompt, no other text.`;
    const themedRequest = `Create a very detailed image prompt for a low poly illustration of a wizard named "${w.name}" in an action pose that would fit this type of wizard. The wizard has this description: ${w.description}. Use dynamic lighting and emphasize the wizard's power with magical particles and spell effects surrounding them. Set the wizard in a dramatic background that matches the wizard's theme. Only give me the image prompt, no other text.`;
    const plainPrompt =
      (await textPrompt(`${wizardId}:plain`, plainRequest)) +
      " Plain solid white background, isolated character, full body, centered, no environment.";
    const themedPrompt = await textPrompt(`${wizardId}:themed`, themedRequest);

    const storedPlain = await storedImage(w.plainIllustration, `${w.name}-plain`);
    const storedThemed = await storedImage(w.illustration, `${w.name}-themed`);

    const id = slug(w.name);
    const perModel = await Promise.all(
      args.models.map(async (modelId) => {
        const plain = await run(`${id}-plain`, modelId, plainPrompt, [], null, undefined);
        let themed = { ok: false, error: "Skipped: no portrait to use as the reference", costUsd: 0 };
        if (plain.ok) {
          const buffer = fs.readFileSync(path.join(imgDir, plain.file));
          const ref = { label: w.name, mime: plain.mime, b64: buffer.toString("base64") };
          themed = await run(`${id}-themed`, modelId, themedPrompt, [ref], null, undefined);
        }
        return { modelId, plain, themed };
      }),
    );
    sections.push({
      title: `Wizard: ${w.name}`,
      subtitle: w.description,
      rows: [
        { title: "Plain portrait (text only)", prompt: plainPrompt, stored: storedPlain, cells: Object.fromEntries(perModel.map((m) => [m.modelId, m.plain])) },
        { title: "Themed scene (portrait as reference)", prompt: themedPrompt, stored: storedThemed, cells: Object.fromEntries(perModel.map((m) => [m.modelId, m.themed])) },
      ],
    });
    writeReport(outDir, sections, args.models, cache);
  }

  // ---- duel scenes
  const wizardCache = new Map();
  for (const { duelId, rounds } of args.scenes) {
    const duel = convexRun("duels:getDuel", { duelId });
    if (!duel) {
      console.warn(`Duel ${duelId} not found, skipping`);
      continue;
    }
    const wizards = [];
    for (const wid of duel.wizards) {
      if (!wizardCache.has(wid)) wizardCache.set(wid, convexRun("wizards:getWizardInternal", { wizardId: wid }));
      wizards.push(wizardCache.get(wid));
    }
    const names = wizards.map((w) => w.name).join(" vs ");
    console.log(`\nDuel: ${names}`);
    const refs = [];
    for (const w of wizards) {
      const stored = await storedImage(w.plainIllustration ?? w.illustration, `${w.name}-ref`);
      if (stored) refs.push({ label: w.name, mime: stored.mime, b64: stored.b64, url: stored.url });
    }
    const descriptions = wizards.map((w) => ({ name: w.name, description: w.description }));
    const section = {
      title: `Duel: ${names}`,
      subtitle: `Wizard references: ${refs.map((r) => r.label).join(", ")}`,
      rows: [],
    };

    for (const roundNumber of rounds) {
      const round = duel.rounds.find((r) => r.roundNumber === roundNumber);
      const prompt = round?.outcome?.illustrationPrompt;
      if (!prompt) {
        console.warn(`  Round ${roundNumber} has no illustration prompt, skipping`);
        continue;
      }
      let previous = null;
      let previousLabel = "";
      if (roundNumber > 0) {
        const prev = duel.rounds
          .filter((r) => r.roundNumber < roundNumber && r.status === "COMPLETED" && r.outcome?.illustration)
          .sort((a, b) => b.roundNumber - a.roundNumber)[0];
        if (prev) {
          const stored = await storedImage(prev.outcome.illustration, `prev-r${prev.roundNumber}`);
          if (stored) {
            previous = { mime: stored.mime, b64: stored.b64, url: stored.url };
            previousLabel = ` (previous scene: round ${prev.roundNumber})`;
          }
        }
      }
      const storedRound = await storedImage(round.outcome.illustration, `${slug(names)}-r${roundNumber}`);
      const itemId = `duel-${duelId.slice(0, 6)}-r${roundNumber}`;
      const results = await Promise.all(
        args.models.map(async (modelId) => [
          modelId,
          await run(itemId, modelId, prompt, refs, previous, roundNumber > 0 ? descriptions : undefined),
        ]),
      );
      section.rows.push({
        title: `Round ${roundNumber}${previousLabel}`,
        prompt,
        stored: storedRound,
        cells: Object.fromEntries(results),
      });
      writeReport(outDir, [...sections, section], args.models, cache);
    }
    sections.push(section);
    writeReport(outDir, sections, args.models, cache);
  }

  writeReport(outDir, sections, args.models, cache);
  const reportPath = path.join(outDir, "report.html");
  console.log(`\nReport: ${reportPath}`);
}

// ------------------------------------------------------------------- report
function writeReport(outDir, sections, models, cache) {
  const totals = Object.fromEntries(models.map((m) => [m, { ok: 0, fail: 0, cost: 0, ms: 0 }]));
  for (const s of sections) {
    for (const row of s.rows) {
      for (const m of models) {
        const r = row.cells[m];
        if (!r) continue;
        const t = totals[m];
        t.cost += r.costUsd ?? 0;
        if (r.ok) {
          t.ok++;
          t.ms += r.ms ?? 0;
        } else t.fail++;
      }
    }
  }
  const money = (n) => (n == null ? "n/a" : `$${n.toFixed(4)}`);
  const summary = models
    .map((m) => {
      const t = totals[m];
      return `<tr><td>${escapeHtml(MODELS[m].label)}<br><code>${m}</code></td><td>${t.ok} / ${t.ok + t.fail}</td><td>${money(t.cost)}</td><td>${t.ok ? money(t.cost / t.ok) : "n/a"}</td><td>${t.ok ? (t.ms / t.ok / 1000).toFixed(1) + "s" : "n/a"}</td></tr>`;
    })
    .join("");

  const cell = (r, label) => {
    if (!r) return `<div class="cell"><div class="head">${escapeHtml(label)}</div><div class="err">not run</div></div>`;
    const body = r.ok
      ? `<a href="img/${r.file}" target="_blank"><img loading="lazy" src="img/${r.file}"></a>`
      : `<div class="err">${escapeHtml(r.error)}</div>`;
    const tokens = r.usage ? ` · ${r.usage.input} in / ${r.usage.output} out${r.usage.thinking ? ` / ${r.usage.thinking} think` : ""}` : "";
    return `<div class="cell"><div class="head">${escapeHtml(label)}</div>${body}<div class="meta">${money(r.costUsd)} · ${((r.ms ?? 0) / 1000).toFixed(1)}s${tokens}</div></div>`;
  };

  const body = sections
    .map(
      (s) => `<h2>${escapeHtml(s.title)}</h2><p class="sub">${escapeHtml(s.subtitle)}</p>` +
        s.rows
          .map(
            (row) => `<h3>${escapeHtml(row.title)}</h3><div class="grid">
  ${row.stored ? `<div class="cell"><div class="head">Stored in app</div><a href="img/${row.stored.file}" target="_blank"><img loading="lazy" src="img/${row.stored.file}"></a><div class="meta">for reference</div></div>` : ""}
  ${models.map((m) => cell(row.cells[m], MODELS[m].label)).join("\n  ")}
</div><details><summary>Prompt</summary><pre>${escapeHtml(row.prompt)}</pre></details>`,
          )
          .join(""),
    )
    .join("");

  fs.writeFileSync(
    path.join(outDir, "report.html"),
    `<!doctype html><meta charset="utf-8"><title>Image model comparison</title>
<style>
body{background:#0f0b1d;color:#e8e4f5;font:14px system-ui,sans-serif;margin:24px}
h1,h2,h3{font-weight:600} h2{margin-top:40px;border-bottom:1px solid #3a3258;padding-bottom:6px} h3{margin:24px 0 8px;color:#bdb4e0}
.sub{color:#9a91c0;margin-top:-6px} table{border-collapse:collapse} td,th{border:1px solid #3a3258;padding:6px 12px;text-align:left}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.cell{background:#1a1432;border:1px solid #3a3258;border-radius:8px;padding:8px}
.head{font-weight:600;margin-bottom:6px} img{width:100%;border-radius:4px;display:block}
.meta{color:#9a91c0;font-size:12px;margin-top:6px} .err{color:#ff8a8a;font-size:12px;padding:12px;word-break:break-word}
pre{white-space:pre-wrap;color:#bdb4e0} code{color:#9a91c0}
</style>
<h1>Image model comparison</h1>
<table><tr><th>Model</th><th>Images ok</th><th>Total cost</th><th>Cost / image</th><th>Avg time</th></tr>${summary}</table>
<p class="sub">Gemini cost is computed from the token counts the API returns, including thinking tokens. BFL cost is the credits the API reports.</p>
${body}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
