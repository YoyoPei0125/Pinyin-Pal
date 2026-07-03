import { modules } from "./lessons.js";
import { classifyAttempt, toneMarksToNumbers } from "../utils/pinyin.js";

const state = {
  moduleIndex: 0,
  itemIndex: 0,
  mediaRecorder: null,
  audioChunks: [],
  audioUrl: null
};

const elements = {
  sessionId: document.querySelector("#sessionId"),
  learnerLanguage: document.querySelector("#learnerLanguage"),
  moduleList: document.querySelector("#moduleList"),
  moduleName: document.querySelector("#moduleName"),
  targetDisplay: document.querySelector("#targetDisplay"),
  targetHanzi: document.querySelector("#targetHanzi"),
  targetExplanation: document.querySelector("#targetExplanation"),
  speakButton: document.querySelector("#speakButton"),
  attemptForm: document.querySelector("#attemptForm"),
  attemptInput: document.querySelector("#attemptInput"),
  nextButton: document.querySelector("#nextButton"),
  feedback: document.querySelector("#feedback"),
  recordButton: document.querySelector("#recordButton"),
  stopButton: document.querySelector("#stopButton"),
  playButton: document.querySelector("#playButton"),
  recordingStatus: document.querySelector("#recordingStatus"),
  refreshLogs: document.querySelector("#refreshLogs"),
  attemptRows: document.querySelector("#attemptRows")
};

function getSessionId() {
  const existing = localStorage.getItem("pinyin-pal-session-id");
  if (existing) return existing;
  const created = crypto.randomUUID ? crypto.randomUUID() : `anon-${Date.now()}`;
  localStorage.setItem("pinyin-pal-session-id", created);
  return created;
}

function currentModule() {
  return modules[state.moduleIndex];
}

function currentItem() {
  return currentModule().items[state.itemIndex];
}

function renderModules() {
  elements.moduleList.innerHTML = "";
  modules.forEach((module, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `module-button${index === state.moduleIndex ? " active" : ""}`;
    button.innerHTML = `<strong>${module.title}</strong><span>${module.description}</span>`;
    button.addEventListener("click", () => {
      state.moduleIndex = index;
      state.itemIndex = 0;
      renderPractice();
      renderModules();
    });
    elements.moduleList.appendChild(button);
  });
}

function renderPractice() {
  const module = currentModule();
  const item = currentItem();
  elements.moduleName.textContent = module.title;
  elements.targetDisplay.textContent = item.display;
  elements.targetHanzi.textContent = `${item.hanzi} / ${item.pinyin}`;
  elements.targetExplanation.textContent = item.explanation;
  elements.attemptInput.value = "";
  elements.feedback.className = "feedback empty";
  elements.feedback.textContent = "Submit an attempt to see feedback.";
}

function speakCurrentTarget() {
  const item = currentItem();
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(item.hanzi);
  utterance.lang = "zh-CN";
  utterance.rate = 0.72;
  window.speechSynthesis.speak(utterance);
}

async function saveAttempt(payload) {
  const response = await fetch("/api/attempts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Could not save attempt");
  }

  return response.json();
}

function showFeedback(result, item) {
  elements.feedback.className = `feedback ${result.isCorrect ? "good" : "bad"}`;
  elements.feedback.innerHTML = `
    <strong>${result.isCorrect ? "Correct" : `Error type: ${result.errorType}`}</strong>
    <span>Target: ${item.display} (${item.pinyin}). ${result.message}</span>
  `;
}

