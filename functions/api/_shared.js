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

async function ensureSchema(db) {
  await db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT NOT NULL,
      goal INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      date TEXT NOT NULL,
      amount_ml INTEGER NOT NULL DEFAULT 500,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_entries_member_date ON entries(member_id, date);
    CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
  `);

  const row = await db.prepare("SELECT COUNT(*) AS count FROM members").first();
  if (!row || row.count > 0) return;

  for (const member of DEFAULT_MEMBERS) {
    await db.prepare(
      "INSERT INTO members (id, name, avatar, goal) VALUES (?, ?, ?, ?)"
    ).bind(crypto.randomUUID(), member.name, member.avatar, member.goal).run();
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

  await db.exec("DELETE FROM entries; DELETE FROM members;");
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
    ).bind(entry.id || crypto.randomUUID(), memberId, entry.date, Number(entry.amountMl || BOTTLE_ML)).run();
  }
}

async function addDrink(db, payload) {
  await db.prepare(
    "INSERT INTO entries (id, member_id, date, amount_ml) VALUES (?, ?, ?, ?)"
  ).bind(crypto.randomUUID(), payload.memberId, payload.date, BOTTLE_ML).run();
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
    ).bind(crypto.randomUUID(), memberId, date, BOTTLE_ML).run();
  }
}

async function createMember(db, payload) {
  const memberId = crypto.randomUUID();
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
  json,
  parseJson,
  readState,
  replaceState,
  setHistory,
  updateMember
};
