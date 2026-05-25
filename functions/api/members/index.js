import { createMember, ensureSchema, json, parseJson, readState } from "../_shared.js";

export async function onRequestPost(context) {
  await ensureSchema(context.env.DB);
  const payload = await parseJson(context.request);
  const memberId = await createMember(context.env.DB, payload);
  const state = await readState(context.env.DB);
  state.selectedMemberId = memberId;
  return json(state);
}

