const bottleMl = 500;
const avatarCatalog = {
  capybara: {
    label: "水豚",
    src: "./assets/generated-animals/capybara.png"
  },
  bunny: {
    label: "兔兔",
    src: "./assets/generated-animals/bunny.png"
  },
  sheep: {
    label: "綿羊",
    src: "./assets/generated-animals/sheep.png"
  },
  tiger: {
    label: "老虎",
    src: "./assets/generated-animals/tiger.png"
  },
  crocodile: {
    label: "鱷魚",
    src: "./assets/generated-animals/crocodile.png"
  },
  cat: {
    label: "小貓",
    src: "./assets/generated-animals/cat.png"
  },
  drop: {
    label: "小水滴",
    src: "./assets/animals/drop.svg"
  }
};

const nudgeLines = [
  "今天也別忘了補水。",
  "慢慢喝一瓶，身體會更舒服。",
  "全家都在記錄，你也來一瓶吧。",
  "剛好一瓶，剛剛好。",
  "喝完再往前走一點點。",
  "今天的水分還差一口氣。",
  "補一瓶，節奏就回來了。",
  "現在輪到你了。"
];

const storageKey = "drink-water-family-prototype";
const todayKey = dateKey(new Date());
const costStartDate = "2026-05-22";
const waterTotalCost = 210;
const canUseServer = location.protocol === "http:" || location.protocol === "https:";

let state = loadState();
let selectedMemberId = state.members[0] ? state.members[0].id : null;
let editingMemberId = null;
let draftGoal = 4;
let editingHistoryDate = todayKey;
let draftHistoryBottles = 0;
let serverAvailable = false;

function makeId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeAvatar(avatar) {
  if (avatarCatalog[avatar]) return avatar;
  if (avatar === "mom") return "capybara";
  if (avatar === "sister") return "bunny";
  if (avatar === "student") return "cat";
  if (avatar === "💧") return "drop";
  return "capybara";
}

function avatarMarkup(avatar, name, className) {
  const safeClass = className ? ` ${className}` : "";
  const item = avatarCatalog[normalizeAvatar(avatar)];
  return `<img class="animal-avatar${safeClass}" src="${item.src}?v=original-animals-17" alt="${name}${item.label}頭像" loading="lazy" decoding="async">`;
}

function readSavedState() {
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function writeSavedState(nextState) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(nextState));
  } catch {
    // File-mode previews can block storage; the app should still be clickable.
  }
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadState() {
  const saved = readSavedState();
  if (saved) return normalizeState(JSON.parse(saved));

  const members = [
    { id: makeId(), name: "珍珍", avatar: "capybara", goal: 5 },
    { id: makeId(), name: "郁郁", avatar: "bunny", goal: 4 },
    { id: makeId(), name: "菜菜", avatar: "cat", goal: 5 }
  ];
  return {
    members,
    entries: seedHistory(members)
  };
}

function normalizeState(nextState) {
  if (!nextState.members || nextState.members.length === 0) return nextState;

  const fallbackMemberId = nextState.members[0].id;
  const validMemberIds = new Set(nextState.members.map((member) => member.id));
  const legacyNames = ["媽媽", "爸爸", "阿嬤"];
  const legacyAvatars = ["💧", "🦫", "🐧"];
  const recentNames = ["媽媽", "妹妹", "我"];
  const isLegacySeed =
    nextState.members.length === 3 &&
    nextState.members.every((member, index) => member.name === legacyNames[index] && member.avatar === legacyAvatars[index]);
  const isRecentSeed =
    nextState.members.length === 3 &&
    nextState.members.every((member, index) => member.name === recentNames[index]);

  const members = isLegacySeed || isRecentSeed
    ? nextState.members.map((member, index) => {
        const nextMembers = [
          { name: "珍珍", avatar: "capybara", goal: 5 },
          { name: "郁郁", avatar: "bunny", goal: 4 },
          { name: "菜菜", avatar: "cat", goal: 5 }
        ];
        return {
          ...member,
          ...nextMembers[index]
        };
      })
    : nextState.members;

  return {
    ...nextState,
    members: members.map((member) => ({
      ...member,
      avatar: normalizeAvatar(member.avatar)
    })),
    entries: (nextState.entries || []).map((entry) => ({
      ...entry,
      memberId: validMemberIds.has(entry.memberId) ? entry.memberId : fallbackMemberId
    }))
  };
}

function seedHistory(members) {
  const entries = [];
  const now = new Date();
  for (let dayOffset = 1; dayOffset <= 6; dayOffset += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - dayOffset);
    const key = dateKey(date);
    const count = Math.max(1, 10 - dayOffset);
    for (let i = 0; i < count; i += 1) {
      const member = members[i % members.length];
      entries.push({ id: makeId(), memberId: member.id, date: key, amountMl: bottleMl });
    }
  }
  return entries;
}

