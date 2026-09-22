import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json(
    {
      error:
        "OAuth collection is not enabled. Configure monitoring sources in your project.",
    },
    { status: 410 },
  );
}
