const form = document.querySelector("#chat-form");
const input = document.querySelector("#chat-input");
const sendButton = document.querySelector("#send-button");
const micButton = document.querySelector("#mic-button");
const messages = document.querySelector("#messages");
const welcome = document.querySelector("#welcome");
const conversation = document.querySelector("#conversation");
const charCount = document.querySelector("#char-count");
const toast = document.querySelector("#toast");

let typingTimer;
let toastTimer;
let sessionContext = { goal: "", skinType: "", sensitivity: false };
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;
let speechBaseText = "";
let finalTranscript = "";

function updateContext(message) {
  if (/\b(dry|dryness|flaky|tight)\b/i.test(message)) sessionContext.skinType = "dry or tight";
  if (/\b(oily|greasy|shiny)\b/i.test(message)) sessionContext.skinType = "oily";
  if (/\b(sensitive|stinging|burning|reactive)\b/i.test(message)) sessionContext.sensitivity = true;
  if (/\b(acne|break ?outs?|pimples?|blackheads?|whiteheads?)\b/i.test(message)) sessionContext.goal = "breakouts";
  else if (/\b(dark spots?|uneven tone|acne marks?|hyperpigment)\b/i.test(message)) sessionContext.goal = "dark marks";
  else if (/\b(dryness|dry skin|flaky|tight)\b/i.test(message)) sessionContext.goal = "dryness";
  else if (/\b(sunscreen|spf|sun ?screen)\b/i.test(message)) sessionContext.goal = "sun protection";
}

function getReply(message) {
  const priority = {
    urgent: 100,
    pregnancy: 95,
    "eczema-rosacea": 90,
    sensitivity: 85,
    "ingredient-benzoyl": 80,
    "ingredient-salicylic": 80,
    "ingredient-niacinamide": 80,
    "ingredient-retinoid": 80,
    "ingredient-hydrators": 80,
    "ingredient-vitamin-c": 80,
    "dark-spots": 75,
    sunscreen: 75,
    acne: 70,
    dryness: 65,
    "oily-skin": 60,
    moisturizer: 55,
    "skin-type": 50,
    routine: 45,
    greeting: 1,
  };
  const topics = window.SKIN_KNOWLEDGE.topics;
  const matches = topics.filter((item) =>
    item.patterns.some((pattern) => pattern.test(message)),
  );
  const safetyTopic = matches.find((item) =>
    ["urgent", "pregnancy", "eczema-rosacea", "sensitivity"].includes(item.id),
  );
  const asksForRoutine = /\b(?:build|make|create|suggest|recommend|help me with)\b.{0,45}\broutine\b|\b(?:morning|evening)\s+routine\b|\broutine\s+(?:for|with)\b/i.test(message);
  const topic = safetyTopic
    || (asksForRoutine && matches.some((item) => item.id === "routine")
      ? topics.find((item) => item.id === "routine")
      : matches.sort((first, second) =>
        (priority[second.id] || 0) - (priority[first.id] || 0),
      )[0]);
  if (topic) {
    const hasContext = sessionContext.goal || sessionContext.skinType || sessionContext.sensitivity;
    const answer = topic.id === "routine" && hasContext
      ? `<p>I’ll keep ${sessionContext.goal ? `your goal of ${sessionContext.goal}` : `your ${sessionContext.skinType || "sensitive"} skin`} in mind. ${sessionContext.sensitivity ? "Since you mentioned sensitivity, stick to products you already tolerate and stop anything that irritates you. " : ""}Here’s a simple starting point: <strong>morning:</strong> gentle cleanser if needed, moisturizer, and broad-spectrum SPF 30+; <strong>evening:</strong> cleanse and moisturize. Add only one new product at a time.</p><p>What are you currently using, and what would you most like to change?</p>`
      : topic.answer;
    return { ...topic, answer };
  }

  if (sessionContext.goal || sessionContext.skinType || sessionContext.sensitivity) {
    const context = [
      sessionContext.goal ? `your goal of ${sessionContext.goal}` : "",
      sessionContext.skinType ? `your ${sessionContext.skinType} skin` : "",
      sessionContext.sensitivity ? "your skin sensitivity" : "",
    ].filter(Boolean).join(" and ");
    return {
      answer: `<p>I want to make sure I answer the question you actually mean. I remember ${context}. Are you asking about a product, an ingredient, or what to try next?</p>`,
      chips: ["A product", "An ingredient", "What to try next"],
      sources: [],
    };
  }

  return {
    answer: "<p>I’m not sure which part you mean, and I don’t want to guess. Is this about a routine, a product ingredient, sunscreen, or a skin concern? If you tell me what you’re noticing and what you already use, I can give a more relevant general answer.</p>",
    chips: ["Routine", "Ingredient", "Sunscreen", "Skin concern"],
    sources: [],
  };
}

function appendMessage(text, isUser) {
  const message = document.createElement("article");
  message.className = `message${isUser ? " user" : ""}`;
  if (!isUser) {
    const avatar = document.createElement("span");
    avatar.className = "assistant-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = "✳";
    message.append(avatar);
  }

  const content = document.createElement("div");
  content.className = "message-content";
  const label = document.createElement("div");
  label.className = "message-label";
  label.textContent = isUser ? "YOU" : "SKINFOLK";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  if (isUser) bubble.textContent = text;
  else bubble.innerHTML = text;
  content.append(label, bubble);
  message.append(content);
  messages.append(message);
  return message;
}

