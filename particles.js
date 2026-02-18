/**
 * Floating particle canvas background effect
 * Creates a subtle, ambient network of particles
 */
(function () {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animId;
    const PARTICLE_COUNT = 50;
    const LINK_DIST = 120;
    const SPEED = 0.3;
    const COLORS = ['rgba(6,182,212,', 'rgba(139,92,246,', 'rgba(16,185,129,'];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function init() {
        resize();
        particles = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * SPEED,
                vy: (Math.random() - 0.5) * SPEED,
                r: Math.random() * 1.8 + 0.6,
                color: COLORS[Math.floor(Math.random() * COLORS.length)]
            });
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw links
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < LINK_DIST) {
                    const alpha = ((LINK_DIST - dist) / LINK_DIST) * 0.15;
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(148,163,184,${alpha})`;
                    ctx.lineWidth = 0.4;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }

        // Draw particles
        for (const p of particles) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color + '0.5)';
            ctx.fill();
        }
    }

    function update() {
        for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        }
    }

    function loop() {
        update();
        draw();
        animId = requestAnimationFrame(loop);
    }

    window.addEventListener('resize', () => {
        resize();
    });

    init();
    loop();

    // Fade out loading screen
    setTimeout(() => {
        const loader = document.getElementById('loadingScreen');
        if (loader) loader.classList.add('fade-out');
    }, 800);
})();
