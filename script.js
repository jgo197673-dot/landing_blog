// Smooth scroll with offset for fixed navbar
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offsetTop = target.offsetTop - 80;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// Navbar scroll effect
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        navbar.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.12)';
    } else {
        navbar.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
    }
    
    lastScroll = currentScroll;
});

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Apply fade-in to cards and sections
const animateElements = document.querySelectorAll('.about-card, .service-card, .tip-card, .recommend-card');
animateElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observer.observe(el);
});

// Parallax effect for hero section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');
    if (hero && scrolled < window.innerHeight) {
        hero.style.transform = `translateY(${scrolled * 0.5}px)`;
    }
});

// Add hover effect to service cards
const serviceCards = document.querySelectorAll('.service-card');
serviceCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-8px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
});

// Mobile menu toggle (for future mobile optimization)
const createMobileMenu = () => {
    const navMenu = document.querySelector('.nav-menu');
    const menuToggle = document.createElement('button');
    menuToggle.classList.add('menu-toggle');
    menuToggle.innerHTML = '☰';
    menuToggle.style.display = 'none';
    
    if (window.innerWidth <= 768) {
        menuToggle.style.display = 'block';
        document.querySelector('.nav-container').insertBefore(menuToggle, navMenu);
        
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
};

// Initialize on load
window.addEventListener('load', () => {
    createMobileMenu();
    
    // Add entrance animation to hero
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        heroContent.style.animation = 'fadeInUp 1s ease-out';
    }
});

// Resize handler
window.addEventListener('resize', () => {
    createMobileMenu();
});

// Add click tracking for CTA buttons (analytics ready)
const ctaButtons = document.querySelectorAll('.cta-button, .hero-cta, .cta-btn');
ctaButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        const buttonText = e.target.textContent;
        console.log(`CTA clicked: ${buttonText}`);
        // Here you can add analytics tracking code
        // Example: gtag('event', 'click', { 'event_category': 'CTA', 'event_label': buttonText });
    });
});

// Smooth reveal for review section
const reviewSection = document.querySelector('.review-section');
if (reviewSection) {
    const reviewObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const reviewText = entry.target.querySelector('.review-text');
                const reviewImages = entry.target.querySelector('.review-images');
                
                if (reviewText) {
                    reviewText.style.opacity = '0';
                    reviewText.style.transform = 'translateX(-30px)';
                    reviewText.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
                    
                    setTimeout(() => {
                        reviewText.style.opacity = '1';
                        reviewText.style.transform = 'translateX(0)';
                    }, 200);
                }
                
                if (reviewImages) {
                    reviewImages.style.opacity = '0';
                    reviewImages.style.transform = 'translateX(30px)';
                    reviewImages.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
                    
                    setTimeout(() => {
                        reviewImages.style.opacity = '1';
                        reviewImages.style.transform = 'translateX(0)';
                    }, 400);
                }
            }
        });
    }, { threshold: 0.2 });
    
    reviewObserver.observe(reviewSection);
}

// Add dynamic year to footer
const footerBottom = document.querySelector('.footer-bottom p');
if (footerBottom) {
    const currentYear = new Date().getFullYear();
    footerBottom.textContent = `© ${currentYear} AUBE. All rights reserved.`;
}
