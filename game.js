const USERS_KEY = "fortnitex_users_v1";
const SKINS = [
  { id: "ghost", name: "Ghost", emoji: "🧑‍🚀", accent: "#7dd3fc" },
  { id: "rogue", name: "Rogue", emoji: "🕵️", accent: "#fda4af" },
  { id: "ninja", name: "Ninja", emoji: "🥷", accent: "#a78bfa" },
  { id: "hunter", name: "Hunter", emoji: "🧭", accent: "#fbbf24" },
  { id: "storm", name: "Storm", emoji: "⚡", accent: "#4ade80" }
];

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let selectedSkin = SKINS[0];
let currentUser = null;
let isRegisterMode = false;
let inGame = false;

const keys = {};
const mouse = { sensitivity: 0.7 };

const player = {
  x: 1000,
  y: 260,
  z: 1000,
  angle: 0,
  pitch: 0,
  speed: 3.6,
  health: 100,
  shield: 0,
  maxHealth: 100,
  maxShield: 100,
  ammo: { ar: 300, sniper: 15, shotgun: 32 },
  currentWeapon: "ar",
  killCount: 0,
  score: 0,
  velocityY: 0,
  canJump: true
};

const world = {
  buildings: [],
  enemies: [],
  bullets: [],
  loot: [],
  zone: { x: 1000, z: 1000, radius: 420 },
  gameOver: false
};

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function showAuthScreen() {
  document.getElementById("menu").classList.add("hidden");
  document.getElementById("auth-screen").classList.remove("hidden");
}

function backToMenu() {
  document.getElementById("auth-screen").classList.add("hidden");
  document.getElementById("menu").classList.remove("hidden");
}

function showSettings() {
  document.getElementById("menu").classList.add("hidden");
  document.getElementById("settings-screen").classList.remove("hidden");
}

function backToMenuFromSettings() {
  document.getElementById("settings-screen").classList.add("hidden");
  document.getElementById("menu").classList.remove("hidden");
}

function toggleAuthMode() {
  isRegisterMode = !isRegisterMode;

  const title = document.getElementById("auth-title");
  const registerField = document.getElementById("register-email-field");
  const authBtn = document.getElementById("auth-btn");
  const toggle = document.querySelector(".toggle-auth");

  if (isRegisterMode) {
    title.textContent = "Inscription";
    registerField.classList.remove("hidden");
    authBtn.textContent = "S'inscrire";
    toggle.innerHTML = "Déjà inscrit ? <a onclick=\"toggleAuthMode()\">Se connecter</a>";
  } else {
    title.textContent = "Connexion";
    registerField.classList.add("hidden");
    authBtn.textContent = "Connexion";
    toggle.innerHTML = "Pas de compte ? <a onclick=\"toggleAuthMode()\">S'inscrire</a>";
  }
}

function authenticate() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const email = document.getElementById("email").value.trim();

  if (!username || !password) {
    alert("Pseudo et mot de passe requis.");
    return;
  }

  const users = loadUsers();

  if (isRegisterMode) {
    if (!email) {
      alert("Email requis pour l'inscription.");
      return;
    }
    if (users[username]) {
      alert("Ce pseudo existe déjà.");
      return;
    }

    users[username] = {
      password,
      email,
      score: 0,
      kills: 0,
      skinId: selectedSkin.id,
      friends: [],
      requests: []
    };

    saveUsers(users);
    alert("Compte créé avec succès.");
    isRegisterMode = false;
    toggleAuthMode();
    return;
  }

  if (!users[username] || users[username].password !== password) {
    alert("Identifiants incorrects.");
    return;
  }

  currentUser = { username, ...users[username] };
  document.getElementById("auth-screen").classList.add("hidden");
  showSkinSelection();
}

