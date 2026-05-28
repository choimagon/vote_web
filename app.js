const STORAGE_KEY = "vote-web-state";
const MAX_CANDIDATES = 30;

const defaultCandidates = [
  { number: 1, title: getDefaultTitle(1), votes: 0 },
  { number: 2, title: getDefaultTitle(2), votes: 0 },
  { number: 3, title: getDefaultTitle(3), votes: 0 },
];

const state = loadState();

const setupView = document.querySelector("#setupView");
const voteView = document.querySelector("#voteView");
const resultView = document.querySelector("#resultView");
const setupForm = document.querySelector("#setupForm");
const candidateCount = document.querySelector("#candidateCount");
const candidateFields = document.querySelector("#candidateFields");
const decreaseBtn = document.querySelector("#decreaseBtn");
const increaseBtn = document.querySelector("#increaseBtn");
const resultBtn = document.querySelector("#resultBtn");
const voteAgainTopBtn = document.querySelector("#voteAgainTopBtn");
const resetBtn = document.querySelector("#resetBtn");
const voteReady = document.querySelector("#voteReady");
const voteCards = document.querySelector("#voteCards");
const completeView = document.querySelector("#completeView");
const nextVoterBtn = document.querySelector("#nextVoterBtn");
const winnerPanel = document.querySelector("#winnerPanel");
const detailResultsBtn = document.querySelector("#detailResultsBtn");
const resultDetails = document.querySelector("#resultDetails");
const resultList = document.querySelector("#resultList");
const totalVotes = document.querySelector("#totalVotes");
const confettiLayer = document.querySelector("#confettiLayer");
const toast = document.querySelector("#toast");

let isShowingCompletion = false;
let isShowingResultDetails = false;
let hasPlayedResultConfetti = false;
let completionTimer = null;
let toastTimer = null;

render();

setupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const candidates = readCandidateFields();

  state.candidates = candidates;
  state.started = true;
  state.view = "vote";
  hideCompletion();
  saveState();
  render();
});

candidateCount.addEventListener("input", () => {
  const nextCount = clampCount(candidateCount.value);
  candidateCount.value = nextCount;
  syncCandidateFieldCount(nextCount);
});

decreaseBtn.addEventListener("click", () => {
  const nextCount = clampCount(Number(candidateCount.value) - 1);
  candidateCount.value = nextCount;
  syncCandidateFieldCount(nextCount);
});

increaseBtn.addEventListener("click", () => {
  const nextCount = clampCount(Number(candidateCount.value) + 1);
  candidateCount.value = nextCount;
  syncCandidateFieldCount(nextCount);
});

resultBtn.addEventListener("click", () => {
  hideCompletion();
  isShowingResultDetails = false;
  hasPlayedResultConfetti = false;
  state.view = "result";
  saveState();
  render();
});

voteAgainTopBtn.addEventListener("click", () => {
  restartVoteRound();
});

resetBtn.addEventListener("click", () => {
  const shouldReset = window.confirm("투표 설정과 결과를 모두 리셋할까요?");

  if (!shouldReset) {
    return;
  }

  state.started = false;
  state.view = "setup";
  state.candidates = cloneDefaultCandidates();
  hideCompletion();
  isShowingResultDetails = false;
  hasPlayedResultConfetti = false;
  saveState();
  render();
  showToast("리셋되었습니다.");
});

nextVoterBtn.addEventListener("click", () => {
  hideCompletion();
  renderVoteView();
});

detailResultsBtn.addEventListener("click", () => {
  isShowingResultDetails = true;
  renderResultView();
  resultDetails.scrollIntoView({ behavior: "smooth", block: "start" });
});

function render() {
  const isStarted = state.started;

  setupView.hidden = isStarted;
  voteView.hidden = !isStarted || state.view !== "vote";
  resultView.hidden = !isStarted || state.view !== "result";
  resultBtn.hidden = !isStarted || state.view === "result";
  voteAgainTopBtn.hidden = !isStarted || state.view === "vote";
  resetBtn.hidden = !isStarted;

  if (!isStarted) {
    renderSetupView();
    return;
  }

  if (state.view === "result") {
    renderResultView();
    return;
  }

  renderVoteView();
}

function renderSetupView() {
  candidateCount.value = state.candidates.length;
  candidateFields.innerHTML = "";

  state.candidates.forEach((candidate) => {
    candidateFields.append(createCandidateField(candidate.number, candidate.title));
  });
}

