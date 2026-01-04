// ==========================================
// 1. STATE & CONFIGURATION
// ==========================================
let currentHabit = 'Math'; 
let currentCategory = 'integer'; 
let currentEnglishMode = 'en_to_id'; 
let currentOperation = '';
let currentScore = 0;
let lives = 3;
let timerInterval;
let timeLeft = 10;
let maxTime = 10; // Variable untuk durasi timer (10s atau 40s)
let correctAnswer = ""; 
let isGameActive = false;

// SYSTEM ANTI-DUPLIKASI (The Engine)
const QuestionHistory = {
    math: new Set(),
    english: {
        LOTS: [],
        MOTS: [],
        HOTS: []
    }
};

// ==========================================
// 2. THEME & UI SYSTEM
// ==========================================
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const icon = document.querySelector('.icon-theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        icon.innerText = '🌙';
    } else {
        document.body.classList.remove('dark-mode');
        icon.innerText = '☀️';
    }
}

function toggleTheme() {
    const body = document.body;
    const icon = document.querySelector('.icon-theme');
    body.classList.toggle('dark-mode');
    if (body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
        icon.innerText = '🌙';
    } else {
        localStorage.setItem('theme', 'light');
        icon.innerText = '☀️';
    }
}
initTheme();

// ==========================================
// 3. NAVIGATION SYSTEM
// ==========================================
function navigateTo(viewId) {
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

function selectHabit(habit) {
    currentHabit = habit;
    if(habit === 'Math') navigateTo('view-math-chapters');
    if(habit === 'English') navigateTo('view-english-modes');
}

function selectChapter(category) {
    currentCategory = category;
    let title = 'Bab Bilangan';
    
    // UI Elements Logic
    const commonBtns = document.querySelectorAll('.topic-common');
    const exponentBtn = document.getElementById('btn-exponent-start');

    // Reset Display
    if(commonBtns) commonBtns.forEach(btn => btn.style.display = 'none');
    if(exponentBtn) exponentBtn.style.display = 'none';

    if (category === 'integer') {
        title = 'Bab Bilangan';
        if(commonBtns) commonBtns.forEach(btn => btn.style.display = 'flex');
    } else if (category === 'fraction') {
        title = 'Bab Pecahan';
        if(commonBtns) commonBtns.forEach(btn => btn.style.display = 'flex');
    } else if (category === 'exponent_chapter') {
        title = 'Bab Eksponen';
        if(exponentBtn) exponentBtn.style.display = 'flex'; // Tombol khusus Eksponen
    }

    document.getElementById('topic-title').innerText = title;
    navigateTo('view-topics');
}

function startEnglishGame(mode) {
    currentEnglishMode = mode;
    currentCategory = 'vocabulary';
    startGame(mode);
}

function goToMenu() {
    document.getElementById('modal-gameover').style.display = 'none';
    navigateTo('view-menu');
}

// ==========================================
// 4. CORE GAME LOGIC
// ==========================================
function startGame(modeOrOp) {
    if(currentHabit === 'Math') currentOperation = modeOrOp;
    
    currentScore = 0;
    lives = 3;
    isGameActive = true;
    
    // SET WAKTU BERDASARKAN MODE
    if (modeOrOp === 'exponent_drill') {
        maxTime = 40; // Eksponen 40 detik
    } else {
        maxTime = 10; // Lainnya 10 detik
    }
    
    // Soft Reset Math History (jika memori penuh)
    if (QuestionHistory.math.size > 200) QuestionHistory.math.clear();
    
    updateHUD();
    navigateTo('view-quiz');
    
    const inputField = document.getElementById('answer-input');
    const modeIndicator = document.getElementById('mode-indicator');

    // FORCE NORMAL KEYBOARD (TEXT)
    inputField.setAttribute('type', 'text');
    inputField.setAttribute('inputmode', 'text');

    if (currentHabit === 'Math') {
        inputField.placeholder = "Ketik jawaban...";
        modeIndicator.innerText = "";
    } else {
        if (currentEnglishMode === 'en_to_id') {
            inputField.placeholder = "Terjemahkan ke Indonesia...";
            modeIndicator.innerText = "Mode: English ➜ Indonesia";
        } else {
            inputField.placeholder = "Translate to English...";
            modeIndicator.innerText = "Mode: Indonesia ➜ English";
        }
    }
    
    nextQuestion();
}

function updateHUD() {
    document.getElementById('score').innerText = currentScore;
    document.getElementById('lives').innerText = lives;
    document.getElementById('feedback-msg').innerText = "";
}

function nextQuestion() {
    if (!isGameActive) return;

    resetTimer();
    const inputField = document.getElementById('answer-input');
    inputField.value = '';
    inputField.focus();
    
    let qData;
    
    // ROUTING GENERATOR SOAL (SMART ROUTING)
    if (currentHabit === 'English') {
        qData = getUniqueEnglishQuestion(); 
    } 
    else {
        // Math Generators
        let generatorFunc;
        if (currentOperation === 'exponent_drill') generatorFunc = generateExponentQuestion;
        else if (currentCategory === 'integer') generatorFunc = () => generateIntegerQuestion(currentOperation);
        else generatorFunc = () => generateFractionQuestion(currentOperation);

        qData = getUniqueMathQuestion(generatorFunc);
    }

    correctAnswer = qData.answer;

    // RENDER SOAL
    const questionContainer = document.getElementById('question-text');
    const mathContainer = document.getElementById('math-expression');
    
    if (currentHabit === 'English') {
        questionContainer.style.display = 'block';
        mathContainer.style.display = 'none';
        questionContainer.className = 'english-text';
        questionContainer.innerHTML = qData.content;
    } else {
        questionContainer.style.display = 'none';
        mathContainer.style.display = 'block';
        mathContainer.className = 'math-text';
        mathContainer.innerHTML = `$$${qData.latex}$$`;
        
        if (window.MathJax) {
            MathJax.typesetPromise([mathContainer]).catch((err) => console.log(err.message));
        }
    }
    
    // Badge Styling
    const badge = document.getElementById('difficulty-label');
    badge.innerText = `Level: ${qData.difficulty}`;
    if (qData.difficulty === 'LOTS') badge.style.background = 'var(--success)';
    else if (qData.difficulty === 'MOTS') badge.style.background = 'var(--warning)';
    else badge.style.background = 'var(--danger)';
}

// ==========================================
// 5. ANTI-DUPLICATE ENGINES
// ==========================================

// A. MATH ENGINE: HASHING & RETRY
function getUniqueMathQuestion(generatorFunc) {
    let q;
    let uniqueFound = false;
    let attempts = 0;
    // Coba generate 10x jika duplikat
    while (!uniqueFound && attempts < 10) {
        q = generatorFunc();
        // Buat ID unik soal
        const signature = `${currentCategory}|${currentOperation}|${q.latex}`;
        if (!QuestionHistory.math.has(signature)) {
            QuestionHistory.math.add(signature);
            uniqueFound = true;
        }
        attempts++;
    }
    return q;
}

// B. ENGLISH ENGINE: DECK SHUFFLE SYSTEM
function getUniqueEnglishQuestion() {
    const diffRoll = Math.random();
    let targetDiff = 'LOTS';
    if (diffRoll > 0.4) targetDiff = 'MOTS';
    if (diffRoll > 0.8) targetDiff = 'HOTS';

    // Jika Deck Kosong, Isi Ulang (Shuffle)
    if (QuestionHistory.english[targetDiff].length === 0) {
        const masterPool = vocabDatabase.filter(item => item.diff === targetDiff);
        // Shuffle Algoritma
        QuestionHistory.english[targetDiff] = [...masterPool].sort(() => Math.random() - 0.5);
    }

    // Ambil Kartu Teratas
    const item = QuestionHistory.english[targetDiff].pop();

    if (!item) return { difficulty: 'LOTS', content: "Error", answer: "Error" };

    let questionText = "", answerText = "";
    if (currentEnglishMode === 'en_to_id') { questionText = item.en; answerText = item.id; } 
    else { questionText = item.id; answerText = item.en; }

    return { difficulty: item.diff, content: questionText, answer: answerText };
}

// ==========================================
// 6. TIMER & INPUT HANDLING
// ==========================================
function resetTimer() {
    clearInterval(timerInterval);
    timeLeft = maxTime; // Reset ke maxTime (10/40)
    updateTimerUI();
    timerInterval = setInterval(() => {
        timeLeft -= 0.1; 
        updateTimerUI();
        if (timeLeft <= 0) handleWrongAnswer(true); 
    }, 100);
}

function updateTimerUI() {
    const percentage = (timeLeft / maxTime) * 100;
    document.getElementById('timer-fill').style.width = `${percentage}%`;
    const fill = document.getElementById('timer-fill');
    if (timeLeft < 3) fill.style.background = 'var(--danger)';
    else fill.style.background = 'var(--primary-blue)';
}

function handleEnter(e) { if (e.key === 'Enter') checkAnswer(); }

function checkAnswer() {
    const rawInput = document.getElementById('answer-input').value.trim();
    if (rawInput === '') return;

    let isCorrect = false;
    if (currentHabit === 'Math') {
        const userVal = parseMathInput(rawInput);
        if (Math.abs(userVal - correctAnswer) < 0.001) isCorrect = true;
    } else {
        if (rawInput.toLowerCase() === correctAnswer.toString().toLowerCase()) isCorrect = true;
    }
    
    if (isCorrect) {
        currentScore += 10;
        showFeedback("BENAR!", true);
        updateHUD();
        setTimeout(nextQuestion, 500); 
    } else {
        handleWrongAnswer(false);
    }
}

function handleWrongAnswer(isTimeout) {
    lives--;
    updateHUD();
    let msg = isTimeout ? "WAKTU HABIS!" : "SALAH!";
    
    if (currentHabit === 'English') msg += ` (${correctAnswer})`; 
    else msg += ` Jwb: ${correctAnswer}`;

    showFeedback(msg, false);

    if (lives <= 0) endGame();
    else setTimeout(nextQuestion, 2000);
}

function showFeedback(msg, isSuccess) {
    const el = document.getElementById('feedback-msg');
    el.innerText = msg;
    el.style.color = isSuccess ? 'var(--success)' : 'var(--danger)';
}

function endGame() {
    isGameActive = false;
    clearInterval(timerInterval);
    document.getElementById('modal-gameover').style.display = 'flex';
    document.getElementById('final-score').innerText = currentScore;
}

function restartGame() {
    document.getElementById('modal-gameover').style.display = 'none';
    if(currentHabit === 'English') startGame(currentEnglishMode);
    else if(currentCategory === 'exponent_chapter') startGame('exponent_drill');
    else startGame(currentOperation);
}

// --- UTILS ---
function parseMathInput(str) {
    if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 2) return parseFloat(parts[0]) / parseFloat(parts[1]);
    }
    str = str.replace(',', '.');
    return parseFloat(str);
}
function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ==========================================
// 7. GENERATOR: INTEGER
// ==========================================
function generateIntegerQuestion(opType) {
    const diffRoll = Math.random();
    let difficulty = 'LOTS'; let numCount = 2; let maxVal = 10; let useParens = false;
    
    if (diffRoll < 0.4) { difficulty = 'LOTS'; numCount = getRandomInt(2, 3); maxVal = 15; }
    else if (diffRoll < 0.8) { difficulty = 'MOTS'; numCount = getRandomInt(3, 4); maxVal = 30; useParens = true; }
    else { difficulty = 'HOTS'; numCount = getRandomInt(4, 5); maxVal = 60; useParens = true; }

    for (let attempt = 0; attempt < 50; attempt++) {
        const numbers = [];
        for (let i = 0; i < numCount; i++) {
            let min = (opType === 'multiplication' || opType === 'division') ? 2 : 1;
            numbers.push(getRandomInt(min, maxVal));
        }
        let res = buildExpression(numbers, opType, useParens);
        try {
            const result = new Function('return ' + res.logic)();
            let isValid = true;
            if (!Number.isInteger(result)) isValid = false;
            if (opType === 'subtraction' && result < 0) isValid = false;
            if (result === Infinity || isNaN(result)) isValid = false;
            if (difficulty === 'LOTS' && Math.abs(result) > 100) isValid = false;
            if (isValid) return { difficulty, latex: res.view + " = ?", answer: result };
        } catch (e) { continue; }
    }
    return { difficulty: 'LOTS', latex: '10 + 5 = ?', answer: 15 };
}

