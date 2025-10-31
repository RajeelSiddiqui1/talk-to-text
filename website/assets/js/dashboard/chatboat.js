// const API_URL = "https://talk-to-text-seven.vercel.app";
const API_URL = "https://text-to-talk-backend-dd6a.vercel.app";
const ASSEMBLY_API_KEY = "3674a77753904f9f91f05d1fc731aa55";
const API_KEY = "AIzaSyAaJiXAcvDNUmJ4DzJ1oxNWNTxXSH-oQRM";
const token = localStorage.getItem("token");
let mediaRecorder;
let audioChunks = [];
let selectedFile = null;
let isRecording = false;
let currentAudioUrl = null;
let progressInterval = null;

// Google Drive helpers
function extractDriveFileId(url) {
    try {
        if (!url) return null;
        // Patterns: /file/d/{id}/view, open?id={id}, uc?id={id}
        const fileD = url.match(/\/file\/d\/([A-Za-z0-9_-]{20,})/);
        if (fileD) return fileD[1];
        const openId = url.match(/[?&]id=([A-Za-z0-9_-]{20,})/);
        if (openId) return openId[1];
        const ucId = url.match(/[?&]id=([A-Za-z0-9_-]{20,})/);
        if (ucId) return ucId[1];
        return null;
    } catch { return null; }
}

function buildDriveDirectDownload(id) {
    return `https://drive.google.com/uc?export=download&id=${id}`;
}

async function sendFromDriveLink() {
    try {
        const input = document.getElementById('driveLinkInput');
        const link = input ? input.value.trim() : '';
        if (!link) { toast.warning('Paste a Google Drive shared link'); return; }
        const fileId = extractDriveFileId(link);
        if (!fileId) { toast.error('Invalid Google Drive shared link'); return; }
        const directUrl = buildDriveDirectDownload(fileId);

        showLoading();
        progressInterval = simulateProgress();

        // Create transcript directly from URL
        const transcriptBody = {
            audio_url: directUrl,
            language_detection: true
        };

        const transcriptRes = await fetch("https://api.assemblyai.com/v2/transcript", {
            method: "POST",
            headers: { 
                "authorization": ASSEMBLY_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(transcriptBody)
        });
        if (!transcriptRes.ok) {
            const errorText = await transcriptRes.text();
            throw new Error(`Transcript creation failed: ${transcriptRes.status} ${errorText}`);
        }
        const transcriptJson = await transcriptRes.json();
        const transcriptId = transcriptJson.id;

        // Polling until completed
        let status = "";
        let transcript = "";
        let errorMessage = "";
        while(status !== "completed" && status !== "error") {
            await new Promise(r => setTimeout(r, 2000));
            const checkRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
                headers: { "authorization": ASSEMBLY_API_KEY }
            });
            if (!checkRes.ok) {
                const t = await checkRes.text();
                throw new Error(`Status check failed: ${checkRes.status} ${t}`);
            }
            const checkJson = await checkRes.json();
            status = checkJson.status;
            errorMessage = checkJson.error || "";
            if(status === "completed") {
                transcript = checkJson.text;     
                break;
            }
            if(status === "error") {
                throw new Error(`Transcription failed: ${errorMessage}`);
            }
        }

        completeProgress();
        hideLoading();

        await callGemini(transcript);
        toast.success('Transcription completed from Google Drive link');
    } catch (e) {
        console.error('Drive link transcription error:', e);
        completeProgress();
        hideLoading();
        toast.error(e.message || 'Failed to transcribe link');
    }
}