function renderVoteView() {
  voteReady.hidden = isShowingCompletion;
  completeView.hidden = !isShowingCompletion;

  if (isShowingCompletion) {
    return;
  }

  voteCards.innerHTML = "";

  state.candidates.forEach((candidate) => {
    const card = document.createElement("button");
    card.className = "vote-card";
    card.type = "button";
    card.dataset.number = String(candidate.number);

    const number = document.createElement("span");
    number.className = "number";
    number.textContent = String(candidate.number);

    const title = document.createElement("span");
    title.className = "title";
    title.textContent = candidate.title;

    card.append(number, title);
    card.addEventListener("click", () => {
      submitVote(candidate.number);
    });

    voteCards.append(card);
  });
}

function renderResultView() {
  const total = state.candidates.reduce((sum, candidate) => sum + candidate.votes, 0);
  totalVotes.textContent = total.toLocaleString("ko-KR");
  resultList.innerHTML = "";
  resultDetails.hidden = !isShowingResultDetails;
  detailResultsBtn.hidden = isShowingResultDetails;

  const sortedCandidates = [...state.candidates].sort((a, b) => {
    if (b.votes !== a.votes) {
      return b.votes - a.votes;
    }

    return a.number - b.number;
  });

  renderWinnerPanel(total, sortedCandidates);

  if (total > 0 && !hasPlayedResultConfetti) {
    hasPlayedResultConfetti = true;
    launchConfetti();
  }

  sortedCandidates.forEach((candidate) => {
    const percent = total === 0 ? 0 : Math.round((candidate.votes / total) * 1000) / 10;
    const item = document.createElement("article");
    item.className = "result-item";

    const number = document.createElement("div");
    number.className = "result-number";
    number.textContent = `${candidate.number}`;

    const detail = document.createElement("div");

    const title = document.createElement("strong");
    title.className = "result-title";
    title.textContent = `${candidate.number}번 ${candidate.title}`;

    const bar = document.createElement("div");
    bar.className = "result-bar";

    const fill = document.createElement("div");
    fill.className = "result-fill";
    fill.style.width = `${percent}%`;

    bar.append(fill);
    detail.append(title, bar);

    const count = document.createElement("div");
    count.className = "result-count";
    count.innerHTML = `${candidate.votes.toLocaleString("ko-KR")}표 <span>${percent}%</span>`;

    item.append(number, detail, count);
    resultList.append(item);
  });
}

function submitVote(candidateNumber) {
  if (isShowingCompletion) {
    return;
  }

  const selected = state.candidates.find((candidate) => candidate.number === candidateNumber);

  if (!selected) {
    return;
  }

  selected.votes += 1;
  saveState();
  showCompletion();
}

function showCompletion() {
  isShowingCompletion = true;
  renderVoteView();
  window.clearTimeout(completionTimer);
  completionTimer = window.setTimeout(() => {
    hideCompletion();
    renderVoteView();
  }, 2200);
}

function hideCompletion() {
  isShowingCompletion = false;
  window.clearTimeout(completionTimer);
  completionTimer = null;
}

function renderWinnerPanel(total, sortedCandidates) {
  winnerPanel.innerHTML = "";

  const label = document.createElement("p");
  label.className = "winner-label";
  label.textContent = "당첨자";

  const number = document.createElement("div");
  number.className = "winner-number";

  const title = document.createElement("strong");
  title.className = "winner-title";

  const detail = document.createElement("span");
  detail.className = "winner-detail";

  if (total === 0) {
    number.textContent = "-";
    title.textContent = "아직 투표가 없습니다";
    detail.textContent = "투표 후 결과를 확인하세요.";
    winnerPanel.append(label, number, title, detail);
    return;
  }

  const topVotes = sortedCandidates[0].votes;
  const winners = sortedCandidates.filter((candidate) => candidate.votes === topVotes);
  const percent = Math.round((topVotes / total) * 1000) / 10;

  if (winners.length === 1) {
    const winner = winners[0];
    number.textContent = `${winner.number}번`;
    title.textContent = winner.title;
    detail.textContent = `${topVotes.toLocaleString("ko-KR")}표, ${percent}%`;
  } else {
    number.textContent = winners.map((winner) => `${winner.number}번`).join(" / ");
    title.textContent = winners
      .map((winner) => winner.title)
      .join(" / ");
    detail.textContent = `공동 당첨, ${topVotes.toLocaleString("ko-KR")}표씩`;
  }

  winnerPanel.append(label, number, title, detail);
}

function restartVoteRound() {
  hideCompletion();
  isShowingResultDetails = false;
  hasPlayedResultConfetti = false;
  state.candidates = state.candidates.map((candidate) => ({
    ...candidate,
    votes: 0,
  }));
  state.view = "vote";
  saveState();
  render();
  showToast("같은 기호로 새 투표를 시작합니다.");
}

