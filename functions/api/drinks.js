import { addDrink, ensureSchema, json, parseJson, readState } from "./_shared.js";

export async function onRequestPost(context) {
  await ensureSchema(context.env.DB);
  const payload = await parseJson(context.request);
  await addDrink(context.env.DB, payload);
  return json(await readState(context.env.DB));
}

