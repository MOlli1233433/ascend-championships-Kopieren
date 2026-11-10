
const ASCEND_URL = "https://viirrwmhstakixecshcz.supabase.co";
const ASCEND_KEY = "sb_publishable_PzZcuN5Rb7G13VfNH5otaQ_SyclSUwO";

const ascendDB = window.supabase?.createClient
  ? window.supabase.createClient(ASCEND_URL, ASCEND_KEY)
  : null;

console.log(ascendDB ? "ASCEND Supabase bereit!" : "ASCEND läuft lokal.");

const STORAGE = "ascend-v2";

const fresh = () => ({
  aram: {
    names: [],
    rounds: [],
    rewards: ["Champion-Titel", "Finalist", "3. Platz"]
  },
  worlds: {
    names: [],
    groups: [[], []],
    results: {},
    rounds: [],
    rewards: ["Worlds Champion", "Finalist", "3. Platz"]
  }
});

let db;
try {
  db = JSON.parse(localStorage.getItem(STORAGE)) || fresh();
} catch {
  db = fresh();
}

for (const k of ["aram", "worlds"]) {
  if (!db[k]) db[k] = fresh()[k];
  if (!Array.isArray(db[k].rewards)) db[k].rewards = fresh()[k].rewards;
}

let page = "home";
const el = document.getElementById("app");

const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
})[c]);

function save() {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(db));
  } catch {
    alert("Speichern fehlgeschlagen.");
  }
}

function roundMatches(k) {
  return db[k].rounds;
}

function champ(rs) {
  if (!rs.length) return null;
  const m = rs[rs.length - 1][0];
  return m && m.w !== null ? m.t[m.w] : null;
}

function played(rs) {
  return rs.flat().filter(m =>
    m.w !== null && m.t[0] && m.t[1]
  ).length;
}

function makeBracket(names) {
  const size = 2 ** Math.ceil(Math.log2(names.length));
  const list = names.concat(Array(size - names.length).fill(null));
  const rs = [];

  for (let n = size; n >= 2; n /= 2) {
    rs.push(Array.from({ length: n / 2 }, () => ({
      t: [null, null],
      s: ["", ""],
      w: null
    })));
  }

  for (let i = 0; i < size; i += 2) {
    rs[0][i / 2].t = [list[i], list[i + 1]];
  }

  sync(rs);
  return rs;
}

function sync(rs) {
  for (let r = 0; r < rs.length; r++) {
    for (let i = 0; i < rs[r].length; i++) {
      const m = rs[r][i];

      if (m.w !== null && !m.t[m.w]) m.w = null;

      if (r === 0 && m.t.filter(Boolean).length === 1) {
        m.w = m.t[0] ? 0 : 1;
      }

      if (r < rs.length - 1) {
        const next = rs[r + 1][Math.floor(i / 2)];
        const slot = i % 2;
        const winner = m.w === null ? null : m.t[m.w];

        if (next.t[slot] !== winner) {
          next.t[slot] = winner;
          next.w = null;
          next.s = ["", ""];
        }
      }
    }
  }

  // Freilose auch in späteren Runden berücksichtigen.
  for (let r = 1; r < rs.length; r++) {
    for (let i = 0; i < rs[r].length; i++) {
      const m = rs[r][i];
      const previous = rs[r - 1].slice(i * 2, i * 2 + 2);
      const finished = previous.every(x => x.w !== null);

      if (finished && m.t.filter(Boolean).length === 1) {
        m.w = m.t[0] ? 0 : 1;
      }

      if (m.w !== null && r < rs.length - 1) {
        rs[r + 1][Math.floor(i / 2)].t[i % 2] = m.t[m.w];
      }
    }
  }
}

