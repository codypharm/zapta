/**
 * Zapta Chat Widget
 * Embeddable chat widget for AI agents with lead collection
 */

(function () {
  "use strict";

  // Auto-detect API URL based on where the script is loaded from
  const scriptElement = document.currentScript;
  const scriptSrc = scriptElement ? scriptElement.src : "";
  const defaultApiUrl = scriptSrc.includes("localhost")
    ? "http://localhost:3000"
    : "https://zapta-nu.vercel.app";

  // Widget configuration
  const config = {
    agentId: window.ZAPTA_AGENT_ID || "",
    apiUrl: window.ZAPTA_API_URL || defaultApiUrl,
    primaryColor: window.ZAPTA_PRIMARY_COLOR || "#FF7A59",
    position: window.ZAPTA_POSITION || "bottom-right",
  };

  // Session management
  let sessionId =
    localStorage.getItem("zapta_session_id") || generateSessionId();
  localStorage.setItem("zapta_session_id", sessionId);

  let messages = JSON.parse(
    localStorage.getItem(`zapta_messages_${config.agentId}`) || "[]",
  );
  let isOpen = false;
  let isLoading = false;

  // Lead collection
  let leadId = localStorage.getItem(`zapta_lead_id_${config.agentId}`) || null;
  let agentConfig = null;
  let showingLeadForm = false;

  // Generate unique session ID
  function generateSessionId() {
    return (
      "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  }

  // Save messages to localStorage
  function saveMessages() {
    localStorage.setItem(
      `zapta_messages_${config.agentId}`,
      JSON.stringify(messages),
    );
  }

  // Fetch agent configuration
  async function fetchAgentConfig() {
    try {
      const response = await fetch(
        `${config.apiUrl}/api/agents/${config.agentId}/config`,
      );
      if (response.ok) {
        agentConfig = await response.json();
      }
    } catch (error) {
      console.error("Failed to fetch agent config:", error);
    }
  }

  // Check if lead form is needed
  function needsLeadForm() {
    return (
      agentConfig?.config?.leadCollection?.enabled &&
      !leadId &&
      messages.length === 0
    );
  }

  // Create widget HTML structure
  function createWidget() {
    const widgetContainer = document.createElement("div");
    widgetContainer.id = "zapta-widget";
    widgetContainer.innerHTML = `
        <style>
          /* Widget Styles */
          #zapta-widget {
            position: fixed;
            ${config.position.includes("right") ? "right: 20px;" : "left: 20px;"}
            bottom: 20px;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          }

          #zapta-chat-bubble {
            width: 60px;
            height: 60px;
            border-radius: 30px;
            background: linear-gradient(135deg, ${config.primaryColor} 0%, ${adjustColor(config.primaryColor, -20)} 100%);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.3s, box-shadow 0.3s;
          }

          #zapta-chat-bubble:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
          }

          #zapta-chat-bubble svg {
            width: 28px;
            height: 28px;
            fill: white;
          }

          #zapta-chat-window {
            position: absolute;
            bottom: 80px;
            ${config.position.includes("right") ? "right: 0;" : "left: 0;"}
            width: 380px;
            height: 550px;
            max-height: calc(100vh - 120px);
            background: white;
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
            display: none;
            flex-direction: column;
            overflow: hidden;
            animation: slideUp 0.3s ease-out;
          }

          #zapta-chat-window.open {
            display: flex;
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          #zapta-chat-header {
            background: ${config.primaryColor};
            color: white;
            padding: 16px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          #zapta-chat-header h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
          }

          #zapta-chat-header button {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 4px;
            opacity: 0.8;
            transition: opacity 0.2s;
          }

          #zapta-chat-header button:hover {
            opacity: 1;
          }

          /* Lead Form Styles */
          #zapta-lead-form-container {
            display: none;
            flex-direction: column;
            padding: 24px;
            flex: 1;
            overflow-y: auto;
          }

          #zapta-lead-form-container.active {
            display: flex;
          }

          #zapta-lead-form-container h4 {
            margin: 0 0 8px 0;
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
          }

          #zapta-lead-form-container p {
            margin: 0 0 20px 0;
            color: #6b7280;
            font-size: 14px;
          }

          .zapta-form-field {
            margin-bottom: 16px;
          }

          .zapta-form-field label {
            display: block;
            margin-bottom: 6px;
            font-size: 14px;
            font-weight: 500;
            color: #374151;
          }

          .zapta-form-field label .required {
            color: #ef4444;
          }

          .zapta-form-field input {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s;
            box-sizing: border-box;
          }

          .zapta-form-field input:focus {
            border-color: ${config.primaryColor};
          }

          #zapta-lead-submit {
            background: ${config.primaryColor};
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 24px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.2s;
            width: 100%;
            margin-top: 8px;
          }

          #zapta-lead-submit:hover:not(:disabled) {
            opacity: 0.9;
          }

          #zapta-lead-submit:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .zapta-form-error {
            color: #ef4444;
            font-size: 13px;
            margin-top: 8px;
            display: none;
          }

          .zapta-form-error.active {
            display: block;
          }

          /* Chat Messages Styles */
          #zapta-chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            background: #f9fafb;
            display: none;
          }

          #zapta-chat-messages.active {
            display: block;
          }

          .zapta-message {
            margin-bottom: 16px;
            display: flex;
            gap: 8px;
          }

          .zapta-message.user {
            flex-direction: row-reverse;
          }

          .zapta-message-content {
            max-width: 75%;
            padding: 12px 16px;
            border-radius: 12px;
            font-size: 14px;
            line-height: 1.5;
            word-wrap: break-word;
          }

          .zapta-message.assistant .zapta-message-content {
            background: white;
            color: #1f2937;
            border: 1px solid #e5e7eb;
          }

          .zapta-message.user .zapta-message-content {
            background: ${config.primaryColor};
            color: white;
          }

          .zapta-typing-indicator {
            display: flex;
            gap: 4px;
            padding: 12px 16px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            width: fit-content;
          }

          .zapta-typing-indicator span {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #9ca3af;
            animation: typing 1.4s infinite;
          }

          .zapta-typing-indicator span:nth-child(2) {
            animation-delay: 0.2s;
          }

          .zapta-typing-indicator span:nth-child(3) {
            animation-delay: 0.4s;
          }

          @keyframes typing {
            0%, 60%, 100% {
              transform: translateY(0);
              opacity: 0.5;
            }
            30% {
              transform: translateY(-10px);
              opacity: 1;
            }
          }

          #zapta-chat-input-container {
            padding: 16px 20px;
            background: white;
            border-top: 1px solid #e5e7eb;
            display: none;
          }

          #zapta-chat-input-container.active {
            display: block;
          }

          #zapta-chat-input-form {
            display: flex;
            gap: 8px;
          }

          #zapta-chat-input {
            flex: 1;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 10px 12px;
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s;
          }

          #zapta-chat-input:focus {
            border-color: ${config.primaryColor};
          }

          #zapta-chat-send {
            background: ${config.primaryColor};
            color: white;
            border: none;
            border-radius: 8px;
            padding: 10px 16px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.2s;
          }

          #zapta-chat-send:hover:not(:disabled) {
            opacity: 0.9;
          }

          #zapta-chat-send:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          #zapta-branding {
            text-align: center;
            padding: 12px;
            font-size: 12px;
            color: #6b7280;
            background: white;
            border-top: 1px solid #e5e7eb;
          }

          #zapta-branding a {
            color: ${config.primaryColor};
            text-decoration: none;
            font-weight: 500;
          }

          #zapta-branding a:hover {
            text-decoration: underline;
          }

          @media (max-width: 480px) {
            #zapta-chat-window {
              width: calc(100vw - 40px);
              height: calc(100vh - 120px);
              bottom: 80px;
            }
          }
        </style>

        <!-- Chat Bubble -->
        <div id="zapta-chat-bubble">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
        </div>

        <!-- Chat Window -->
        <div id="zapta-chat-window">
          <div id="zapta-chat-header">
            <h3>Chat with us</h3>
            <button id="zapta-close-btn" aria-label="Close chat">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Lead Form -->
          <div id="zapta-lead-form-container">
            <h4 id="zapta-lead-welcome"></h4>
            <p id="zapta-lead-description"></p>
            <form id="zapta-lead-form">
              <div id="zapta-lead-fields"></div>
              <button type="submit" id="zapta-lead-submit">Start Chat</button>
            </form>
            <div id="zapta-lead-error" class="zapta-form-error"></div>
          </div>

          <!-- Chat Messages -->
          <div id="zapta-chat-messages"></div>

          <!-- Chat Input -->
          <div id="zapta-chat-input-container">
            <form id="zapta-chat-input-form">
              <input
                type="text"
                id="zapta-chat-input"
                placeholder="Type your message..."
                autocomplete="off"
              />
              <button type="submit" id="zapta-chat-send">Send</button>
            </form>
          </div>

          <div id="zapta-branding">
            Powered by <a href="https://zapta.ai" target="_blank">Zapta</a>
          </div>
        </div>
      `;

    document.body.appendChild(widgetContainer);
    initializeEventListeners();
    initializeWidget();
  }

  // Initialize widget
  async function initializeWidget() {
    await fetchAgentConfig();

    if (needsLeadForm()) {
      showLeadForm();
    } else {
      showChat();
    }
  }

  // Show lead form
  function showLeadForm() {
    showingLeadForm = true;
    const formContainer = document.getElementById("zapta-lead-form-container");
    const messagesContainer = document.getElementById("zapta-chat-messages");
    const inputContainer = document.getElementById(
      "zapta-chat-input-container",
    );

    formContainer.classList.add("active");
    messagesContainer.classList.remove("active");
    inputContainer.classList.remove("active");

    // Set welcome message
    const welcomeEl = document.getElementById("zapta-lead-welcome");
    welcomeEl.textContent =
      agentConfig?.config?.leadCollection?.welcomeMessage ||
      "Let us know how to reach you";

    const descEl = document.getElementById("zapta-lead-description");
    descEl.textContent = "Please provide your information to start chatting";

    // Build form fields
    const fieldsContainer = document.getElementById("zapta-lead-fields");
    fieldsContainer.innerHTML = "";

    const fields = agentConfig?.config?.leadCollection?.fields || {};

    if (fields.name?.enabled) {
      fieldsContainer.innerHTML += `
          <div class="zapta-form-field">
            <label for="zapta-field-name">
              Name ${fields.name.required ? '<span class="required">*</span>' : ""}
            </label>
            <input type="text" id="zapta-field-name" ${fields.name.required ? "required" : ""} />
          </div>
        `;
    }

    if (fields.email?.enabled) {
      fieldsContainer.innerHTML += `
          <div class="zapta-form-field">
            <label for="zapta-field-email">
              Email ${fields.email.required ? '<span class="required">*</span>' : ""}
            </label>
            <input type="email" id="zapta-field-email" ${fields.email.required ? "required" : ""} />
          </div>
        `;
    }

    if (fields.phone?.enabled) {
      fieldsContainer.innerHTML += `
          <div class="zapta-form-field">
            <label for="zapta-field-phone">
              Phone ${fields.phone.required ? '<span class="required">*</span>' : ""}
            </label>
            <input type="tel" id="zapta-field-phone" ${fields.phone.required ? "required" : ""} />
          </div>
        `;
    }

    if (fields.company?.enabled) {
      fieldsContainer.innerHTML += `
          <div class="zapta-form-field">
            <label for="zapta-field-company">
              Company ${fields.company.required ? '<span class="required">*</span>' : ""}
            </label>
            <input type="text" id="zapta-field-company" ${fields.company.required ? "required" : ""} />
          </div>
        `;
    }

    // Set submit button text
    const submitBtn = document.getElementById("zapta-lead-submit");
    submitBtn.textContent =
      agentConfig?.config?.leadCollection?.submitButtonText || "Start Chat";
  }

  // Show chat interface
  function showChat() {
    showingLeadForm = false;
    const formContainer = document.getElementById("zapta-lead-form-container");
    const messagesContainer = document.getElementById("zapta-chat-messages");
    const inputContainer = document.getElementById(
      "zapta-chat-input-container",
    );

    formContainer.classList.remove("active");
    messagesContainer.classList.add("active");
    inputContainer.classList.add("active");

    renderMessages();
  }

  // Adjust color brightness
  function adjustColor(color, amount) {
    const num = parseInt(color.replace("#", ""), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amount));
    return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
  }

  // Initialize event listeners
  function initializeEventListeners() {
    const bubble = document.getElementById("zapta-chat-bubble");
    const closeBtn = document.getElementById("zapta-close-btn");
    const chatForm = document.getElementById("zapta-chat-input-form");
    const leadForm = document.getElementById("zapta-lead-form");

    bubble.addEventListener("click", toggleChat);
    closeBtn.addEventListener("click", toggleChat);
    chatForm.addEventListener("submit", handleSendMessage);
    leadForm.addEventListener("submit", handleLeadSubmit);
  }

  // Toggle chat window
  function toggleChat() {
    isOpen = !isOpen;
    const chatWindow = document.getElementById("zapta-chat-window");

    if (isOpen) {
      chatWindow.classList.add("open");
      if (showingLeadForm) {
        const firstInput = document.querySelector("#zapta-lead-fields input");
        if (firstInput) firstInput.focus();
      } else {
        document.getElementById("zapta-chat-input").focus();
      }
      scrollToBottom();
    } else {
      chatWindow.classList.remove("open");
    }
  }

  // Handle lead form submission
  async function handleLeadSubmit(e) {
    e.preventDefault();

    const errorEl = document.getElementById("zapta-lead-error");
    const submitBtn = document.getElementById("zapta-lead-submit");
    errorEl.classList.remove("active");

    const formData = {
      name: document.getElementById("zapta-field-name")?.value || undefined,
      email: document.getElementById("zapta-field-email")?.value || undefined,
      phone: document.getElementById("zapta-field-phone")?.value || undefined,
      company:
        document.getElementById("zapta-field-company")?.value || undefined,
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    try {
      const response = await fetch(
        `${config.apiUrl}/api/leads/${config.agentId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit information");
      }

      // Save lead ID
      leadId = data.leadId;
      localStorage.setItem(`zapta_lead_id_${config.agentId}`, leadId);

      // Show chat
      showChat();
    } catch (error) {
      errorEl.textContent = error.message;
      errorEl.classList.add("active");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent =
        agentConfig?.config?.leadCollection?.submitButtonText || "Start Chat";
    }
  }

  // Render messages
  function renderMessages() {
    const messagesContainer = document.getElementById("zapta-chat-messages");
    messagesContainer.innerHTML = "";

    if (messages.length === 0) {
      const welcomeMessage = document.createElement("div");
      welcomeMessage.className = "zapta-message assistant";
      welcomeMessage.innerHTML = `
          <div class="zapta-message-content">
            👋 Hi! How can I help you today?
          </div>
        `;
      messagesContainer.appendChild(welcomeMessage);
    } else {
      messages.forEach((msg) => {
        const messageEl = document.createElement("div");
        messageEl.className = `zapta-message ${msg.role}`;
        messageEl.innerHTML = `
            <div class="zapta-message-content">${escapeHtml(msg.content)}</div>
          `;
        messagesContainer.appendChild(messageEl);
      });
    }

    if (isLoading) {
      const typingIndicator = document.createElement("div");
      typingIndicator.className = "zapta-message assistant";
      typingIndicator.innerHTML = `
          <div class="zapta-typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        `;
      messagesContainer.appendChild(typingIndicator);
    }

    scrollToBottom();
  }

  // Handle send message
  async function handleSendMessage(e) {
    e.preventDefault();

    const input = document.getElementById("zapta-chat-input");
    const message = input.value.trim();

    if (!message || isLoading) return;

    messages.push({ role: "user", content: message });
    saveMessages();
    input.value = "";
    renderMessages();

    isLoading = true;
    renderMessages();

    try {
      const response = await fetch(
        `${config.apiUrl}/api/chat/${config.agentId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
            sessionId,
            history: messages.slice(0, -1),
            leadId: leadId || undefined,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      messages.push({ role: "assistant", content: data.message });
      saveMessages();
    } catch (error) {
      console.error("Zapta widget error:", error);
      messages.push({
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      });
      saveMessages();
    } finally {
      isLoading = false;
      renderMessages();
    }
  }

  // Scroll to bottom
  function scrollToBottom() {
    const messagesContainer = document.getElementById("zapta-chat-messages");
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Initialize widget when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createWidget);
  } else {
    createWidget();
  }
})();