function showSkinSelection() {
  const grid = document.getElementById("skins-grid");
  grid.innerHTML = "";

  SKINS.forEach((skin) => {
    const card = document.createElement("div");
    card.className = "skin-card" + (skin.id === selectedSkin.id ? " selected" : "");
    card.innerHTML = `
      <div class="skin-avatar" style="background: linear-gradient(135deg, ${skin.accent}, #a78bfa, #38bdf8);">${skin.emoji}</div>
      <div class="skin-name">${skin.name}</div>
    `;
    card.onclick = () => {
      selectedSkin = skin;
      renderSkinSelection();
    };
    grid.appendChild(card);
  });

  document.getElementById("skin-selection").classList.remove("hidden");
}

function renderSkinSelection() {
  const grid = document.getElementById("skins-grid");
  [...grid.children].forEach((card, idx) => {
    card.classList.toggle("selected", SKINS[idx].id === selectedSkin.id);
  });
}

function startGame() {
  if (!currentUser) return;

  const users = loadUsers();
  if (users[currentUser.username]) {
    users[currentUser.username].skinId = selectedSkin.id;
    saveUsers(users);
  }

  inGame = true;
  currentUser.skin = selectedSkin;

  document.getElementById("skin-selection").classList.add("hidden");
  document.getElementById("game").classList.remove("hidden");
  document.getElementById("player-name").textContent = currentUser.username;

  initWorld();
  setupWeapons();
  renderFriendsPanel();
  addChatMessage("Système", "Partie lancée. Reste dans la zone !");
  requestAnimationFrame(loop);
}

function initWorld() {
  world.buildings = [];
  world.enemies = [];
  world.bullets = [];
  world.loot = [];
  world.zone = { x: 1000, z: 1000, radius: 420 };
  world.gameOver = false;

  for (let x = 0; x < 2000; x += 100) {
    for (let z = 0; z < 2000; z += 100) {
      world.buildings.push({
        x,
        y: 260,
        z,
        w: 100,
        h: 10,
        d: 100,
        color: "#4ade80",
        type: "ground"
      });
    }
  }

  for (let i = 0; i < 18; i++) {
    world.buildings.push({
      x: 120 + Math.random() * 1700,
      y: 220,
      z: 120 + Math.random() * 1700,
      w: 80 + Math.random() * 120,
      h: 120 + Math.random() * 160,
      d: 80 + Math.random() * 120,
      color: `hsl(${Math.random() * 360}, 50%, 42%)`,
      type: "building"
    });
  }

  for (let i = 0; i < 12; i++) {
    world.enemies.push({
      x: 100 + Math.random() * 1800,
      y: 260,
      z: 100 + Math.random() * 1800,
      health: 80,
      maxHealth: 80,
      speed: 0.7 + Math.random() * 0.9,
      name: "Bot " + i,
      alive: true
    });
  }

  for (let i = 0; i < 18; i++) {
    world.loot.push({
      x: 100 + Math.random() * 1800,
      y: 285,
      z: 100 + Math.random() * 1800,
      type: ["ammo", "shield", "health"][Math.floor(Math.random() * 3)],
      picked: false
    });
  }

  player.x = 1000;
  player.y = 260;
  player.z = 1000;
  player.angle = 0;
  player.pitch = 0;
  player.health = 100;
  player.shield = 0;
  player.score = currentUser ? Number(currentUser.score || 0) : 0;
  player.killCount = 0;
  player.currentWeapon = "ar";
  player.ammo = { ar: 300, sniper: 15, shotgun: 32 };
}

