/* =========================================
   1. REAL-TIME CLOCK UPDATER
   ========================================= */
function updateClock() {
    const now = new Date();
    const d = now.toLocaleDateString("en-GB", { weekday: "short", year: "numeric", month: "short", day: "2-digit" });
    const t = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    document.getElementById("clock").innerHTML = `${d} &nbsp;|&nbsp; <span>${t}</span>`;
}
setInterval(updateClock, 1000);
updateClock();

/* =========================================
   2. MATRIX RAIN EFFECT (CANVAS)
   ========================================= */
const canvas = document.getElementById("matrix");
const mc = canvas.getContext("2d");
const chars = "01BLACKARCH$#@><|/\\{}[]";
let cols, drops;

function initMatrix() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const fs = 13;
    cols = Math.floor(canvas.width / fs);
    drops = Array.from({ length: cols }, () => Math.random() * -50);
}

function drawMatrix() {
    mc.fillStyle = "rgba(0,0,0,0.055)";
    mc.fillRect(0, 0, canvas.width, canvas.height);
    mc.font = "13px Share Tech Mono, monospace";

    for (let i = 0; i < drops.length; i++) {
        const bright = Math.random() > 0.93;
        mc.fillStyle = bright ? "#aaffaa" : "#00c832";
        const char = chars[Math.floor(Math.random() * chars.length)];
        mc.fillText(char, i * 13, drops[i] * 13);

        if (drops[i] * 13 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.5 + Math.random() * 0.5;
    }
}
window.addEventListener("resize", initMatrix);
initMatrix();
setInterval(drawMatrix, 38);

/* =========================================
   3. TYPEWRITER EFFECT (CHẠY CHỮ)
   ========================================= */
const typeText = document.getElementById("type-text");
const words = ["NGUYEN TUONG", "CYBER SECURITY"];
let wordIndex = 0;
let charIndex = 0;
let isDeleting = false;

function typingEffect() {
    const currentWord = words[wordIndex];
    typeText.textContent = currentWord.substring(0, charIndex);

    let speed = isDeleting ? 60 : 150;

    if (!isDeleting && charIndex === currentWord.length) {
        speed = 2000;
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        speed = 500;
    }

    charIndex += isDeleting ? -1 : 1;
    setTimeout(typingEffect, speed);
}
typingEffect();

/* =========================================
   4. TÍCH HỢP TÌM KIẾM AI & GOOGLE THÔNG MINH
   ========================================= */
const searchInput = document.getElementById("searchInput");
const suggestionsBox = document.getElementById("suggestions");
const searchForm = document.getElementById("searchForm");

// Khai báo 2 bộ đếm thời gian riêng biệt
let googleTimer = null;
let aiTimer = null;

// Trạng thái (State) hiện tại của khung tìm kiếm
let stateQuery = "";
let stateAI = "";
let stateGoogle = [];

// Bộ nhớ đệm (Cache) giúp không gọi API nhiều lần cho cùng 1 từ khóa
const cacheGoogle = {};
const cacheAI = {};

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Lấy gợi ý Google (nhanh)
async function getGoogle(q) {
    if (cacheGoogle[q]) return cacheGoogle[q]; // Lấy từ Cache nếu có
    return new Promise((resolve) => {
        window._gsugg = function (data) {
            const res = data && data[1] ? data[1] : [];
            cacheGoogle[q] = res; // Lưu vào cache
            resolve(res);
        };
        const s = document.createElement("script");
        s.src = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(q)}&callback=_gsugg`;
        s.onload = () => s.remove();
        s.onerror = () => resolve([]);
        document.body.appendChild(s);
    });
}

// Lấy phản hồi AI (chậm hơn)
async function getAI(q) {
    if (cacheAI[q]) return cacheAI[q]; // Lấy từ Cache nếu có
    try {
        const response = await fetch(`http://localhost:3000/api/suggest?q=${encodeURIComponent(q)}`);
        if (!response.ok) throw new Error("Lỗi mạng");
        const data = await response.json();
        cacheAI[q] = data.suggestion; // Lưu vào cache
        return data.suggestion;
    } catch (error) {
        return `✨ AI Search: "${q}"`;
    }
}

// Hàm render giao diện động
function renderSuggestions() {
    if (!stateQuery) {
        suggestionsBox.style.display = "none";
        return;
    }

    currentFocus = -1;
    let htmlContent = "";

    // Lọc các ký tự đặc biệt để đưa lên URL an toàn
    const encodedQuery = encodeURIComponent(stateQuery);

    // 1. Render mục AI (luôn hiện trên cùng)
    htmlContent += `
        <div class="sug-item" 
             style="padding: 10px; cursor: pointer; color: #00ff41; transition: 0.2s; border-bottom: 1px dashed #00c832; margin-bottom: 5px;"
             onmouseover="this.style.backgroundColor='rgba(0, 255, 65, 0.1)'; this.style.color='#fff'"
             onmouseout="this.style.backgroundColor=''; this.style.color='#00ff41'"
             onclick="window.open('https://www.google.com/search?q=${encodedQuery}&udm=50&aep=1&ntc=1', '_blank');">
            > <b>${stateAI}</b>
        </div>
    `;

    // 2. Render mục Google (Giới hạn tối đa 5 kết quả)
    const topGoogle = stateGoogle.slice(0, 5);
    topGoogle.forEach(g => {
        const regex = new RegExp(`(${escapeRegExp(stateQuery)})`, "gi");
        const highlighted = g.replace(regex, "<b>$1</b>");
        
        htmlContent += `
        <div class="sug-item" 
             style="padding: 10px; cursor: pointer; color: rgba(0, 255, 65, 0.7); transition: 0.2s;"
             onmouseover="this.style.backgroundColor='rgba(255, 255, 255, 0.05)'; this.style.color='#fff'"
             onmouseout="this.style.backgroundColor=''; this.style.color='rgba(0, 255, 65, 0.7)'"
             onclick="document.getElementById('searchInput').value='${g.replace(/'/g, "\\'")}'; document.getElementById('searchForm').submit();">
            > ${highlighted}
        </div>
        `;
    });

    suggestionsBox.innerHTML = htmlContent;
    suggestionsBox.style.display = "block";
}


// Bắt sự kiện người dùng gõ phím (Nơi áp dụng Dual-Debounce)
searchInput.addEventListener("input", function () {
    // Xóa bộ đếm cũ nếu người dùng vẫn đang gõ liên tục
    clearTimeout(googleTimer);
    clearTimeout(aiTimer);
    
    const q = this.value.trim();

    if (!q) {
        stateQuery = "";
        renderSuggestions();
        return;
    }

    stateQuery = q;

    // --- LUỒNG 1: GOOGLE (Siêu tốc - 150ms) ---
    googleTimer = setTimeout(() => {
        getGoogle(q).then(res => {
            if (stateQuery !== q) return; 
            stateGoogle = res;
            renderSuggestions(); 
        });
    }, 150);

    // --- LUỒNG 2: AI (Đợi người dùng gõ xong - 800ms) ---
    // Ngay lập tức hiện trạng thái Thinking (Không đợi 800ms mới hiện)
    stateAI = `⏳ Thinking...`;
    renderSuggestions();

    // Chỉ thực sự gọi API lướt web khi đã dừng gõ 0.8s
    aiTimer = setTimeout(() => {
        getAI(q).then(res => {
            if (stateQuery !== q) return;
            stateAI = res;
            renderSuggestions(); 
        });
    }, 800);
});

// Điều hướng bằng phím mũi tên Lên/Xuống
searchInput.addEventListener("keydown", function(e) {
    let items = suggestionsBox.getElementsByClassName("sug-item");
    if (suggestionsBox.style.display === "none" || !items.length) return;

    if (e.key === "ArrowDown") {
        currentFocus++; setActive(items);
    } else if (e.key === "ArrowUp") {
        currentFocus--; setActive(items);
    } else if (e.key === "Enter") {
        if (currentFocus > -1) {
            e.preventDefault();
            items[currentFocus].click(); 
        }
    } else if (e.key === "Escape") {
        suggestionsBox.style.display = "none";
    }
});

function setActive(items) {
    for (let i = 0; i < items.length; i++) {
        items[i].style.backgroundColor = ""; 
    }
    if (currentFocus >= items.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = items.length - 1;
    items[currentFocus].style.backgroundColor = "rgba(0, 255, 65, 0.2)"; 
}

// Tính năng ẩn/hiện hộp gợi ý thông minh
document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
        suggestionsBox.style.display = "none";
    }
});

// Hiện lại gợi ý khi bấm trở lại vào ô nhập liệu
searchInput.addEventListener("focus", () => {
    if (searchInput.value.trim() && suggestionsBox.innerHTML !== "") {
        suggestionsBox.style.display = "block";
    }
});