function saveState() {
  if (serverAvailable) return;
  writeSavedState(state);
}

function setConnectionStatus(online) {
  const chip = document.querySelector("#connectionStatus");
  if (!chip) return;
  chip.classList.toggle("is-online", online);
  chip.classList.toggle("is-offline", !online);
  chip.textContent = online ? "家庭同步" : (canUseServer ? "本機模式" : "本機預覽");
}

function applyRemoteState(nextState) {
  state = normalizeState(nextState);
  if (nextState.selectedMemberId) {
    selectedMemberId = nextState.selectedMemberId;
  }
  if (!state.members.some((member) => member.id === selectedMemberId)) {
    selectedMemberId = state.members[0] ? state.members[0].id : null;
  }
}

async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

async function hydrateFromServer() {
  if (!canUseServer) return;

  try {
    const remoteState = await requestJson("/api/state");
    serverAvailable = true;
    setConnectionStatus(true);
    applyRemoteState(remoteState);
    render();
  } catch (error) {
    serverAvailable = false;
    setConnectionStatus(false);
    console.warn("Using local-only mode because the family server is unavailable.", error);
  }
}

async function refreshFromServer() {
  if (!serverAvailable) return;
  if (document.querySelector("dialog[open]")) return;

  try {
    applyRemoteState(await requestJson("/api/state"));
    render();
  } catch (error) {
    console.warn("Could not refresh family data.", error);
    setConnectionStatus(false);
  }
}

function todayEntriesFor(memberId) {
  return state.entries.filter((entry) => entry.memberId === memberId && entry.date === todayKey);
}

function entriesFor(memberId, date) {
  return state.entries.filter((entry) => entry.memberId === memberId && entry.date === date);
}

function totalForDate(date) {
  const validMemberIds = new Set(state.members.map((member) => member.id));
  return state.entries.filter((entry) => validMemberIds.has(entry.memberId) && entry.date === date).length;
}

function totalSince(date) {
  const validMemberIds = new Set(state.members.map((member) => member.id));
  return state.entries.filter((entry) => validMemberIds.has(entry.memberId) && entry.date >= date).length;
}

function selectedMember() {
  return state.members.find((member) => member.id === selectedMemberId) || state.members[0];
}

function memberStats(member) {
  const bottles = todayEntriesFor(member.id).length;
  const remaining = Math.max(member.goal - bottles, 0);
  const progress = member.goal > 0 ? Math.min(bottles / member.goal, 1) : 0;
  return { bottles, remaining, progress, ml: bottles * bottleMl, goalMl: member.goal * bottleMl };
}

function render() {
  setConnectionStatus(serverAvailable);
  renderTabs();
  renderHome();
  renderDashboard();
  renderHistory();
  renderMembers();
  saveState();
}

function renderTabs() {
  const tabs = document.querySelector("#memberTabs");
  tabs.innerHTML = state.members.map((member) => `
    <button class="member-tab ${member.id === selectedMemberId ? "active" : ""}" data-member="${member.id}">
      ${avatarMarkup(member.avatar, member.name, "tab-avatar")}
      <span>${member.name}</span>
    </button>
  `).join("");

  tabs.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedMemberId = button.dataset.member;
      render();
    });
  });
}

function renderHome() {
  const member = selectedMember();
  if (!member) return;

  const stats = memberStats(member);
  document.querySelector("#homeAvatar").innerHTML = avatarMarkup(member.avatar, member.name, "home-avatar-image");
  document.querySelector("#todayBottles").textContent = stats.bottles;
  document.querySelector("#goalBottles").textContent = member.goal;
  document.querySelector("#todayMl").textContent = stats.ml;
  document.querySelector("#goalMl").textContent = stats.goalMl;
  document.querySelector("#homeProgress").style.width = `${stats.progress * 100}%`;
  document.querySelector("#remainingText").textContent = stats.remaining === 0 ? "今天已經補得很完整。" : `還差 ${stats.remaining} 瓶`;

  if (stats.remaining === 0) {
    document.querySelector("#nudgeText").textContent = "今天的補水節奏很不錯。";
  }
}