function buildExpression(nums, opType, useParens) {
    let sym = '+'; let latexSym = '+';
    if(opType === 'subtraction') { sym = '-'; latexSym = '-'; }
    if(opType === 'multiplication') { sym = '*'; latexSym = '\\times'; }
    if(opType === 'division') { sym = '/'; latexSym = '\\div'; }

    if (nums.length === 2) return { logic: `${nums[0]} ${sym} ${nums[1]}`, view: `${nums[0]} ${latexSym} ${nums[1]}` };

    let logicParts = [...nums]; let viewParts = [...nums];
    if (useParens) {
        const wrapIdx = getRandomInt(0, nums.length - 2);
        viewParts[wrapIdx] = `(${viewParts[wrapIdx]}`; viewParts[wrapIdx+1] = `${viewParts[wrapIdx+1]})`;
        logicParts[wrapIdx] = `(${logicParts[wrapIdx]}`; logicParts[wrapIdx+1] = `${logicParts[wrapIdx+1]})`;
    }
    return { logic: logicParts.join(` ${sym} `), view: viewParts.join(` ${latexSym} `) };
}

// ==========================================
// 8. GENERATOR: FRACTION
// ==========================================
function generateFractionQuestion(opType) {
    const diffRoll = Math.random();
    let difficulty, count;
    const dens = [2, 3, 4, 5, 6, 8, 10]; 
    if (diffRoll < 0.4) { difficulty = 'LOTS'; count = 2; }
    else if (diffRoll < 0.8) { difficulty = 'MOTS'; count = 3; }
    else { difficulty = 'HOTS'; count = 3; }

    for (let attempt = 0; attempt < 50; attempt++) {
        let fracParts = [];
        for(let i=0; i<count; i++){
            let d = dens[getRandomInt(0, dens.length-1)];
            let n = getRandomInt(1, d-1); if(n===0) n=1; 
            fracParts.push({n, d});
        }
        let sym = '+'; let latexSym = '+';
        if(opType === 'subtraction') { sym = '-'; latexSym = '-'; }
        if(opType === 'multiplication') { sym = '*'; latexSym = '\\times'; }
        if(opType === 'division') { sym = '/'; latexSym = '\\div'; }

        let views = fracParts.map(f => `\\frac{${f.n}}{${f.d}}`);
        let logics = fracParts.map(f => `(${f.n}/${f.d})`);
        
        let viewStr = views.join(` ${latexSym} `);
        let logicStr = logics.join(` ${sym} `);

        try {
            const result = new Function('return ' + logicStr)();
            let isValid = true;
            if(opType === 'subtraction' && result < 0) isValid = false;
            if(result === Infinity || isNaN(result)) isValid = false;
            if (isValid) return { difficulty, latex: viewStr + " = ?", answer: result };
        } catch(e) { continue; }
    }
    return { difficulty: 'LOTS', latex: '\\frac{1}{2} + \\frac{1}{2} = ?', answer: 1 };
}

