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
const user = JSON.parse(localStorage.getItem("user"));
        const userId = user ? user.user_id : null;
                let userData = null;

        // Check if user is authenticated
        if (!token) {
            window.location.href = "../index.html";
        }
        async function fetchHistory() {
            try {
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
                 
               let displayElement = document.getElementById('file_proccess');

let start = 0;
let end = file_process;
let duration = 2000; // kitni der mein complete ho (ms)
let stepTime = Math.abs(Math.floor(duration / end));

let counter = setInterval(() => {
    start++;
    displayElement.textContent = start;
    if (start >= end) {
        clearInterval(counter);
    }
}, stepTime);

            } catch (error) {
                console.error("Failed to load history:", error);
            }
        }
        // Load user profile data
        function loadProfile() {
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
                        userData = data.user;
                        updateProfileUI(userData);
                        // console.log(userData);

                    }
                })
                .catch(err => {
                    console.error("Profile fetch error:", err);
                    localStorage.removeItem("token");
                    window.location.href = "index.html";
                });
        }

        // Update UI with profile data
        function updateProfileUI(user) {
            // Update profile section
            document.getElementById('profileName').textContent = `${user.firstname} ${user.lastname || ''}`;
            document.getElementById('profileEmail').textContent = user.email;
            document.getElementById('profileAvatar').textContent = `${user.firstname?.[0] || ''}${user.lastname?.[0] || ''}`.toUpperCase();
            const createdDate = new Date(user.created_at);
            document.getElementById('memberSince').textContent = createdDate.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
            // Output: 11 Sep 2025

            // Total time calculate karo minutes me
            const now = new Date();
            const diffMs = now - createdDate; // milliseconds ka difference
            const diffMinutes = Math.floor(diffMs / 1000 / 60); // ms -> seconds -> minutes
            document.getElementById('total_minutes').textContent = diffMinutes + " minutes";
            fetchHistory();

            // Update header
            document.getElementById('u_name').textContent = `${user.firstname} ${user.lastname || ''}`;
            document.getElementById('u_role').textContent = user.email;
            document.getElementById('u_avatar').textContent = `${user.firstname?.[0] || ''}${user.lastname?.[0] || ''}`.toUpperCase();

            // Fill edit form
            document.getElementById('editFirstName').value = user.firstname || '';
            document.getElementById('editLastName').value = user.lastname || '';
            document.getElementById('editEmail').value = user.email || '';
        }

        // Save profile changes
        function saveProfile() {
            document.getElementById('saveProfileBtn').innerHTML = "Saveing..."
            const firstname = document.getElementById('editFirstName').value;
            const lastname = document.getElementById('editLastName').value;
            const email = document.getElementById('editEmail').value;

            fetch(`${API_URL}/auth/profile`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ firstname, lastname, email })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.message) {
                        toast.success('Profile updated successfully!');
            document.getElementById('saveProfileBtn').innerHTML = "Save Changes"

                        loadProfile(); // Reload profile data
                    } else {
                        toast.error('Error updating profile: ' + (data.error || 'Unknown error'));
                    }
                })
                .catch(err => {
                    console.error("Update error:", err);
                    toast.error('Error updating profile');
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
                localStorage.removeItem("user_id");
                localStorage.removeItem("user");


                window.location.href = "login.html";
            }
        }

        // Initialize when page loads
        document.addEventListener('DOMContentLoaded', function () {
            // Load profile data
            loadProfile();

            // Setup event listeners
            document.getElementById('saveProfileBtn').addEventListener('click', saveProfile);

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

            // Toggle history submenu
            const historyToggle = document.getElementById('history-toggle');
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

            // Toggle dark/light mode
            const themeToggle = document.getElementById('theme-toggle');
            const body = document.body;

            themeToggle.addEventListener('click', function () {
                if (body.classList.contains('light-mode')) {
                    body.classList.remove('light-mode');
                    body.classList.add('dark-mode');
                    themeToggle.classList.add('dark');
                } else {
                    body.classList.remove('dark-mode');
                    body.classList.add('light-mode');
                    themeToggle.classList.remove('dark');
                }
            });
        });