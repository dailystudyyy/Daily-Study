// --- STATE VARIABLES ---
let currentHabit = 'Math'; // 'Math' or 'English'
let currentCategory = 'integer'; // 'integer', 'fraction'
let currentEnglishMode = 'en_to_id'; // 'en_to_id' or 'id_to_en'
let currentOperation = '';
let currentScore = 0;
let lives = 3;
let timerInterval;
let timeLeft = 10;
let correctAnswer = ""; 
let isGameActive = false;

// --- THEME SYSTEM ---
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

// --- NAVIGATION ---
function navigateTo(viewId) {
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

function selectHabit(habit) {
    currentHabit = habit;
    if(habit === 'Math') navigateTo('view-math-chapters');
    if(habit === 'English') navigateTo('view-english-modes'); // Ke Menu Mode English
}

function selectChapter(category) {
    currentCategory = category;
    const title = category === 'integer' ? 'Bab Bilangan' : 'Bab Pecahan';
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

// --- GAME LOGIC ---
function startGame(modeOrOp) {
    if(currentHabit === 'Math') currentOperation = modeOrOp;
    
    currentScore = 0;
    lives = 3;
    isGameActive = true;
    
    updateHUD();
    navigateTo('view-quiz');
    
    // Set Input Mode
    const inputField = document.getElementById('answer-input');
    const modeIndicator = document.getElementById('mode-indicator');

    if (currentHabit === 'Math') {
        inputField.setAttribute('type', 'text');
        inputField.setAttribute('inputmode', 'decimal');
        inputField.placeholder = "Jawab (angka)...";
        modeIndicator.innerText = "";
    } else {
        inputField.setAttribute('type', 'text');
        inputField.setAttribute('inputmode', 'text');
        
        // Atur Placeholder & Indikator berdasarkan Mode
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
    
    // ROUTING GENERATOR
    if (currentHabit === 'English') {
        qData = generateVocabularyQuestion();
    } else if (currentCategory === 'integer') {
        qData = generateIntegerQuestion(currentOperation);
    } else {
        qData = generateFractionQuestion(currentOperation);
    }

    correctAnswer = qData.answer;

    // RENDER SOAL
    const questionContainer = document.getElementById('question-text');
    
    if (currentHabit === 'English') {
        questionContainer.className = 'english-text';
        questionContainer.innerHTML = qData.content;
        document.getElementById('math-expression').innerHTML = ""; 
    } else {
        questionContainer.className = 'math-text';
        questionContainer.innerHTML = `$$${qData.latex}$$`;
        if (window.MathJax) {
            MathJax.typesetPromise([questionContainer]).catch((err) => console.log(err.message));
        }
    }
    
    // Update Badge
    const badge = document.getElementById('difficulty-label');
    badge.innerText = `Level: ${qData.difficulty}`;
    
    if (qData.difficulty === 'LOTS') badge.style.background = 'var(--success)';
    else if (qData.difficulty === 'MOTS') badge.style.background = 'var(--warning)';
    else badge.style.background = 'var(--danger)';
}

// --- TIMER ---
function resetTimer() {
    clearInterval(timerInterval);
    timeLeft = 10;
    updateTimerUI();
    
    timerInterval = setInterval(() => {
        timeLeft -= 0.1; 
        updateTimerUI();
        if (timeLeft <= 0) handleWrongAnswer(true); 
    }, 100);
}

function updateTimerUI() {
    const percentage = (timeLeft / 10) * 100;
    document.getElementById('timer-fill').style.width = `${percentage}%`;
    const fill = document.getElementById('timer-fill');
    if (timeLeft < 3) fill.style.background = 'var(--danger)';
    else fill.style.background = 'var(--primary-blue)';
}

// --- CHECK ANSWER ---
function handleEnter(e) {
    if (e.key === 'Enter') checkAnswer();
}

function checkAnswer() {
    const rawInput = document.getElementById('answer-input').value.trim();
    if (rawInput === '') return;

    let isCorrect = false;

    if (currentHabit === 'Math') {
        const userVal = parseFractionInput(rawInput);
        if (Math.abs(userVal - correctAnswer) < 0.001) isCorrect = true;
    } else {
        // English Logic (Case Insensitive)
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
    if (currentHabit === 'English') {
        msg += ` (${correctAnswer})`; 
    }

    showFeedback(msg, false);

    if (lives <= 0) {
        endGame();
    } else {
        setTimeout(nextQuestion, 1500);
    }
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
    else startGame(currentOperation);
}

// --- UTILS ---
function parseFractionInput(str) {
    if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 2) return parseFloat(parts[0]) / parseFloat(parts[1]);
    }
    return parseFloat(str);
}
function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ==========================================
// ENGLISH VOCABULARY GENERATOR (1 BARIS)
// ==========================================

const vocabDatabase = [
    // LOTS (Dasar)
    { en: "Cat", id: "Kucing", diff: "LOTS" },
    { en: "Dog", id: "Anjing", diff: "LOTS" },
    { en: "Eat", id: "Makan", diff: "LOTS" },
    { en: "Sleep", id: "Tidur", diff: "LOTS" },
    { en: "Happy", id: "Senang", diff: "LOTS" },
    { en: "Sad", id: "Sedih", diff: "LOTS" },
    { en: "Book", id: "Buku", diff: "LOTS" },
    { en: "Table", id: "Meja", diff: "LOTS" },

    // MOTS (Frasa Pendek / Menengah)
    { en: "Wake up", id: "Bangun", diff: "MOTS" },
    { en: "Give up", id: "Menyerah", diff: "MOTS" },
    { en: "Make up (verb)", id: "Berdandan", diff: "MOTS" },
    { en: "Look for", id: "Mencari", diff: "MOTS" },
    { en: "Environment", id: "Lingkungan", diff: "MOTS" },
    { en: "Government", id: "Pemerintah", diff: "MOTS" },
    { en: "Actually", id: "Sebenarnya", diff: "MOTS" },

    // HOTS (Akademik / Abstrak)
    { en: "Ambiguity", id: "Ambiguitas", diff: "HOTS" },
    { en: "Phenomenon", id: "Fenomena", diff: "HOTS" },
    { en: "Hypothesis", id: "Hipotesis", diff: "HOTS" },
    { en: "Inevitable", id: "Tak terelakkan", diff: "HOTS" },
    { en: "Sustainability", id: "Keberlanjutan", diff: "HOTS" },
    { en: "Vulnerable", id: "Rentan", diff: "HOTS" },
    { en: "Ubiquitous", id: "Ada di mana-mana", diff: "HOTS" }
];

function generateVocabularyQuestion() {
    // 1. Roll Difficulty
    const diffRoll = Math.random();
    let targetDiff = 'LOTS';
    if (diffRoll > 0.4) targetDiff = 'MOTS';
    if (diffRoll > 0.8) targetDiff = 'HOTS';

    // 2. Filter Pool
    const pool = vocabDatabase.filter(item => item.diff === targetDiff);
    const item = pool.length > 0 ? pool[getRandomInt(0, pool.length - 1)] : vocabDatabase[0];

    // 3. Determine Question & Answer based on Mode
    let questionText = "";
    let answerText = "";

    if (currentEnglishMode === 'en_to_id') {
        // Soal: English -> Jawab: Indo
        questionText = item.en;
        answerText = item.id;
    } else {
        // Soal: Indo -> Jawab: English
        questionText = item.id;
        answerText = item.en;
    }

    return {
        difficulty: item.diff,
        content: questionText, // Langsung teks 1 baris
        answer: answerText
    };
}

// --- MATH GENERATORS (TETAP SAMA) ---
function generateIntegerQuestion(opType) {
    const diffRoll = Math.random();
    let difficulty = 'LOTS'; let numCount = 2; let maxVal = 10; let useParens = false;
    if (diffRoll < 0.4) { difficulty = 'LOTS'; numCount = getRandomInt(2, 3); maxVal = 10; }
    else if (diffRoll < 0.8) { difficulty = 'MOTS'; numCount = getRandomInt(3, 4); maxVal = 20; useParens = true; }
    else { difficulty = 'HOTS'; numCount = getRandomInt(4, 6); maxVal = 50; useParens = true; }

    for (let attempt = 0; attempt < 20; attempt++) {
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
            if (isValid) return { difficulty, latex: res.view + " = ?", answer: result };
        } catch (e) { continue; }
    }
    return { difficulty: 'LOTS', latex: '1 + 1 = ?', answer: 2 };
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

function generateFractionQuestion(opType) {
    const diffRoll = Math.random();
    let difficulty, count;
    const dens = [2, 3, 4, 5, 6, 8, 10]; 
    if (diffRoll < 0.4) { difficulty = 'LOTS'; count = 2; }
    else if (diffRoll < 0.8) { difficulty = 'MOTS'; count = 3; }
    else { difficulty = 'HOTS'; count = 3; }

    for (let attempt = 0; attempt < 20; attempt++) {
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