// ==========================================
// 9. GENERATOR: EXPONENT (40 Detik)
// ==========================================
function generateExponentQuestion() {
    const diffRoll = Math.random();
    let difficulty = 'LOTS';
    const bases = [2, 3, 4, 5, 10]; 
    const base = bases[getRandomInt(0, bases.length - 1)];
    let latex = "";
    let answer = 0;

    if (diffRoll < 0.4) {
        difficulty = 'LOTS';
        const power = getRandomInt(0, 3);
        latex = `${base}^{${power}}`;
        answer = Math.pow(base, power);
    } else if (diffRoll < 0.8) {
        difficulty = 'MOTS';
        const type = Math.random() > 0.5 ? 'mult' : 'div';
        if (type === 'mult') {
            const p1 = getRandomInt(1, 3); const p2 = getRandomInt(1, 3);
            latex = `${base}^{${p1}} \\times ${base}^{${p2}}`; answer = Math.pow(base, p1 + p2);
        } else {
            const p1 = getRandomInt(3, 6); const p2 = getRandomInt(1, 2);
            latex = `${base}^{${p1}} \\div ${base}^{${p2}}`; answer = Math.pow(base, p1 - p2);
        }
    } else {
        difficulty = 'HOTS';
        const type = Math.random();
        if (type < 0.33) {
            const b = (base > 3) ? 2 : base; 
            const p1 = 2; const p2 = getRandomInt(2,3);
            latex = `(${b}^{${p1}})^{${p2}}`; answer = Math.pow(b, p1 * p2);
        } else if (type < 0.66) {
            const bNeg = Math.random() > 0.5 ? 10 : 2; 
            const pNeg = -1;
            latex = `${bNeg}^{${pNeg}}`; answer = Math.pow(bNeg, pNeg); 
        } else {
            const p1 = getRandomInt(2, 4); const p2 = getRandomInt(2, 4);
            const pTotal = p1 + p2; const p3 = pTotal - getRandomInt(0, 2);
            latex = `\\frac{${base}^{${p1}} \\times ${base}^{${p2}}}{${base}^{${p3}}}`;
            answer = Math.pow(base, (p1 + p2) - p3);
        }
    }
    latex += " = ?";
    return { difficulty, latex, answer };
}

