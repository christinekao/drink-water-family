import { ensureSchema, json, parseJson, readState, setHistory } from "./_shared.js";

export async function onRequestPost(context) {
  await ensureSchema(context.env.DB);
  const payload = await parseJson(context.request);
  await setHistory(context.env.DB, payload);
  return json(await readState(context.env.DB));
}

