import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const http = httpRouter();

// Stripe sends checkout events here. Configure the endpoint in the Stripe
// dashboard as https://<deployment>.convex.site/stripe/webhook
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing signature", { status: 400 });
    }

    const payload = await request.text();
    const ok = await ctx.runAction(internal.stripe.handleStripeWebhook, {
      payload,
      signature,
    });

    return ok
      ? new Response(null, { status: 200 })
      : new Response("Invalid signature", { status: 400 });
  }),
});

// The teaser render job (video/render.mjs, run by GitHub Actions) reads its
// inputs and uploads the finished MP4 through these routes. Every request
// carries "Authorization: Bearer <TEASER_RENDER_SECRET>".
function renderJobAuthorized(request: Request): boolean {
  const secret = process.env.TEASER_RENDER_SECRET;
  if (!secret || secret.length < 16) return false;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) {
    diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

http.route({
  path: "/teasers/render-props",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!renderJobAuthorized(request))
      return json({ error: "Unauthorized" }, 401);
    const teaserId = new URL(request.url).searchParams.get("teaserId") ?? "";
    const props = await ctx.runQuery(internal.teasers.getRenderProps, {
      teaserId,
    });
    return props ? json(props) : json({ error: "Teaser not found" }, 404);
  }),
});

http.route({
  path: "/teasers/upload-url",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!renderJobAuthorized(request))
      return json({ error: "Unauthorized" }, 401);
    return json({ uploadUrl: await ctx.storage.generateUploadUrl() });
  }),
});

http.route({
  path: "/teasers/render-result",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!renderJobAuthorized(request))
      return json({ error: "Unauthorized" }, 401);
    const body = (await request.json()) as {
      teaserId?: string;
      storageId?: string;
      error?: string;
    };
    if (!body.teaserId) return json({ error: "teaserId is required" }, 400);
    const accepted = await ctx.runMutation(internal.teasers.completeRender, {
      teaserId: body.teaserId,
      storageId: body.storageId as Id<"_storage"> | undefined,
      error: body.error,
    });
    return json({ accepted });
  }),
});

export default http;