function updateMatch(k, r, i, a, b) {
  const rs = roundMatches(k);
  const m = rs[r][i];

  if (!m.t[0] || !m.t[1]) {
    return alert("Beide Teilnehmer müssen feststehen.");
  }

  if (!/^\d+$/.test(a) || !/^\d+$/.test(b) || +a === +b) {
    return alert("Bitte unterschiedliche ganze Ergebnisse eingeben.");
  }

  m.s = [+a, +b];
  m.w = +a > +b ? 0 : 1;

  for (let j = r + 1; j < rs.length; j++) {
    for (const x of rs[j]) {
      x.w = null;
      x.s = ["", ""];
    }
  }

  sync(rs);
  save();
  render();
}

function showPage(p) {
  page = p;
  render();
}

window.showPage = showPage;

function bracket(rs, k) {
  if (!rs.length) {
    return '<div class="notice">Noch kein Turnierbaum. Teilnehmer hinzufügen und Turnier starten.</div>';
  }

  const col = 291;
  const top = 45;
  const unit = 132;
  const cardH = 110;
  const height = top + rs[0].length * unit;
  let paths = "";

  const mid = (r, i) =>
    top + unit * (Math.pow(2, r) * (i + .5)) - cardH / 2;

  for (let r = 0; r < rs.length - 1; r++) {
    for (let i = 0; i < rs[r].length; i++) {
      const x = r * col + 235;
      const y = mid(r, i) + cardH / 2;
      const nx = (r + 1) * col;
      const ny = mid(r + 1, Math.floor(i / 2)) + cardH / 2;

      paths += `<path d="M${x} ${y} H${x + 27} V${ny} H${nx}"
        fill="none" stroke="#b99a5e" stroke-width="2" opacity=".8"/>`;
    }
  }

  return `<div class="bracket-scroll">
    <div class="bracket" style="height:${height}px">
      <svg width="${rs.length * col}" height="${height}">${paths}</svg>
      ${rs.map((round, r) => `
        <div class="round">
          <div class="round-title">
            ${r === rs.length - 1 ? "GRAND FINAL" :
              r === rs.length - 2 ? "HALBFINALE" :
              r === rs.length - 3 ? "VIERTELFINALE" :
              "RUNDE " + (r + 1)}
          </div>
          ${round.map((m, i) => `
            <div class="match" style="top:${mid(r, i)}px">
              <small>MATCH ${i + 1}</small>
              ${m.t.map((n, j) => `
                <div class="team ${m.w === j ? "winner" : ""}">
                  <span>${m.w === j ? "★ " : ""}${esc(n || "Noch offen")}</span>
                  <b>${esc(m.s[j])}</b>
                </div>
              `).join("")}
              <button data-edit="${k},${r},${i}"
                ${!m.t[0] || !m.t[1] ? "disabled" : ""}>
                ✎ Ergebnis eintragen
              </button>
            </div>
          `).join("")}
        </div>
      `).join("")}
    </div>
  </div>`;
}

function rewardBox(k) {
  const c = champ(roundMatches(k));

  return `<div class="champion">
    <span class="pill">ASCEND CHAMPION</span>
    <strong>👑 ${esc(c || "Noch nicht entschieden")}</strong>
    <div class="prize">🏆 ${esc(db[k].rewards[0])}</div>
    <p>Weitere Preise: 🥈 ${esc(db[k].rewards[1])}
    · 🥉 ${esc(db[k].rewards[2])}</p>
  </div>`;
}

function nameRows(k) {
  return db[k].names.map((n, i) => `
    <div class="name-row">
      <input data-name="${k},${i}" value="${esc(n)}"
        aria-label="Teilnehmer ${i + 1}">
      <button data-remove="${k},${i}">✕</button>
    </div>
  `).join("");
}

