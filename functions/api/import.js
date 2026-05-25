import { handleApi, json, parseJson, readState, replaceState } from "./_shared.js";

export async function onRequestPost(context) {
  return handleApi(context, async (db) => {
    const payload = await parseJson(context.request);
    await replaceState(db, payload);
    return json(await readState(db));
  });
}
