// ---------------- shared state helpers ----------------
function getPlayer() {
  return {
    name: localStorage.getItem("playerName") || "Player",
    grade: localStorage.getItem("playerGrade") || "6"
  };
}

function goHome() {
  window.location.href = "index.html";
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

function loadProgress() {
  return JSON.parse(localStorage.getItem("progress") || "{}");
}
function saveProgress(p) {
  localStorage.setItem("progress", JSON.stringify(p));
}

// ---------------- timer + scaling helpers ----------------
let puzzleStartTs = null;
let timerInterval = null;
let elapsedSec = 0;
let wrongAttempts = 0;

function gradeTargets(grade) {
  return grade === "1"
    ? { targetSec: 60 }
    : { targetSec: 120 };
}

function loadSkill() {
  return JSON.parse(localStorage.getItem("skill") || "{}");
}
function saveSkill(s) {
  localStorage.setItem("skill", JSON.stringify(s));
}

function getTopicLevel(grade, topicId) {
  const skill = loadSkill();
  skill[grade] = skill[grade] || {};
  skill[grade][topicId] = skill[grade][topicId] || { level: 1, streakUp: 0 };
  saveSkill(skill);
  return skill[grade][topicId];
}

function updateTopicLevel(grade, topicId, result) {
  // result: {timeSec, hintsUsed, wrongAttempts}
  const skill = loadSkill();
  skill[grade] = skill[grade] || {};
  const entry = skill[grade][topicId] || { level: 1, streakUp: 0 };

  const { targetSec } = gradeTargets(grade);

  const fastEnough = result.timeSec <= targetSec;
  const lowHints = result.hintsUsed <= 1;
  const lowWrong = result.wrongAttempts <= 1;

  const tooSlow = result.timeSec >= targetSec * 2;
  const maxHints = result.hintsUsed >= 3;
  const manyWrong = result.wrongAttempts >= 3;

  // Level up logic (needs 2-in-a-row good solves)
  if (fastEnough && lowHints && lowWrong) {
    entry.streakUp = (entry.streakUp || 0) + 1;
    if (entry.streakUp >= 2 && entry.level < 3) {
      entry.level += 1;
      entry.streakUp = 0;
    }
  } else {
    entry.streakUp = 0;
  }

  // Level down logic
  if ((tooSlow || maxHints || manyWrong) && entry.level > 1) {
    entry.level -= 1;
    entry.streakUp = 0;
  }

  skill[grade][topicId] = entry;
  saveSkill(skill);
}

function recordPuzzleStat(grade, topicId, puzzleId, stat) {
  const progress = loadProgress();
  progress.stats = progress.stats || {};
  progress.stats[grade] = progress.stats[grade] || {};
  progress.stats[grade][topicId] = progress.stats[grade][topicId] || {};
  progress.stats[grade][topicId][puzzleId] = stat;
  saveProgress(progress);
}

// ---------------- topic banks ----------------
const TOPICS = {
  "6": [
    { id: "numbers", name: "Number Sense", tag: "Quick Wins", desc: "Primes, factors, LCM/HCF, patterns, BODMAS." },
    { id: "fractions", name: "Fractions & Decimals", tag: "Everyday Math", desc: "Add/subtract, compare, real-life problems." },
    { id: "geometry", name: "Geometry Lab", tag: "Visual", desc: "Angles, triangles, area & perimeter, coordinate grid." },
    { id: "logic", name: "Logic Puzzles", tag: "Brain Boost", desc: "Strategy, elimination, spatial reasoning." }
  ],
  "1": [
    { id: "counting", name: "Counting & Numbers", tag: "Play Time", desc: "Count, compare, before/after, tens & ones." },
    { id: "addition", name: "Addition Fun", tag: "Stories", desc: "Add with pictures, number lines, make 10." },
    { id: "subtraction", name: "Subtraction Fun", tag: "Stories", desc: "Take away puzzles, missing numbers." },
    { id: "shapes", name: "Shapes & Space", tag: "Visual", desc: "2D/3D shapes, match & sort games." }
  ]
};

// ---------------- puzzle bank ----------------
// You can add more puzzles anytime. Keep same structure.
const PUZZLES = {
  "6": {
    numbers: [
      {
        id: "6-n-1",
        type: "mcq",
        title: "Prime Detective",
        question: "Which of these numbers is prime?",
        options: ["21", "27", "29", "33"],
        answer: "29",
        hints: [
          "A prime has exactly two factors: 1 and itself.",
          "Try dividing by 2, 3, 5.",
          "29 is not divisible by 2, 3, or 5."
        ],
        explain: "29 has only two factors: 1 and 29."
      },
      {
        id: "6-n-2",
        type: "numeric",
        title: "LCM Sprint",
        question: "Find the LCM of 6 and 8.",
        answer: 24,
        tolerance: 0,
        hints: [
          "List multiples of 6: 6, 12, 18, 24...",
          "List multiples of 8: 8, 16, 24...",
          "The first common multiple is your LCM."
        ],
        explain: "LCM(6,8)=24 because 24 is the smallest number divisible by both."
      },
      {
        id: "6-n-3",
        type: "dragdrop",
        title: "Factor Match",
        question: "Drag each number to its correct factor pair.",
        leftLabel: "Number",
        rightLabel: "Factor Pair",
        pairs: [
          ["15", "3 × 5"],
          ["16", "4 × 4"],
          ["21", "3 × 7"]
        ],
        hints: [
          "A factor pair multiplies to the number.",
          "Try quick multiplication.",
          "Check if both factors divide evenly."
        ],
        explain: "15=3×5, 16=4×4, 21=3×7."
      }
    ],
    fractions: [
      {
        id: "6-f-1",
        type: "mcq",
        title: "Fraction Ninja",
        question: "Which fraction is equivalent to 3/4?",
        options: ["6/8", "9/10", "12/18", "3/5"],
        answer: "6/8",
        hints: [
          "Equivalent fractions are made by multiplying top and bottom by same number.",
          "3/4 × 2/2 = 6/8.",
          "Check all options that reduce to 3/4."
        ],
        explain: "6/8 reduces to 3/4."
      },
      {
        id: "6-f-2",
        type: "numeric",
        title: "Decimal Dash",
        question: "Convert 1/5 into a decimal.",
        answer: 0.2,
        tolerance: 0.0001,
        hints: [
          "1÷5 = ?",
          "5 goes into 10 two times.",
          "So 1/5 = 0.2."
        ],
        explain: "1 ÷ 5 = 0.2."
      }
    ],
    geometry: [
      {
        id: "6-g-1",
        type: "mcq",
        title: "Angle Hunter",
        question: "A triangle has angles 50° and 60°. What is the third angle?",
        options: ["70°", "80°", "90°", "100°"],
        answer: "70°",
        hints: [
          "Sum of angles in triangle = 180°.",
          "Add known angles: 50 + 60 = 110.",
          "180 - 110 = 70."
        ],
        explain: "Third angle = 180 − (50+60)=70°."
      },
      {
        id: "6-g-2",
        type: "dragdrop",
        title: "Shape Sort",
        question: "Match each shape to its property.",
        leftLabel: "Shape",
        rightLabel: "Property",
        pairs: [
          ["Square", "4 equal sides"],
          ["Rectangle", "Opposite sides equal"],
          ["Triangle", "3 sides"]
        ],
        hints: [
          "Think about sides and angles.",
          "Square has all sides same.",
          "Triangle always has 3 sides."
        ],
        explain: "Square: 4 equal sides; Rectangle: opposite sides equal; Triangle: 3 sides."
      }
    ],
    logic: [
      {
        id: "6-l-1",
        type: "numeric",
        title: "Fast Pattern",
        question: "What comes next? 2, 5, 11, 23, __",
        answer: 47,
        tolerance: 0,
        hints: [
          "Look at what is added each time.",
          "Differences: +3, +6, +12...",
          "Differences are doubling."
        ],
        explain: "Differences double: 3,6,12,24 → 23+24=47."
      }
    ]
  },

  "1": {
    counting: [
      {
        id: "1-c-1",
        type: "mcq",
        title: "Count the Stars",
        question: "How many stars are there? ⭐⭐⭐⭐⭐⭐",
        options: ["4", "5", "6", "7"],
        answer: "6",
        hints: ["Count slowly.", "Point to each star.", "There are 6 stars."],
        explain: "We count 1 2 3 4 5 6."
      },
      {
        id: "1-c-2",
        type: "numeric",
        title: "Before / After",
        question: "What number comes after 19?",
        answer: 20,
        tolerance: 0,
        hints: ["Count forward.", "19 then next is 20."],
        explain: "After 19 is 20."
      }
    ],
    addition: [
      {
        id: "1-a-1",
        type: "mcq",
        title: "Fruit Add",
        question: "You have 3 apples 🍎🍎🍎 and get 2 more 🍎🍎. How many apples now?",
        options: ["4", "5", "6", "7"],
        answer: "5",
        hints: ["3 + 2 = ?", "Count all apples."],
        explain: "3 + 2 = 5."
      },
      {
        id: "1-a-2",
        type: "dragdrop",
        title: "Make 10 Match",
        question: "Drag to make pairs that add to 10.",
        leftLabel: "Number",
        rightLabel: "Goes with",
        pairs: [
          ["6", "4"],
          ["7", "3"],
          ["5", "5"]
        ],
        hints: ["10 is the target.", "Try pairs you know."],
        explain: "6+4, 7+3, 5+5 all make 10."
      }
    ],
    subtraction: [
      {
        id: "1-s-1",
        type: "numeric",
        title: "Balloon Pop",
        question: "There are 9 balloons. 3 pop. How many left?",
        answer: 6,
        tolerance: 0,
        hints: ["9 - 3 = ?", "Count backwards 3 steps."],
        explain: "9 - 3 = 6."
      }
    ],
    shapes: [
      {
        id: "1-sh-1",
        type: "mcq",
        title: "Shape Finder",
        question: "Which one is a triangle?",
        options: ["⬜ Square", "🔺 Triangle", "⚪ Circle", "⬛ Rectangle"],
        answer: "🔺 Triangle",
        hints: ["Triangle has 3 sides.", "Look for 3 corners."],
        explain: "Triangle has 3 sides."
      },
      {
        id: "1-sh-2",
        type: "dragdrop",
        title: "Corners Match",
        question: "Match the shape to how many corners it has.",
        leftLabel: "Shape",
        rightLabel: "Corners",
        pairs: [
          ["Circle", "0"],
          ["Triangle", "3"],
          ["Square", "4"]
        ],
        hints: ["Corners are sharp points.", "Circle has none."],
        explain: "Circle 0, Triangle 3, Square 4."
      }
    ]
  }
};

// ---------------- daily quest selection ----------------
// deterministic daily selection: same puzzles each day per player+topic
function pickDailyPuzzles(grade, topicId) {
  const list = (PUZZLES[grade] && PUZZLES[grade][topicId]) || [];
  if (list.length === 0) return [];

  const { level } = getTopicLevel(grade, topicId);

  // Filter by difficulty (fallback to easy if none match)
  let eligible = list.filter(p => (p.difficulty || 1) === level);
  if (eligible.length < 3) {
    eligible = eligible.concat(list.filter(p => (p.difficulty || 1) === Math.max(1, level - 1)));
  }
  if (eligible.length < 3) eligible = list; // last resort

  if (eligible.length <= 3) return eligible;

  const seedStr = `${todayKey()}|${grade}|${topicId}|L${level}`;
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;

  const picked = [];
  const usedIdx = new Set();
  while (picked.length < 3) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const idx = seed % eligible.length;
    if (!usedIdx.has(idx)) {
      usedIdx.add(idx);
      picked.push(eligible[idx]);
    }
  }
  return picked;
}

