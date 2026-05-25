import { addDrink, handleApi, json, parseJson, readState } from "./_shared.js";

export async function onRequestPost(context) {
  return handleApi(context, async (db) => {
    const payload = await parseJson(context.request);
    await addDrink(db, payload);
    return json(await readState(db));
  });
}
