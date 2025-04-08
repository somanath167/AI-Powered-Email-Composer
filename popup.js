document.addEventListener('DOMContentLoaded', () => {
  function showTab(tabId) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    console.log(`Switched to tab: ${tabId}`);
  }

  document.getElementById('login-btn').onclick = () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    chrome.storage.local.get("users", (data) => {
      const users = data.users || {};
      if (users[email] && users[email].password === password) {
        chrome.storage.local.set({ userData: users[email] }, () => {
          showComposerTab(users[email]);
        });
      } else {
        alert("Invalid email or password.");
      }
    });
  };

  document.getElementById('register-btn').onclick = () => {
    const userData = {
      name: document.getElementById('reg-name').value,
      email: document.getElementById('reg-email').value,
      phone: document.getElementById('reg-phone').value,
      designation: document.getElementById('reg-designation').value,
      password: document.getElementById('reg-password').value
    };

    if (!userData.name || !userData.email || !userData.password) {
      alert("Please fill in all required fields (Name, Email, Password).");
      return;
    }

    chrome.storage.local.get("users", (data) => {
      const users = data.users || {};
      users[userData.email] = userData;
      chrome.storage.local.set({ users }, () => {
        alert("Registration successful! Please log in.");
        showTab('login-tab');
      });
    });
  };

  function showComposerTab(userData) {
    document.getElementById('greeting').textContent = `Hey ${userData.name}, I am your assistant!`;
    showTab('composer-tab');

    const composerContent = document.getElementById('composer-content');
    composerContent.style.display = 'block';

    const suggestionBtn = document.getElementById('get-suggestion-btn');
    const fullEmailBtn = document.getElementById('get-full-email-btn');
    const replySuggestionBtn = document.getElementById('get-reply-suggestion-btn');
    const smartSummaryBtn = document.getElementById('get-smart-summary-btn');
    const submitFullEmailBtn = document.getElementById('submit-full-email');
    const copyReplyBtn = document.getElementById('copy-reply-btn');
    const resetBtn = document.getElementById('reset-btn');
    const loadingDiv = document.getElementById('loading');
    const output = document.getElementById('output');
    const emailInput = document.getElementById('email-input');
    const fullEmailForm = document.getElementById('full-email-form');

    output.style.display = 'none';

    const composerTab = document.getElementById('composer-tab');
    const composerTabHeight = composerTab.clientHeight;
    const outputHeight = output.clientHeight || 150;
    const topPosition = (composerTabHeight - outputHeight) / 2;
    output.style.top = `${topPosition}px`;

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

    function resetComposer() {
      output.textContent = '';
      output.style.display = 'none';
      emailInput.style.display = 'none';
      fullEmailForm.style.display = 'none';
      copyReplyBtn.style.display = 'none';
      resetBtn.style.display = 'none';
      suggestionBtn.disabled = false;
      fullEmailBtn.disabled = false;
      replySuggestionBtn.disabled = false;
      smartSummaryBtn.disabled = false;
      submitFullEmailBtn.disabled = false;
      loadingDiv.style.display = 'none';
    }

    suggestionBtn.onclick = () => {
      if (emailInput.style.display === 'none') {
        emailInput.style.display = 'block'; // Show textarea on first click
        emailInput.focus(); // Focus on textarea for user convenience
        return;
      }

      const text = emailInput.value;
      if (!text) {
        alert("Please enter some text to get a suggestion.");
        return;
      }

      suggestionBtn.disabled = true;
      fullEmailBtn.disabled = true;
      loadingDiv.style.display = 'block';
      output.textContent = '';
      output.style.display = 'none';

      if (!chrome.runtime || !chrome.runtime.id) {
        output.textContent = "Error: Extension context invalidated. Please reload the extension and try again.";
        output.style.display = 'block';
        suggestionBtn.disabled = false;
        fullEmailBtn.disabled = false;
        loadingDiv.style.display = 'none';
        resetBtn.style.display = 'block';
        return;
      }

      chrome.runtime.sendMessage({ type: "getSuggestion", text, tone: "formal", purpose: "communicate" });
      pollForResult("suggestionResult", (result) => {
        suggestionBtn.disabled = false;
        fullEmailBtn.disabled = false;
        loadingDiv.style.display = 'none';
        output.textContent = result.error || result.suggestion || "Error: Unexpected response.";
        output.style.display = 'block';
        copyReplyBtn.style.display = 'none';
        emailInput.style.display = 'none'; // Hide textarea after processing
        resetBtn.style.display = 'block'; // Show reset button
      });
    };

    fullEmailBtn.onclick = () => {
      if (fullEmailForm.style.display === 'none') {
        emailInput.style.display = 'block'; // Show textarea for input
        fullEmailForm.style.display = 'block';
        output.textContent = '';
        output.style.display = 'none';
      } else {
        fullEmailForm.style.display = 'none';
      }
    };

    submitFullEmailBtn.onclick = () => {
      const text = emailInput.value;
      const recipient = document.getElementById('full-recipient').value || "Someone";
      const tone = document.getElementById('full-tone').value;
      const purpose = document.getElementById('full-purpose').value || "communicate";
      if (!text) {
        alert("Please enter some text to generate a full email.");
        return;
      }

      suggestionBtn.disabled = true;
      fullEmailBtn.disabled = true;
      submitFullEmailBtn.disabled = true;
      loadingDiv.style.display = 'block';
      output.textContent = '';
      output.style.display = 'none';

      if (!chrome.runtime || !chrome.runtime.id) {
        output.textContent = "Error: Extension context invalidated. Please reload the extension and try again.";
        output.style.display = 'block';
        suggestionBtn.disabled = false;
        fullEmailBtn.disabled = false;
        submitFullEmailBtn.disabled = false;
        loadingDiv.style.display = 'none';
        resetBtn.style.display = 'block';
        return;
      }

      chrome.runtime.sendMessage({ type: "getFullEmail", text, tone, purpose, recipient });
      pollForResult("fullEmailResult", (result) => {
        suggestionBtn.disabled = false;
        fullEmailBtn.disabled = false;
        submitFullEmailBtn.disabled = false;
        loadingDiv.style.display = 'none';
        output.textContent = result.error || result.fullEmail || "Error: Unexpected response.";
        output.style.display = 'block';
        fullEmailForm.style.display = 'none';
        copyReplyBtn.style.display = 'none';
        emailInput.style.display = 'none'; // Hide textarea after processing
        resetBtn.style.display = 'block'; // Show reset button
      });
    };

    replySuggestionBtn.onclick = () => {
      suggestionBtn.disabled = true;
      fullEmailBtn.disabled = true;
      replySuggestionBtn.disabled = true;
      loadingDiv.style.display = 'block';
      output.textContent = '';
      output.style.display = 'none';

      if (!chrome.runtime || !chrome.runtime.id) {
        output.textContent = "Error: Extension context invalidated. Please reload the extension and try again.";
        output.style.display = 'block';
        suggestionBtn.disabled = false;
        fullEmailBtn.disabled = false;
        replySuggestionBtn.disabled = false;
        loadingDiv.style.display = 'none';
        resetBtn.style.display = 'block';
        return;
      }

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0].url.match(/https:\/\/mail\.google\.com\/.*|https:\/\/outlook\.live\.com\/.*/)) {
          chrome.tabs.sendMessage(tabs[0].id, { type: "getEmailContent" }, (response) => {
            if (chrome.runtime.lastError) {
              output.textContent = "Error: Could not communicate with content script. " + chrome.runtime.lastError.message;
              output.style.display = 'block';
              suggestionBtn.disabled = false;
              fullEmailBtn.disabled = false;
              replySuggestionBtn.disabled = false;
              loadingDiv.style.display = 'none';
              resetBtn.style.display = 'block';
              return;
            }
            if (!response || !response.emailContent) {
              output.textContent = "Error: Could not read email content. Please open an email in Gmail or Outlook.";
              output.style.display = 'block';
              suggestionBtn.disabled = false;
              fullEmailBtn.disabled = false;
              replySuggestionBtn.disabled = false;
              loadingDiv.style.display = 'none';
              resetBtn.style.display = 'block';
              return;
            }
            const emailContent = response.emailContent;
            chrome.runtime.sendMessage({ type: "getReplySuggestion", emailContent });
            pollForResult("replySuggestionResult", (result) => {
              suggestionBtn.disabled = false;
              fullEmailBtn.disabled = false;
              replySuggestionBtn.disabled = false;
              loadingDiv.style.display = 'none';
              output.textContent = result.error || result.replySuggestion || "Error: Unexpected response.";
              output.style.display = 'block';
              copyReplyBtn.style.display = 'block';
              resetBtn.style.display = 'block'; // Show reset button
              copyReplyBtn.onclick = () => {
                navigator.clipboard.writeText(output.textContent)
                  .then(() => alert("Reply suggestion copied to clipboard!"))
                  .catch(err => alert("Failed to copy: " + err));
              };
            });
          });
        } else {
          output.textContent = "Error: Please open this on a Gmail or Outlook email page.";
          output.style.display = 'block';
          suggestionBtn.disabled = false;
          fullEmailBtn.disabled = false;
          replySuggestionBtn.disabled = false;
          loadingDiv.style.display = 'none';
          resetBtn.style.display = 'block';
          return;
        }
      });
    };

    smartSummaryBtn.onclick = () => {
      emailInput.style.display = 'block'; // Show textarea for input
      suggestionBtn.disabled = true;
      fullEmailBtn.disabled = true;
      replySuggestionBtn.disabled = true;
      smartSummaryBtn.disabled = true;
      loadingDiv.style.display = 'block';
      output.textContent = '';
      output.style.display = 'none';

      if (!chrome.runtime || !chrome.runtime.id) {
        output.textContent = "Error: Extension context invalidated. Please reload the extension and try again.";
        output.style.display = 'block';
        suggestionBtn.disabled = false;
        fullEmailBtn.disabled = false;
        replySuggestionBtn.disabled = false;
        smartSummaryBtn.disabled = false;
        loadingDiv.style.display = 'none';
        resetBtn.style.display = 'block';
        return;
      }

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0].url.match(/https:\/\/mail\.google\.com\/.*|https:\/\/outlook\.live\.com\/.*/)) {
          chrome.tabs.sendMessage(tabs[0].id, { type: "getEmailContent" }, (response) => {
            if (chrome.runtime.lastError) {
              output.textContent = "Error: Could not communicate with content script. " + chrome.runtime.lastError.message;
              output.style.display = 'block';
              suggestionBtn.disabled = false;
              fullEmailBtn.disabled = false;
              replySuggestionBtn.disabled = false;
              smartSummaryBtn.disabled = false;
              loadingDiv.style.display = 'none';
              resetBtn.style.display = 'block';
              return;
            }
            if (!response || !response.emailContent) {
              const text = emailInput.value;
              if (!text) {
                output.textContent = "Error: Could not read email content and no text provided. Please open an email or enter text.";
                output.style.display = 'block';
                suggestionBtn.disabled = false;
                fullEmailBtn.disabled = false;
                replySuggestionBtn.disabled = false;
                smartSummaryBtn.disabled = false;
                loadingDiv.style.display = 'none';
                resetBtn.style.display = 'block';
                return;
              }
              chrome.runtime.sendMessage({ type: "getSmartSummary", emailContent: text });
            } else {
              const emailContent = response.emailContent;
              chrome.runtime.sendMessage({ type: "getSmartSummary", emailContent });
            }
            pollForResult("smartSummaryResult", (result) => {
              suggestionBtn.disabled = false;
              fullEmailBtn.disabled = false;
              replySuggestionBtn.disabled = false;
              smartSummaryBtn.disabled = false;
              loadingDiv.style.display = 'none';
              output.textContent = result.error || result.smartSummary || "Error: Unexpected response.";
              output.style.display = 'block';
              copyReplyBtn.style.display = 'block';
              resetBtn.style.display = 'block'; // Show reset button
              copyReplyBtn.onclick = () => {
                navigator.clipboard.writeText(output.textContent)
                  .then(() => alert("Smart summary copied to clipboard!"))
                  .catch(err => alert("Failed to copy: " + err));
              };
              emailInput.style.display = 'none'; // Hide textarea after processing
            });
          });
        } else {
          const text = emailInput.value;
          if (!text) {
            output.textContent = "Error: Please open this on a Gmail/Outlook email page or enter text to summarize.";
            output.style.display = 'block';
            suggestionBtn.disabled = false;
            fullEmailBtn.disabled = false;
            replySuggestionBtn.disabled = false;
            smartSummaryBtn.disabled = false;
            loadingDiv.style.display = 'none';
            resetBtn.style.display = 'block';
            return;
          }
          chrome.runtime.sendMessage({ type: "getSmartSummary", emailContent: text });
          pollForResult("smartSummaryResult", (result) => {
            suggestionBtn.disabled = false;
            fullEmailBtn.disabled = false;
            replySuggestionBtn.disabled = false;
            smartSummaryBtn.disabled = false;
            loadingDiv.style.display = 'none';
            output.textContent = result.error || result.smartSummary || "Error: Unexpected response.";
            output.style.display = 'block';
            copyReplyBtn.style.display = 'block';
            resetBtn.style.display = 'block'; // Show reset button
            copyReplyBtn.onclick = () => {
              navigator.clipboard.writeText(output.textContent)
                .then(() => alert("Smart summary copied to clipboard!"))
                .catch(err => alert("Failed to copy: " + err));
            };
            emailInput.style.display = 'none'; // Hide textarea after processing
          });
        }
      });
    };

    resetBtn.onclick = () => {
      resetComposer();
    };

    document.getElementById('logout-btn').onclick = () => {
      chrome.storage.local.remove("userData", () => {
        composerContent.style.display = 'none';
        showTab('login-tab');
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, { type: "clearSuggestionBox" });
        });
      });
    };
  }

  const registerLink = document.getElementById('register-link');
  const loginLink = document.getElementById('login-link');

  if (registerLink) {
    registerLink.onclick = (e) => {
      e.preventDefault();
      showTab('register-tab');
      console.log("Navigating to register tab");
    };
  } else {
    console.error("register-link element not found");
  }

  if (loginLink) {
    loginLink.onclick = (e) => {
      e.preventDefault();
      showTab('login-tab');
      console.log("Navigating to login tab");
    };
  } else {
    console.error("login-link element not found");
  }

  function checkLoginStatus() {
    if (!chrome.runtime || !chrome.runtime.id) {
      alert("Extension context invalidated. Please reload the extension.");
      return;
    }

    chrome.storage.local.get(["userData"], (data) => {
      if (data.userData) {
        showComposerTab(data.userData);
      } else {
        showTab('login-tab');
      }
    });
  }

  checkLoginStatus();
});