// ---------------- rendering: header/topics/progress ----------------
function renderHeader() {
  const { name, grade } = getPlayer();
  const header = document.querySelector("#appHeader");

  header.innerHTML = `
    <div class="brand">
      <div class="logo">🎯</div>
      <div>
        <div class="title">Math Puzzle Quest</div>
        <div class="subtitle">Hi ${name}! Grade ${grade} mode</div>
      </div>
    </div>
    <div class="header-actions">
      <button class="btn ghost" id="switchBtn">Switch Player</button>
      <button class="btn" id="resetBtn">Reset Progress</button>
    </div>
  `;

  document.querySelector("#switchBtn").onclick = goHome;
  document.querySelector("#resetBtn").onclick = () => {
    localStorage.removeItem("progress");
    alert("Progress reset!");
    renderProgress();
  };
}

function renderTopics() {
  const { grade } = getPlayer();
  const topics = TOPICS[grade] || [];
  const grid = document.querySelector("#topicsGrid");

  grid.innerHTML = topics.map(t => `
    <div class="card" data-topic="${t.id}">
      <div class="tag">${t.tag}</div>
      <div class="name">${t.name}</div>
      <div class="desc">${t.desc}</div>
    </div>
  `).join("");

  grid.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", () => openTopic(card.dataset.topic));
  });
}

