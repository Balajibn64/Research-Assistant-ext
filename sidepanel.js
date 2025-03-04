document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["researchNotes"], function (result) {
    if (result.researchNotes) {
      document.getElementById("notes").value = result.researchNotes;
    }
  });

  document
    .getElementById("summarize-Btn")
    .addEventListener("click", () => processText("summarize"));
  document
    .getElementById("suggest-Btn")
    .addEventListener("click", () => processText("suggest"));
  document
    .getElementById("paraphrase-Btn")
    .addEventListener("click", () => processText("paraphrase"));
  document
    .getElementById("grammarCheck-Btn")
    .addEventListener("click", () => processText("grammarCheck"));
  document
    .getElementById("expand-Btn")
    .addEventListener("click", () => processText("expand"));
  document.getElementById("saveNotes-Btn").addEventListener("click", saveNotes);
  document
    .getElementById("downloadNotes-Btn")
    .addEventListener("click", downloadNotes);
  document
    .getElementById("copy-Btn")
    .addEventListener("click", copyToClipboard);
  document
    .getElementById("clearResults-Btn")
    .addEventListener("click", clearResults);
  document.getElementById("speak-Btn").addEventListener("click", speakContent);
  document
    .getElementById("stopSpeak-Btn")
    .addEventListener("click", stopSpeaking);
  document
    .getElementById("darkMode-Btn")
    .addEventListener("click", toggleDarkMode);
});

let speechInstance;

async function processText(operation) {
  try {
    showTyping();
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => window.getSelection().toString(),
    });

    if (!result) {
      showToast("Please select some text first", "error");
      return;
    }

    const response = await fetch("http://localhost:8080/api/research/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: result, operation: operation }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const text = await response.text();
    showResult(text.replace(/\n/g, "<br>"));
  } catch (error) {
    showResult("Error: " + error.message);
  }
}

async function saveNotes() {
  const notes = document.getElementById("notes").value;
  chrome.storage.local.set({ researchNotes: notes }, function () {
    showToast("Notes saved successfully", "success");
  });
}

function downloadNotes() {
  const notes = document.getElementById("notes").value;
  const blob = new Blob([notes], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "research_notes.txt";
  a.click();
}

function copyToClipboard() {
  const content = document.getElementById("results").innerText;
  navigator.clipboard.writeText(content);
  showToast("Copied to clipboard", "info");
}

function clearResults() {
  document.getElementById("results").innerHTML = "";
}

function speakContent() {
  const content = document.getElementById("results").innerText;
  speechInstance = new SpeechSynthesisUtterance(content);
  window.speechSynthesis.speak(speechInstance);
}

function stopSpeaking() {
  if (speechInstance) {
    window.speechSynthesis.cancel();
  }
}

function showResult(content) {
  const resultDiv = document.createElement("div");
  resultDiv.className = "result-item";
  const resultContent = document.createElement("div");
  resultContent.className = "result-content";
  resultDiv.appendChild(resultContent);
  document.getElementById("results").appendChild(resultDiv);

  // Sanitize the content to remove any HTML tags
  const sanitizedContent = content.replace(/<[^>]*>/g, " "); 

  let index = 0;
  const interval = setInterval(() => {
    if (index < sanitizedContent.length) {
      resultContent.appendChild(document.createTextNode(sanitizedContent[index]));

      document.getElementById("results").scrollTop =
        document.getElementById("results").scrollHeight;

      index++;
    } else {
      clearInterval(interval);
    }
  }, 30);
}


function showTyping() {
  document.getElementById("results").innerHTML = `
    Generating response...
  `;
}




function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 100);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}
