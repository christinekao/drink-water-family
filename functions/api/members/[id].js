import { handleApi, json, parseJson, readState, updateMember } from "../_shared.js";

export async function onRequestPut(context) {
  return handleApi(context, async (db) => {
    const payload = await parseJson(context.request);
    await updateMember(db, context.params.id, payload);
    return json(await readState(db));
  });
}
