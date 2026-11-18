import { SeverityNumber } from "@opentelemetry/api-logs";
import { NextRequest, NextResponse } from "next/server";
import { posthogLog } from "../../../../../instrumentation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Only allow this in emulation mode
  if (process.env.ENV !== "emulate") {
    return new NextResponse("Not found", { status: 404 });
  }

  const resolvedParams = await params;
  const path = resolvedParams.path.join("/");
  const convexUrl = `http://127.0.0.1:3210/api/storage/${path}`;

  try {
    const response = await fetch(convexUrl);

    if (!response.ok) {
      posthogLog?.emit({
        body: "Convex image proxy could not find requested image",
        severityNumber: SeverityNumber.WARN,
        attributes: {
          component: "convex_image_proxy",
          upstream_status: response.status,
        },
      });
      return new NextResponse("Image not found", { status: 404 });
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    posthogLog?.emit({
      body: "Convex image proxy served image",
      severityNumber: SeverityNumber.INFO,
      attributes: { component: "convex_image_proxy" },
    });

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    posthogLog?.emit({
      body: "Convex image proxy request failed",
      severityNumber: SeverityNumber.ERROR,
      attributes: { component: "convex_image_proxy" },
    });
    console.error("Error proxying Convex image:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
