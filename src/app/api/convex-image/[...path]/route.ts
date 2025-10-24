import { NextRequest, NextResponse } from "next/server";

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
      return new NextResponse("Image not found", { status: 404 });
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error proxying Convex image:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
