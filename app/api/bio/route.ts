import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { siteContent } from "@/db/schema";
import { DEFAULT_BIO } from "@/lib/default-bio";
import { getChatGPTUser } from "@/app/chatgpt-auth";

const BIO_KEY = "public-bio";

export async function GET() {
  try {
    const [entry] = await getDb().select().from(siteContent).where(eq(siteContent.key, BIO_KEY)).limit(1);
    return NextResponse.json({ content: entry?.content || DEFAULT_BIO });
  } catch {
    return NextResponse.json({ content: DEFAULT_BIO, source: "fallback" });
  }
}

export async function POST(req: Request) {
  let body: { content?: unknown };
  try {
    body = (await req.json()) as { content?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_REQUEST" }, { status: 400 });
  }

  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in to edit the bio" }, { status: 401 });
  if (typeof body.content !== "string" || body.content.length > 20_000 || !body.content.trim()) {
    return NextResponse.json({ error: "Bio must be non-empty text under 20,000 characters" }, { status: 400 });
  }

  try {
    const content = body.content.trim();
    const db = getDb();
    const [existing] = await db.select().from(siteContent).where(eq(siteContent.key, BIO_KEY)).limit(1);
    if (existing?.ownerUserId && existing.ownerUserId !== user.userId) {
      return NextResponse.json({ error: "Only the bio owner can edit this page" }, { status: 403 });
    }
    if (existing) {
      await db.update(siteContent).set({ content, updatedAt: Date.now(), ownerUserId: user.userId }).where(eq(siteContent.key, BIO_KEY));
    } else {
      await db.insert(siteContent).values({ key: BIO_KEY, content, updatedAt: Date.now(), ownerUserId: user.userId });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to save bio" }, { status: 500 });
  }
}
