import { createMember, handleApi, json, parseJson, readState } from "../_shared.js";

export async function onRequestPost(context) {
  return handleApi(context, async (db) => {
    const payload = await parseJson(context.request);
    const memberId = await createMember(db, payload);
    const state = await readState(db);
    state.selectedMemberId = memberId;
    return json(state);
  });
}
