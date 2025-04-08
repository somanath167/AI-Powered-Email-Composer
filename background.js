const GEMINI_API_KEY = "Your Gemini AI Api Key";//type your api key

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  chrome.storage.local.get(["userData"], (data) => {
    const userData = data.userData || {};

    if (request.type === "getSuggestion") {
      chrome.storage.local.remove("suggestionResult", () => {
        fetchSuggestion(request.text, request.tone, request.purpose, request.subject, GEMINI_API_KEY)
          .then(suggestion => {
            chrome.storage.local.set({ suggestionResult: { suggestion, error: null } }, () => {
              sendResponse({ suggestion, error: null });
            });
          })
          .catch(error => {
            console.error("Suggestion fetch error:", error);
            chrome.storage.local.set({ suggestionResult: { suggestion: null, error: error.message } }, () => {
              sendResponse({ suggestion: null, error: error.message });
            });
          });
      });
    } else if (request.type === "getFullEmail") {
      chrome.storage.local.remove("fullEmailResult", () => {
        fetchFullEmail(request.text, request.tone, request.purpose, request.recipient, userData, request.subject, GEMINI_API_KEY)
          .then(fullEmail => {
            chrome.storage.local.set({ fullEmailResult: { fullEmail, error: null } }, () => {
              sendResponse({ fullEmail, error: null });
            });
          })
          .catch(error => {
            console.error("Full email fetch error:", error);
            chrome.storage.local.set({ fullEmailResult: { fullEmail: null, error: error.message } }, () => {
              sendResponse({ fullEmail: null, error: error.message });
            });
          });
      });
    } else if (request.type === "getReplySuggestion") {
      chrome.storage.local.remove("replySuggestionResult", () => {
        fetchReplySuggestion(request.emailContent, GEMINI_API_KEY)
          .then(replySuggestion => {
            chrome.storage.local.set({ replySuggestionResult: { replySuggestion, error: null } }, () => {
              sendResponse({ replySuggestion, error: null });
            });
          })
          .catch(error => {
            console.error("Reply suggestion fetch error:", error);
            chrome.storage.local.set({ replySuggestionResult: { replySuggestion: null, error: error.message } }, () => {
              sendResponse({ replySuggestion: null, error: error.message });
            });
          });
      });
    } else if (request.type === "getSmartSummary") {
      chrome.storage.local.remove("smartSummaryResult", () => {
        fetchSmartSummary(request.emailContent, GEMINI_API_KEY)
          .then(smartSummary => {
            console.log("Smart summary fetched:", smartSummary);
            chrome.storage.local.set({ smartSummaryResult: { smartSummary, error: null } }, () => {
              sendResponse({ smartSummary, error: null });
            });
          })
          .catch(error => {
            console.error("Smart summary fetch error:", error);
            chrome.storage.local.set({ smartSummaryResult: { smartSummary: null, error: error.message } }, () => {
              sendResponse({ smartSummary: null, error: error.message });
            });
          })
          .finally(() => {
            // Ensure sendResponse is called even if the promise chain fails
            if (!sendResponse.called) {
              sendResponse({ smartSummary: null, error: "Internal error processing request" });
              sendResponse.called = true; // Prevent multiple calls
            }
          });
      });
    } else if (request.type === "clearResult") {
      chrome.storage.local.remove(request.key);
    }
    return true; // Required to use sendResponse asynchronously
  });
});

async function fetchSuggestion(text, tone, purpose, subject, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const prompt = `Given a ${tone} email with the subject '${subject}' and the purpose to ${purpose}, and the current text: '${text}', suggest the next sentence or phrase to continue naturally.`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 50 }
      })
    });

    if (!response.ok) throw new Error(`API request failed: ${response.statusText}`);
    const data = await response.json();
    return data.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error("Error fetching suggestion:", error);
    throw error;
  }
}

async function fetchFullEmail(text, tone, purpose, recipient, userData, subject, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const closing = `Best regards,\n${userData.name || '[Your Name]'}\n${userData.designation || ''}\n${userData.phone || ''}`;
  const prompt = `Write a complete ${tone} email to ${recipient} with the subject '${subject}' and the purpose to ${purpose}. Start with the current text: '${text}', and include a subject line, greeting, body, and end with this closing: '${closing}'.`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 200 }
      })
    });

    if (!response.ok) throw new Error(`API request failed: ${response.statusText}`);
    const data = await response.json();
    return data.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error("Error fetching full email:", error);
    throw error;
  }
}

async function fetchReplySuggestion(emailContent, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const prompt = `Given the following email content: '${emailContent}', suggest a suitable reply in a formal tone. Keep it concise and professional.`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 100 }
      })
    });

    if (!response.ok) throw new Error(`API request failed: ${response.statusText}`);
    const data = await response.json();
    return data.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error("Error fetching reply suggestion:", error);
    throw error;
  }
}

async function fetchSmartSummary(emailContent, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const prompt = `Given the following email content: '${emailContent}', provide a concise and well-formatted summary of the email in a professional manner.`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 100 }
      })
    });

    if (!response.ok) throw new Error(`API request failed: ${response.statusText}`);
    const data = await response.json();
    return data.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error("Error fetching smart summary:", error);
    throw error;
  }
}