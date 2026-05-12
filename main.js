/* ========================================
   个人简历网站 - 交互脚本
   文件：main.js
   ======================================== */

function safeCreateIcons() {
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
    }
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let scrollRafId = 0;
let latestScrollY = 0;
let reportWraps = [];
let heroAvatar = null;
let heroSection = null;
let backToTopBtn = null;
let stickyNav = null;
let stickyNavLinks = [];
let sections = [];

// 1. Scroll reveal animation
if (prefersReducedMotion) {
    document.documentElement.classList.add('reduced-motion');
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('active'));
} else {
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                if (entry.target.classList.contains('timeline-item')) {
                    const timeline = entry.target.closest('.timeline');
                    if (timeline) timeline.classList.add('is-revealed');
                }
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px'
    });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}

// 2. Sticky Navigation visibility & active link highlighting
stickyNav = document.getElementById('stickyNav');
stickyNavLinks = document.querySelectorAll('.sticky-nav-link[href^="#"]');
sections = document.querySelectorAll('section[id]');
backToTopBtn = document.getElementById('backToTop');
reportWraps = document.querySelectorAll('.report-image-wrap');
heroAvatar = document.querySelector('.hero-avatar');
heroSection = document.querySelector('.hero');

function onScroll() {
    const scrollY = latestScrollY;
    const navVisible = scrollY > 300;

    if (stickyNav) stickyNav.classList.toggle('is-visible', navVisible);
    if (backToTopBtn) backToTopBtn.classList.toggle('is-visible', scrollY > 400);

    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (scrollY >= sectionTop - 100) {
            current = section.getAttribute('id');
        }
    });

    stickyNavLinks.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        if (href === '#' + current) {
            link.classList.add('active');
        }
    });

    if (heroAvatar && heroSection) {
        const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
        if (scrollY < heroBottom) {
            heroAvatar.style.transform = `translateY(${scrollY * 0.05}px)`;
        }
    }

    if (!prefersReducedMotion) {
        reportWraps.forEach(wrap => {
            const rect = wrap.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                const centerOffset = (rect.top + rect.height / 2 - window.innerHeight / 2) * -0.015;
                wrap.style.transform = `translateY(${centerOffset}px)`;
            }
        });
    }
}

function requestScrollUpdate() {
    latestScrollY = window.scrollY;
    if (scrollRafId) return;
    scrollRafId = window.requestAnimationFrame(() => {
        scrollRafId = 0;
        onScroll();
    });
}

window.addEventListener('scroll', requestScrollUpdate, { passive: true });
window.addEventListener('resize', requestScrollUpdate, { passive: true });

// 3. Smooth scroll for anchor links (offset for sticky nav)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        const targetEl = document.querySelector(targetId);
        if (targetEl) {
            e.preventDefault();
            const navHeight = stickyNav ? stickyNav.offsetHeight : 0;
            const targetTop = targetEl.getBoundingClientRect().top + window.scrollY - navHeight - 16;
            window.scrollTo({
                top: targetTop,
                behavior: prefersReducedMotion ? 'auto' : 'smooth'
            });
        }
    });
});

// 4. Back to top button
if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
}

// 5. Welcome overlay
(function initWelcomeOverlay() {
    const overlay = document.getElementById('welcomeOverlay');
    const video = document.getElementById('welcomeVideo');
    const enterBtn = document.getElementById('welcomeEnter');
    const skipBtn = document.getElementById('welcomeSkip');

    if (!overlay) return;

    let hasClosed = false;
    window.welcomeOverlayClosed = false;

    const soundHint = document.getElementById('welcomeSoundHint');

    function playWelcomeVideo() {
        if (!video) return;
        video.muted = false;
        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                if (soundHint) soundHint.classList.add('is-hidden');
            }).catch(() => {
                video.muted = true;
                if (soundHint) soundHint.classList.remove('is-hidden');
                video.play().catch(() => {});
            });
        }
    }

    function closeOverlay() {
        if (hasClosed) return;
        hasClosed = true;
        window.welcomeOverlayClosed = true;
        overlay.classList.add('is-hidden');
        if (typeof window.tryPlayMusic === 'function') window.tryPlayMusic();

        // Clean up event listeners to prevent memory leaks
        if (video) video.removeEventListener('ended', closeOverlay);
        if (soundHint) soundHint.removeEventListener('click', onSoundHintClick);
        if (enterBtn) enterBtn.removeEventListener('click', onEnterClick);
        if (skipBtn) skipBtn.removeEventListener('click', onSkipClick);
    }

    function unmuteVideo() {
        if (!video) return;
        video.muted = false;
        playWelcomeVideo();
    }

    function onSoundHintClick(e) {
        e.stopPropagation();
        unmuteVideo();
    }

    function onEnterClick(e) {
        e.stopPropagation();
        unmuteVideo();
        closeOverlay();
    }

    function onSkipClick(e) {
        e.stopPropagation();
        unmuteVideo();
        closeOverlay();
    }

    if (soundHint) soundHint.classList.add('is-hidden');

    if (video) {
        playWelcomeVideo();
        video.addEventListener('ended', closeOverlay);
    }

    if (soundHint) soundHint.addEventListener('click', onSoundHintClick);
    if (enterBtn) enterBtn.addEventListener('click', onEnterClick);
    if (skipBtn) skipBtn.addEventListener('click', onSkipClick);

    // Fallback: auto-close after 10 seconds in case autoplay is blocked
    setTimeout(() => {
        if (!hasClosed) closeOverlay();
    }, 10000);

    // Ensure icons inside welcome overlay are rendered
    safeCreateIcons();
})();

