import { handleApi, json, parseJson, readState, setHistory } from "./_shared.js";

export async function onRequestPost(context) {
  return handleApi(context, async (db) => {
    const payload = await parseJson(context.request);
    await setHistory(db, payload);
    return json(await readState(db));
  });
}
