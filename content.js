let lastText = "";
let suggestionDiv = null;
let originalSuggestion = "";

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function createSuggestionUI() {
  if (suggestionDiv) return;
  suggestionDiv = document.createElement("div");
  suggestionDiv.id = "email-suggestion-box";
  suggestionDiv.innerHTML = `
    <p class="suggestion-text">Loading suggestion...</p>
    <button id="full-email-btn">Generate Full Email</button>
    <div id="full-email-form" style="display: none;">
      <input id="recipient" placeholder="Recipient (e.g., John Doe)" type="text">
      <select id="tone">
        <option value="formal">Formal</option>
        <option value="casual">Casual</option>
        <option value="persuasive">Persuasive</option>
      </select>
      <input id="purpose" placeholder="Purpose (e.g., request a meeting)" type="text">
      <button id="submit-full-email">Submit</button>
    </div>
    <pre id="full-email-output" style="display: none;"></pre>
    <button id="copy-email-btn" style="display: none;">Copy</button>
  `;
  document.body.appendChild(suggestionDiv);
  positionSuggestionBox();
}

function updateSuggestionUI(suggestion) {
  if (!suggestionDiv) createSuggestionUI();
  originalSuggestion = suggestion;
  suggestionDiv.querySelector(".suggestion-text").textContent = suggestion;
  suggestionDiv.querySelector(".suggestion-text").style.display = "block";
  suggestionDiv.querySelector("#full-email-form").style.display = "none";
  suggestionDiv.querySelector("#full-email-output").style.display = "none";
  suggestionDiv.querySelector("#copy-email-btn").style.display = "none";
  positionSuggestionBox();
  suggestionDiv.onclick = (e) => {
    if (e.target.tagName === "BUTTON" || e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
    const activeElement = document.activeElement;
    if (activeElement.tagName === "TEXTAREA" || activeElement.isContentEditable) {
      activeElement.value += " " + suggestion;
      activeElement.focus();
      suggestionDiv.style.display = "none";
    }
  };
}

function showFullEmailForm() {
  if (!suggestionDiv) createSuggestionUI();
  suggestionDiv.querySelector(".suggestion-text").style.display = "none";
  suggestionDiv.querySelector("#full-email-form").style.display = "block";
  suggestionDiv.querySelector("#full-email-output").style.display = "none";
  suggestionDiv.querySelector("#copy-email-btn").style.display = "none";
  positionSuggestionBox();
}

function showFullEmail(fullEmail) {
  if (!suggestionDiv) createSuggestionUI();
  const output = suggestionDiv.querySelector("#full-email-output");
  output.textContent = fullEmail;
  output.style.display = "block";
  suggestionDiv.querySelector(".suggestion-text").style.display = "none";
  suggestionDiv.querySelector("#full-email-form").style.display = "none";
  suggestionDiv.querySelector("#full-email-btn").textContent = "Back to Suggestion";
  const copyBtn = suggestionDiv.querySelector("#copy-email-btn");
  copyBtn.style.display = "block";
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(fullEmail)
      .then(() => alert("Full email copied to clipboard!"))
      .catch(err => alert("Failed to copy: " + err));
  };
  positionSuggestionBox();
}

function positionSuggestionBox() {
  if (!suggestionDiv) return;
  const field = document.activeElement;
  if (field && (field.tagName === "TEXTAREA" || field.isContentEditable)) {
    const rect = field.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const suggestionBoxHeight = suggestionDiv.offsetHeight || 200;
    let topPosition = rect.bottom + window.scrollY + 5;
    if (topPosition + suggestionBoxHeight > window.scrollY + viewportHeight) {
      topPosition = window.scrollY + (viewportHeight - suggestionBoxHeight) / 2;
    }
    const leftPosition = rect.left + window.scrollX;
    suggestionDiv.style.position = "absolute";
    suggestionDiv.style.top = `${topPosition}px`;
    suggestionDiv.style.left = `${leftPosition}px`;
    suggestionDiv.style.display = "block";
  }
}

function getEmailSubject() {
  let subjectField = document.querySelector('input[name="subjectbox"]');
  if (subjectField && subjectField.value) {
    return subjectField.value.trim();
  }
  subjectField = document.querySelector('input[id*="subjectLine"], input[aria-label*="Subject"], input[placeholder*="Subject"]');
  if (subjectField && subjectField.value) {
    return subjectField.value.trim();
  }
  subjectField = document.querySelector('input[id*="subject" i], input[class*="subject" i], input[aria-label*="subject" i]');
  if (subjectField && subjectField.value) {
    return subjectField.value.trim();
  }
  return "General Inquiry";
}

