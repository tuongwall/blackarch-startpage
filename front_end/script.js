/* =========================================================
   MODULE 1: REAL-TIME CLOCK RENDERING ENGINE
   =========================================================
   Purpose:
   Provides a continuously updating date-time display
   formatted for the en-GB locale.

   Responsibilities:
   - Generate current timestamp
   - Format date and time separately
   - Inject formatted output into DOM
   - Maintain deterministic 1-second refresh cycle

   Performance Notes:
   - Single DOM write per second
   - Negligible CPU overhead
   - Safe for long-running sessions
   ========================================================= */

function updateClock() {
    // Instantiate current timestamp
    const now = new Date();

    // Format date (e.g., Mon, 27 Feb 2026)
    const d = now.toLocaleDateString("en-GB", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "2-digit"
    });

    // Format time (HH:MM:SS, 24-hour format)
    const t = now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    // Atomic DOM update
    document.getElementById("clock").innerHTML =
        `${d} &nbsp;|&nbsp; <span>${t}</span>`;
}

// Immediate execution prevents first-render delay
updateClock();

// Scheduled interval execution (1 second resolution)
setInterval(updateClock, 1000);



/* =========================================================
   MODULE 2: MATRIX RAIN CANVAS ENGINE
   =========================================================
   Purpose:
   Renders animated matrix-style background effect
   using HTML5 Canvas 2D API.

   Architecture:
   - Procedural character rendering
   - State-driven column drops
   - Soft fade frame blending
   - Responsive to viewport resize

   Performance Strategy:
   - No object allocations inside loop
   - Controlled frame rate (~26 FPS)
   - Partial opacity background repaint
   ========================================================= */

// Canvas initialization
const canvas = document.getElementById("matrix");
const mc = canvas.getContext("2d");

// Character pool used for random rendering
const chars = "01BLACKARCH$#@><|/\\{}[]";

// Column and vertical drop state
let cols, drops;

/**
 * Initializes canvas dimensions and column state.
 * Triggered on page load and viewport resize.
 */
function initMatrix() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const fs = 13; // Fixed font size
    cols = Math.floor(canvas.width / fs);

    // Randomized negative start to stagger drop appearance
    drops = Array.from({ length: cols }, () => Math.random() * -50);
}

/**
 * Main rendering loop.
 * Handles frame fading, character rendering,
 * drop movement, and reset logic.
 */
function drawMatrix() {
    // Semi-transparent overlay for motion trail effect
    mc.fillStyle = "rgba(0,0,0,0.055)";
    mc.fillRect(0, 0, canvas.width, canvas.height);

    mc.font = "13px Share Tech Mono, monospace";

    for (let i = 0; i < drops.length; i++) {

        // Random brightness variation
        const bright = Math.random() > 0.93;
        mc.fillStyle = bright ? "#aaffaa" : "#00c832";

        const char = chars[Math.floor(Math.random() * chars.length)];

        mc.fillText(char, i * 13, drops[i] * 13);

        // Reset drop once exceeding viewport height
        if (drops[i] * 13 > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }

        // Increment vertical position
        drops[i] += 0.5 + Math.random() * 0.5;
    }
}

// Responsive reinitialization
window.addEventListener("resize", initMatrix);
initMatrix();

// Controlled animation interval (~38ms per frame)
setInterval(drawMatrix, 38);



/* =========================================================
   MODULE 3: TYPEWRITER ANIMATION ENGINE
   =========================================================
   Purpose:
   Simulates typing and deleting animation
   cycling through predefined phrases.

   Design Pattern:
   - Stateful recursive timeout
   - Dynamic speed adjustment
   - Forward / backward mode switch

   Timing Profile:
   - Typing speed: 150ms
   - Deleting speed: 60ms
   - Pause at full word: 2000ms
   - Pause before next word: 500ms
   ========================================================= */

const typeText = document.getElementById("type-text");

const words = ["NGUYEN TUONG", "CYBER SECURITY"];

let wordIndex = 0;
let charIndex = 0;
let isDeleting = false;

/**
 * Controls the typewriter state machine.
 */
function typingEffect() {

    const currentWord = words[wordIndex];

    // Render substring up to current character index
    typeText.textContent = currentWord.substring(0, charIndex);

    let speed = isDeleting ? 60 : 150;

    // Full word typed → switch to deleting mode
    if (!isDeleting && charIndex === currentWord.length) {
        speed = 2000;
        isDeleting = true;
    }
    // Fully deleted → switch to next word
    else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        speed = 500;
    }

    charIndex += isDeleting ? -1 : 1;

    // Recursive controlled timing
    setTimeout(typingEffect, speed);
}

typingEffect();



/* =========================================================
   MODULE 4: HYBRID INTELLIGENT SEARCH ENGINE
   =========================================================
   Purpose:
   Provides real-time dual-source suggestions:
   - Google Suggest (fast path)
   - AI Suggest API (slow path)

   Architecture:
   - Dual Debounce Strategy
   - Client-side caching
   - State-driven rendering
   - Keyboard navigation support
   - Smart visibility management

   Performance & UX Strategy:
   - Immediate "Thinking..." feedback
   - Cancel stale queries via state comparison
   - Single DOM injection per render cycle
   ========================================================= */

const searchInput = document.getElementById("searchInput");
const suggestionsBox = document.getElementById("suggestions");
const searchForm = document.getElementById("searchForm");

// Independent debounce timers
let googleTimer = null;
let aiTimer = null;

// Centralized state store
let stateQuery = "";
let stateAI = "";
let stateGoogle = [];

// In-memory caches to reduce API calls
const cacheGoogle = {};
const cacheAI = {};

/**
 * Escapes special regex characters to prevent malformed patterns.
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}



/* ========================
   GOOGLE SUGGEST PROVIDER
   ========================

   Uses JSONP-style dynamic script injection
   to bypass CORS limitations.

   Fast response (~150ms debounce).
*/

async function getGoogle(q) {

    if (cacheGoogle[q]) return cacheGoogle[q];

    return new Promise((resolve) => {

        window._gsugg = function (data) {
            const res = data && data[1] ? data[1] : [];
            cacheGoogle[q] = res;
            resolve(res);
        };

        const s = document.createElement("script");

        s.src =
            `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(q)}&callback=_gsugg`;

        s.onload = () => s.remove();
        s.onerror = () => resolve([]);

        document.body.appendChild(s);
    });
}



/* ========================
   AI SUGGEST PROVIDER
   ========================

   Slower but more intelligent.
   Triggered only after user stops typing (800ms).

   Includes:
   - Network error handling
   - Graceful fallback
   - Result caching
*/

async function getAI(q) {

    if (cacheAI[q]) return cacheAI[q];

    try {
        const response =
            await fetch(`http://localhost:3000/api/suggest?q=${encodeURIComponent(q)}`);

        if (!response.ok) throw new Error("Network error");

        const data = await response.json();

        cacheAI[q] = data.suggestion;

        return data.suggestion;

    } catch (error) {
        return `✨ AI Search: "${q}"`;
    }
}