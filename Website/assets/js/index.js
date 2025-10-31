         window.addEventListener("load", () => {
      setTimeout(() => {
        document.getElementById("loader").classList.add("fade-out");
        document.getElementById("main-content").classList.add("show");
      }, 1000); // Loader delay 2s
    });
           if(localStorage.getItem("token")){
      window.location.href = "dashboard.html";
    }
        // Initialize AOS
        AOS.init({
            duration: 500,
            easing: 'ease-in-out',
            once: false,
            mirror: false
        });
        
        // Custom cursor
        document.addEventListener('DOMContentLoaded', function() {
            const cursorDot = document.querySelector('.cursor-dot');
            const cursorOutline = document.querySelector('.cursor-outline');
            
            // Only initialize custom cursor on non-mobile devices
            if (window.innerWidth >= 769) {
                document.addEventListener('mousemove', function(e) {
                    cursorDot.style.left = e.clientX + 'px';
                    cursorDot.style.top = e.clientY + 'px';
                    
                    cursorOutline.style.left = e.clientX + 'px';
                    cursorOutline.style.top = e.clientY + 'px';
                });
                
                // Hover effect for links and buttons
                const hoverElements = document.querySelectorAll('a, button, .btn, .nav-link, .feature-card, .developer-card');
                
                hoverElements.forEach(element => {
                    element.addEventListener('mouseenter', () => {
                        cursorDot.classList.add('hover');
                        cursorOutline.classList.add('hover');
                    });
                    
                    element.addEventListener('mouseleave', () => {
                        cursorDot.classList.remove('hover');
                        cursorOutline.classList.remove('hover');
                    });
                });
                
                // Click effect
                document.addEventListener('mousedown', () => {
                    cursorDot.classList.add('click');
                    cursorOutline.classList.add('click');
                });
                
                document.addEventListener('mouseup', () => {
                    cursorDot.classList.remove('click');
                    cursorOutline.classList.remove('click');
                });
            }
            
            // Navbar background change on scroll
            const navbar = document.querySelector('.navbar');
            window.addEventListener('scroll', function() {
                if (window.scrollY > 50) {
                    navbar.style.background = 'rgba(10, 10, 10, 0.95) !important';
                    navbar.style.padding = '10px 0';
                } else {
                    navbar.style.background = 'rgba(10, 10, 10, 0.8) !important';
                    navbar.style.padding = '15px 0';
                }
            });
            
            // Smooth scrolling for navigation links
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function (e) {
                    e.preventDefault();
                    
                    const targetId = this.getAttribute('href');
                    if (targetId === '#') return;
                    
                    const targetElement = document.querySelector(targetId);
                    if (targetElement) {
                        window.scrollTo({
                            top: targetElement.offsetTop - 80,
                            behavior: 'smooth'
                        });
                    }
                });
            });
        });
 