function getEmailContent() {
  console.log("Attempting to get email content...");
  // Gmail: Email body in opened email
  let emailBody = document.querySelector('.ii, .adO'); // Updated for Gmail opened email body
  if (emailBody && emailBody.textContent) {
    console.log("Found Gmail body:", emailBody.textContent.substring(0, 50));
    return emailBody.textContent.trim();
  }

  // Outlook: Email body in opened email
  emailBody = document.querySelector('div[data-testid="messageBody"], div[role="document"]');
  if (emailBody && emailBody.textContent) {
    console.log("Found Outlook body:", emailBody.textContent.substring(0, 50));
    return emailBody.textContent.trim();
  }

  // Fallback: Look for any div with substantial text content
  emailBody = document.querySelector('div[class*="message"], div[class*="body"]');
  if (emailBody && emailBody.textContent) {
    console.log("Found fallback body:", emailBody.textContent.substring(0, 50));
    return emailBody.textContent.trim();
  }

  console.log("No email content found.");
  return "";
}

function pollForResult(key, callback, timeout = 30000) {
  const startTime = Date.now();
  const interval = setInterval(() => {
    chrome.storage.local.get([key], (data) => {
      if (data[key]) {
        clearInterval(interval);
        callback(data[key]);
        chrome.runtime.sendMessage({ type: "clearResult", key });
      } else if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        callback({ error: "Request timed out. Please try again." });
      }
    });
  }, 500);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "clearSuggestionBox") {
    if (suggestionDiv) {
      suggestionDiv.style.display = "none";
      suggestionDiv.querySelector(".suggestion-text").textContent = "";
      suggestionDiv.querySelector("#full-email-output").textContent = "";
      suggestionDiv.querySelector("#full-email-btn").textContent = "Generate Full Email";
      suggestionDiv.querySelector("#copy-email-btn").style.display = "none";
    }
    sendResponse({ success: true });
  } else if (request.type === "getEmailContent") {
    const emailContent = getEmailContent();
    console.log("Sending email content:", emailContent.substring(0, 50));
    sendResponse({ emailContent });
  }
});

function monitorEmailFields() {
  console.log("Monitoring email fields...");
  const emailFields = document.querySelectorAll(
    "textarea, [contenteditable=true], div.editable[contenteditable='true'], div[role='textbox'][contenteditable='true']"
  );
  console.log("Found fields:", emailFields.length);
  emailFields.forEach(field => {
    console.log("Adding listener to field:", field);
    field.addEventListener("input", debounce(() => {
      const text = field.value || field.textContent;
      console.log("Input detected:", text.substring(0, 20));
      if (text === lastText || text.trim() === "") return;
      lastText = text;

      chrome.storage.local.get("userData", (data) => {
        const userData = data.userData || {};
        if (!userData.name) {
          alert("Please log in via the extension popup to use this feature.");
          return;
        }

        const subject = getEmailSubject();

        const tone = "formal";
        const purpose = "communicate";

        createSuggestionUI();
        suggestionDiv.style.display = "block";
        positionSuggestionBox();

        if (!chrome.runtime || !chrome.runtime.id) {
          console.log("Extension context invalid");
          updateSuggestionUI("Error: Extension context invalidated. Please reload the extension and try again.");
          return;
        }

        console.log("Sending getSuggestion request");
        chrome.runtime.sendMessage({ type: "getSuggestion", text, tone, purpose, subject });
        pollForResult("suggestionResult", (result) => {
          if (result.error) {
            console.log("Suggestion error:", result.error);
            updateSuggestionUI("Error: " + result.error);
          } else {
            console.log("Suggestion received:", result.suggestion);
            updateSuggestionUI(result.suggestion || "Error: Unexpected response");

            const fullEmailBtn = suggestionDiv.querySelector("#full-email-btn");
            fullEmailBtn.onclick = () => {
              if (fullEmailBtn.textContent === "Back to Suggestion") {
                updateSuggestionUI(originalSuggestion);
                fullEmailBtn.textContent = "Generate Full Email";
                suggestionDiv.querySelector("#copy-email-btn").style.display = "none";
                positionSuggestionBox();
              } else {
                showFullEmailForm();
                suggestionDiv.querySelector("#submit-full-email").onclick = () => {
                  const recipient = suggestionDiv.querySelector("#recipient").value || "Someone";
                  const tone = suggestionDiv.querySelector("#tone").value;
                  const purpose = suggestionDiv.querySelector("#purpose").value || "communicate";

                  if (!chrome.runtime || !chrome.runtime.id) {
                    showFullEmail("Error: Extension context invalidated. Please reload the extension and try again.");
                    return;
                  }

                  chrome.runtime.sendMessage({ type: "getFullEmail", text, tone, purpose, recipient, subject });
                  pollForResult("fullEmailResult", (fullResult) => {
                    showFullEmail(fullResult.error || fullResult.fullEmail || "Error: Unexpected response");
                  });
                };
              }
            };
          }
        });
      });
    }, 500));
  });
}

monitorEmailFields();
const observer = new MutationObserver(() => {
  console.log("DOM mutation detected");
  monitorEmailFields();
});
observer.observe(document.body, { childList: true, subtree: true });