function setupWeapons() {
  const weapons = [
    { key: "ar", label: "Fusil", ammo: player.ammo.ar },
    { key: "sniper", label: "Sniper", ammo: player.ammo.sniper },
    { key: "shotgun", label: "Shotgun", ammo: player.ammo.shotgun }
  ];

  const container = document.getElementById("weapons-container");
  container.innerHTML = "";

  weapons.forEach((w) => {
    const btn = document.createElement("button");
    btn.className = "weapon-slot" + (player.currentWeapon === w.key ? " active" : "");
    btn.textContent = w.label + " (" + player.ammo[w.key] + ")";
    btn.onclick = () => {
      player.currentWeapon = w.key;
      setupWeapons();
    };
    container.appendChild(btn);
  });

  const itemContainer = document.getElementById("items-container");
  itemContainer.innerHTML = "";
  ["Soin", "Bouclier", "Mur", "Escalier"].forEach((item) => {
    const btn = document.createElement("button");
    btn.className = "item-slot";
    btn.textContent = item;
    btn.onclick = () => {
      if (item === "Soin") useHeal();
      if (item === "Bouclier") useShield();
      if (item === "Mur") placeBuild("wall");
      if (item === "Escalier") placeBuild("stairs");
    };
    itemContainer.appendChild(btn);
  });

  const buildButtons = document.getElementById("build-buttons");
  buildButtons.innerHTML = "";
  ["Mur", "Escalier", "Rampe"].forEach((type) => {
    const btn = document.createElement("button");
    btn.className = "build-btn";
    btn.textContent = type;
    btn.onclick = () => placeBuild(type.toLowerCase());
    buildButtons.appendChild(btn);
  });
}

function useHeal() {
  player.health = Math.min(player.maxHealth, player.health + 25);
  showMessage("Soin +25");
}

function useShield() {
  player.shield = Math.min(player.maxShield, player.shield + 35);
  showMessage("Bouclier +35");
}

function placeBuild(type) {
  const dx = Math.cos(player.angle);
  const dz = Math.sin(player.angle);

  const x = player.x + dx * 70;
  const z = player.z + dz * 70;

  if (type === "wall") {
    world.buildings.push({ x, y: 250, z, w: 30, h: 80, d: 30, type: "wall", color: "#cbd5e1" });
  }

  if (type === "stairs") {
    world.buildings.push({ x, y: 250, z, w: 40, h: 50, d: 60, type: "stairs", color: "#94a3b8" });
  }

  if (type === "rampe") {
    world.buildings.push({ x, y: 250, z, w: 40, h: 45, d: 90, type: "ramp", color: "#dbeafe" });
  }
}

function updateHUD() {
  if (!currentUser) return;
  document.getElementById("player-name").textContent = currentUser.username;
  document.getElementById("health-text").textContent = Math.floor(player.health);
  document.getElementById("shield-text").textContent = Math.floor(player.shield);
  document.getElementById("weapon-name").textContent = {
    ar: "Fusil",
    sniper: "Sniper",
    shotgun: "Shotgun"
  }[player.currentWeapon];
  document.getElementById("ammo-text").textContent = player.ammo[player.currentWeapon];

  const zonePct = Math.round((world.zone.radius / 420) * 100);
  document.getElementById("zone-text").textContent = zonePct + "%";

  const healthPct = (player.health / player.maxHealth) * 100;
  document.getElementById("health-fill").style.width = healthPct + "%";

  const shieldPct = (player.shield / player.maxShield) * 100;
  document.getElementById("shield-fill").style.width = shieldPct + "%";

  document.getElementById("rank-text").textContent = getRank();
  renderScoreboard();
}

function getRank() {
  if (player.score < 200) return "Bronze";
  if (player.score < 600) return "Argent";
  if (player.score < 1200) return "Or";
  return "Légende";
}

function updatePlayer() {
  let dx = 0;
  let dz = 0;

  if (keys["w"] || keys["arrowup"]) {
    dx += Math.cos(player.angle);
    dz += Math.sin(player.angle);
  }
  if (keys["s"] || keys["arrowdown"]) {
    dx -= Math.cos(player.angle);
    dz -= Math.sin(player.angle);
  }
  if (keys["a"] || keys["arrowleft"]) {
    dx += Math.cos(player.angle - Math.PI / 2);
    dz += Math.sin(player.angle - Math.PI / 2);
  }
  if (keys["d"] || keys["arrowright"]) {
    dx += Math.cos(player.angle + Math.PI / 2);
    dz += Math.sin(player.angle + Math.PI / 2);
  }

  if (dx !== 0 || dz !== 0) {
    const len = Math.hypot(dx, dz) || 1;
    player.x += (dx / len) * player.speed;
    player.z += (dz / len) * player.speed;
  }

  if (keys[" "] && player.canJump) {
    player.velocityY = -11.5;
    player.canJump = false;
  }

  player.velocityY += 0.6;
  player.y += player.velocityY;

  if (player.y > 260) {
    player.y = 260;
    player.velocityY = 0;
    player.canJump = true;
  }

  player.x = clamp(player.x, 40, 1960);
  player.z = clamp(player.z, 40, 1960);

  const distToZone = Math.hypot(player.x - world.zone.x, player.z - world.zone.z);
  if (distToZone > world.zone.radius) {
    player.health -= 0.6;
    if (player.health <= 0) {
      world.gameOver = true;
      showMessage("Tu as perdu !");
    }
  }
}

