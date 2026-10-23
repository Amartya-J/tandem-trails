import assert from "node:assert/strict";

const base = process.env.AUTH_BASE_URL || "http://127.0.0.1:8787";
const identity = (id, name = "Trail Tester") => ({
  "oai-authenticated-user-id": id,
  "oai-authenticated-user-email": `${id}@example.test`,
  "oai-authenticated-user-full-name": encodeURIComponent(name),
  "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
});
const post = (body, headers = {}) => fetch(`${base}/api/bio`, {
  method: "POST",
  headers: { "content-type": "application/json", ...headers },
  body: typeof body === "string" ? body : JSON.stringify(body),
});

const publicBio = await fetch(`${base}/api/bio`);
assert.equal(publicBio.status, 200, "public bio remains readable without a login");
const original = (await publicBio.json()).content;
assert.equal(typeof original, "string");

assert.equal((await post({ content: original })).status, 401, "anonymous writes are rejected");
assert.equal((await post({ content: original }, { "oai-authenticated-user-id": "partial" })).status, 401, "partial identity headers are rejected");
assert.equal((await post("{not valid json", identity("auth-owner"))).status, 400, "malformed JSON is rejected safely");
assert.equal((await post({ content: "   " }, identity("auth-owner"))).status, 400, "blank content is rejected");
assert.equal((await post({ content: 42 }, identity("auth-owner"))).status, 400, "non-text content is rejected");
assert.equal((await post({ content: "x".repeat(20_001) }, identity("auth-owner"))).status, 400, "oversized content is rejected");

assert.equal((await post({ content: original }, identity("auth-owner", "Ana Trail"))).status, 200, "a complete identity can claim the bio");
assert.equal((await post({ content: original }, identity("auth-intruder", "Not Owner"))).status, 403, "a second identity cannot overwrite the owner");
assert.equal((await post({ content: `${original}\n` }, identity("auth-owner", "Ana Trail"))).status, 200, "the owner can update again");

const protectedEditor = await fetch(`${base}/bio/edit`, { redirect: "manual" });
assert.ok([302, 303, 307, 308].includes(protectedEditor.status), "protected editor redirects signed-out visitors");
assert.match(protectedEditor.headers.get("location") || "", /signin-with-chatgpt/, "editor redirect uses the platform sign-in path");
const signedAccount = await fetch(`${base}/account`, { headers: identity("auth-owner", "Ana Trail") });
assert.equal(signedAccount.status, 200, "signed-in account page renders");
assert.match(await signedAccount.text(), /Ana Trail/, "account page displays the decoded platform name");

console.log("Authentication smoke test passed: public read, identity validation, input validation, ownership, redirects, and signed account rendering.");