async function callGemini(promptText) {
    const prompt = `
    You are an expert AI assistant specialized in analyzing meeting recordings, audio discussions, and video content. 
Your job is to take an audio/video transcript and provide a structured, clear, and professional response in ENGLISH ONLY. 
Do NOT use any other language. 
Always keep formatting consistent with headings and bullet points. 
Follow the structure below very strictly:

====================================================================
1. Abstract Summary
   - Provide a short overview (3–5 sentences) of the entire transcript.
   - Keep it professional and concise.
   - Avoid repetition. Focus on the purpose and main discussion.

2. Key Points
   - Extract the most important points from the transcript.
   - Present them in clear bullet points.
   - Each point should be precise, capturing essential details.
   - Do not add unnecessary details, only the key information.
   - Use numbered format (1, 2, 3, …).

3. Action Items
   - List clear, concise, and actionable tasks derived from the discussion.
   - Use numbered format (1, 2, 3, …).
   - Each action should be written as a direct instruction.
   - Make sure action items are practical and easy to follow.

4. Sentiment Analysis
   - Identify the overall sentiment of the discussion: Positive, Neutral, or Negative.
   - Briefly explain WHY you selected that sentiment (1–2 lines).
   - Keep explanation factual and objective, not opinionated.

5. Proper Transcript
   - Provide the cleaned, readable version of the transcript.
   - Remove filler words (uh, um, like, you know).
   - Ensure proper grammar, punctuation, and readability.
   - Keep original meaning intact, but make it professional.

====================================================================
Rules:
- Response MUST always follow the above format with proper headings.
- Never skip a section, even if content is missing.
    The user may input text in any language. You must respond only in English, using the following structured format: Abstract Summary, Key Details, Action Items, Additional Notes. Do not skip any section.
- Always keep the output well-formatted with headings and spacing.
- Output should look neat and professional, similar to a business meeting summary.
- Always respond in ENGLISH ONLY. Never use any other language under any circumstances.
`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt + "\n\nConvertit according to given formate:\n" + promptText
                                }
                            ],
                        },
                    ],
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status} - ${errorText}`);
        }

        const data = await response.json();
       addBotResponse(data.candidates[0].content.parts[0].text);

const req = data.candidates[0].content.parts[0].text;

const options = {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ message: req }) // better naming
};

try {
  const resp = await fetch("https://text-to-talk-backend-frj5.vercel.app/save-history", options);

  if (!resp.ok) {
    throw new Error(`HTTP error! status: ${resp.status}`);
  }

  const data = await resp.json(); // or await resp.text() if backend returns text
  
} catch (error) {
  console.error("Error:", error);
}

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        addBotResponse("Sorry, there was an error processing your request. Please try again.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");

    // Select sidebar items
    const profileItem = document.querySelector('.nav-item[data-page="authentication/profile.html"]');
    const historyItem = document.querySelector('.nav-item[data-page="history.html"]');
    const logoutBtn = document.getElementById("logoutBtn");

    if (!token) {
        // If no token (Guest mode), hide Profile, History, and Logout button
        if (profileItem) profileItem.style.display = "none";
        if (historyItem) historyItem.style.display = "none";
        if (logoutBtn) logoutBtn.style.display = "none";
    } else {
        // If token exists, show them (optional, in case you want to reset)
        if (profileItem) profileItem.style.display = "flex";
        if (historyItem) historyItem.style.display = "flex";
        if (logoutBtn) logoutBtn.style.display = "flex";
    }
});

// Check if user is authenticated
document.addEventListener("DOMContentLoaded", function () {
    const navItems = document.querySelectorAll(".nav-item");

    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const page = item.getAttribute("data-page");
            if (page) {
                window.location.href = page;
            }
        });
    });
});

// Load user data
function loadUserData() {
    fetch(`${API_URL}/auth/profile`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Authentication failed');
            }
            return response.json();
        })
        .then(data => {
            if (data.user) {
                const user = data.user;
                document.getElementById('u_name').textContent = `${user.firstname} ${user.lastname || ''}`;
                document.getElementById('u_role').textContent = user.email;
                document.getElementById('u_avatar').textContent = `${user.firstname?.[0] || ''}${user.lastname?.[0] || ''}`.toUpperCase();
            }
        })
        .catch(err => {
            console.error("Profile fetch error:", err);
            localStorage.removeItem("token");
            // window.location.href = "index.html";
        });
}

// Logout function
async function logoutUser() {
    try {
        await fetch(`${API_URL}/logout`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });
    } catch (err) {
        console.error("Logout API error:", err);
    } finally {
        localStorage.removeItem("token");
        window.location.href = "index.html";
    }
}


// Add message to chat
function addMessage(content, isUser = false, timestamp = new Date()) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;

    const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    messageDiv.innerHTML = `
        <div class="message-content">${content}</div>
        <div class="message-meta">
            <span>${isUser ? 'You' : 'TalkToText Pro'}</span>
            <span>${timeString}</span>
        </div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Add audio message to chat