function appendSources(container, sourceIds) {
  const sources = sourceIds.map((id) => window.SKIN_KNOWLEDGE.sources[id]).filter(Boolean);
  if (!sources.length) return;
  const row = document.createElement("div");
  row.className = "source-list";
  const label = document.createElement("span");
  label.className = "source-label";
  label.textContent = "Sources:";
  row.append(label);
  sources.forEach((source) => {
    const link = document.createElement("a");
    link.className = "source-link";
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = source.label;
    row.append(link);
  });
  container.append(row);
}

function appendSuggestions(container, suggestions) {
  if (!suggestions.length) return;
  const row = document.createElement("div");
  row.className = "suggestion-row";
  suggestions.forEach((suggestion) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "suggestion-chip";
    chip.textContent = suggestion;
    chip.addEventListener("click", () => submitMessage(suggestion));
    row.append(chip);
  });
  container.append(row);
}

function showTyping() {
  const message = document.createElement("article");
  message.className = "message typing";
  message.setAttribute("aria-label", "Skinfolk is typing");
  const avatar = document.createElement("span");
  avatar.className = "assistant-avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = "✳";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
  message.append(avatar, bubble);
  messages.append(message);
  return message;
}

function submitMessage(text) {
  const cleaned = text.trim();
  if (!cleaned) return;
  stopDictation();
  window.clearTimeout(typingTimer);
  updateContext(cleaned);
  welcome.hidden = true;
  appendMessage(cleaned, true);
  input.value = "";
  updateComposer();
  const typing = showTyping();
  conversation.scrollTo({ top: conversation.scrollHeight, behavior: "smooth" });
  const reply = getReply(cleaned);
  typingTimer = window.setTimeout(() => {
    typing.remove();
    const response = appendMessage(reply.answer, false);
    const content = response.querySelector(".message-content");
    appendSources(content, reply.sources);
    appendSuggestions(content, reply.chips);
    conversation.scrollTo({ top: conversation.scrollHeight, behavior: "smooth" });
  }, 450);
}

function updateComposer() {
  sendButton.disabled = !input.value.trim();
  charCount.textContent = input.value.length > 500 ? `${input.value.length}/600` : "";
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
}

function newConversation() {
  window.clearTimeout(typingTimer);
  stopDictation();
  messages.replaceChildren();
  welcome.hidden = false;
  sessionContext = { goal: "", skinType: "", sensitivity: false };
  input.value = "";
  updateComposer();
  input.focus();
  conversation.scrollTo({ top: 0 });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 3000);
}

function stopDictation() {
  if (recognition && isListening) recognition.stop();
  isListening = false;
  micButton.classList.remove("is-listening");
  micButton.setAttribute("aria-pressed", "false");
  micButton.setAttribute("aria-label", "Dictate message");
  micButton.title = "Dictate message";
}

function renderTranscript(interimTranscript = "") {
  const dictated = `${finalTranscript}${interimTranscript}`.trim();
  const separator = speechBaseText && dictated ? " " : "";
  input.value = `${speechBaseText}${separator}${dictated}`.slice(0, 600);
  updateComposer();
  if (input.value.length >= 600 && isListening) {
    stopDictation();
    showToast("Voice input reached the 600-character limit.");
  }
}

function startDictation() {
  if (!SpeechRecognition) {
    showToast("Voice input isn’t supported by this browser. Try a current version of Chrome or Edge.");
    return;
  }
  if (!recognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = navigator.language || "en-US";
    recognition.onresult = (event) => {
      let interimTranscript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0].transcript;
        if (event.results[index].isFinal) finalTranscript += `${transcript} `;
        else interimTranscript += transcript;
      }
      renderTranscript(interimTranscript);
    };
    recognition.onerror = (event) => {
      stopDictation();
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        showToast("Microphone access was blocked. Allow microphone access in your browser settings and try again.");
      } else if (event.error === "no-speech") {
        showToast("I didn’t hear speech. Tap the microphone and try again.");
      } else if (event.error !== "aborted") {
        showToast("Voice input couldn’t start. Check your microphone and try again.");
      }
    };
    recognition.onend = () => {
      isListening = false;
      micButton.classList.remove("is-listening");
      micButton.setAttribute("aria-pressed", "false");
      micButton.setAttribute("aria-label", "Dictate message");
      micButton.title = "Dictate message";
    };
  }

  speechBaseText = input.value.trimEnd();
  finalTranscript = "";
  isListening = true;
  micButton.classList.add("is-listening");
  micButton.setAttribute("aria-pressed", "true");
  micButton.setAttribute("aria-label", "Stop dictation");
  micButton.title = "Stop dictation";
  try {
    recognition.start();
  } catch (error) {
    stopDictation();
    if (error.name === "InvalidStateError") {
      showToast("Voice input is already active. Tap the microphone again to stop.");
      return;
    }
    showToast("Voice input couldn’t start. Check your microphone and try again.");
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitMessage(input.value);
});

micButton.addEventListener("click", () => {
  if (isListening) stopDictation();
  else startDictation();
});

input.addEventListener("input", updateComposer);
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    if (!sendButton.disabled) form.requestSubmit();
  }
});

document.querySelectorAll(".starter-card").forEach((card) => {
  card.addEventListener("click", () => submitMessage(card.dataset.prompt));
});
document.querySelector("#new-chat").addEventListener("click", newConversation);
document.querySelector("#mobile-new-chat").addEventListener("click", newConversation);
document.querySelector("#about-button").addEventListener("click", () => {
  showToast("Skinfolk uses curated AAD, NHS, and FDA guidance—not a live AI or medical professional.");
});