// ==========================================
// 10. DATABASE: ENGLISH VOCABULARY
// ==========================================
const vocabDatabase = [
    { en: "Cat", id: "Kucing", diff: "LOTS" },
    { en: "Dog", id: "Anjing", diff: "LOTS" },
    { en: "Eat", id: "Makan", diff: "LOTS" },
    { en: "Sleep", id: "Tidur", diff: "LOTS" },
    { en: "Happy", id: "Senang", diff: "LOTS" },
    { en: "Sad", id: "Sedih", diff: "LOTS" },
    { en: "Book", id: "Buku", diff: "LOTS" },
    { en: "Table", id: "Meja", diff: "LOTS" },
    { en: "Water", id: "Air", diff: "LOTS" },
    { en: "Fire", id: "Api", diff: "LOTS" },
    { en: "Wake up", id: "Bangun", diff: "MOTS" },
    { en: "Give up", id: "Menyerah", diff: "MOTS" },
    { en: "Make up (verb)", id: "Berdandan", diff: "MOTS" },
    { en: "Look for", id: "Mencari", diff: "MOTS" },
    { en: "Environment", id: "Lingkungan", diff: "MOTS" },
    { en: "Government", id: "Pemerintah", diff: "MOTS" },
    { en: "Actually", id: "Sebenarnya", diff: "MOTS" },
    { en: "Usually", id: "Biasanya", diff: "MOTS" },
    { en: "Ambiguity", id: "Ambiguitas", diff: "HOTS" },
    { en: "Phenomenon", id: "Fenomena", diff: "HOTS" },
    { en: "Hypothesis", id: "Hipotesis", diff: "HOTS" },
    { en: "Inevitable", id: "Tak terelakkan", diff: "HOTS" },
    { en: "Sustainability", id: "Keberlanjutan", diff: "HOTS" },
    { en: "Vulnerable", id: "Rentan", diff: "HOTS" },
    { en: "Ubiquitous", id: "Ada di mana-mana", diff: "HOTS" },
    { en: "Metaphor", id: "Metafora", diff: "HOTS" },
    { en: "Perspective", id: "Sudut pandang", diff: "HOTS" }
];