function shoot() {
  if (!inGame || world.gameOver) return;

  const weapon = player.currentWeapon;
  const ammo = player.ammo[weapon];

  if (ammo <= 0) {
    addChatMessage("Système", "Plus de munitions pour cette arme.");
    return;
  }

  player.ammo[weapon]--;

  const damage = { ar: 24, sniper: 75, shotgun: 60 }[weapon];
  const spread = { ar: 0.04, sniper: 0.01, shotgun: 0.12 }[weapon];
  const shots = weapon === "shotgun" ? 8 : 1;

  for (let i = 0; i < shots; i++) {
    const offset = (Math.random() - 0.5) * spread;
    world.bullets.push({
      x: player.x,
      y: player.y - 20,
      z: player.z,
      vx: Math.cos(player.angle + offset) * 18,
      vy: Math.sin(player.pitch + offset) * 18,
      vz: Math.sin(player.angle + offset) * 18,
      damage,
      life: 120
    });
  }
}

function updateBullets() {
  for (let i = world.bullets.length - 1; i >= 0; i--) {
    const b = world.bullets[i];
    b.x += b.vx;
    b.y += b.vy;
    b.z += b.vz;
    b.life--;

    if (b.life <= 0) {
      world.bullets.splice(i, 1);
      continue;
    }

    for (let j = world.enemies.length - 1; j >= 0; j--) {
      const e = world.enemies[j];
      if (!e.alive) continue;

      const dist = Math.hypot(b.x - e.x, b.y - e.y, b.z - e.z);
      if (dist < 26) {
        e.health -= b.damage;
        world.bullets.splice(i, 1);

        if (e.health <= 0) {
          e.alive = false;
          player.score += 100;
          player.killCount++;
        }
        break;
      }
    }
  }
}

function updateEnemies() {
  for (let i = world.enemies.length - 1; i >= 0; i--) {
    const e = world.enemies[i];
    if (!e.alive) continue;

    const dx = player.x - e.x;
    const dz = player.z - e.z;
    const dist = Math.hypot(dx, dz);

    if (dist > 0.1) {
      e.x += (dx / dist) * e.speed;
      e.z += (dz / dist) * e.speed;
    }

    if (dist < 100 && Math.random() < 0.025) {
      player.health -= 8;
      if (player.health <= 0) {
        world.gameOver = true;
        showMessage("Tu as perdu !");
      }
    }

    if (e.health <= 0) e.alive = false;
  }
}

function updateZone() {
  world.zone.radius *= 0.9985;
  if (world.zone.radius < 90) world.zone.radius = 90;
}

function updateLoot() {
  world.loot.forEach((item) => {
    if (item.picked) return;
    const dist = Math.hypot(player.x - item.x, player.z - item.z);

    if (dist < 28) {
      item.picked = true;

      if (item.type === "health") {
        player.health = Math.min(player.maxHealth, player.health + 25);
      } else if (item.type === "shield") {
        player.shield = Math.min(player.maxShield, player.shield + 35);
      } else if (item.type === "ammo") {
        player.ammo.ar += 50;
        player.ammo.sniper += 6;
        player.ammo.shotgun += 10;
      }
    }
  });
}

function addChatMessage(sender, text) {
  const container = document.getElementById("chat-messages");
  const line = document.createElement("div");
  line.className = "chat-message";
  line.textContent = sender + ": " + text;
  container.appendChild(line);
  container.scrollTop = container.scrollHeight;
}

