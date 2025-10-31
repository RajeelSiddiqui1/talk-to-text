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
        // Only add logout event listener when logged in
        if(logoutBtn) {
            logoutBtn.addEventListener("click", function() {
                logoutUser();
            });
        }
    }
});
    document.addEventListener("DOMContentLoaded", function () {
        const navItems = document.querySelectorAll(".nav-item");
        const API_URL = "https://text-to-talk-backend-dd6a.vercel.app";
let userId = "";
try {
    const user = JSON.parse(localStorage.getItem("user"));
    userId = user?.user_id ?? "";
} catch (error) {
    // If parsing fails or no user object exists, keep userId as empty string
    userId = "";
}        let userData = null;
        let historyData = [];
        let chartsInitialized = false;

        // Navigation click handlers
        navItems.forEach(item => {
            item.addEventListener("click", () => {
                const page = item.getAttribute("data-page");
                if (page) {
                    window.location.href = page;
                }
            });
        });
 document.getElementById("uploadMeetingAudio").addEventListener("click", function () {
        window.location.href = "chatboat.html"; // yahan apna chatboat page ka URL daal do
    });
    document.getElementById("viewhistory").addEventListener("click", function () {
        let token = localStorage.getItem('token');
        if(token) window.location.href = "history.html"; else toast.warning("Please login first to view history")
         // yahan apna chatboat page ka URL daal do
    });
        // PDF download function
        function downloadAsPDF() {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');

            const title = (document.getElementById('modalTitle').innerText || 'Talk To Text Pro').trim();
            const date = (document.getElementById('modalDate').innerText || new Date().toLocaleString()).trim();
            const historyHTML = document.getElementById('modalHistory').innerHTML || '';

            // Convert HTML to plain text
            const tmp = document.createElement('div');
            tmp.innerHTML = historyHTML
                .replace(/={3,}/g, '')
                .replace(/\*\*/g, '');
            const content = (tmp.textContent || tmp.innerText || 'No content available').trim();

            const marginLeft = 15;
            const marginTop = 20;
            const maxWidth = 180;

            // Header
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.text(title, marginLeft, marginTop);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(date, marginLeft, marginTop + 6);

            // Body
            doc.setFontSize(11);
            const lines = doc.splitTextToSize(content, maxWidth);
            let y = marginTop + 14;
            const lineHeight = 6;
            lines.forEach(line => {
                if (y > 280) {
                    doc.addPage();
                    y = marginTop;
                }
                doc.text(line, marginLeft, y);
                y += lineHeight;
            });

            doc.save(`${title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
        }

        // Word download function
        function downloadAsWord() {
            const title = document.getElementById("modalTitle").innerText;
            const date = document.getElementById("modalDate").innerText;
            let history = document.getElementById("modalHistory").innerHTML;
            
            // Headings: h2 size + dark blue color + margin-top 15 + margin-bottom 5 + underline
            history = history
                .replace(/(\d+\.\s*Abstract Summary)/gi, "<h3 style='font-weight:bold; font-size:22px; margin:15px 0 5px; text-decoration:underline; color:#1a3c8b;'>$1</h3>")
                .replace(/(\d+\.\s*Key Points)/gi, "<h3 style='font-weight:bold; font-size:22px; margin:15px 0 5px; text-decoration:underline; color:#1a3c8b;'>$1</h3>")
                .replace(/(\d+\.\s*Action Items)/gi, "<h3 style='font-weight:bold; font-size:22px; margin:15px 0 5px; text-decoration:underline; color:#1a3c8b;'>$1</h3>")
                .replace(/(\d+\.\s*Sentiment Analysis)/gi, "<h3 style='font-weight:bold; font-size:22px; margin:15px 0 5px; text-decoration:underline; color:#1a3c8b;'>$1</h3>")
                .replace(/(\d+\.\s*Proper Transcript)/gi, "<h3 style='font-weight:bold; font-size:22px; margin:15px 0 5px; text-decoration:underline; color:#1a3c8b;'>$1</h3>");

            // Convert * points to <ul><li>
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

        // Function to process history data for charts
        function processHistoryData(historyRecords) {
            // Process data for charts
            const monthlyData = processMonthlyData(historyRecords);
            const weeklyData = processWeeklyData(historyRecords);

            return {
                monthly: monthlyData,
                weekly: weeklyData
            };
        }

        // Process monthly data for line chart
        function processMonthlyData(records) {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthlyCounts = new Array(12).fill(0);

            records.forEach(record => {
                const date = new Date(record.created_at);
                const month = date.getMonth();
                monthlyCounts[month]++;
            });

            return {
                labels: monthNames,
                data: monthlyCounts
            };
        }

        // Process weekly data for bar chart
        function processWeeklyData(records) {
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const dailyCounts = new Array(7).fill(0);

            records.forEach(record => {
                const date = new Date(record.created_at);
                const day = date.getDay();
                dailyCounts[day]++;
            });

            return {
                labels: dayNames,
                data: dailyCounts
            };
        }

        // Function to update the recent notes section
        function updateRecentNotes(records) {
            const notesGrid = document.querySelector('.notes-grid');
            notesGrid.innerHTML = ''; // Clear existing content

            // Sort by date (newest first) & take up to 3
            const recentRecords = records
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 3);

            recentRecords.forEach(record => {
                const noteCard = document.createElement('div');
                noteCard.className = 'note-card';

                // Format date
                const recordDate = new Date(record.created_at);
                const formattedDate = recordDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });

                noteCard.innerHTML = `
                    <div class="note-header">
                        <div>
                            <h3 class="note-title">
                                ${(record.title || 'Untitled Note').replace(/\*\*/g, '')}
                            </h3>
                            <div class="note-date">${formattedDate}</div>
                        </div>
                        <div class="note-menu">
                            <i class="fas fa-ellipsis-v"></i>
                        </div>
                    </div>
                    <div class="note-content">
                        <p class="note-text">
                            ${truncateText(record.history || 'No summary available', 200)}
                        </p>
                    </div>
                `;

                // Click to open modal with full details
                noteCard.addEventListener("click", function () {
                    openNoteModal(record, formattedDate);
                });

                notesGrid.appendChild(noteCard);
            });

            if (recentRecords.length === 0) {
                notesGrid.innerHTML = '<p>No processed notes yet. Upload your first audio file to get started!</p>';
            }
        }

        // Word-safe truncate function
        function truncateText(text, maxLength) {
            if (text.length > maxLength) {
                const trimmed = text.substring(0, maxLength);
                return trimmed.substring(0, trimmed.lastIndexOf(" ")) + "...";
            }
            return text;
        }

        const modal = document.getElementById("noteModal");
        const modalTitle = document.getElementById("modalTitle");
        const modalDate = document.getElementById("modalDate");
        const modalHistory = document.getElementById("modalHistory");

        function openNoteModal(record, formattedDate) {
            modalTitle.textContent = (record.title || 'Untitled Note').replace(/\*\*/g, '');
            modalDate.textContent = formattedDate;

            // Clean response and format headings
            let cleanedHistory = (record.history || 'No summary available')
                .replace(/={5,}/g, '') // remove =====
                .trim();

            // Replace section titles with bold
            cleanedHistory = cleanedHistory
                .replace(/^(\d+\.\s*Abstract Summary)/im, "<b>$1</b>")
                .replace(/^(\d+\.\s*Key Points)/im, "<b>$1</b>")
                .replace(/^(\d+\.\s*Action Items)/im, "<b>$1</b>")
                .replace(/^(\d+\.\s*Sentiment Analysis)/im, "<b>$1</b>")
                .replace(/^(\d+\.\s*Proper Transcript)/im, "<b>$1</b>");

            // Preserve line breaks
            modalHistory.innerHTML = cleanedHistory.replace(/\n/g, "<br>");
            modal.style.display = "flex";
        }

        // Close Modal
        document.querySelector(".close").addEventListener("click", () => {
            modal.style.display = "none";
        });

        window.addEventListener("click", (e) => {
            if (e.target === modal) modal.style.display = "none";
        });

        async function fetchHistory() {
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(`${API_URL}/history?user_id=${userId}`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                });

                if (!response.ok) {
                    throw new Error(`Error fetching history: ${response.status}`);
                }

                const data = await response.json();
                let file_process = data.history_record.length;
                historyData = data.history_record;

                let displayCount = 0;
                const fileProcessElement = document.getElementById('file_proccess');

                const counterInterval = setInterval(() => {
                    displayCount++;
                    fileProcessElement.textContent = displayCount;

                    if(displayCount >= file_process) {
                        clearInterval(counterInterval); // stop the counter
                    }
                }, 50); // 50ms interval

                // Process data for charts
                const chartData = processHistoryData(historyData);

                // Initialize charts if not already done
                if (!chartsInitialized) {
                    initializeCharts();
                    chartsInitialized = true;
                }

                // Update charts with dynamic data
                updateCharts(chartData);

                // Update recent notes section
                updateRecentNotes(historyData);

            } catch (error) {
                console.error("Failed to load history:", error);
            }
        }

        // Function to update all charts with dynamic data
        function updateCharts(chartData) {
            if (!window.charts) return;

            // Update history chart (line chart)
            window.charts.history.data.labels = chartData.monthly.labels;
            window.charts.history.data.datasets[0].data = chartData.monthly.data;
            window.charts.history.update();

            // Update weekly usage chart (bar chart)
            window.charts.weeklyUsage.data.labels = chartData.weekly.labels;
            window.charts.weeklyUsage.data.datasets[0].data = chartData.weekly.data;
            window.charts.weeklyUsage.update();
        }

        // Initialize Charts
        function initializeCharts() {
            // History Chart (Line Chart)
            const historyCtx = document.getElementById('historyChart').getContext('2d');
            const historyChart = new Chart(historyCtx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    datasets: [{
                        label: 'Processed Files',
                        data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                        borderColor: '#4361ee',
                        backgroundColor: 'rgba(67, 97, 238, 0.1)',
                        tension: 0.4,
                        fill: true,
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });

            // Weekly Usage Chart (Bar Chart)
            const weeklyUsageCtx = document.getElementById('weeklyUsageChart').getContext('2d');
            const weeklyUsageChart = new Chart(weeklyUsageCtx, {
                type: 'bar',
                data: {
                    labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                    datasets: [{
                        label: 'Files',
                        data: [0, 0, 0, 0, 0, 0, 0],
                        backgroundColor: [
                            'rgba(67, 97, 238, 0.7)',
                            'rgba(67, 97, 238, 0.7)',
                            'rgba(67, 97, 238, 0.7)',
                            'rgba(67, 97, 238, 0.7)',
                            'rgba(67, 97, 238, 0.7)',
                            'rgba(67, 97, 238, 0.7)',
                            'rgba(67, 97, 238, 0.7)'
                        ],
                        borderRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });

            // Store chart references for theme updates
            window.charts = {
                history: historyChart,
                weeklyUsage: weeklyUsageChart
            };
        }

        // Update charts for dark mode
        function updateChartsForDarkMode() {
            if (!window.charts) return;

            const gridColor = 'rgba(255, 255, 255, 0.05)';

            // Update history chart
            window.charts.history.options.scales.y.grid.color = gridColor;
            window.charts.history.update();

            // Update weekly usage chart
            window.charts.weeklyUsage.options.scales.y.grid.color = gridColor;
            window.charts.weeklyUsage.update();
        }

        // Update charts for light mode
        function updateChartsForLightMode() {
            if (!window.charts) return;

            const gridColor = 'rgba(0, 0, 0, 0.05)';

            // Update history chart
            window.charts.history.options.scales.y.grid.color = gridColor;
            window.charts.history.update();

            // Update weekly usage chart
            window.charts.weeklyUsage.options.scales.y.grid.color = gridColor;
            window.charts.weeklyUsage.update();
        }

        // Logout function

        // Load user profile and data
        const token = localStorage.getItem("token");
        if (token) {
            fetch(`${API_URL}/auth/profile`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            })
                .then(response => response.json())
                .then(data => {
                    if (data.user) {
                        const user = data.user;

                        // Update Name & Email
                        document.getElementById('u_name').innerHTML = user.firstname || "Guest User"
                        document.querySelector(".user-name").textContent = user.firstname || "Guest User";
                        document.querySelector(".user-role").textContent = user.email || "No Email Found";

                        // Avatar initials generate karo (first letter of firstname + lastname)
                        const initials = `${user.firstname?.[0] || ""}${user.lastname?.[0] || ""}`.toUpperCase();
                        document.querySelector(".user-avatar").textContent = initials || "U";
                        
                        // Fetch history after profile is loaded
                        fetchHistory();
                    }
                })
                .catch(err => {
                    console.error("Profile fetch error:", err);
                });
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

        // Toggle history submenu
        const historyToggle = document.querySelector('#historyToggle');
        if (historyToggle) {
            const historySubmenu = document.getElementById('history-submenu');
            const historyToggleIcon = historyToggle.querySelector('.nav-toggle i');

            historyToggle.addEventListener('click', function () {
                historySubmenu.classList.toggle('open');
                if (historySubmenu.classList.contains('open')) {
                    historyToggleIcon.classList.remove('fa-chevron-down');
                    historyToggleIcon.classList.add('fa-chevron-up');
                } else {
                    historyToggleIcon.classList.remove('fa-chevron-up');
                    historyToggleIcon.classList.add('fa-chevron-down');
                }
            });
        }

        // Toggle dark/light mode
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
        // Handle history item selection
        const historyCheckboxes = document.querySelectorAll('.history-checkbox');
        historyCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function () {
                const historyItem = this.closest('.history-item');
                if (this.checked) {
                    historyItem.style.backgroundColor = 'var(--bg-tertiary)';
                } else {
                    historyItem.style.backgroundColor = 'var(--bg-secondary)';
                }
            });
        });

        // Add hover effects to cards
        const cards = document.querySelectorAll('.action-card, .note-card, .stat-card');
        cards.forEach(card => {
            card.addEventListener('mouseenter', function () {
                this.style.transform = 'translateY(-5px)';
                this.style.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.1)';
            });

            card.addEventListener('mouseleave', function () {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            });
        });

        // Simulate progress animation
        setTimeout(function () {
            const progressFill = document.querySelector('.fill-0');
            if (progressFill) {
                progressFill.style.width = '30%';
            }
        }, 1000);

        // Floating button animation
        const floatingBtn = document.querySelector('.floating-btn');
        if (floatingBtn) {
            floatingBtn.addEventListener('click', function () {
                this.classList.add('pulse');
                setTimeout(() => {
                    this.classList.remove('pulse');
                }, 1000);

                // Simulate starting a new recording
                const icon = this.querySelector('i');
                icon.classList.remove('fa-microphone');
                icon.classList.add('fa-circle');
                this.style.backgroundColor = 'var(--danger)';

                setTimeout(() => {
                    icon.classList.remove('fa-circle');
                    icon.classList.add('fa-microphone');
                    this.style.backgroundColor = 'var(--primary)';
                }, 3000);
            });
        }
    });
            async function logoutUser() {
            const token = localStorage.getItem("token");
            if (!token) {
                // already logged out → redirect
                window.location.href = "index.html";
                return;
            }

            try {
                const res = await fetch(`${API_URL}/logout`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    }
                });

                // Clear local storage regardless of API response
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                localStorage.removeItem("firstname");

                if (res.ok) {
                    console.log("Logout successful.");
                } else {
                    console.warn("Logout API returned error, but clearing local data.");
                }

                // redirect to index page
                window.location.href = "index.html";

            } catch (err) {
                console.error("Logout failed:", err);
                // Still clear local data and redirect
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                window.location.href = "index.html";
            }
        }
