// -----------------------------
// デフォルトのお題
// -----------------------------
const DEFAULT_MISSIONS = [
  "腕立て伏せ20回",
  "スクワット30回",
  "水をコップ2杯飲む",
  "読書10分",
  "英単語を10個覚える",
  "部屋を5分だけ片付ける",
  "ストレッチ5分",
  "日記を3行書く",
  "散歩15分",
  "SNSを30分我慢する",
  "いつもより30分早く寝る"
];

// -----------------------------
// localStorage のキー
// -----------------------------
const STORAGE_TODAY_KEY = "daily_missions_today_v2"; // 前回と同じでOK
const STORAGE_LIST_KEY  = "daily_missions_list_v1";

// 編集可能なお題リスト
let missionList = [];

// 今日のミッション（{ text, done } の配列）
let todayMissions = [];

// -----------------------------
// ユーティリティ
// -----------------------------

// Fisher-Yates シャッフル
function shuffle(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ★ 5個固定で選ぶ（リストが少なければその最大数）★
function pickFiveMissionTexts(sourceList) {
  const shuffled = shuffle(sourceList);
  const count = Math.min(5, shuffled.length);
  return shuffled.slice(0, count);
}

// 今日の日付（YYYY-MM-DD）
function getTodayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ミッション配列を { text, done } 形式に正規化
function normalizeMissions(missions) {
  if (!Array.isArray(missions)) return [];
  return missions.map((m) => {
    if (typeof m === "string") {
      return { text: m, done: false };
    }
    return {
      text: m.text ?? "",
      done: Boolean(m.done)
    };
  }).filter(m => m.text);
}

// -----------------------------
// お題リスト（編集可能な方）の保存・読み込み
// -----------------------------
function loadMissionList() {
  const raw = localStorage.getItem(STORAGE_LIST_KEY);
  if (!raw) {
    missionList = DEFAULT_MISSIONS.slice();
    return;
  }
  try {
    const list = JSON.parse(raw);
    if (Array.isArray(list) && list.length > 0) {
      missionList = list;
    } else {
      missionList = DEFAULT_MISSIONS.slice();
    }
  } catch (e) {
    console.error("お題リストの読み込みに失敗しました", e);
    missionList = DEFAULT_MISSIONS.slice();
  }
}

function saveMissionList() {
  localStorage.setItem(STORAGE_LIST_KEY, JSON.stringify(missionList));
}

// -----------------------------
// 今日のミッションの保存・読み込み
// -----------------------------
function loadTodayMissions() {
  const raw = localStorage.getItem(STORAGE_TODAY_KEY);
  if (!raw) return null;

  try {
    const data = JSON.parse(raw);
    if (data.date === getTodayKey() && Array.isArray(data.missions)) {
      const normalized = normalizeMissions(data.missions);
      return normalized.length > 0 ? normalized : null;
    }
  } catch (e) {
    console.error("今日のミッションの読み込みに失敗しました", e);
  }
  return null;
}

function saveTodayMissions(missions) {
  const data = {
    date: getTodayKey(),
    missions: missions
  };
  localStorage.setItem(STORAGE_TODAY_KEY, JSON.stringify(data));
}

// ★ 今日用の5個を新しく自動生成する ★
function generateNewTodayMissions() {
  if (missionList.length === 0) {
    todayMissions = [];
    saveTodayMissions(todayMissions);
    return;
  }
  const texts = pickFiveMissionTexts(missionList);
  todayMissions = texts.map(t => ({ text: t, done: false }));
  saveTodayMissions(todayMissions);
}

// -----------------------------
// 描画処理
// -----------------------------
function renderTodayMissions() {
  const listEl = document.getElementById("missions");
  const dateInfo = document.getElementById("date-info");
  const progressEl = document.getElementById("progress-info");

  listEl.innerHTML = "";

  if (!todayMissions || todayMissions.length === 0) {
    dateInfo.textContent = "";
    progressEl.textContent = "";
    return;
  }

  todayMissions.forEach((m, index) => {
    const li = document.createElement("li");
    li.className = "mission-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "mission-checkbox";
    checkbox.checked = m.done;
    checkbox.addEventListener("change", () => {
      onToggleMissionDone(index, checkbox.checked);
    });

    const label = document.createElement("span");
    label.className = "mission-label";
    label.textContent = m.text;
    if (m.done) {
      label.classList.add("done");
    }

    li.appendChild(checkbox);
    li.appendChild(label);
    listEl.appendChild(li);
  });

  dateInfo.textContent = `※ ${getTodayKey()} のミッションです`;

  const total = todayMissions.length;
  const doneCount = todayMissions.filter(m => m.done).length;

  // ★ 3つ達成でクリア判定 ★
  let text = `進捗：${doneCount} / ${total} ミッション達成`;
  if (total === 5) {
    if (doneCount >= 3) {
      text += "　🎉 今日のミッションはクリアです！";
    } else {
      const remain = 3 - doneCount;
      text += `　（クリアまであと ${remain} 個）`;
    }
  }
  progressEl.textContent = text;
}

function renderMissionList() {
  const ul = document.getElementById("all-missions");
  ul.innerHTML = "";

  missionList.forEach((text, index) => {
    const li = document.createElement("li");
    li.className = "all-missions-item";

    const span = document.createElement("span");
    span.className = "mission-text";
    span.textContent = text;

    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "削除";
    delBtn.addEventListener("click", () => {
      onDeleteMission(index);
    });

    li.appendChild(span);
    li.appendChild(delBtn);
    ul.appendChild(li);
  });
}

// -----------------------------
// イベントハンドラ
// -----------------------------
function onGenerateClick() {
  if (missionList.length === 0) {
    alert("お題リストが空です。お題を追加してください。");
    return;
  }

  if (todayMissions.length > 0) {
    const ok = confirm(
      "今日のミッションを再抽選しますか？\n" +
      "現在のチェック状態はリセットされます。"
    );
    if (!ok) return;
  }

  generateNewTodayMissions();
  renderTodayMissions();
}

function onAddMissionClick() {
  const input = document.getElementById("new-mission-input");
  const value = input.value.trim();

  if (!value) {
    alert("お題を入力してください。");
    return;
  }

  missionList.push(value);
  saveMissionList();
  renderMissionList();
  input.value = "";
}

function onDeleteMission(index) {
  const text = missionList[index];
  const ok = confirm(`このお題を削除しますか？\n\n${text}`);
  if (!ok) return;

  missionList.splice(index, 1);
  saveMissionList();
  renderMissionList();
}

// チェックボックス変更時
function onToggleMissionDone(index, done) {
  if (!todayMissions[index]) return;
  todayMissions[index].done = done;
  saveTodayMissions(todayMissions);
  renderTodayMissions(); // 見た目（取り消し線・進捗）を更新
}

// -----------------------------
// 初期化
// -----------------------------
function init() {
  // お題リスト読み込み
  loadMissionList();

  // ボタンイベント
  document
    .getElementById("generate-btn")
    .addEventListener("click", onGenerateClick);

  document
    .getElementById("add-mission-btn")
    .addEventListener("click", onAddMissionClick);

  document
    .getElementById("new-mission-input")
    .addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        onAddMissionClick();
      }
    });

  // お題リスト表示
  renderMissionList();

  // ★ 今日のミッションを読み込み or 自動生成 ★
  const loaded = loadTodayMissions();
  if (loaded) {
    todayMissions = loaded;           // 同じ日 → 保存されているものを使用
  } else {
    generateNewTodayMissions();       // 日付が変わっている or まだない → 新しく5個作る
  }

  renderTodayMissions();
}

init();
