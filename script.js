const form = document.querySelector("#chat-form");
const input = document.querySelector("#chat-input");
const sendButton = document.querySelector("#send-button");
const messages = document.querySelector("#messages");
const welcome = document.querySelector("#welcome");
const conversation = document.querySelector("#conversation");
const charCount = document.querySelector("#char-count");
const toast = document.querySelector("#toast");

let typingTimer;
let toastTimer;

const replyBank = [
  {
    match: /\b(routine|morning|evening|start|beginner|steps)\b/i,
    text: "<p><strong>A good routine can be wonderfully simple.</strong></p><p><strong>Morning:</strong> gentle cleanser (or just a rinse), moisturizer, then broad-spectrum SPF 30 or higher. <strong>Evening:</strong> cleanser and moisturizer.</p><p>Stick with the basics for a couple of weeks before adding anything new. Want to tell me your skin type or what you’d like your routine to help with?</p>",
    chips: ["My skin is sensitive", "I want help with breakouts"],
  },
  {
    match: /\b(dry|dryness|flaky|dehydrat|tight|hydration)\b/i,
    text: "<p>That tight, flaky feeling can be uncomfortable. You could try a gentle, fragrance-free cleanser, applying a plain moisturizer to slightly damp skin, and avoiding hot water or scrubbing.</p><p>Ingredients like glycerin and ceramides are commonly used in moisturizers. Add one new product at a time and patch test first. If the dryness is persistent, painful, or worsening, a dermatologist can help figure out what’s going on.</p>",
    chips: ["What is a patch test?", "Help me build a routine"],
  },
  {
    match: /\b(breakout|breakouts|acne|pimple|spots?)\b/i,
    text: "<p>Breakouts are common, and they’re not a reflection of how clean your skin is. A gentle cleanser, non-comedogenic moisturizer, and daily sunscreen are a sensible foundation. Try not to pick or scrub, since that can irritate skin.</p><p>Some over-the-counter ingredients may help, but can also irritate—introduce only one at a time and follow its label. For painful, scarring, or persistent acne, a dermatologist can suggest options that fit your skin.</p>",
    chips: ["What does salicylic acid do?", "My skin feels sensitive"],
  },
  {
    match: /\b(sensitive|irritat|react|stinging|burning|redness)\b/i,
    text: "<p>If your skin feels reactive, it may help to pause new or active products and keep things gentle: mild cleanser, fragrance-free moisturizer, and sunscreen that feels comfortable to you.</p><p>Try new products on a small area first and introduce them one at a time. If you have severe pain, swelling, blistering, or a reaction that isn’t settling, stop using the product and contact a healthcare professional.</p>",
    chips: ["How do I patch test?", "What ingredients should I know?"],
  },
  {
    match: /\b(sunscreen|spf|sun ?screen|sun protection)\b/i,
    text: "<p>Sunscreen is one of the most useful everyday skincare steps. Look for broad-spectrum SPF 30 or higher, apply it generously to exposed skin, and reapply about every two hours outdoors—and after swimming or sweating. Hats and shade are helpful, too.</p><p>Choose a formula you enjoy wearing; consistency matters. Follow the product label, and ask a dermatologist if you have a skin condition or need help choosing one.</p>",
    chips: ["Help me build a morning routine", "What does broad-spectrum mean?"],
  },
  {
    match: /\b(niacinamide|salicylic acid|retinol|retinoid|hyaluronic acid|ceramide|ingredient)\b/i,
    text: "<p>Skincare ingredients can be confusing. The best choice depends on what you want help with, your skin’s tolerance, and the rest of your routine. Start with one new product at a time, follow its label, and patch test on a small area before regular use.</p><p>Some active ingredients can increase irritation or sun sensitivity, so sunscreen is a helpful daytime habit. What ingredient or product are you curious about specifically?</p>",
    chips: ["What does niacinamide do?", "Tell me about retinol"],
  },
  {
    match: /\b(skin type|oily|combination|normal skin)\b/i,
    text: "<p>A simple way to get a rough sense of your skin type: wash gently, pat dry, and wait about 30 minutes without applying products. If most of your face feels tight, it may lean dry; if it looks shiny across your face, it may lean oily; shine mainly in the T-zone can suggest combination skin.</p><p>It’s only a clue—skin changes with weather, hormones, and products. You don’t need a label to start with a gentle cleanser, moisturizer, and sunscreen.</p>",
    chips: ["Help me build a routine", "My skin is sensitive"],
  },
  {
    match: /\b(patch test|test a product)\b/i,
    text: "<p>For a simple home patch test, apply a small amount of the product to a discreet area—such as the inner forearm or behind the ear—following the product’s directions. Watch for irritation over the next day or two before using it more widely.</p><p>A patch test can’t guarantee a product won’t cause a reaction, and it isn’t the same as medical allergy testing. Stop if irritation develops.</p>",
    chips: ["My skin feels sensitive", "Help me build a routine"],
  },
  {
    match: /\b(eczema|rosacea|rash|allerg|infection|diagnos|prescription|medication)\b/i,
    text: "<p>I can share general skincare information, but I can’t diagnose skin conditions or advise on prescription treatments. A dermatologist or other healthcare professional is the right person to assess this and recommend care.</p><p>In the meantime, avoid products that sting or worsen symptoms. Seek prompt medical care for a severe reaction, rapidly worsening symptoms, or signs of infection.</p>",
    chips: ["Keep my routine gentle", "How do I patch test?"],
  },
  {
    match: /\b(hello|hi|hey|good morning|good evening)\b/i,
    text: "<p>Hi there! I’m glad you’re here. I can help you keep a routine simple, learn about ingredients, or talk through everyday skin concerns.</p><p>What would you like to explore?</p>",
    chips: ["Help me build a routine", "How do I figure out my skin type?"],
  },
];

function getReply(message) {
  const found = replyBank.find((item) => item.match.test(message));
  if (found) return found;
  return {
    text: "<p>Good question. Skincare advice can depend on your skin, your current routine, and what you’re hoping to change. A gentle cleanser, moisturizer, and daily broad-spectrum sunscreen are a helpful starting point for many people.</p><p>Tell me a little more—are you curious about a routine, a particular ingredient, or a skin concern?</p>",
    chips: ["Help me build a routine", "Decode an ingredient"],
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
  if (isUser) {
    bubble.textContent = text;
  } else {
    bubble.innerHTML = text;
  }
  content.append(label, bubble);
  message.append(content);
  messages.append(message);
  return message;
}

function appendSuggestions(container, suggestions) {
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
  window.clearTimeout(typingTimer);
  welcome.hidden = true;
  appendMessage(cleaned, true);
  input.value = "";
  updateComposer();
  const typing = showTyping();
  conversation.scrollTo({ top: conversation.scrollHeight, behavior: "smooth" });
  const reply = getReply(cleaned);
  typingTimer = window.setTimeout(() => {
    typing.remove();
    const response = appendMessage(reply.text, false);
    appendSuggestions(response.querySelector(".message-content"), reply.chips);
    conversation.scrollTo({ top: conversation.scrollHeight, behavior: "smooth" });
  }, 650 + Math.random() * 450);
}

function updateComposer() {
  sendButton.disabled = !input.value.trim();
  charCount.textContent = input.value.length > 500 ? `${input.value.length}/600` : "";
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
}

function newConversation() {
  window.clearTimeout(typingTimer);
  messages.replaceChildren();
  welcome.hidden = false;
  input.value = "";
  updateComposer();
  input.focus();
  conversation.scrollTo({ top: 0 });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2600);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitMessage(input.value);
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
  showToast("Skinfolk offers general skincare information—not medical advice.");
});
