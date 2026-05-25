import { ensureSchema, json, readState } from "./_shared.js";

export async function onRequestGet(context) {
  await ensureSchema(context.env.DB);
  return json(await readState(context.env.DB));
}