function aram() {
  return `<section class="panel">
    <h2>⚔ ARAM 1V1 CHAMPIONSHIP</h2>
    <p>2 bis 64 Spieler. Bei ungerader Teilnehmerzahl gibt es Freilose.</p>
    ${nameRows("aram")}
    <div class="flex">
      <button data-add="aram">+ Spieler hinzufügen</button>
      <button class="primary" data-start="aram">⚡ Turnierbaum erstellen</button>
    </div>
    <div class="notice">
      Teilnehmernamen ändern? Danach den Turnierbaum neu erstellen.
      Bestehende Ergebnisse werden dabei zurückgesetzt.
    </div>
  </section>
  <section class="panel">
    <h2>ROAD TO THE FINAL</h2>
    ${rewardBox("aram")}
    ${bracket(db.aram.rounds, "aram")}
  </section>`;
}

function pairs(g) {
  const t = db.worlds.groups[g];
  const p = [];

  for (let i = 0; i < t.length; i++) {
    for (let j = i + 1; j < t.length; j++) {
      p.push({ a: t[i], b: t[j], key: `${g}-${i}-${j}` });
    }
  }

  return p;
}

function table(g) {
  const rows = db.worlds.groups[g].map(n => ({
    n, w: 0, l: 0, p: 0
  }));

  for (const m of pairs(g)) {
    const x = db.worlds.results[m.key];
    if (!x) continue;

    const a = rows.find(z => z.n === m.a);
    const b = rows.find(z => z.n === m.b);

    a.p++;
    b.p++;

    if (x[0] > x[1]) {
      a.w++;
      b.l++;
    } else {
      b.w++;
      a.l++;
    }
  }

  return rows.sort((a, b) =>
    b.w - a.w || a.l - b.l || a.n.localeCompare(b.n)
  );
}

