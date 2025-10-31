 if(localStorage.getItem("token")){
      window.location.href = "../dashboard.html";
    }
    const API_URL = "https://text-to-talk-backend-dd6a.vercel.app";

    function togglePassword(fieldId, el) {
      const field = document.getElementById(fieldId);
      if (field.type === "password") {
        field.type = "text";
        el.classList.replace("bi-eye", "bi-eye-slash");
      } else {
        field.type = "password";
        el.classList.replace("bi-eye-slash", "bi-eye");
      }
    }

    document.getElementById("loginForm").addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("loginEmail").value;
      const password = document.getElementById("loginPassword").value;
      const loginBtn = document.getElementById("loginBtn");

      // Button loading state
      loginBtn.disabled = true;
      loginBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Processing...`;

      try {
        const res = await fetch(`${API_URL}/auth/login`, {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({email, password})
        });
        const data = await res.json();

        if(res.ok){
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          toast.success(data.message || "Login successful!");
          setTimeout(()=> window.location.href="../dashboard.html", 1200);
        } else {
          toast.error(data.message || "Invalid credentials");
        }
      } catch(err){
        toast.error(err.message || "Network error. Please try again.");
      }

      // Reset button
      loginBtn.disabled = false;
      loginBtn.innerHTML = `<span>Login</span>`;
    });

    // Google Sign-In
    window.handleGoogleCredentialResponse = async (response) => {
      try {
        const idToken = response && response.credential;
        if (!idToken) {
          toast.error("Google sign-in failed");
          return;
        }

        const res = await fetch(`${API_URL}/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_token: idToken })
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.message || "Google authentication failed");
          return;
        }

        // Expecting: { token, user }
        if (data.token) localStorage.setItem("token", data.token);
        if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
        toast.success("Signed in with Google");
        setTimeout(() => window.location.href = "../dashboard.html", 800);
      } catch (e) {
        toast.error("Google sign-in error");
      }
    };

    // Render Google button with client_id fetched from backend
    window.addEventListener('load', async () => {
      try {
        const res = await fetch(`${API_URL}/config/public`);
        const cfg = await res.json();
        const clientId = cfg.google_client_id;
        if (!clientId) return;
        if (window.google && google.accounts && document.getElementById('googleLoginBtnContainer')) {
          google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCredentialResponse
          });
          google.accounts.id.renderButton(
            document.getElementById('googleLoginBtnContainer'),
            { theme: 'outline', size: 'large', shape: 'rectangular', text: 'signin_with' }
          );
        }
      } catch {}
    });