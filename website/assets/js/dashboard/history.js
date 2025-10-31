         document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token"); // replace 'token' with your actual key

    // Select sidebar items
    const profileItem = document.querySelector('.nav-item[data-page="authentication/profile.html"]');
    const historyItem = document.querySelector('.nav-item[data-page="history.html"]');
    const logoutBtn = document.getElementById("logoutBtn");

    if (!token) {
        // If no token (Guest mode), hide Profile, History, and Logout button
        if(profileItem) profileItem.style.display = "none";
        if(historyItem) historyItem.style.display = "none";
        if(logoutBtn) logoutBtn.style.display = "none";
    } else {
        // If token exists, show them (optional, in case you want to reset)
        if(profileItem) profileItem.style.display = "flex";
        if(historyItem) historyItem.style.display = "flex";
        if(logoutBtn) logoutBtn.style.display = "flex";
    }
});
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
        const API_URL = "https://text-to-talk-backend-dd6a.vercel.app";
        const token = localStorage.getItem("token");
        let historyData = [];
        let selectedHistoryIds = [];
        let currentHistoryItem = null;
        const user = JSON.parse(localStorage.getItem("user"));
        const userId = user ? user.user_id : null;
         
        // Pagination variables
        let currentPage = 1;
        const itemsPerPage = 10;
        let totalPages = 1;
        let filteredData = [];

        // Check if user is authenticated
        if (!token || !userId) {
            window.location.href = "index.html";
        }

        // Initialize AOS
        AOS.init({
            duration: 600,
             offset: 100
        });

        // Show progress bar
        function showProgressBar() {
            const progressContainer = document.getElementById('progressContainer');
            const progressBar = document.getElementById('progressBar');
            progressContainer.style.display = 'block';

            let width = 0;
            const interval = setInterval(() => {
                if (width >= 80) {
                    clearInterval(interval);
                } else {
                    width += 5;
                    progressBar.style.width = width + '%';
                }
            }, 100);

            return () => {
                clearInterval(interval);
                progressBar.style.width = '100%';
                setTimeout(() => {
                    progressContainer.style.display = 'none';
                }, 300);
            };
        }

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

                        // Load history with user ID
                        loadHistory(userId);
                    }
                })
                .catch(err => {
                    console.error("Profile fetch error:", err);
                    localStorage.removeItem("token");
                    window.location.href = "index.html";
                });
        }

        // Load history data
        function loadHistory(userId) {
            const finishProgress = showProgressBar();

            fetch(`${API_URL}/history?user_id=${userId}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to fetch history');
                    }
                    return response.json();
                })
                .then(data => {
                    // Extract the history_record array from the response
                    historyData = data.history_record || [];
                    filteredData = [...historyData];

                    // Initialize pagination
                    totalPages = Math.ceil(filteredData.length / itemsPerPage);
                    updatePagination();

                    // Render first page
                    renderCurrentPage();

                    // Hide progress bar
                    finishProgress();
                })
                .catch(err => {
                    console.error("History fetch error:", err);
                    finishProgress();
                    showEmptyState();
                });
        }

        // Get current page data
        function getCurrentPageData() {
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            return filteredData.slice(startIndex, endIndex);
        }

        // Update pagination UI
        function updatePagination() {
            const prevBtn = document.getElementById('prevPage');
            const nextBtn = document.getElementById('nextPage');
            const pageInfo = document.getElementById('paginationInfo');

            prevBtn.disabled = currentPage === 1;
            nextBtn.disabled = currentPage === totalPages;

            pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

            // Show/hide pagination based on page count
            const paginationContainer = document.getElementById('pagination');
            paginationContainer.style.display = totalPages <= 1 ? 'none' : 'flex';
        }

        // Go to specific page
        function goToPage(page) {
            if (page < 1 || page > totalPages) return;

            currentPage = page;
            updatePagination();
            renderCurrentPage();

            // Scroll to top of history list
            document.getElementById('historyList').scrollIntoView({ behavior: 'smooth' });
        }

        // Render current page
        function renderCurrentPage() {
            const currentPageData = getCurrentPageData();
            renderHistoryList(currentPageData);
        }

        // Render history list
        function renderHistoryList(data) {
            const historyList = document.getElementById('historyList');

            if (!data || data.length === 0) {
                showEmptyState();
                return;
            }

            historyList.innerHTML = '';

            data.forEach((item, index) => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                historyItem.dataset.id = item._id;
                historyItem.setAttribute('data-aos', 'fade-up');
                historyItem.setAttribute('data-aos-delay', index * 50);

                // Extract title from history content if available
                let title = 'Untitled Transcription';
                if (item.history) {
                    const firstLine = item.history.split('\n')[0];
                    let cleanTitle = item.title ? item.title.replace(/\*\*/g, '').trim() : 'Untitled';
                    title = cleanTitle;
                }

                historyItem.innerHTML = `
                    <input type="checkbox" class="history-checkbox" data-id="${item._id}" onclick="event.stopPropagation()">
                    <div class="history-content">
                        <div class="history-title">${title}</div>
                        <div class="history-details">
                            <div class="history-detail">
                                <i class="fas fa-calendar"></i>
                                <span>${formatDate(item.created_at)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="history-actions-item">
                        <button class="action-btn btn-view" data-id="${item._id}">
                            <i class="fas fa-eye"></i> Details
                        </button>
                        <button class="action-btn btn-delete" data-id="${item._id}">
                            <i class="fas fa-trash-alt"></i> Delete
                        </button>
                    </div>
                `;

                // Add click event to the entire history item
                historyItem.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('history-checkbox') &&
                        !e.target.classList.contains('btn-delete') &&
                        !e.target.closest('.btn-delete')) {
                        handleViewDetailsFromItem(item._id);
                    }
                });

                historyList.appendChild(historyItem);
            });

            // Add event listeners to action buttons
            document.querySelectorAll('.btn-view').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleViewDetails(e);
                });
            });

            document.querySelectorAll('.btn-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleDeleteSingle(e);
                });
            });

            document.querySelectorAll('.history-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', handleCheckboxChange);
            });

            // Refresh AOS to detect new elements
            AOS.refresh();
        }

        // Handle view details from item click
        function handleViewDetailsFromItem(id) {
            const item = historyData.find(item => item._id === id);
            if (item) {
                currentHistoryItem = item;
                showHistoryDetails(item);
            }
        }

        // Show empty state
        function showEmptyState() {
            const historyList = document.getElementById('historyList');
            historyList.innerHTML = `
                <div class="empty-state" data-aos="fade-up">
                    <div class="empty-icon">
                        <i class="fas fa-history"></i>
                    </div>
                    <p class="empty-text">No history found</p>
                </div>
            `;

            // Hide pagination when empty
            document.getElementById('pagination').style.display = 'none';

            // Refresh AOS to detect new elements
            AOS.refresh();
        }

        // Format date - handles the specific format from API
        function formatDate(dateString) {
            try {
                const date = new Date(dateString);
                if (isNaN(date.getTime())) {
                    return 'Invalid Date';
                }

                const options = { year: 'numeric', month: 'short', day: 'numeric' };
                return date.toLocaleDateString(undefined, options);
            } catch (e) {
                console.error("Date formatting error:", e);
                return 'Invalid Date';
            }
        }

        // Handle checkbox change
        function handleCheckboxChange(e) {
            const id = e.target.dataset.id;

            if (e.target.checked) {
                selectedHistoryIds.push(id);
            } else {
                selectedHistoryIds = selectedHistoryIds.filter(item => item !== id);
            }

            updateDeleteButtonState();
        }

        // Update delete button state
        function updateDeleteButtonState() {
            const deleteBtn = document.getElementById('deleteSelectedBtn');
            deleteBtn.disabled = selectedHistoryIds.length === 0;
        }

        // Handle view details
        function handleViewDetails(e) {
            const id = e.target.closest('.btn-view').dataset.id;
            const item = historyData.find(item => item._id === id);

            if (item) {
                currentHistoryItem = item;
                showHistoryDetails(item);
            }
        }

        // Show history details in modal
        function showHistoryDetails(item) {
            // Extract title from history content if available
            let title = 'Untitled Transcription';
            if (item.history) {
                let cleanTitle = item.title ? item.title.replace(/\*\*/g, '').trim() : 'Untitled';
                title = cleanTitle;

            }
            let cleanHistory = item.history.replace(/={5,}/g, "")                      // remove =====

            document.getElementById('modalTitle').textContent = title;
            document.getElementById('detailTitle').textContent = title;
            document.getElementById('detailDate').textContent = formatDate(item.created_at);
            document.getElementById('detailTranscription').textContent = cleanHistory || 'No transcription available.';

            const modal = document.getElementById('historyModal');
            modal.classList.add('open');
        }

        // Handle delete single history item
        function handleDeleteSingle(e) {
            const id = e.target.closest('.btn-delete').dataset.id;

            if (confirm('Are you sure you want to delete this item?')) {
                deleteHistoryItem(id);
            }
        }
async function parseResponse(response) {
    if (!response.ok) throw new Error(`Request failed (status: ${response.status})`);
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        return await response.json();
    }
    return await response.text();
}

        // Delete history item
   function deleteHistoryItem(id) {
    const finishProgress = showProgressBar();

    fetch(`${API_URL}/delete-history?history_id=${id}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        }
    })
        .then(async response => {
            if (!response.ok) {
                throw new Error(`Failed to delete history item (status: ${response.status})`);
            }

            // ✅ Plain text parse karo
            return await response.text();
        })
        .then(message => {
            console.log("Server Response:", message); // e.g. "1 history entry deleted"

            // Remove from data arrays
            historyData = historyData.filter(item => item._id !== id);
            filteredData = filteredData.filter(item => item._id !== id);

            // Recalculate pagination
            totalPages = Math.ceil(filteredData.length / itemsPerPage);
            if (currentPage > totalPages) {
                currentPage = Math.max(1, totalPages);
            }

            // Update UI
            updatePagination();
            renderCurrentPage();

            // Remove from selected IDs if present
            selectedHistoryIds = selectedHistoryIds.filter(itemId => itemId !== id);
            updateDeleteButtonState();

            // Hide progress bar
            finishProgress();
        })
        .catch(err => {
            console.error("Delete error:", err);
            finishProgress();
            toast.error('Failed to delete history item');
        });
}

        // Delete selected history items
        function deleteSelectedHistory() {
            if (selectedHistoryIds.length === 0) {
                toast.warning('Please select at least one item to delete');
                return;
            }

            if (confirm(`Are you sure you want to delete ${selectedHistoryIds.length} item(s)?`)) {
                const finishProgress = showProgressBar();

                fetch(`${API_URL}/delete/select/history`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ history_ids: selectedHistoryIds })
                })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Failed to delete selected history items');
                        }
                        return response.json();
                    })
                    .then(data => {
                        // Remove deleted items from data arrays
                        historyData = historyData.filter(item => !selectedHistoryIds.includes(item._id));
                        filteredData = filteredData.filter(item => !selectedHistoryIds.includes(item._id));

                        // Recalculate pagination
                        totalPages = Math.ceil(filteredData.length / itemsPerPage);
                        if (currentPage > totalPages) {
                            currentPage = Math.max(1, totalPages);
                        }

                        // Update UI
                        updatePagination();
                        renderCurrentPage();

                        // Reset selection
                        selectedHistoryIds = [];
                        updateDeleteButtonState();

                        // Hide progress bar
                        finishProgress();
                    })
                    .catch(err => {
                        console.error("Delete error:", err);
                        finishProgress();
                        toast.error('Failed to delete selected items');
                    });
            }
        }

        // Delete all history
     function deleteAllHistory() {
    if (historyData.length === 0) {
        toast.info('No history items to delete');
        return;
    }

    if (confirm('Are you sure you want to delete all history items? This action cannot be undone.')) {
        const finishProgress = showProgressBar();

        fetch(`${API_URL}/delete/all/history?user_id=${userId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        })
            .then(async response => {
                if (!response.ok) {
                    throw new Error(`Failed to delete all history (status: ${response.status})`);
                }

                // ✅ Plain text parse karo (JSON nahi)
                return await response.text();
            })
            .then(message => {
                console.log("Server Response:", message); // e.g. "5 history entries deleted"

                // Clear local data
                historyData = [];
                filteredData = [];
                selectedHistoryIds = [];

                // Clear DOM
                const historyContainer = document.getElementById("history-container");
                if (historyContainer) historyContainer.innerHTML = "";

                // Reset pagination
                currentPage = 1;
                totalPages = 1;

                updatePagination();
                showEmptyState();
                updateDeleteButtonState();

                finishProgress();
            })
            .catch(err => {
                console.error("Delete error:", err);
                finishProgress();
                toast.error('Failed to delete all history');
            });
    }
}

        // Search history
        function searchHistory(query) {
            if (!query) {
                filteredData = [...historyData];
            } else {
                filteredData = historyData.filter(item => {
                    const searchableText = `${item.title || ''} ${item.history || ''}`.toLowerCase();
                    return searchableText.includes(query.toLowerCase());
                });
            }

            // Reset to first page when searching
            currentPage = 1;
            totalPages = Math.ceil(filteredData.length / itemsPerPage);
            updatePagination();
            renderCurrentPage();
        }

        // Download as text
        function downloadAsText() {
            if (!currentHistoryItem) return;

            const content = currentHistoryItem.history || 'No content available';
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${currentHistoryItem.title || 'transcription'}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

     // ✅ Download as PDF (Styled like Word Export)
function downloadAsPDF() {
    if (!currentHistoryItem) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    const marginLeft = 15;
    const marginTop = 20;
    const maxWidth = 180; // A4 width 210mm - 2*15mm margins

    const rawTitle = (currentHistoryItem.title || 'Talk To Text Pro').replace(/\*\*/g, '').trim();
    const title = rawTitle || 'Talk To Text Pro';
    const date = currentHistoryItem.created_at
        ? new Date(currentHistoryItem.created_at).toLocaleString()
        : new Date().toLocaleString();

    // Clean content to plain text
    let content = (currentHistoryItem.history || '').replace(/={3,}/g, '').replace(/\*\*/g, '');
    const tmp = document.createElement('div');
    tmp.innerHTML = content;
    content = (tmp.textContent || tmp.innerText || content).trim();

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(title, marginLeft, marginTop);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(date, marginLeft, marginTop + 6);

    // Body
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(content || 'No content available.', maxWidth);
    let y = marginTop + 14;
    const lineHeight = 6;
    lines.forEach(line => {
        if (y > 280) { // new page
            doc.addPage();
            y = marginTop;
        }
        doc.text(line, marginLeft, y);
        y += lineHeight;
    });

    doc.save(`${title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
}

 function formatContent(raw) {
    let formatted = raw;

    // ✅ Bold headings with extra spacing
    formatted = formatted.replace(/(\d+\.\s*Abstract Summary)/i, "<br><b>$1</b><br>");
    formatted = formatted.replace(/(\d+\.\s*Key Points)/i, "<br><b>$1</b><br>");
    formatted = formatted.replace(/(\d+\.\s*Action Items)/i, "<br><b>$1</b><br>");
    formatted = formatted.replace(/(\d+\.\s*Sentiment Analysis)/i, "<br><b>$1</b><br>");
    formatted = formatted.replace(/(\d+\.\s*Proper Transcript)/i, "<br><b>$1</b><br>");

    // ✅ Convert * bullets to <ul><li>
    formatted = formatted.replace(/\*\s+(.*?)(?=\n|$)/g, "<li>$1</li>");
    formatted = formatted.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");

    // ✅ Convert numbered action items to <ol><li>
    formatted = formatted.replace(/(\d+)\.\s+(.*?)(?=\n|$)/g, "<li>$2</li>");
    formatted = formatted.replace(/(<li>.*<\/li>)/gs, "<ol>$1</ol>");

    // ✅ Replace plain new lines with <br> for Word readability
    formatted = formatted.replace(/\n/g, "<br>");

    return formatted.trim();
}

    function downloadAsWord() {
    const title = document.getElementById("detailTitle").innerText;
    const date = document.getElementById("detailDate").innerText;
    let history = document.getElementById("detailTranscription").innerHTML;

    // ✅ Headings: h2 size + dark blue color + margin-top 15 + margin-bottom 5 + underline
    history = history
        .replace(/(\d+\.\s*Abstract Summary)/gi, "<h3 style='font-weight:bold; font-size:22px; margin:15px 0 5px; text-decoration:underline; color:#1a3c8b;'>$1</h3>")
        .replace(/(\d+\.\s*Key Points)/gi, "<h3 style='font-weight:bold; font-size:22px; margin:15px 0 5px; text-decoration:underline; color:#1a3c8b;'>$1</h3>")
        .replace(/(\d+\.\s*Action Items)/gi, "<h3 style='font-weight:bold; font-size:22px; margin:15px 0 5px; text-decoration:underline; color:#1a3c8b;'>$1</h3>")
        .replace(/(\d+\.\s*Sentiment Analysis)/gi, "<h3 style='font-weight:bold; font-size:22px; margin:15px 0 5px; text-decoration:underline; color:#1a3c8b;'>$1</h3>")
        .replace(/(\d+\.\s*Proper Transcript)/gi, "<h3 style='font-weight:bold; font-size:22px; margin:15px 0 5px; text-decoration:underline; color:#1a3c8b;'>$1</h3>");

    // ✅ Convert * points to <ul><li>
    history = history.replace(/(?:\r?\n)?\*\s+(.+?)(?=\r?\n|\*|$)/g, "<li>$1</li>");
    history = history.replace(/(<li>[\s\S]*?<\/li>)+/g, match => `<ul>${match}</ul>`);

    const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>${title}</title></head>
    <body style="font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.5;">
        <h2 style="text-align:center; font-weight:bold; margin-bottom:10px; color:#1a3c8b;">${title}</h2>
        <p style="text-align:center; font-weight:bold; margin-bottom:20px; color:#333;">${date}</p>
        <div>${history}</div>
    </body>
    </html>`;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(htmlContent);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/[^a-z0-9]/gi, "_")}.doc`;
    link.click();
}

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
                localStorage.removeItem("user");
                window.location.href = "index.html";
            }
        }

        // Initialize when page loads
        document.addEventListener('DOMContentLoaded', function () {
            // Load user data
            loadUserData();

            // Toggle sidebar on mobile
            const menuToggle = document.getElementById('menu-toggle');
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.getElementById('overlay');

            menuToggle.addEventListener('click', function () {
                sidebar.classList.toggle('open');
                overlay.classList.toggle('open');
            });

            overlay.addEventListener('click', function () {
                sidebar.classList.remove('open');
                overlay.classList.remove('open');
            });
// Theme initialization from localStorage
const savedTheme = localStorage.getItem("theme");
const body = document.body;
const themeToggle = document.getElementById('theme-toggle');

// Set default to dark theme
if (savedTheme === "light") {
    body.classList.remove('dark-mode');
    body.classList.add('light-mode');
    themeToggle.classList.remove('dark');
} else {
    // Default dark theme
    body.classList.remove('light-mode');
    body.classList.add('dark-mode');
    themeToggle.classList.add('dark');
    // Ensure dark theme is saved if not already set
    if (!savedTheme) {
        localStorage.setItem("theme", "dark");
    }
}

// Toggle dark/light mode with localStorage saving
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
            // Search functionality
            const searchInput = document.getElementById('searchInput');
            searchInput.addEventListener('input', (e) => {
                searchHistory(e.target.value);
            });

            // Delete selected button
            document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelectedHistory);

            // Delete all button
            document.getElementById('deleteAllBtn').addEventListener('click', deleteAllHistory);

            // Modal close button
            document.getElementById('modalClose').addEventListener('click', () => {
                document.getElementById('historyModal').classList.remove('open');
            });

            // Download buttons
            document.getElementById('downloadTxt').addEventListener('click', downloadAsText);
            document.getElementById('downloadPdf').addEventListener('click', downloadAsPDF);
            document.getElementById('downloadWord').addEventListener('click', downloadAsWord);

            // Close modal when clicking outside
            document.getElementById('historyModal').addEventListener('click', (e) => {
                if (e.target === document.getElementById('historyModal')) {
                    document.getElementById('historyModal').classList.remove('open');
                }
            });

            // Pagination buttons
            document.getElementById('prevPage').addEventListener('click', () => {
                goToPage(currentPage - 1);
            });

            document.getElementById('nextPage').addEventListener('click', () => {
                goToPage(currentPage + 1);
            });
        });