function addAudioMessage(audioFile, timestamp = new Date()) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user';

    // Create URL for the audio file
    if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl);
    }
    currentAudioUrl = URL.createObjectURL(audioFile);

    const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    messageDiv.innerHTML = `
        <div class="message-content">
            <i class="fas fa-music"></i> Audio File: ${audioFile.name}
            <div class="audio-player">
                <audio controls>
                    <source src="${currentAudioUrl}" type="${audioFile.type}">
                    Your browser does not support the audio element.
                </audio>
            </div>
        </div>
        <div class="message-meta">
            <span>You</span>
            <span>${timeString}</span>
        </div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addBotResponse(content, timestamp = new Date()) {
    const messagesContainer = document.getElementById('chatMessages');
    let resp_title = content?.title?.replace(/\*\*/g, "") || "TalkToText_Summary";
    
    // If content is an object, convert to string
    if (typeof content === "object") {
        if (content.resp) content = content.resp;
        else content = JSON.stringify(content, null, 2);
    }
    
    // Clean & format
    content = content
        .replace(/={5,}/g, "")
        .replace(/\\/g, "")
        .replace(/```/g, "")
        .replace(/^\s*\d+\.\s*Proper Transcript[\s\S]*$/gm, "")
        // Headings
        .replace(/^\s*(\d+)\.\s+(Abstract Summary|Key Points|Action Items|Sentiment Analysis)/gm, "<b class='bot-heading'>$1. $2</b><br>")
        // Markdown headings
        .replace(/^\s*#{1,6}\s?(.*)$/gm, "<b class='bot-heading'>$1</b><br>")
        // Bold inside text
        .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
        // Bullets
        .replace(/^\s*\*\s(.*)$/gm, "• $1<br>")
        // Numbered lists
        .replace(/^\s*(\d+)\.\s(.*)$/gm, "$1. $2<br>")
        // Speakers italic
        .replace(/^(Speaker \d+:)(.*)$/gm, "<i>$1$2</i><br>")
        .trim();

    const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const uniqueId = `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot message-content-wrapper';
    messagesContainer.appendChild(messageDiv);

    // Add meta & actions
    messageDiv.innerHTML = `
        <div class="message-content" id="${uniqueId}" style="line-height:1.6; font-size:15px;"></div>
        <div class="message-meta">
            <span>TalkToText Pro</span>
            <span>${timeString}</span>
        </div>
        <div class="message-actions">
            <button class="action-btn send-email">Generate PDF & Send Email</button>
            <button class="action-btn download-txt">Download as Text</button>
            <button class="action-btn download-pdf">Download as PDF</button>
            <button class="action-btn download-word">Download as Word</button>
        </div>
    `;

    const contentDiv = document.getElementById(uniqueId);

    // Start typing
    typeHTML(contentDiv, content, 15);

    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Event listeners for download buttons
    messageDiv.querySelector(".send-email").addEventListener("click", () => openPDFModal(uniqueId, resp_title));
    messageDiv.querySelector(".download-txt").addEventListener("click", () => downloadText(content));
    messageDiv.querySelector(".download-pdf").addEventListener("click", () => downloadPDF(uniqueId));
    messageDiv.querySelector(".download-word").addEventListener("click", () => downloadWord(uniqueId));
}

function typeHTML(element, html, speed = 15, callback) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const nodes = Array.from(tempDiv.childNodes);
    let nodeIndex = 0;

    function typeNode() {
        if (nodeIndex >= nodes.length) {
            if (callback) callback();
            return;
        }

        const node = nodes[nodeIndex];

        if (node.nodeType === Node.TEXT_NODE) {
            let text = node.textContent;
            let charIndex = 0;

            function typeChar() {
                element.innerHTML += text.charAt(charIndex);
                charIndex++;
                if (charIndex < text.length) {
                    setTimeout(typeChar, speed);
                } else {
                    nodeIndex++;
                    typeNode();
                }
            }

            typeChar();
        } else {
            const clone = node.cloneNode(false);
            element.appendChild(clone);
            if (node.childNodes.length > 0) {
                typeHTML(clone, node.innerHTML, speed, () => {
                    nodeIndex++;
                    typeNode();
                });
            } else {
                nodeIndex++;
                typeNode();
            }
        }
    }

    typeNode();
}

let cont_id, title_of_pdf;

function openPDFModal(contentid, pdf_title) {
    cont_id = contentid;
    title_of_pdf = pdf_title || "TalkToText_Summary";
    document.getElementById('pdfModal').style.display = 'flex';
    document.getElementById('modalSuccessMessage').style.display = 'none';
    document.getElementById('modalEmailInput').value = '';
}

function closePDFModal() {
    document.getElementById('pdfModal').style.display = 'none';
}

// Generate PDF and send email
async function generateAndSendPDF(contentid, pdf_title) {
    const contentElement = document.getElementById(contentid);
    const emailInput = document.getElementById('modalEmailInput').value.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(emailInput)) {
        toast.error("Please enter a valid email address!");
        return;
    }

    const token = localStorage.getItem("token");

    if (!emailInput) {
        toast.error("Please enter an email address.");
        return;
    }
    if (!token) {
        toast.warning("You are not logged in. Please login again.");
        return;
    }
    
    document.getElementById('sendEmail').innerHTML = 'Sending...';

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    // Extract plain text
    let text = (contentElement.textContent || contentElement.innerText || '').trim();
    if (!text) {
        const tmp = document.createElement('div');
        tmp.innerHTML = contentElement.innerHTML || '';
        text = (tmp.textContent || tmp.innerText || '').trim();
    }
    if (!text) {
        toast.error('No content found to export');
        document.getElementById('sendEmail').innerHTML = 'Send Email';
        return;
    }

    const marginLeft = 15;
    const marginTop = 20;
    const maxWidth = 180;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(text, maxWidth);
    let y = marginTop;
    const lineHeight = 6;
    lines.forEach(line => {
        if (y > 280) {
            doc.addPage();
            y = marginTop;
        }
        doc.text(line, marginLeft, y);
        y += lineHeight;
    });

    try {
        const pdfBlob = doc.output('blob');
        const formData = new FormData();
        formData.append('file', pdfBlob, `${pdf_title}.pdf`);
        formData.append('emailTo', emailInput);

        const response = await fetch("https://talk-totext-project-2g24.vercel.app/send-pdf-email", {
            method: 'POST',
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
        });
        const data = await response.json();

        if (response.ok) {
            toast.success(`PDF sent successfully to ${emailInput}!`);
            document.getElementById('modalSuccessMessage').style.display = 'block';
            document.getElementById('modalEmailInput').style.display = 'none';
            document.getElementById('sendEmail').style.display = 'none';

            setTimeout(() => {
                closePDFModal();
                document.getElementById('modalEmailInput').style.display = 'block';
                document.getElementById('sendEmail').style.display = 'block';
                document.getElementById('modalSuccessMessage').style.display = 'none';
                document.getElementById('sendEmail').innerHTML = 'Send Email';
            }, 3000);
        } else {
            toast.error(data.error || 'Failed to send email!');
            document.getElementById('sendEmail').innerHTML = 'Send Email';
        }
    } catch (err) {
        console.error('Email sending error:', err);
        toast.error('Something went wrong while sending the email.');
        document.getElementById('sendEmail').innerHTML = 'Send Email';
}
}

// Show loading indicator
function showLoading() {
    const messagesContainer = document.getElementById('chatMessages');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot';
    loadingDiv.id = 'loadingIndicator';

    loadingDiv.innerHTML = `
        <div class="loading-dots">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        </div>
    `;

    messagesContainer.appendChild(loadingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Hide loading indicator
function hideLoading() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.remove();
    }
}

async function downloadWord(contentId) {
    const text = document.getElementById(contentId);
    
    if (!text) {
        console.error("Content element not found");
        return;
    }

    const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
        <title>Professional Word Document</title>
        <style>
          /* Word Document CSS Styles */
          .message-content {
            width:100%;
            transform:scale(1.2);
          }
          /* Headings */
          b.bot-heading {
              display: block;
              font-size: 16pt;
              color: #0a66c2;
              margin-top: 24pt;
              margin-bottom: 12pt;
              font-weight: bold;
              border-bottom: 1px solid #0a66c2;
              padding-bottom: 4pt;
          }

          /* Paragraphs */
          p {
              margin: 12pt 0;
              text-align: justify;
          }

          /* Lists */
          ul {
              margin: 12pt 0 12pt 40pt;
          }

          li {
              margin: 6pt 0;
          }

          /* Numbered lists */
          ol {
              margin: 12pt 0 12pt 40pt;
          }

          /* Sections */
          .section {
              border: 1px solid #ddd;
              padding: 15px;
              border-radius: 6px;
              background-color: #f9f9f9;
          }

          /* Cover page */
          .cover-title {
              font-size: 28pt;
              text-align: center;
              margin-top: 120pt;
              color: #2c3e50;
              font-weight: bold;
          }

          .cover-subtitle {
              font-size: 14pt;
              text-align: center;
              margin-top: 40pt;
              color: #7f8c8d;
          }

          .cover-line {
              width: 200pt;
              height: 2pt;
              background: #3498db;
              margin: 40pt auto;
          }

          /* Footer */
          .footer {
              font-size: 9pt;
              text-align: center;
              margin-top: 40pt;
              color: #7f8c8d;
              border-top: 1px solid #ddd;
              padding-top: 12pt;
          }

          /* Table styles */
          table {
              width: 100%;
              border-collapse: collapse;
              margin: 15pt 0;
          }

          th {
              background-color: #f2f2f2;
              padding: 8pt;
              text-align: left;
              border: 1px solid #ddd;
          }

          td {
              padding: 8pt;
              border: 1px solid #ddd;
          }

          /* Highlighted text */
          .highlight {
              background-color: #ffff00;
              padding: 2pt 4pt;
          }

          /* Blockquote */
          blockquote {
              border-left: 4px solid #0a66c2;
              margin: 15pt 0;
              padding-left: 15pt;
              font-style: italic;
              color: #555;
          }

          /* Code blocks */
          .code {
              font-family: 'Courier New', monospace;
              background-color: #f5f5f5;
              padding: 10pt;
              border: 1px solid #ddd;
              border-radius: 4px;
              margin: 12pt 0;
          }

          /* Header for multi-page documents */
          .header {
              border-bottom: 1px solid #0a66c2;
              padding-bottom: 8pt;
              margin-bottom: 20pt;
          }

          /* Page breaks for print */
          .page-break {
              page-break-after: always;
          }

          /* Two-column layout */
          .two-column {
              display: flex;
              justify-content: space-between;
              margin: 15pt 0;
          }

          .column {
              width: 48%;
          }

          /* Callout boxes */
          .callout {
              background-color: #e3f2fd;
              border-left: 4px solid #0a66c2;
              padding: 12pt;
              margin: 15pt 0;
              border-radius: 4px;
          }

          /* Signature area */
          .signature {
              margin-top: 40pt;
              border-top: 1px solid #ddd;
              padding-top: 12pt;
          }
        </style>
    </head>
    <body>
        <div class="section">
            ${text.innerHTML
                // Convert line breaks to paragraphs for Word readability
                .replace(/<br>/g, '</p><p>')
                // Wrap bullets properly
                .replace(/•\s+/g, '<li>') // start li
                .replace(/<li>([^<]+)<\/p>/g, '<li>$1</li>') // fix li closing
            }
        </div>
    </body>
    </html>`;

    // Create a Blob object
    const blob = new Blob(['\ufeff', htmlContent], {
        type: 'application/msword'
    });

    // Create a download link
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'ProfessionalDocument.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

// Download as text file
function downloadText(content) {
    // Remove HTML tags for clean text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const cleanText = tempDiv.textContent || tempDiv.innerText || '';
    
    const blob = new Blob([cleanText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription-${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Download as PDF
function downloadPDF(contentId) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    const element = document.getElementById(contentId);
    if (!element) {
        console.error('Element not found:', contentId);
        return;
    }

    // Extract plain text
    let text = (element.textContent || element.innerText || '').trim();
    if (!text) {
        // Fallback: strip HTML tags
        const tmp = document.createElement('div');
        tmp.innerHTML = element.innerHTML || '';
        text = (tmp.textContent || tmp.innerText || '').trim();
    }
    if (!text) {
        toast.error('No content found to download!');
        return;
    }

    const marginLeft = 15;
    const marginTop = 20;
    const maxWidth = 180;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(text, maxWidth);
    let y = marginTop;
    const lineHeight = 6;
    lines.forEach(line => {
        if (y > 280) {
            doc.addPage();
            y = marginTop;
        }
        doc.text(line, marginLeft, y);
        y += lineHeight;
    });

    doc.save('TalkToTextPro.pdf');
}

// Progress bar simulation
function simulateProgress() {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const progressContainer = document.getElementById('progressContainer');

    progressContainer.style.display = 'block';
    let width = 0;

    return setInterval(() => {
        if (width >= 90) {
            clearInterval(progressInterval);
            return;
        }

        width += Math.random() * 10;
        if (width > 90) width = 90;

        progressBar.style.width = width + '%';
        progressText.textContent = `Processing... ${Math.floor(width)}%`;
    }, 500);
}

// Complete the progress bar
function completeProgress() {
    if (progressInterval) {
        clearInterval(progressInterval);
    }
    
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const progressContainer = document.getElementById('progressContainer');
    
    progressBar.style.width = '100%';
    progressText.textContent = 'Processing... 100%';
    
    // Hide progress bar after a short delay
    setTimeout(() => {
        progressContainer.style.display = 'none';
    }, 1000);
}

// Update sendAudio function to include language and progress
// Update the sendAudio function to use automatic language detection
async function sendAudio() {
    if (!selectedFile) {
        toast.warning('Please select an audio file first');
        return;
    }

    // Disable send button
    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    // Add audio message to chat
    addAudioMessage(selectedFile);

    showLoading();
    progressInterval = simulateProgress();

    try {
        // Upload to AssemblyAI
        try {
            const uploadRes = await fetch("https://api.assemblyai.com/v2/upload", {
                method: "POST",
                headers: { 
                    "authorization": ASSEMBLY_API_KEY,
                },
                body: selectedFile
            });
            
            if (!uploadRes.ok) {
                throw new Error(`Upload failed: ${uploadRes.status}`);
            }
            
            const uploadJson = await uploadRes.json();
            const audioUrl = uploadJson.upload_url;

            // Create transcript with automatic language detection
            const transcriptBody = {
                audio_url: audioUrl,
                language_detection: true // Enable automatic language detection
            };
            
            const transcriptRes = await fetch("https://api.assemblyai.com/v2/transcript", {
                method: "POST",
                headers: { 
                    "authorization": ASSEMBLY_API_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(transcriptBody)
            });
            
            if (!transcriptRes.ok) {
                const errorText = await transcriptRes.text();
                console.error("Transcript error:", errorText);
                throw new Error(`Transcript creation failed: ${transcriptRes.status}`);
            }
            
            const transcriptJson = await transcriptRes.json();
            const transcriptId = transcriptJson.id;
            
            // Polling until completed
            let status = "";
            let transcript = "";
            let detectedLanguage = "";
            let errorMessage = "";
            
            while(status !== "completed" && status !== "error") {
                await new Promise(r => setTimeout(r, 2000));
                const checkRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
                    headers: { "authorization": ASSEMBLY_API_KEY }
                });
                
                if (!checkRes.ok) {
                    const errorText = await checkRes.text();
                    console.error("Status check error:", errorText);
                    throw new Error(`Status check failed: ${checkRes.status}`);
                }
                
                const checkJson = await checkRes.json();
                status = checkJson.status;
                errorMessage = checkJson.error || "";
                detectedLanguage = checkJson.language_code || "";
                
                if(status === "completed") {
                    transcript = checkJson.text;     
                     break;
                }
                if(status === "error") {
                    throw new Error(`Transcription failed: ${errorMessage}`);
                }
            }
            
            // Complete progress and hide loading
            completeProgress(); 
            hideLoading();
              
            // Call Gemini with the transcript
            await callGemini(transcript);
            
        } catch(e) {
            console.error("AssemblyAI Error:", e);
            completeProgress();
            hideLoading();
            addBotResponse("Error: " + e.message);
        } finally {
            // Reset send button
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
        }
    } catch (error) {
        console.error("Error processing audio:", error);
        completeProgress();
        hideLoading();
        addBotResponse("Sorry, there was an error processing your audio.");
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
    }

    // Reset file selection
    selectedFile = null;
    document.getElementById('selectedFileContainer').style.display = 'none';
    document.getElementById('audioFile').value = '';
}
// Zoom functionality
function setupZoomControls() {
    let zoomLevel = 1; // 0: small, 1: normal, 2: large, 3: xlarge

    const zoomOutBtn = document.getElementById('zoomOut');
    const zoomResetBtn = document.getElementById('zoomReset');
    const zoomInBtn = document.getElementById('zoomIn');

    function applyZoom() {
        const messageContents = document.querySelectorAll('.message-content');
        messageContents.forEach(content => {
            content.classList.remove('zoom-small', 'zoom-normal', 'zoom-large', 'zoom-xlarge');

            switch (zoomLevel) {
                case 0:
                    content.classList.add('zoom-small');
                    break;
                case 1:
                    content.classList.add('zoom-normal');
                    break;
                case 2:
                    content.classList.add('zoom-large');
                    break;
                case 3:
                    content.classList.add('zoom-xlarge');
                    break;
            }
        });
    }

    zoomOutBtn.addEventListener('click', () => {
        if (zoomLevel > 0) {
            zoomLevel--;
            applyZoom();
        }
    });

    zoomResetBtn.addEventListener('click', () => {
        zoomLevel = 1;
        applyZoom();
    });

    zoomInBtn.addEventListener('click', () => {
        if (zoomLevel < 3) {
            zoomLevel++;
            applyZoom();
        }
    });
}

// Start recording - MODIFIED to ensure complete audio capture
async function startRecording() {
    if (isRecording) {
        stopRecording();
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                channelCount: 1,
                sampleRate: 16000,
                sampleSize: 16
            } 
        });
        
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
        });
        
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            selectedFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });

            document.getElementById('selectedFileName').textContent = 'Recording.webm';
            document.getElementById('selectedFileContainer').style.display = 'flex';

            const recordBtn = document.getElementById('recordBtn');
            recordBtn.classList.remove('recording');
            recordBtn.innerHTML = '<i class="fas fa-microphone"></i> Record';
            isRecording = false;
        };

        // Start recording and set timeslice to undefined to capture complete audio
        mediaRecorder.start(undefined);
        isRecording = true;

        const recordBtn = document.getElementById('recordBtn');
        recordBtn.classList.add('recording');
        recordBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Recording';
    } catch (error) {
        console.error('Error accessing microphone:', error);
        toast.error('Could not access your microphone. Please check your permissions.');
    }
}