function sendMessage() {
  const input = document.getElementById("chat-box");
  const value = input.value.trim();
  if (!value) return;

  addChatMessage(currentUser ? currentUser.username : "Moi", value);
  input.value = "";
}

function showMessage(text) {
  const el = document.getElementById("game-message");
  el.textContent = text;
  el.style.display = "block";

  setTimeout(() => {
    el.style.display = "none";
  }, 1300);
}

function project3D(x, y, z) {
  const dx = x - player.x;
  const dy = y - player.y;
  const dz = z - player.z;

  const localX = dx * Math.cos(player.angle) + dz * Math.sin(player.angle);
  const localZ = -dx * Math.sin(player.angle) + dz * Math.cos(player.angle);

  if (localZ <= 0.1) return null;

  const screenX = canvas.width / 2 + (localX / localZ) * 210;
  const screenY = canvas.height / 2 - ((dy + player.pitch * 100) / localZ) * 210;

  return { x: screenX, y: screenY, z: localZ };
}

function drawWorld() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#7dd3fc");
  sky.addColorStop(1, "#dbeafe");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#65a30d";
  ctx.fillRect(0, canvas.height * 0.6, canvas.width, canvas.height * 0.4);

  const objects = [
    ...world.buildings.map((b) => ({ type: "building", obj: b, z: b.z })),
    ...world.enemies.filter((e) => e.alive).map((e) => ({ type: "enemy", obj: e, z: e.z })),
    ...world.loot.filter((l) => !l.picked).map((l) => ({ type: "loot", obj: l, z: l.z }))
  ];

  objects.sort((a, b) => b.z - a.z);

  objects.forEach((item) => {
    if (item.type === "building") {
      const b = item.obj;
      const p = project3D(b.x, b.y, b.z);
      if (!p) return;

      const size = Math.max(18, 180 / p.z);
      const w = Math.max(18, size * (b.w / 100));
      const h = Math.max(18, size * (b.h / 100));

      ctx.fillStyle = b.color;
      ctx.fillRect(p.x - w / 2, p.y - h, w, h);
    }

    if (item.type === "enemy") {
      const e = item.obj;
      const p = project3D(e.x, e.y, e.z);
      if (!p) return;

      const size = Math.max(14, 160 / p.z);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(p.x - size / 2, p.y - size, size, size * 1.5);

      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(p.x - size / 2, p.y - size - 10, size, 5);

      ctx.fillStyle = "#22c55e";
      ctx.fillRect(p.x - size / 2, p.y - size - 10, size * (e.health / e.maxHealth), 5);
    }

    if (item.type === "loot") {
      const l = item.obj;
      const p = project3D(l.x, l.y, l.z);
      if (!p) return;

      const size = Math.max(8, 120 / p.z);
      ctx.fillStyle = l.type === "health" ? "#22c55e" : l.type === "shield" ? "#38bdf8" : "#facc15";
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  world.bullets.forEach((b) => {
    const p = project3D(b.x, b.y, b.z);
    if (!p) return;
    const size = Math.max(4, 100 / p.z);
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fill();
  });

  const zoneP = project3D(world.zone.x, 0, world.zone.z);
  if (zoneP) {
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(zoneP.x, zoneP.y, world.zone.radius / 3.5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function renderScoreboard() {
  if (!currentUser) return;

  const players = [
    { name: currentUser.username, score: player.score, kills: player.killCount },
    ...world.enemies.filter((e) => e.alive).map((e, idx) => ({ name: e.name, score: 50 + idx * 10, kills: idx }))
  ];

  players.sort((a, b) => b.score - a.score);

  const board = document.getElementById("scoreboard-players");
  board.innerHTML = "";

  players.slice(0, 8).forEach((p, index) => {
    const row = document.createElement("div");
    row.className = "score-row";
    row.innerHTML = `<span>${index + 1}. ${p.name}</span><span>${p.score}</span>`;
    board.appendChild(row);
  });
}

function renderFriendsPanel() {
  if (!currentUser) return;

  const users = loadUsers();
  const currentData = users[currentUser.username] || {};
  const friends = currentData.friends || [];
  const requests = currentData.requests || [];

  const friendsList = document.getElementById("friends-list");
  const reqList = document.getElementById("friend-requests-list");
  friendsList.innerHTML = "";
  reqList.innerHTML = "";

  friends.forEach((friend) => {
    const item = document.createElement("div");
    item.className = "friend-item";
    item.innerHTML = `
      <span>${friend}</span>
      <div class="friend-actions">
        <button onclick="joinFriend('${friend}')">Rejoindre</button>
      </div>
    `;
    friendsList.appendChild(item);
  });

  requests.forEach((req) => {
    const item = document.createElement("div");
    item.className = "request-item";
    item.innerHTML = `
      <span>${req}</span>
      <button onclick="acceptRequest('${req}')">Accepter</button>
    `;
    reqList.appendChild(item);
  });
}

function addFriend() {
  if (!currentUser) return;

  const name = document.getElementById("friend-name-input").value.trim();
  if (!name) return;

  if (name === currentUser.username) {
    alert("Tu ne peux pas t'ajouter toi-même.");
    return;
  }

  const users = loadUsers();
  if (!users[name]) {
    alert("Ce joueur n'existe pas.");
    return;
  }

  const currentData = users[currentUser.username];
  if (!currentData.friends) currentData.friends = [];
  if (!currentData.friends.includes(name)) {
    currentData.friends.push(name);
    saveUsers(users);
  }

  document.getElementById("friend-name-input").value = "";
  renderFriendsPanel();
}

function joinFriend(name) {
  showMessage("Tu rejoins " + name);
  addChatMessage("Système", "Tu rejoins " + name + " dans sa partie.");
}

function acceptRequest(name) {
  if (!currentUser) return;

  const users = loadUsers();
  const currentData = users[currentUser.username];
  currentData.requests = (currentData.requests || []).filter((r) => r !== name);
  currentData.friends = [...new Set([...(currentData.friends || []), name])];
  saveUsers(users);
  renderFriendsPanel();
}

function toggleFriendsPanel() {
  document.getElementById("friends-panel").classList.toggle("hidden");
}

function loop() {
  if (inGame && !world.gameOver) {
    updatePlayer();
    updateEnemies();
    updateBullets();
    updateZone();
    updateLoot();
    updateHUD();
  }

  drawWorld();
  requestAnimationFrame(loop);
}

document.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  keys[key] = true;

  if (key === "t") document.getElementById("chat-box").focus();
  if (key === "b") document.getElementById("build-menu").classList.toggle("hidden");
  if (key === "c") document.getElementById("scoreboard").classList.toggle("hidden");
  if (key === "f") toggleFriendsPanel();

  if (key === " ") keys[" "] = true;

  if (key === "1") player.currentWeapon = "ar";
  if (key === "2") player.currentWeapon = "sniper";
  if (key === "3") player.currentWeapon = "shotgun";
});

document.addEventListener("keyup", (e) => {
  const key = e.key.toLowerCase();
  keys[key] = false;
  if (key === " ") keys[" "] = false;
});

document.addEventListener("mousemove", (e) => {
  if (!inGame) return;
  player.angle -= (e.movementX || 0) * (mouse.sensitivity * 0.01);
  player.pitch += (e.movementY || 0) * (mouse.sensitivity * 0.008);
  player.pitch = clamp(player.pitch, -1.2, 1.2);
});

document.addEventListener("mousedown", (e) => {
  if (e.button === 0 && inGame) shoot();
});

document.addEventListener("click", () => {
  canvas.requestPointerLock?.();
});

document.getElementById("mouse-sensitivity").addEventListener("input", (e) => {
  mouse.sensitivity = Number(e.target.value);
});

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

document.getElementById("loading").style.display = "none";
showSkinSelection();
renderSkinSelection();
renderFriendsPanel();