// 6. Music control
const bgMusic = document.getElementById('bgMusic');
const musicToggle = document.getElementById('musicToggle');

if (bgMusic && musicToggle) {
    bgMusic.volume = 0.22;
    let userExplicitlyPaused = false;

    function updateMusicIcon(isPlaying) {
        const icon = musicToggle.querySelector('i');
        if (isPlaying) {
            musicToggle.classList.add('is-playing');
            musicToggle.classList.remove('is-muted');
            icon.setAttribute('data-lucide', 'music');
            musicToggle.setAttribute('aria-label', '暂停背景音乐');
        } else {
            musicToggle.classList.remove('is-playing');
            musicToggle.classList.add('is-muted');
            icon.setAttribute('data-lucide', 'volume-x');
            musicToggle.setAttribute('aria-label', '播放背景音乐');
        }
        safeCreateIcons();
    }

    window.tryPlayMusic = function tryPlayMusic() {
        if (!window.welcomeOverlayClosed || userExplicitlyPaused || !bgMusic.paused) return;
        try {
            const promise = bgMusic.play();
            if (promise !== undefined) {
                promise.then(() => {
                    updateMusicIcon(true);
                }).catch(() => {
                    updateMusicIcon(false);
                });
            } else {
                updateMusicIcon(true);
            }
        } catch (err) {
            updateMusicIcon(false);
        }
    };

    updateMusicIcon(false);

    // Auto-play on user gestures after overlay closes
    document.addEventListener('click', () => window.tryPlayMusic(), { passive: true });
    document.addEventListener('keydown', () => window.tryPlayMusic());

    // Music toggle button
    musicToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        if (bgMusic.paused) {
            userExplicitlyPaused = false;
            bgMusic.play().then(() => updateMusicIcon(true)).catch(() => {});
        } else {
            userExplicitlyPaused = true;
            bgMusic.pause();
            updateMusicIcon(false);
        }
    });
}

// 7. Subtle parallax for Hero avatar and report covers
(function initParallax() {
    function updateParallax() {
        if (prefersReducedMotion) return;
        requestScrollUpdate();
    }

    updateParallax();
})();

// 8. Stat number count-up animation (observe cards for better timing)
(function initCountUp() {
    const statCards = document.querySelectorAll('.stat-card');

    function parseValue(text) {
        const match = text.trim().match(/^([^0-9]*)([0-9]+(?:\.[0-9]+)?)(.*)$/);
        if (!match) return null;
        return {
            prefix: match[1],
            value: parseFloat(match[2]),
            suffix: match[3]
        };
    }

    function easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }

    const UNIFIED_DURATION = 1500;

    function animateNumber(el, to, prefix, suffix) {
        const isInteger = Number.isInteger(to);
        const totalFrames = Math.ceil(UNIFIED_DURATION / 16.67);
        let frame = 0;
        const from = Math.max(1, Math.round(to * 0.2));

        function step() {
            frame++;
            const progress = Math.min(frame / totalFrames, 1);
            const eased = easeOutQuart(progress);
            const current = from + (to - from) * eased;

            let displayValue;
            if (progress >= 0.96) {
                displayValue = to;
            } else if (isInteger) {
                displayValue = Math.round(current);
            } else {
                displayValue = current.toFixed(1);
            }

            el.textContent = prefix + displayValue + suffix;

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                el.textContent = prefix + to + suffix;
                el.classList.add('counted-done');
            }
        }

        requestAnimationFrame(step);
    }

    const countUpObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.dataset.counted) {
                entry.target.dataset.counted = 'true';
                const statNumber = entry.target.querySelector('.stat-number');
                if (!statNumber) return;
                const parsed = parseValue(statNumber.textContent);
                if (parsed) {
                    const parent = entry.target.parentNode;
                    let staggerDelay = 0;
                    if (parent) {
                        const index = Array.from(parent.children).indexOf(entry.target);
                        const row = Math.floor(index / 4);
                        const col = index % 4;
                        staggerDelay = row * 100 + col * 60;
                    }
                    setTimeout(() => {
                        animateNumber(statNumber, parsed.value, parsed.prefix, parsed.suffix);
                    }, 200 + staggerDelay);
                }
            }
        });
    }, {
        threshold: 0.2,
        rootMargin: '0px 0px -30px 0px'
    });

    if (prefersReducedMotion) {
        statCards.forEach(card => {
            const statNumber = card.querySelector('.stat-number');
            if (statNumber) statNumber.classList.add('counted-done');
        });
        return;
    }

    statCards.forEach(card => countUpObserver.observe(card));
})();

requestScrollUpdate();
safeCreateIcons();
