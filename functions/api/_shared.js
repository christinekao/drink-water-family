const BOTTLE_ML = 500;

const DEFAULT_MEMBERS = [
  { name: "珍珍", avatar: "capybara", goal: 5 },
  { name: "郁郁", avatar: "bunny", goal: 4 },
  { name: "菜菜", avatar: "crocodile", goal: 5 }
];

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init.headers || {})
    }
  });
}

function makeId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

function requireDb(db) {
  if (!db || typeof db.prepare !== "function") {
    throw new Error("D1 binding DB is not available to this Pages Function.");
  }
}

async function ensureSchema(db) {
  requireDb(db);

  const statements = [
    "CREATE TABLE IF NOT EXISTS members (" +
      "id TEXT PRIMARY KEY," +
      "name TEXT NOT NULL," +
      "avatar TEXT NOT NULL," +
      "goal INTEGER NOT NULL," +
      "created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP," +
      "updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP" +
    ")",
    "CREATE TABLE IF NOT EXISTS entries (" +
      "id TEXT PRIMARY KEY," +
      "member_id TEXT NOT NULL," +
      "date TEXT NOT NULL," +
      "amount_ml INTEGER NOT NULL DEFAULT 500," +
      "created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP," +
      "FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE CASCADE" +
    ")",
    "CREATE INDEX IF NOT EXISTS idx_entries_member_date ON entries(member_id, date)",
    "CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date)"
  ];

  for (const statement of statements) {
    await db.exec(statement);
  }

  const row = await db.prepare("SELECT COUNT(*) AS count FROM members").first();
  if (!row || row.count > 0) return;

  for (const member of DEFAULT_MEMBERS) {
    await db.prepare(
      "INSERT INTO members (id, name, avatar, goal) VALUES (?, ?, ?, ?)"
    ).bind(makeId(), member.name, member.avatar, member.goal).run();
  }
}

async function handleApi(context, handler) {
  try {
    const db = context.env.DB;
    await ensureSchema(db);
    return await handler(db);
  } catch (error) {
    return json({
      error: "Pages Function failed",
      message: error && error.message ? error.message : String(error),
      hasDbBinding: Boolean(context.env && context.env.DB)
    }, { status: 500 });
  }
}

async function readState(db) {
  const membersResult = await db.prepare(
    "SELECT id, name, avatar, goal FROM members ORDER BY created_at ASC"
  ).all();
  const entriesResult = await db.prepare(
    "SELECT id, member_id, date, amount_ml FROM entries ORDER BY date ASC, created_at ASC"
  ).all();

  return {
    members: (membersResult.results || []).map((row) => ({
      id: row.id,
      name: row.name,
      avatar: row.avatar,
      goal: row.goal
    })),
    entries: (entriesResult.results || []).map((row) => ({
      id: row.id,
      memberId: row.member_id,
      date: row.date,
      amountMl: row.amount_ml
    }))
  };
}

async function replaceState(db, payload) {
  const members = payload && Array.isArray(payload.members) ? payload.members : [];
  const entries = payload && Array.isArray(payload.entries) ? payload.entries : [];
  if (members.length === 0) return;

  await db.exec("DELETE FROM entries");
  await db.exec("DELETE FROM members");
  for (const member of members) {
    await db.prepare(
      "INSERT INTO members (id, name, avatar, goal) VALUES (?, ?, ?, ?)"
    ).bind(member.id, member.name, member.avatar, Number(member.goal || 0)).run();
  }

  const validMemberIds = new Set(members.map((member) => member.id));
  const fallbackMemberId = members[0].id;
  for (const entry of entries) {
    const memberId = validMemberIds.has(entry.memberId) ? entry.memberId : fallbackMemberId;
    await db.prepare(
      "INSERT INTO entries (id, member_id, date, amount_ml) VALUES (?, ?, ?, ?)"
    ).bind(entry.id || makeId(), memberId, entry.date, Number(entry.amountMl || BOTTLE_ML)).run();
  }
}

async function addDrink(db, payload) {
  await db.prepare(
    "INSERT INTO entries (id, member_id, date, amount_ml) VALUES (?, ?, ?, ?)"
  ).bind(makeId(), payload.memberId, payload.date, BOTTLE_ML).run();
}

async function setHistory(db, payload) {
  const memberId = payload.memberId;
  const date = payload.date;
  const bottleCount = Math.max(0, Number(payload.bottleCount || 0));

  await db.prepare("DELETE FROM entries WHERE member_id = ? AND date = ?")
    .bind(memberId, date)
    .run();

  for (let index = 0; index < bottleCount; index += 1) {
    await db.prepare(
      "INSERT INTO entries (id, member_id, date, amount_ml) VALUES (?, ?, ?, ?)"
    ).bind(makeId(), memberId, date, BOTTLE_ML).run();
  }
}

async function createMember(db, payload) {
  const memberId = makeId();
  await db.prepare(
    "INSERT INTO members (id, name, avatar, goal) VALUES (?, ?, ?, ?)"
  ).bind(memberId, payload.name, payload.avatar, Number(payload.goal || 0)).run();
  return memberId;
}

async function updateMember(db, memberId, payload) {
  await db.prepare(
    "UPDATE members SET name = ?, avatar = ?, goal = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(payload.name, payload.avatar, Number(payload.goal || 0), memberId).run();
}

async function parseJson(request) {
  return request.json().catch(() => ({}));
}

export {
  addDrink,
  createMember,
  ensureSchema,
  handleApi,
  json,
  parseJson,
  readState,
  replaceState,
  setHistory,
  updateMember
};
