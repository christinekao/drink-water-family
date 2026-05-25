import { ensureSchema, json, parseJson, readState, updateMember } from "../_shared.js";

export async function onRequestPut(context) {
  await ensureSchema(context.env.DB);
  const payload = await parseJson(context.request);
  await updateMember(context.env.DB, context.params.id, payload);
  return json(await readState(context.env.DB));
}