// Stop recording
function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();

        // Stop all audio tracks
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function () {
    // Load user data
    if (token) {
        loadUserData();
    }

    // Toggle sidebar on mobile
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('overlay');

    if (menuToggle && sidebar && overlay) {
        menuToggle.addEventListener('click', function () {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('open');
        });

        overlay.addEventListener('click', function () {
            sidebar.classList.remove('open');
            overlay.classList.remove('open');
        });
    }

    // Theme initialization from localStorage
    const savedTheme = localStorage.getItem("theme");
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');

    // Set default to dark theme
    if (savedTheme === "light") {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        if (themeToggle) themeToggle.classList.remove('dark');
    } else {
        // Default dark theme
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        if (themeToggle) themeToggle.classList.add('dark');
        // Ensure dark theme is saved if not already set
        if (!savedTheme) {
            localStorage.setItem("theme", "dark");
        }
    }

    // Toggle dark/light mode with localStorage saving
    if (themeToggle) {
        themeToggle.addEventListener('click', function () {
            if (body.classList.contains('dark-mode')) {
                body.classList.remove('dark-mode');
                body.classList.add('light-mode');
                themeToggle.classList.remove('dark');
                localStorage.setItem("theme", "light");
            } else {
                body.classList.remove('light-mode');
                body.classList.add('dark-mode');
                themeToggle.classList.add('dark');
                localStorage.setItem("theme", "dark");
            }
        });
    }

    // File selection handler
    const audioFileInput = document.getElementById('audioFile');
    if (audioFileInput) {
        audioFileInput.addEventListener('change', function (e) {
            if (e.target.files.length > 0) {
                selectedFile = e.target.files[0];
                document.getElementById('selectedFileName').textContent = selectedFile.name;
                document.getElementById('selectedFileContainer').style.display = 'flex';
            }
        });
    }

    // Remove file handler
    const removeFileBtn = document.getElementById('removeFile');
    if (removeFileBtn) {
        removeFileBtn.addEventListener('click', function () {
            selectedFile = null;
            document.getElementById('selectedFileContainer').style.display = 'none';
            document.getElementById('audioFile').value = '';

            // If recording, stop it
            if (isRecording) {
                stopRecording();
            }
        });
    }

    // Record button handler
    const recordBtn = document.getElementById('recordBtn');
    if (recordBtn) {
        recordBtn.addEventListener('click', startRecording);
    }

    // Send button handler
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendAudio);
    }

    // Drive link button
    const sendDriveLinkBtn = document.getElementById('sendDriveLinkBtn');
    if (sendDriveLinkBtn) {
        sendDriveLinkBtn.addEventListener('click', sendFromDriveLink);
    }

    // Setup zoom controls
    setupZoomControls();

    // Setup email send button
    const sendEmailBtn = document.getElementById('sendEmail');
    if (sendEmailBtn) {
        sendEmailBtn.addEventListener('click', function () {
            document.getElementById('sendEmail').innerHTML = 'Sending...';
            generateAndSendPDF(cont_id, title_of_pdf);
        });
    }
    
    // Close modal button
    const closeModalBtn = document.querySelector('.close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closePDFModal);
    }
});