function renderProgress() {
  const progress = loadProgress();
  const done = progress.doneCount || 0;
  const total = 30;
  const pct = Math.min(100, Math.round((done / total) * 100));

  document.querySelector("#progressText").textContent =
    `${done} puzzles solved this month`;

  document.querySelector("#progressBarFill").style.width = pct + "%";
}

// ---------------- puzzle engine ----------------
let currentTopicId = null;
let currentDailyList = [];
let currentIndex = 0;
let currentHintCount = 0;

function openTopic(topicId) {
  const { grade } = getPlayer();
  currentTopicId = topicId;
  currentDailyList = pickDailyPuzzles(grade, topicId);
  currentIndex = 0;
  renderDailyQuest();
}

function renderDailyQuest() {
  const panel = document.querySelector("#puzzlePanel");
  const topicName = (TOPICS[getPlayer().grade] || []).find(t => t.id === currentTopicId)?.name || currentTopicId;

  panel.innerHTML = `
    <h2>Today’s Quest • ${topicName}</h2>
    <p class="sub">Solve ${currentDailyList.length} puzzles. Use hints if stuck. You got this 💪</p>
    <div id="puzzleContainer"></div>
    <div class="progress-row" style="margin-top:10px;">
      <div class="sub">Puzzle ${currentIndex + 1} / ${currentDailyList.length}</div>
      <div class="progress"><div id="questFill"></div></div>
    </div>
  `;

  renderPuzzle();
  updateQuestProgress();
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function updateQuestProgress() {
  const pct = Math.round(((currentIndex) / currentDailyList.length) * 100);
  const fill = document.querySelector("#questFill");
  if (fill) fill.style.width = pct + "%";
}

function renderPuzzle() {
  const puzzle = currentDailyList[currentIndex];
  const box = document.querySelector("#puzzleContainer");
  currentHintCount = 0;

  if (!puzzle) {
    box.innerHTML = renderQuestComplete();
    return;
  }

  let bodyHtml = "";
  if (puzzle.type === "mcq") bodyHtml = renderMCQ(puzzle);
  if (puzzle.type === "numeric") bodyHtml = renderNumeric(puzzle);
  if (puzzle.type === "dragdrop") bodyHtml = renderDragDrop(puzzle);

  const { grade } = getPlayer();
  const levelInfo = getTopicLevel(grade, currentTopicId);
  
  box.innerHTML = `
    <div class="puzzle-box">
      <div class="puzzle-toprow">
        <div>
          <div class="puzzle-title">${puzzle.title}</div>
          <div class="sub">Difficulty: Level ${levelInfo.level}</div>
        </div>
        <div class="timer-chip" id="timerChip">⏱️ 0s</div>
      </div>
      <div class="puzzle-question">${puzzle.question}</div>

       ${bodyHtml}

      <div class="answer-row" style="margin-top:8px;">
        <button class="btn" id="hintBtn">Hint (${puzzle.hints?.length || 0})</button>
        <button class="btn ghost" id="explainBtn">Explain</button>
        <button class="btn primary" id="nextBtn" disabled>Next</button>
      </div>

      <div id="hintArea" class="sub"></div>
      <div id="explainArea" class="sub" style="display:none;"></div>
    </div>
  `;

  wirePuzzleHandlers(puzzle);
  startTimer();
  wrongAttempts = 0;
}

function startTimer() {
  stopTimer();
  puzzleStartTs = Date.now();
  elapsedSec = 0;
  const chip = document.querySelector("#timerChip");
  if (chip) chip.textContent = "⏱️ 0s";

  timerInterval = setInterval(() => {
    elapsedSec = Math.floor((Date.now() - puzzleStartTs) / 1000);
    const chipNow = document.querySelector("#timerChip");
    if (chipNow) chipNow.textContent = `⏱️ ${elapsedSec}s`;
  }, 500);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function wirePuzzleHandlers(puzzle) {
  const nextBtn = document.querySelector("#nextBtn");
  const hintBtn = document.querySelector("#hintBtn");
  const explainBtn = document.querySelector("#explainBtn");
  const hintArea = document.querySelector("#hintArea");
  const explainArea = document.querySelector("#explainArea");

  hintBtn.onclick = () => {
    if (!puzzle.hints || currentHintCount >= puzzle.hints.length) {
      hintArea.textContent = "No more hints 🙂";
      return;
    }
    hintArea.textContent = puzzle.hints[currentHintCount];
    currentHintCount++;
  };

  explainBtn.onclick = () => {
    explainArea.style.display = "block";
    explainArea.innerHTML = `<b>Explanation:</b> ${puzzle.explain || "Nice work!"}`;
  };

  // Each type sets up its own "check" and enables Next when solved.
  if (puzzle.type === "mcq") {
    document.querySelectorAll("input[name='mcq']").forEach(r => {
      r.addEventListener("change", () => {
        const picked = document.querySelector("input[name='mcq']:checked")?.value;
        const ok = picked === puzzle.answer;
        showFeedback(ok);
        if (ok) markSolved(puzzle.id, nextBtn);
      });
    });
  }

  if (puzzle.type === "numeric") {
    const input = document.querySelector("#numInput");
    const checkBtn = document.querySelector("#numCheckBtn");
    checkBtn.onclick = () => {
      const val = parseFloat(input.value);
      const ans = puzzle.answer;
      const tol = puzzle.tolerance ?? 0;
      const ok = Math.abs(val - ans) <= tol;
      showFeedback(ok);
      if (ok) markSolved(puzzle.id, nextBtn);
    };
  }

  if (puzzle.type === "dragdrop") {
    setupDragDrop(puzzle, nextBtn);
  }

  nextBtn.onclick = () => {
    currentIndex++;
    renderPuzzle();
    updateQuestProgress();
  };
}

function showFeedback(ok) {
  const fb = document.querySelector("#feedback");
  if (!fb) return;
  fb.className = "feedback " + (ok ? "ok" : "no");
  fb.textContent = ok ? "✅ Correct! Nice!" : "❌ Try again.";

  if (!ok) wrongAttempts++;
}

// -------- renderers per type --------
function renderMCQ(p) {
  return `
    <div class="answer-row mcq">
      ${p.options.map((opt, i) => `
        <label class="mcq-opt">
          <input type="radio" name="mcq" value="${opt}">
          <span>${opt}</span>
        </label>
      `).join("")}
    </div>
    <div id="feedback" class="feedback"></div>
  `;
}

function renderNumeric(p) {
  return `
    <div class="answer-row">
      <input class="answer" id="numInput" type="number" step="any" placeholder="Type your answer">
      <button class="btn" id="numCheckBtn">Check</button>
    </div>
    <div id="feedback" class="feedback"></div>
  `;
}

function renderDragDrop(p) {
  // Left items draggable, right items droppable
  const left = p.pairs.map(x => x[0]);
  const right = p.pairs.map(x => x[1]);

  // shuffle right for fun
  const shuffledRight = [...right].sort(() => Math.random() - 0.5);

  return `
    <div class="dd-grid">
      <div class="dd-col">
        <div class="dd-head">${p.leftLabel || "Left"}</div>
        ${left.map(item => `
          <div class="dd-item" draggable="true" data-dd="${item}">${item}</div>
        `).join("")}
      </div>

      <div class="dd-col">
        <div class="dd-head">${p.rightLabel || "Right"}</div>
        ${shuffledRight.map(slot => `
          <div class="dd-slot" data-slot="${slot}">
            <div class="dd-slot-label">${slot}</div>
            <div class="dd-dropzone" data-drop="${slot}">Drop here</div>
          </div>
        `).join("")}
      </div>
    </div>

    <div class="answer-row" style="margin-top:8px;">
      <button class="btn" id="ddCheckBtn">Check Matches</button>
    </div>
    <div id="feedback" class="feedback"></div>
  `;
}

// -------- dragdrop logic --------
function setupDragDrop(puzzle, nextBtn) {
  const dragItems = document.querySelectorAll(".dd-item");
  const dropzones = document.querySelectorAll(".dd-dropzone");
  const checkBtn = document.querySelector("#ddCheckBtn");
  const correctMap = Object.fromEntries(puzzle.pairs); // left -> right

  let draggedValue = null;

  dragItems.forEach(it => {
    it.addEventListener("dragstart", e => {
      draggedValue = it.dataset.dd;
      it.classList.add("dragging");
      e.dataTransfer.setData("text/plain", draggedValue);
    });
    it.addEventListener("dragend", () => it.classList.remove("dragging"));
  });

  dropzones.forEach(zone => {
    zone.addEventListener("dragover", e => {
      e.preventDefault();
      zone.classList.add("over");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("over"));
    zone.addEventListener("drop", e => {
      e.preventDefault();
      zone.classList.remove("over");
      const val = e.dataTransfer.getData("text/plain") || draggedValue;
      if (!val) return;

      // prevent duplicates: remove val from any other zone
      dropzones.forEach(z => {
        if (z.dataset.chosen === val) {
          z.dataset.chosen = "";
          z.textContent = "Drop here";
        }
      });

      zone.dataset.chosen = val;
      zone.textContent = val;
    });
  });

  checkBtn.onclick = () => {
    let okAll = true;
    dropzones.forEach(zone => {
      const right = zone.dataset.drop;
      const leftChosen = zone.dataset.chosen;
      if (!leftChosen || correctMap[leftChosen] !== right) okAll = false;
    });

    showFeedback(okAll);
    if (okAll) markSolved(puzzle.id, nextBtn);
  };
}

// -------- solved/progress/streak --------
function markSolved(puzzleId, nextBtn) {
  const progress = loadProgress();
  const day = todayKey();

  progress.solved = progress.solved || {};
  progress.solved[day] = progress.solved[day] || {};

  if (!progress.solved[day][puzzleId]) {
    progress.solved[day][puzzleId] = true;
    progress.doneCount = (progress.doneCount || 0) + 1;
  }

  saveProgress(progress);
  renderProgress();
  
  // stop timer and collect results
  stopTimer();
  const { grade } = getPlayer();
  const hintsUsed = currentHintCount; // from your hint system
  
  const stat = {
    timeSec: elapsedSec,
    hintsUsed,
    wrongAttempts,
    solvedAt: Date.now()
  };
  
  recordPuzzleStat(grade, currentTopicId, puzzleId, stat);
  updateTopicLevel(grade, currentTopicId, stat);
  
  nextBtn.disabled = false;
  updateQuestProgress();
}

function renderQuestComplete() {
  return `
    <div class="puzzle-box">
      <div class="puzzle-title">🎉 Quest Complete!</div>
      <div class="puzzle-question">
        You finished today’s puzzles for this topic.  
        Come back tomorrow for new ones!
      </div>
      <div class="answer-row">
        <button class="btn primary" onclick="goHome()">Switch Player / Topic</button>
      </div>
    </div>
  `;
}

// ---------------- boot ----------------
function initGradePage() {
  renderHeader();
  renderTopics();
  renderProgress();
}

document.addEventListener("DOMContentLoaded", initGradePage);