function launchConfetti() {
  confettiLayer.innerHTML = "";

  const colors = ["#d84f35", "#256d85", "#2f8f65", "#f1b84b", "#8d63d2", "#ff7aa2"];
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < 120; index += 1) {
    const piece = document.createElement("span");
    const shape = index % 4 === 0 ? "circle" : index % 5 === 0 ? "ribbon" : "paper";
    const startX = index % 2 === 0 ? 22 : 78;
    piece.className = `confetti-piece is-${shape}`;
    piece.style.background = colors[index % colors.length];
    piece.style.setProperty("--start-x", `${startX + (Math.random() * 16 - 8)}vw`);
    piece.style.setProperty("--burst-x", `${Math.random() * 90 - 45}vw`);
    piece.style.setProperty("--burst-y", `${-(Math.random() * 44 + 28)}vh`);
    piece.style.setProperty("--fall-x", `${Math.random() * 120 - 60}vw`);
    piece.style.setProperty("--spin", `${Math.random() * 1080 - 540}deg`);
    piece.style.setProperty("--size", `${Math.random() * 9 + 7}px`);
    piece.style.animationDelay = `${Math.random() * 0.28}s`;
    piece.style.animationDuration = `${Math.random() * 1.1 + 3.2}s`;
    fragment.append(piece);
  }

  for (let index = 0; index < 12; index += 1) {
    const balloon = document.createElement("span");
    balloon.className = "party-balloon";
    balloon.style.background = colors[(index + 2) % colors.length];
    balloon.style.left = `${Math.random() * 86 + 7}%`;
    balloon.style.setProperty("--float-x", `${Math.random() * 120 - 60}px`);
    balloon.style.animationDelay = `${Math.random() * 0.75}s`;
    balloon.style.animationDuration = `${Math.random() * 1.3 + 4.2}s`;
    fragment.append(balloon);
  }

  for (let index = 0; index < 2; index += 1) {
    const burst = document.createElement("span");
    burst.className = `party-burst ${index === 0 ? "is-left" : "is-right"}`;
    fragment.append(burst);
  }

  confettiLayer.append(fragment);

  window.setTimeout(() => {
    confettiLayer.innerHTML = "";
  }, 5200);
}

function readCandidateFields() {
  const inputs = [...candidateFields.querySelectorAll("input")];

  return inputs.map((input, index) => ({
    number: index + 1,
    title: input.value.trim() || getDefaultTitle(index + 1),
    votes: 0,
  }));
}

function syncCandidateFieldCount(nextCount) {
  const existing = [...candidateFields.querySelectorAll("input")].map((input) => input.value);
  candidateFields.innerHTML = "";

  for (let index = 0; index < nextCount; index += 1) {
    const number = index + 1;
    const title = existing[index] || getDefaultTitle(number);
    candidateFields.append(createCandidateField(number, title));
  }
}

function createCandidateField(number, title) {
  const row = document.createElement("div");
  row.className = "candidate-row";

  const numberCell = document.createElement("div");
  numberCell.className = "candidate-number";
  numberCell.textContent = `${number}번`;

  const input = document.createElement("input");
  input.type = "text";
  input.value = isDefaultTitle(title, number) ? "" : title;
  input.placeholder = getDefaultTitle(number);
  input.autocomplete = "off";

  row.append(numberCell, input);
  return row;
}

function loadState() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));

    if (saved?.candidates?.length) {
      return {
        started: Boolean(saved.started),
        view: saved.view === "result" ? "result" : saved.started ? "vote" : "setup",
        candidates: saved.candidates.map((candidate, index) => {
          const number = index + 1;
          const title = String(candidate.title || getDefaultTitle(number));

          return {
            number,
            title: isDefaultTitle(title, number) ? getDefaultTitle(number) : title,
            votes: Number(candidate.votes || 0),
          };
        }),
      };
    }
  } catch {
    removeSavedState();
  }

  return {
    started: false,
    view: "setup",
    candidates: cloneDefaultCandidates(),
  };
}

function cloneDefaultCandidates() {
  return defaultCandidates.map((candidate) => ({ ...candidate }));
}

function getDefaultTitle(number) {
  return `기호 ${number}`;
}

function isDefaultTitle(title, number) {
  return title === getDefaultTitle(number) || title === `후보 또는 항목 ${number}` || title === `항목 ${number}`;
}

function saveState() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    showToast("브라우저 저장소를 사용할 수 없어 현재 화면에서만 유지됩니다.");
  }
}

function removeSavedState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable in some restricted browser contexts.
  }
}

function clampCount(value) {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    return 1;
  }

  return Math.min(MAX_CANDIDATES, Math.max(1, parsed));
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");

  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 1800);
}