function worlds() {
  const w = db.worlds;

  let html = `<section class="panel">
    <h2>🏆 MINI WORLDS</h2>
    <p>8 Community-Teams · 2 Gruppen mit je 4 Teams · Halbfinale · Finale</p>
    ${nameRows("worlds")}
    <div class="flex">
      <button data-add="worlds">+ Team hinzufügen</button>
      <button class="primary" data-start="worlds">Gruppen auslosen</button>
    </div>
  </section>`;

  if (w.groups[0].length) {
    for (let g = 0; g < 2; g++) {
      html += `<section class="panel">
        <h2>GRUPPE ${g ? "B" : "A"}</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Team</th><th>Spiele</th><th>Siege</th><th>Niederlagen</th></tr>
            </thead>
            <tbody>
              ${table(g).map(x => `
                <tr>
                  <td>${esc(x.n)}</td>
                  <td>${x.p}</td>
                  <td>${x.w}</td>
                  <td>${x.l}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        <h3>Gruppenspiele</h3>
        <div class="group-games">
          ${pairs(g).map(m => `
            <div class="game">
              <b>${esc(m.a)} vs ${esc(m.b)}</b>
              <p>${db.worlds.results[m.key]?.join(" : ") || "Noch offen"}</p>
              <button data-group="${m.key}">Ergebnis eintragen</button>
            </div>
          `).join("")}
        </div>
      </section>`;
    }

    html += `<section class="panel">
      <h2>WORLDS PLAYOFFS</h2>
      <button class="primary" data-playoffs="1">
        Playoffs aus Gruppensiegern erstellen
      </button>
      ${rewardBox("worlds")}
      ${bracket(w.rounds, "worlds")}
    </section>`;
  }

  return html;
}

function home() {
  return `<div class="stats">
    <div class="stat"><small>ARAM SPIELER</small>
      <strong>${db.aram.names.filter(Boolean).length}</strong></div>
    <div class="stat"><small>WORLDS TEAMS</small>
      <strong>${db.worlds.names.filter(Boolean).length}</strong></div>
    <div class="stat"><small>ARAM MATCHES</small>
      <strong>${played(db.aram.rounds)}</strong></div>
    <div class="stat"><small>WORLDS PLAYOFFS</small>
      <strong>${played(db.worlds.rounds)}</strong></div>
  </div>

  <div class="cards">
    <div class="card">
      <h2>⚔ ARAM 1V1</h2>
      <p>Ein Spieler gegen einen anderen. Der Sieger kommt weiter.</p>
      <button data-page="aram">Turnier öffnen</button>
    </div>
    <div class="card">
      <h2>🏆 MINI WORLDS</h2>
      <p>Gruppenphase, Tabellen und Finalrunde.</p>
      <button data-page="worlds">Turnier öffnen</button>
    </div>
  </div>

  <section class="panel">
    <h2>ARAM TURNIERBAUM</h2>
    ${bracket(db.aram.rounds, "aram")}
  </section>

  <section class="panel">
    <h2>MINI WORLDS PLAYOFFS</h2>
    ${bracket(db.worlds.rounds, "worlds")}
  </section>`;
}

function admin() {
  return `<section class="panel">
    <h2>⚙ ADMIN · CHAMPION REWARDS</h2>
    <p>Belohnungen für jedes Turnier selbst festlegen.
    Diese Angaben sind nur Ankündigungen; es wird nichts automatisch ausgezahlt.</p>

    ${["aram", "worlds"].map(k => `
      <h3>${k === "aram" ? "ARAM 1V1" : "MINI WORLDS"}</h3>
      ${db[k].rewards.map((v, i) => `
        <div class="name-row">
          <label style="width:95px">${i + 1}. Platz</label>
          <input data-reward="${k},${i}" value="${esc(v)}">
        </div>
      `).join("")}
    `).join("")}

    <div class="notice">Preisfelder verlassen, um Änderungen zu speichern.</div>
  </section>

  <section class="panel">
    <h2>💾 DATEN & BACKUP</h2>
    <p>Deine Daten werden lokal im Browser gespeichert.
    Dieser Admin-Bereich hat noch keinen Login-Schutz.</p>
    <div class="flex">
      <button data-export="1">Backup herunterladen</button>
      <label>Backup importieren
        <input id="import" type="file" accept=".json,application/json">
      </label>
      <button class="danger" data-reset="1">Alle Daten löschen</button>
    </div>
  </section>`;
}

function render() {
  document.querySelectorAll("nav [data-page]").forEach(b =>
    b.classList.toggle("active", b.dataset.page === page)
  );

  el.innerHTML =
    page === "aram" ? aram() :
    page === "worlds" ? worlds() :
    page === "admin" ? admin() : home();
}

function modal(title, a, b, callback) {
  const cover = document.createElement("div");
  cover.className = "modal-bg";

  cover.innerHTML = `<div class="modal">
    <h2>${esc(title)}</h2>
    <label>${esc(a)}</label>
    <input id="m-a" type="number" min="0" value="0">
    <label>${esc(b)}</label>
    <input id="m-b" type="number" min="0" value="1">
    <div class="flex">
      <button class="primary" id="m-save">Ergebnis speichern</button>
      <button id="m-cancel">Abbrechen</button>
    </div>
  </div>`;

  document.body.append(cover);

  cover.querySelector("#m-cancel").onclick = () => cover.remove();

  cover.querySelector("#m-save").onclick = () => {
    const x = cover.querySelector("#m-a").value;
    const y = cover.querySelector("#m-b").value;

    if (!/^\d+$/.test(x) || !/^\d+$/.test(y) || +x === +y) {
      return alert("Bitte gültige unterschiedliche Zahlen eingeben.");
    }

    callback(x, y);
    cover.remove();
  };
}

document.addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b) return;

  if (b.dataset.page) {
    showPage(b.dataset.page);
    return;
  }

  if (b.dataset.add) {
    db[b.dataset.add].names.push("");
    save();
    render();
    return;
  }

  if (b.dataset.remove) {
    const [k, i] = b.dataset.remove.split(",");
    db[k].names.splice(+i, 1);
    save();
    render();
    return;
  }

  if (b.dataset.start) {
    const k = b.dataset.start;
    const names = db[k].names.map(s => s.trim()).filter(Boolean);

    if (new Set(names).size !== names.length) {
      return alert("Jeder Teilnehmername muss eindeutig sein.");
    }

    if (k === "aram") {
      if (names.length < 2 || names.length > 64) {
        return alert("Bitte 2 bis 64 Spieler eintragen.");
      }

      if (db.aram.rounds.length &&
          !confirm("Turnier neu starten? Alte Ergebnisse werden gelöscht.")) {
        return;
      }

      db.aram.names = names;
      db.aram.rounds = makeBracket(names);
    } else {
      if (names.length !== 8) {
        return alert("Mini Worlds braucht genau 8 Teams.");
      }

      if (db.worlds.groups[0].length &&
          !confirm("Gruppen neu auslosen? Alte Ergebnisse werden gelöscht.")) {
        return;
      }

      db.worlds.names = names;
      names.sort(() => Math.random() - .5);
      db.worlds.groups = [names.slice(0, 4), names.slice(4)];
      db.worlds.results = {};
      db.worlds.rounds = [];
    }

    save();
    render();
    return;
  }

  if (b.dataset.edit) {
    const [k, r, i] = b.dataset.edit.split(",");
    const m = roundMatches(k)[+r][+i];

    modal("Match-Ergebnis", m.t[0], m.t[1],
      (a, c) => updateMatch(k, +r, +i, a, c));
    return;
  }

  if (b.dataset.group) {
    const key = b.dataset.group;
    const g = +key.split("-")[0];
    const m = pairs(g).find(x => x.key === key);

    modal("Gruppenmatch", m.a, m.b, (a, c) => {
      db.worlds.results[key] = [+a, +c];
      db.worlds.rounds = [];
      save();
      render();
    });
    return;
  }

  if (b.dataset.playoffs) {
    if ([0, 1].some(g =>
      pairs(g).some(m => !db.worlds.results[m.key])
    )) {
      return alert("Erst alle 12 Gruppenspiele abschließen.");
    }

    if (db.worlds.rounds.length &&
        !confirm("Playoffs neu erstellen? Alte Ergebnisse werden gelöscht.")) {
      return;
    }

    const A = table(0);
    const B = table(1);

    db.worlds.rounds = [
      [
        { t: [A[0].n, B[1].n], s: ["", ""], w: null },
        { t: [B[0].n, A[1].n], s: ["", ""], w: null }
      ],
      [
        { t: [null, null], s: ["", ""], w: null }
      ]
    ];

    save();
    render();
    return;
  }

  if (b.dataset.export) {
    const blob = new Blob([JSON.stringify(db, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ascend-v2-backup.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  if (b.dataset.reset &&
      confirm("Alle Turniere und Preise wirklich löschen?")) {
    db = fresh();
    save();
    render();
  }
});

document.addEventListener("change", e => {
  if (e.target.dataset.name) {
    const [k, i] = e.target.dataset.name.split(",");
    db[k].names[+i] = e.target.value;
    save();
  }

  if (e.target.dataset.reward) {
    const [k, i] = e.target.dataset.reward.split(",");
    db[k].rewards[+i] = e.target.value;
    save();
  }

  if (e.target.id === "import") {
    const f = e.target.files[0];
    if (!f) return;

    f.text().then(t => {
      const x = JSON.parse(t);

      if (!Array.isArray(x.aram?.names) ||
          !Array.isArray(x.aram?.rounds) ||
          !Array.isArray(x.worlds?.names) ||
          !Array.isArray(x.worlds?.rounds) ||
          !Array.isArray(x.worlds?.groups)) {
        throw Error("Invalid");
      }

      db = x;

      for (const k of ["aram", "worlds"]) {
        if (!Array.isArray(db[k].rewards)) {
          db[k].rewards = fresh()[k].rewards;
        }
      }

      save();
      render();
      alert("Backup importiert!");
    }).catch(() => alert("Ungültige Backup-Datei."));
  }
});

render();
console.log("ASCEND Navigation geladen!");
