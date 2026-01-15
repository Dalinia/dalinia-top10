console.log("APP VERSION 14-01-16:50");
// --- CONFIG ---
// On lit tes JSON dans ../data (comme ton dossier web est à côté de data)
const PATH_QUESTIONS = "../data/questions.json";
const PATH_DOCS = "../data/documents.json";
const PATH_RULES = "../data/regles.json";

// Webhook Make (on le garde pour plus tard, mais il n'est pas utilisé tant que le mail n'est pas réglé)
const MAKE_WEBHOOK_URL = "https://hook.us2.make.com/gntxj633fdhcf906n1mu78bjwad4jn1m";

// --- Helpers ---
async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Impossible de charger ${path} (${res.status})`);
  return res.json();
}

function safeText(x) {
  return (x === null || x === undefined) ? "" : String(x);
}

function normalizeId(x) {
  return safeText(x).trim();
}

// --- UI generation ---
function renderQuestion(formEl, q) {
  const id = normalizeId(q["Identifiant"] || q["ID"] || q["id"] || q["QuestionID"] || q["Code"]);
  const labelTxt = safeText(q["Question (texte exact)"] || q["Question"] || q["Libellé"] || id);
  if (!id) return;

  const typeRaw = safeText(q["Type de champ"] || q["Type"] || "").toLowerCase().trim();
  const rawChoices = safeText(q["Choix proposés / champs"] || q["Choix"] || q["Options"] || "");

  const isRequired =
    String(q["Obligatoire"] || q["Required"] || "").toLowerCase().includes("oui") ||
    String(q["Obligatoire"] || q["Required"] || "") === "1" ||
    String(q["Obligatoire"] || q["Required"] || "").toLowerCase() === "true";

  const helpTxt = safeText(q["Aide"] || q["Help"] || q["Description"] || "");

  const choices = rawChoices
    .split(/\r?\n|;/)
    .map(s => s.trim())
    .filter(Boolean);

  const wrap = document.createElement("div");
  wrap.className = "card";
  wrap.dataset.qid = id;

  const label = document.createElement("label");
  label.textContent = labelTxt;

  const help = document.createElement("div");
  help.className = "muted";
  help.style.marginTop = "-2px";
  help.style.marginBottom = "10px";
  help.textContent = helpTxt;
  if (!helpTxt) help.style.display = "none";

  wrap.appendChild(label);
  wrap.appendChild(help);

  const makeInput = (input) => {
    input.name = id;
    if (isRequired) input.required = true;
    input.style.width = "100%";
    return input;
  };

  const makeSelect = () => {
    const sel = document.createElement("select");
    sel.name = id;
    if (isRequired) sel.required = true;

    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "— Choisir —";
    sel.appendChild(opt0);

    for (const c of choices) {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      sel.appendChild(opt);
    }
    return sel;
  };

  const makeRadios = () => {
    const box = document.createElement("div");
    for (const c of choices) {
      const row = document.createElement("label");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.gap = "10px";
      row.style.margin = "8px 0";
      row.style.fontWeight = "400";

      const r = document.createElement("input");
      r.type = "radio";
      r.name = id;
      r.value = c;
      if (isRequired) r.required = true;

      const t = document.createElement("span");
      t.textContent = c;

      row.appendChild(r);
      row.appendChild(t);
      box.appendChild(row);
    }
    return box;
  };

  const makeCheckboxes = () => {
    const box = document.createElement("div");
    for (const c of choices) {
      const row = document.createElement("label");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.gap = "10px";
      row.style.margin = "8px 0";
      row.style.fontWeight = "400";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.name = `${id}__${c}`;
      cb.value = "1";

      const t = document.createElement("span");
      t.textContent = c;

      row.appendChild(cb);
      row.appendChild(t);
      box.appendChild(row);
    }
    return box;
  };

  const looksLikeYesNo = () => {
    if (choices.length === 2) {
      const a = choices[0].toLowerCase();
      const b = choices[1].toLowerCase();
      return (a.includes("oui") && b.includes("non")) ||
             (a.includes("non") && b.includes("oui")) ||
             (a === "yes" && b === "no") ||
             (a === "no" && b === "yes");
    }
    return typeRaw.includes("oui") || typeRaw.includes("yes/no");
  };

  let field = null;

  if (looksLikeYesNo()) {
    if (choices.length === 0) choices.push("Oui", "Non");
    field = makeRadios();
  } else if (typeRaw.includes("checkbox") || typeRaw.includes("multi") || typeRaw.includes("multiple")) {
    field = makeCheckboxes();
  } else if (typeRaw.includes("radio")) {
    field = makeRadios();
  } else if (typeRaw.includes("liste") || typeRaw.includes("dropdown") || typeRaw.includes("select")) {
    field = makeSelect();
  } else if (typeRaw.includes("textarea") || typeRaw.includes("texte long") || typeRaw.includes("commentaire")) {
    const ta = document.createElement("textarea");
    ta.rows = 3;
    ta.placeholder = "Votre réponse...";
    field = makeInput(ta);
  } else if (typeRaw.includes("email")) {
    const inp = document.createElement("input");
    inp.type = "email";
    inp.placeholder = "ex. vous@domaine.com";
    field = makeInput(inp);
  } else if (typeRaw.includes("téléphone") || typeRaw.includes("telephone") || typeRaw.includes("phone")) {
    const inp = document.createElement("input");
    inp.type = "tel";
    inp.placeholder = "ex. 514-000-0000";
    field = makeInput(inp);
  } else if (typeRaw.includes("nombre") || typeRaw.includes("number") || typeRaw.includes("num")) {
    const inp = document.createElement("input");
    inp.type = "number";
    inp.placeholder = "0";
    field = makeInput(inp);
  } else if (typeRaw.includes("date")) {
    const inp = document.createElement("input");
    inp.type = "date";
    field = makeInput(inp);
  } else {
    // fallback MVP
    field = (choices.length > 0) ? makeSelect() : makeInput(Object.assign(document.createElement("input"), {
      type: "text",
      placeholder: "Votre réponse..."
    }));
  }

  wrap.appendChild(field);
  formEl.appendChild(wrap);
}

function collectAnswers(formEl) {
  const data = new FormData(formEl);
  const answers = {};
  for (const [k, v] of data.entries()) answers[k] = v;
  return answers;
}

// --- Personnes ressources (2 fixes) ---
function renderResourcesSection(container) {
  if (!container) return;

  container.innerHTML = `
    <h2 style="margin:0 0 8px;">Personnes ressources</h2>
    <p class="muted" style="margin:0 0 12px;">
      Saisis 2 personnes qui pourront agir rapidement si tu es indisponible.
    </p>

    <div class="card" style="margin:12px 0;">
      <div style="font-weight:800; margin-bottom:10px;">1) Personne-relais (prioritaire)</div>

      <div class="row">
        <div>
          <label>Nom complet</label>
          <input name="relais1_nom" placeholder="Ex. Marie Tremblay" required>
        </div>
        <div>
          <label>Lien</label>
          <input name="relais1_lien" placeholder="Ex. conjointe, sœur, amie" required>
        </div>
      </div>

      <div class="row">
        <div>
          <label>Téléphone</label>
          <input name="relais1_tel" placeholder="Ex. 514-000-0000">
        </div>
        <div>
          <label>Email</label>
          <input name="relais1_email" placeholder="Ex. marie@email.com">
        </div>
      </div>
    </div>

    <div class="card" style="margin:12px 0;">
      <div style="font-weight:800; margin-bottom:10px;">2) Personne de soutien (backup)</div>

      <div class="row">
        <div>
          <label>Nom complet</label>
          <input name="relais2_nom" placeholder="Ex. francis Bouchard" required>
        </div>
        <div>
          <label>Lien</label>
          <input name="relais2_lien" placeholder="Ex. amie, frère, collègue" required>
        </div>
      </div>

      <div class="row">
        <div>
          <label>Téléphone</label>
          <input name="relais2_tel" placeholder="Ex. 514-000-0000">
        </div>
        <div>
          <label>Email</label>
          <input name="relais2_email" placeholder="Ex. test@email.com">
        </div>
      </div>

      <div class="muted" style="margin-top:8px;">
        Idéalement : une personne du quotidien + une personne capable d’agir même si la première est indisponible.
      </div>
    </div>
  `;
}

// (Optionnel, pas activé tant que le mail n’est pas réglé)
async function sendTop10ByEmail(payload) {
  const res = await fetch(MAKE_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Envoi webhook échoué : " + res.status);
}

// --- Scoring engine (MVP) ---
function computeTop10(answers, docs, rules) {
  // Index documents (détaillés) par nom
  const byName = new Map(docs.map(d => [safeText(d["Document"] || d["Nom"] || d["Titre"]).trim(), d]));

  const score = new Map();
  const why = new Map();

  // Récupère une réponse "texte" même si checkbox (Q5__xxx=1)
  function getAnswerText(qid) {
    const direct = answers[qid];
    if (direct && String(direct).trim()) return String(direct).trim();

    // checkbox => on reconstruit à partir des clés QID__CHOIX
    const picked = Object.keys(answers)
      .filter(k => k.startsWith(qid + "__") && String(answers[k]) === "1")
      .map(k => k.split("__").slice(1).join("__"))
      .map(s => s.trim())
      .filter(Boolean);

    return picked.join("; ");
  }

  // Convertit une cellule multi-lignes type "• Carte ... (Finances)" en ["Carte ...", ...]
  function parseDetailedDocs(cell) {
    const txt = safeText(cell);
    if (!txt) return [];

    return txt
      .split(/\r?\n|;+/)                // lignes ou ;
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => s.replace(/^•\s*/g, "")) // retire puce
      .map(s => s.replace(/\s*\([^)]*\)\s*$/g, "")) // retire "(Finances)" en fin
      .map(s => s.trim())
      .filter(Boolean);
  }

  function add(docName, pts, reason) {
    const key = safeText(docName).trim();
    if (!key) return;
    if (!byName.has(key)) return; // si ça ne match pas, on n'ajoute pas (évite bruit)
    score.set(key, (score.get(key) || 0) + pts);
    if (!why.has(key) && reason) why.set(key, reason);
  }

  // Map priorité -> points (ajuste si tu veux)
  function ptsFromPriority(p) {
    const x = safeText(p).toLowerCase();
    if (x.includes("obligatoire")) return 10;
    if (x.includes("très")) return 7;
    if (x.includes("élev")) return 5;
    if (x.includes("moy")) return 3;
    if (x.includes("faib")) return 1;
    return 3;
  }

  // 1) Base Dalinia (détaillée)
  const base = [
    "Personne-relais",
    "Contacts clés",
    "Instructions quoi faire en premier",
    "Comptes bancaires",
    "Accès numériques / méthode",
    "Pièce d’identité principale"
  ];
  for (const d of base) add(d, 10, "Base Dalinia : permet d’agir immédiatement");

  // 2) Application des règles depuis la bonne colonne (docs détaillés)
  for (const r of rules) {
    const cond = safeText(r["Si (condition basée sur les réponses)"] || r["Si"] || r["Condition"] || r["Règle"] || "");
    const prio = r["Priorité"] || r["Priority"] || "";
    const pts = ptsFromPriority(prio);

    // ⬇️ ICI : on lit les docs détaillés, pas les docs "numéro - nom"
    const detailedCell =
      r["Documents détaillés associés (SCORE TOP10)"] ||
      r["Top 10 (détaillé) associés"] ||
      r["Documents détaillés associés"] ||
      "";

    const detailedDocs = parseDetailedDocs(detailedCell);

    if (!cond) continue;

    // Règle toujours
    if (cond.toLowerCase().includes("toujours")) {
      for (const docName of detailedDocs) add(docName, pts, "Règle : toujours recommandé");
      continue;
    }

    // Conditions type: "Q5 contient Enfant(s) mineur(s)" ou "Q7 = Travailleur autonome"
    // Extraction du QID (Q1, Q2...)
    const m = cond.match(/\b(Q\d+)\b/i);
    if (!m) continue;

    const qid = m[1].toUpperCase();
    const ansText = getAnswerText(qid).toLowerCase();
    const c = cond.toLowerCase();

    let matched = false;

    if (c.includes("contient")) {
      const needle = c.split("contient").pop().trim().toLowerCase();
      if (needle && ansText.includes(needle)) matched = true;
    } else if (c.includes("=") || c.includes("égal")) {
      const val = c.split("=").pop().trim().toLowerCase();
      if (val && ansText === val) matched = true;
    } else {
      // fallback : mot-clé
      if (ansText && c && ansText.includes(c)) matched = true;
    }

    if (matched) {
      for (const docName of detailedDocs) add(docName, pts, `Parce que votre réponse (${qid}) active cette règle`);
    }
  }

  // 3) Top 10
  return Array.from(score.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name, pts]) => ({
      ...byName.get(name),
      _score: pts,
      _why: why.get(name) || ""
    }));
}


// --- Boot ---
(async function init() {
  try {
    const formEl = document.getElementById("form");
    const btn = document.getElementById("btnRun");
    console.log("btnRun:", btn);


    if (!formEl) throw new Error("Formulaire #form introuvable (index.html).");
    if (!btn) throw new Error("Bouton #btnRun introuvable (index.html).");

    // Charger questions + rendre UI
    const questions = await loadJSON(PATH_QUESTIONS);
    renderResourcesSection(document.getElementById("resources"));
    for (const q of questions) renderQuestion(formEl, q);

    // Progression
    const totalEl = document.getElementById("total");
    const answeredEl = document.getElementById("answered");
    if (totalEl) totalEl.textContent = questions.length;

    function updateProgress() {
      const answers = collectAnswers(formEl);
      const answeredCount = Object.values(answers).filter(v => v && String(v).trim()).length;
      if (answeredEl) answeredEl.textContent = answeredCount;
    }

    formEl.addEventListener("change", updateProgress);
    updateProgress();

    // Clic -> calcule -> stocke -> redirige vers result.html
    btn.addEventListener("click", async (e) => {
      e.preventDefault();

      const answers = collectAnswers(formEl);

      const docs = await loadJSON(PATH_DOCS);
      const rules = await loadJSON(PATH_RULES);

      const top10 = computeTop10(answers, docs, rules);
      if (!top10 || top10.length === 0) {
        alert("Veuillez répondre aux questions pour obtenir votre Top 10.");
        return;
      }

      sessionStorage.setItem("dalinia_top10", JSON.stringify(top10));

      // Redirection (robuste)
alert("Top10 stocké, je redirige");
window.location.href = "/web/result.html";
    });

  } catch (err) {
    console.error(err);
    alert("Erreur au chargement : " + (err?.message || err));
  }
})();
