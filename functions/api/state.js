import { handleApi, json, readState } from "./_shared.js";

export async function onRequestGet(context) {
  return handleApi(context, async (db) => json(await readState(db)));
}