function renderDashboard() {
  const stats = state.members.map((member) => ({ member, ...memberStats(member) }));
  const totalMl = stats.reduce((sum, item) => sum + item.ml, 0);
  const champion = [...stats].sort((a, b) => b.bottles - a.bottles)[0];
  const needsWater = [...stats].sort((a, b) => b.remaining - a.remaining)[0];
  const costBottles = totalSince(costStartDate);
  const costPerBottle = costBottles > 0 ? waterTotalCost / costBottles : null;

  document.querySelector("#familyTotal").textContent = `${totalMl} ml`;
  document.querySelector("#champion").textContent = `冠軍 ${champion ? champion.member.name : "-"}`;
  document.querySelector("#needsWater").textContent = `補水提醒 ${needsWater ? needsWater.member.name : "-"}`;
  document.querySelector("#costPerBottle").textContent = costPerBottle === null ? "-- 元 / 瓶" : `${formatCost(costPerBottle)} 元 / 瓶`;
  document.querySelector("#costNote").textContent = `${waterTotalCost} 元 / 累計 ${costBottles} 瓶 · ${costBottles * bottleMl} ml`;

  document.querySelector("#dashboardList").innerHTML = stats.map((item) => `
    <article class="member-row">
      <div class="member-row-main">
        <div class="mini-avatar">${avatarMarkup(item.member.avatar, item.member.name, "mini-avatar-image")}</div>
        <div>
          <div class="member-name">${item.member.name}</div>
          <div class="member-meta">${item.bottles}/${item.member.goal} 瓶 · ${item.ml} ml · 還差 ${item.remaining} 瓶</div>
        </div>
      </div>
      <div class="mini-progress"><span style="width:${item.progress * 100}%"></span></div>
    </article>
  `).join("");

  renderWeekBars();
}

function formatCost(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function renderWeekBars() {
  const points = [];
  const start = new Date(`${costStartDate}T00:00:00`);
  const today = new Date(`${todayKey}T00:00:00`);
  const dayCount = Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86400000) + 1);

  for (let offset = 0; offset < dayCount; offset += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const key = dateKey(date);
    points.push({
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      bottles: totalForDate(key)
    });
  }

  const max = Math.max(...points.map((point) => point.bottles), 1);
  document.querySelector("#weekBars").innerHTML = points.map((point) => `
    <div class="bar">
      <strong>${point.bottles}</strong>
      <i style="height:${Math.max(8, (point.bottles / max) * 150)}px"></i>
      <span>${point.label}</span>
    </div>
  `).join("");
}

function renderHistory() {
  const start = new Date(`${costStartDate}T00:00:00`);
  const today = new Date(`${todayKey}T00:00:00`);
  const dayCount = Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86400000) + 1);
  const rows = [];
  for (let offset = dayCount - 1; offset >= 0; offset -= 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const key = dateKey(date);
    const bottles = totalForDate(key);
    rows.push(`
      <article class="history-row">
        <div>
          <strong>${date.getMonth() + 1}/${date.getDate()}</strong>
          <span>${bottles} 瓶 · ${bottles * bottleMl} ml</span>
        </div>
        <button class="small-action" data-history-date="${key}">編輯</button>
      </article>
    `);
  }
  document.querySelector("#historyList").innerHTML = rows.join("");

  document.querySelectorAll("[data-history-date]").forEach((button) => {
    button.addEventListener("click", () => openHistoryDialog(button.dataset.historyDate));
  });
}

function renderMembers() {
  document.querySelector("#membersList").innerHTML = state.members.map((member) => `
    <article class="member-row">
      <div class="member-row-main">
        <div class="mini-avatar">${avatarMarkup(member.avatar, member.name, "mini-avatar-image")}</div>
        <div>
          <div class="member-name">${member.name}</div>
          <div class="member-meta">每日 ${member.goal} 瓶 · ${member.goal * bottleMl} ml</div>
        </div>
      </div>
      <button class="member-tab" data-edit="${member.id}">編輯</button>
    </article>
  `).join("");

  document.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => openMemberDialog(button.dataset.edit));
  });
}

function openMemberDialog(memberId = null) {
  const member = state.members.find((item) => item.id === memberId);
  editingMemberId = memberId;
  draftGoal = member ? member.goal : 4;

  document.querySelector("#dialogTitle").textContent = member ? "編輯家人" : "新增家人";
  document.querySelector("#memberName").value = member ? member.name : "";
  document.querySelector("#memberAvatar").value = member ? normalizeAvatar(member.avatar) : "capybara";
  updateGoalPreview();
  document.querySelector("#memberDialog").showModal();
}

function updateGoalPreview() {
  document.querySelector("#goalValue").textContent = draftGoal;
  document.querySelector("#goalMlPreview").textContent = `等於 ${draftGoal * bottleMl} ml`;
}

function openHistoryDialog(date) {
  editingHistoryDate = date;
  const member = selectedMember();
  const memberId = member ? member.id : state.members[0].id;

  document.querySelector("#historyDialogTitle").textContent = `編輯 ${formatDateLabel(date)}`;
  document.querySelector("#historyMember").innerHTML = state.members.map((item) => `
    <option value="${item.id}" ${item.id === memberId ? "selected" : ""}>${item.name}</option>
  `).join("");
  draftHistoryBottles = entriesFor(memberId, date).length;
  updateHistoryPreview();
  document.querySelector("#historyDialog").showModal();
}

