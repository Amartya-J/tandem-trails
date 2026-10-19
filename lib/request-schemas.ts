import { z } from "zod";

const name = z.string().trim().min(1).max(20);
const code = z.string().regex(/^[A-Z2-9]{6}$/);
const token = z.string().min(1).max(100);
export const trailRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), name }),
  z.object({ action: z.literal("join"), name, code }),
  z.object({ action: z.literal("reconnect"), code, token }),
  z.object({ action: z.literal("rename"), code, token, name }),
  z.object({ action: z.literal("leave"), code, token }),
  z.object({ action: z.literal("start"), code, token, level: z.number().int().min(0).max(15) }),
  z.object({ action: z.literal("restart"), code, token }),
  z.object({ action: z.literal("move"), code, token, x: z.number().finite().min(0).max(1960), y: z.number().finite().min(-150).max(550) }),
  z.object({ action: z.literal("collect"), code, token, shard: z.number().int().min(0).max(3) }),
  z.object({ action: z.literal("fall"), code, token }),
  z.object({ action: z.literal("complete"), code, token }),
]);

export type TrailRequest = z.infer<typeof trailRequestSchema>;

export function parseTrailRequest(input: unknown): TrailRequest {
  return trailRequestSchema.parse(input);
}

export function requestIdentity(input: TrailRequest) {
  return {
    action: input.action,
    code: "code" in input ? input.code : "",
    token: "token" in input ? input.token : "",
  };
}
