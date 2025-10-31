         if(localStorage.getItem("token")){
      window.location.href = "../dashboard.html";
    }
    const API_URL = "https://text-to-talk-backend-dd6a.vercel.app";
    let currentStep = 1;

    function updateProgressBar() {
      const progress = document.querySelector(".progress-bar");
      progress.style.width = `${currentStep * 33}%`;
    }

    function nextStep() {
      if (!validateStep(currentStep)) return;
      
      document.querySelector(`[data-step="${currentStep}"]`).classList.remove("active");
      currentStep++;
      document.querySelector(`[data-step="${currentStep}"]`).classList.add("active");
      updateProgressBar();
    }

    function prevStep() {
      document.querySelector(`[data-step="${currentStep}"]`).classList.remove("active");
      currentStep--;
      document.querySelector(`[data-step="${currentStep}"]`).classList.add("active");
      updateProgressBar();
    }

    function validateStep(step) {
      let isValid = true;
      
      if (step === 1) {
        const first = document.getElementById("firstname").value.trim();
        const last = document.getElementById("lastname").value.trim();
        
        if (!first) {
          document.getElementById("firstnameError").style.display = "block";
          isValid = false;
        } else {
          document.getElementById("firstnameError").style.display = "none";
        }
        
        if (!last) {
          document.getElementById("lastnameError").style.display = "block";
          isValid = false;
        } else {
          document.getElementById("lastnameError").style.display = "none";
        }
        
        return isValid;
      }
      
      if (step === 2) {
        const email = document.getElementById("email").value.trim();
        const emailPattern = /^\S+@\S+\.\S+$/;
        
        if (!emailPattern.test(email)) {
          document.getElementById("emailError").style.display = "block";
          isValid = false;
        } else {
          document.getElementById("emailError").style.display = "none";
        }
        
        return isValid;
      }
      
      return true;
    }

    function togglePassword(fieldId, el) {
      const field = document.getElementById(fieldId);
      field.type = field.type === "password" ? "text" : "password";
      el.classList.toggle("bi-eye");
      el.classList.toggle("bi-eye-slash");
    }

    document.getElementById("registerForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirmPassword").value;
      
      if (password !== confirmPassword) {
        document.getElementById("confirmPasswordError").style.display = "block";
        return;
      } else {
        document.getElementById("confirmPasswordError").style.display = "none";
      }
      
      if (password.length < 6) {
        document.getElementById("passwordError").style.display = "block";
        return;
      } else {
        document.getElementById("passwordError").style.display = "none";
      }
      
      const firstname = document.getElementById("firstname").value.trim();
      const lastname = document.getElementById("lastname").value.trim();
      const email = document.getElementById("email").value.trim();
      
      const registerBtn = document.getElementById("registerBtn");
      registerBtn.disabled = true;
      registerBtn.innerHTML = `<i class="bi bi-arrow-repeat spinner"></i>`;

      try {
        const res = await fetch(`${API_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstname, lastname, email, password })
        });
        
        const data = await res.json();

        if (res.ok) {
          toast.success(data.message || "Account created successfully!");
          setTimeout(() => window.location.href = "login.html", 1500);
        } else {
          toast.error(data.message || "Registration failed. Please try again.");
        }
      } catch (err) {
        toast.error("Network error. Please check your connection.");
      }

      registerBtn.disabled = false;
      registerBtn.innerHTML = `<i class="bi bi-check-lg"></i>`;
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
        if (window.google && google.accounts && document.getElementById('googleBtnContainer')) {
          google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCredentialResponse
          });
          google.accounts.id.renderButton(
            document.getElementById('googleBtnContainer'),
            { theme: 'outline', size: 'large', shape: 'rectangular', text: 'signup_with' }
          );
        }
      } catch {}
    });