function formatDateLabel(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function updateHistoryPreview() {
  document.querySelector("#historyBottleValue").textContent = draftHistoryBottles;
  document.querySelector("#historyMlPreview").textContent = `等於 ${draftHistoryBottles * bottleMl} ml`;
}

function setBottleCount(memberId, date, targetCount) {
  const currentEntries = entriesFor(memberId, date);
  const currentCount = currentEntries.length;

  if (targetCount > currentCount) {
    for (let index = currentCount; index < targetCount; index += 1) {
      state.entries.push({
        id: makeId(),
        memberId,
        date,
        amountMl: bottleMl
      });
    }
    return;
  }

  const removeCount = currentCount - targetCount;
  const removeIds = currentEntries.slice(0, removeCount).map((entry) => entry.id);
  state.entries = state.entries.filter((entry) => !removeIds.includes(entry.id));
}

document.querySelector("#drinkButton").addEventListener("click", async () => {
  const member = selectedMember();
  if (!member) return;

  if (serverAvailable) {
    applyRemoteState(await requestJson("/api/drinks", {
      method: "POST",
      body: JSON.stringify({ memberId: member.id, date: todayKey })
    }));
  } else {
    state.entries.push({
      id: makeId(),
      memberId: member.id,
      date: todayKey,
      amountMl: bottleMl
    });
  }

  const bubble = document.querySelector("#homeAvatar");
  bubble.classList.add("pop");
  window.setTimeout(() => bubble.classList.remove("pop"), 220);
  document.querySelector("#nudgeText").textContent = "收到一瓶 500ml 的補水記錄。";
  render();
});

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
    document.querySelectorAll(".screen").forEach((screen) => screen.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(`#${button.dataset.tab}`).classList.add("active");
    render();
  });
});

document.querySelector("#openMembers").addEventListener("click", () => openMemberDialog());
document.querySelector("#addMember").addEventListener("click", () => openMemberDialog());

document.querySelector("#minusGoal").addEventListener("click", () => {
  draftGoal = Math.max(1, draftGoal - 1);
  updateGoalPreview();
});

document.querySelector("#plusGoal").addEventListener("click", () => {
  draftGoal += 1;
  updateGoalPreview();
});

document.querySelector("#historyMember").addEventListener("change", (event) => {
  draftHistoryBottles = entriesFor(event.target.value, editingHistoryDate).length;
  updateHistoryPreview();
});

document.querySelector("#minusHistory").addEventListener("click", () => {
  draftHistoryBottles = Math.max(0, draftHistoryBottles - 1);
  updateHistoryPreview();
});

document.querySelector("#plusHistory").addEventListener("click", () => {
  draftHistoryBottles += 1;
  updateHistoryPreview();
});

document.querySelector("#saveHistory").addEventListener("click", async () => {
  const memberId = document.querySelector("#historyMember").value;
  if (serverAvailable) {
    applyRemoteState(await requestJson("/api/history", {
      method: "POST",
      body: JSON.stringify({
        memberId,
        date: editingHistoryDate,
        bottleCount: draftHistoryBottles
      })
    }));
  } else {
    setBottleCount(memberId, editingHistoryDate, draftHistoryBottles);
  }
  selectedMemberId = memberId;
  document.querySelector("#historyDialog").close();
  render();
});

document.querySelector("#saveMember").addEventListener("click", async () => {
  const name = document.querySelector("#memberName").value.trim();
  if (!name) return;

  const payload = {
    name,
    avatar: normalizeAvatar(document.querySelector("#memberAvatar").value),
    goal: draftGoal
  };

  if (serverAvailable && editingMemberId) {
    applyRemoteState(await requestJson(`/api/members/${encodeURIComponent(editingMemberId)}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }));
  } else if (serverAvailable) {
    applyRemoteState(await requestJson("/api/members", {
      method: "POST",
      body: JSON.stringify(payload)
    }));
  } else if (editingMemberId) {
    state.members = state.members.map((member) => member.id === editingMemberId ? { ...member, ...payload } : member);
  } else {
    const newMember = { id: makeId(), ...payload };
    state.members.push(newMember);
    selectedMemberId = newMember.id;
  }

  document.querySelector("#memberDialog").close();
  render();
});

window.setInterval(() => {
  const member = selectedMember();
  if (!member) return;
  if (memberStats(member).remaining > 0) {
    document.querySelector("#nudgeText").textContent = nudgeLines[Math.floor(Math.random() * nudgeLines.length)];
  }
}, 9000);

window.setInterval(refreshFromServer, 5000);

render();
hydrateFromServer();