async function handleAttempt(event) {
  event.preventDefault();
  const item = currentItem();
  const module = currentModule();
  const userInput = elements.attemptInput.value;
  const result = classifyAttempt(item.pinyin, userInput);

  const payload = {
    session_id: elements.sessionId.value,
    user_id: elements.sessionId.value,
    learner_language: elements.learnerLanguage.value.trim() || "unknown",
    module_id: module.id,
    target_id: item.id,
    target_hanzi: item.hanzi,
    target_pinyin: item.pinyin,
    target_normalized: toneMarksToNumbers(item.pinyin),
    user_input: userInput.trim(),
    user_input_normalized: toneMarksToNumbers(userInput),
    is_correct: result.isCorrect,
    error_type: result.errorType,
    feedback: result.message
  };

  showFeedback(result, item);

  try {
    await saveAttempt(payload);
    await loadAttempts();
  } catch (error) {
    elements.feedback.className = "feedback bad";
    elements.feedback.innerHTML += `<br><strong>Logging failed:</strong> ${error.message}`;
  }
}

function nextTarget() {
  const module = currentModule();
  state.itemIndex = (state.itemIndex + 1) % module.items.length;
  renderPractice();
}

async function loadAttempts() {
  const sessionId = encodeURIComponent(elements.sessionId.value);
  const response = await fetch(`/api/attempts?session_id=${sessionId}`);
  const data = await response.json();
  const attempts = (data.attempts || []).slice().reverse();

  elements.attemptRows.innerHTML = "";
  if (!attempts.length) {
    elements.attemptRows.innerHTML = `<tr><td colspan="5">No attempts logged for this session yet.</td></tr>`;
    return;
  }

  attempts.forEach((attempt) => {
    const row = document.createElement("tr");
    const time = attempt.created_at ? new Date(attempt.created_at).toLocaleString() : "-";
    row.innerHTML = `
      <td>${time}</td>
      <td>${attempt.target_pinyin || "-"}</td>
      <td>${attempt.user_input || "-"}</td>
      <td>${attempt.error_type || "-"}</td>
      <td class="${attempt.is_correct ? "status-good" : "status-bad"}">${attempt.is_correct ? "correct" : "incorrect"}</td>
    `;
    elements.attemptRows.appendChild(row);
  });
}

async function startRecording() {
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    elements.recordingStatus.textContent = "Recording is not supported in this browser.";
    return;
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  state.audioChunks = [];
  state.mediaRecorder = new MediaRecorder(stream);
  state.mediaRecorder.ondataavailable = (event) => state.audioChunks.push(event.data);
  state.mediaRecorder.onstop = () => {
    const blob = new Blob(state.audioChunks, { type: "audio/webm" });
    if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
    state.audioUrl = URL.createObjectURL(blob);
    elements.playButton.disabled = false;
    elements.recordingStatus.textContent = "Recording ready for local playback.";
    stream.getTracks().forEach((track) => track.stop());
  };
  state.mediaRecorder.start();
  elements.recordButton.disabled = true;
  elements.stopButton.disabled = false;
  elements.playButton.disabled = true;
  elements.recordingStatus.textContent = "Recording...";
}

function stopRecording() {
  if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
    state.mediaRecorder.stop();
  }
  elements.recordButton.disabled = false;
  elements.stopButton.disabled = true;
}

function playRecording() {
  if (!state.audioUrl) return;
  new Audio(state.audioUrl).play();
}

function init() {
  elements.sessionId.value = getSessionId();
  elements.learnerLanguage.value = localStorage.getItem("pinyin-pal-learner-language") || "";
  elements.learnerLanguage.addEventListener("change", () => {
    localStorage.setItem("pinyin-pal-learner-language", elements.learnerLanguage.value.trim());
  });

  elements.speakButton.addEventListener("click", speakCurrentTarget);
  elements.attemptForm.addEventListener("submit", handleAttempt);
  elements.nextButton.addEventListener("click", nextTarget);
  elements.refreshLogs.addEventListener("click", loadAttempts);
  elements.recordButton.addEventListener("click", () => startRecording().catch((error) => {
    elements.recordingStatus.textContent = `Recording failed: ${error.message}`;
    elements.recordButton.disabled = false;
    elements.stopButton.disabled = true;
  }));
  elements.stopButton.addEventListener("click", stopRecording);
  elements.playButton.addEventListener("click", playRecording);

  renderModules();
  renderPractice();
  loadAttempts();
}

init();
