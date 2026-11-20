import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ActionCtx } from "../_generated/server";
import { generateWithBfl } from "./bflImage";

const IMAGE_BYTES = new Uint8Array([1, 2, 3]).buffer;
const COMPRESSED = new Uint8Array([9, 9]).buffer;

function makeCtx() {
  const runMutation = vi.fn().mockResolvedValue(null);
  const runAction = vi.fn().mockResolvedValue(COMPRESSED);
  const getUrl = vi.fn(async (id: string) => `https://storage.test/${id}`);
  const ctx = {
    runMutation,
    runAction,
    storage: { getUrl },
  } as unknown as ActionCtx;
  return { ctx, runMutation, runAction, getUrl };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("generateWithBfl", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("BFL_API_KEY", "test-key");
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sends references by position, polls, and records the reported cost", async () => {
    const { ctx, runMutation, runAction } = makeCtx();
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ polling_url: "https://poll.test/1", cost: 0.9 }),
      )
      .mockResolvedValueOnce(jsonResponse({ status: "Generating" }))
      .mockResolvedValueOnce(
        jsonResponse({
          status: "Ready",
          result: { sample: "https://cdn.test/out.png" },
        }),
      )
      .mockResolvedValueOnce(new Response(IMAGE_BYTES));

    const promise = generateWithBfl(
      ctx,
      {
        prompt: "A duel in an arena.",
        wizardImages: ["wiz1", "wiz2"],
        wizardImageLabels: ["Merlin", "Morgana"],
        previousImage: "prev",
      },
      {
        userId: "user1",
        sessionId: "duel-1",
        feature: "generate_duel_illustration",
      },
    );
    await vi.advanceTimersByTimeAsync(5000);
    const result = await promise;

    expect(result).toBe(COMPRESSED);
    expect(runAction).toHaveBeenCalledTimes(1);

    const [submitUrl, submitInit] = fetchMock.mock.calls[0];
    expect(submitUrl).toBe("https://api.bfl.ai/v1/flux-3-image-klein");
    expect(submitInit.headers["x-key"]).toBe("test-key");
    const body = JSON.parse(submitInit.body);
    expect(body.images).toEqual([
      "https://storage.test/wiz1",
      "https://storage.test/wiz2",
      "https://storage.test/prev",
    ]);
    expect(body.aspect_ratio).toBe("1:1");
    expect(body.prompt).toContain(
      "Image 1 is the appearance reference for Merlin",
    );
    expect(body.prompt).toContain(
      "Image 2 is the appearance reference for Morgana",
    );
    expect(body.prompt).toContain("Image 3 is the previous scene");

    // The signed result URL must not receive the API key.
    const downloadInit = fetchMock.mock.calls[3][1];
    expect(downloadInit).toBeUndefined();

    expect(runMutation).toHaveBeenCalledTimes(1);
    expect(runMutation.mock.calls[0][1]).toMatchObject({
      provider: "bfl",
      model: "flux-3-image-klein",
      feature: "generate_duel_illustration",
      imageCount: 1,
      success: true,
      userId: "user1",
    });
    expect(runMutation.mock.calls[0][1].costUsd).toBeCloseTo(0.009);
  });

  it("sends only the prompt when there are no references", async () => {
    const { ctx } = makeCtx();
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ polling_url: "https://poll.test/1" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          status: "Ready",
          result: { sample: "https://cdn.test/o.png" },
        }),
      )
      .mockResolvedValueOnce(new Response(IMAGE_BYTES));

    const promise = generateWithBfl(ctx, { prompt: "A plain wizard." });
    await vi.advanceTimersByTimeAsync(2000);
    await promise;

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.prompt).toBe("A plain wizard.");
    expect(body.images).toBeUndefined();
  });

  it("asks for the requested aspect ratio", async () => {
    const { ctx } = makeCtx();
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ polling_url: "https://poll.test/1" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          status: "Ready",
          result: { sample: "https://cdn.test/o.png" },
        }),
      )
      .mockResolvedValueOnce(new Response(IMAGE_BYTES));

    const promise = generateWithBfl(ctx, {
      prompt: "Two wizards face off.",
      aspectRatio: "3:2",
    });
    await vi.advanceTimersByTimeAsync(2000);
    await promise;

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.aspect_ratio).toBe("3:2");
  });

  it("records a failed, uncharged attempt when the request is moderated", async () => {
    const { ctx, runMutation } = makeCtx();
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ polling_url: "https://poll.test/1", cost: 0.9 }),
      )
      .mockResolvedValueOnce(jsonResponse({ status: "Request Moderated" }));

    const promise = generateWithBfl(ctx, { prompt: "x" });
    const assertion = expect(promise).rejects.toThrow(/Request Moderated/);
    await vi.advanceTimersByTimeAsync(2000);
    await assertion;

    expect(runMutation.mock.calls[0][1]).toMatchObject({
      provider: "bfl",
      success: false,
      imageCount: 0,
      costUsd: 0,
    });
  });

  it("throws on a rejected submit request", async () => {
    const { ctx } = makeCtx();
    fetchMock.mockResolvedValueOnce(
      new Response("out of credits", { status: 402 }),
    );
    await expect(generateWithBfl(ctx, { prompt: "x" })).rejects.toThrow(/402/);
  });

  it("throws when BFL_API_KEY is missing", async () => {
    vi.stubEnv("BFL_API_KEY", "");
    const { ctx } = makeCtx();
    await expect(generateWithBfl(ctx, { prompt: "x" })).rejects.toThrow(
      /BFL_API_KEY/,
    );
  });
});
