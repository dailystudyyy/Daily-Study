// --- STATE VARIABLES ---
let currentCategory = 'integer'; 
let currentOperation = '';
let currentScore = 0;
let lives = 3;
let timerInterval;
let timeLeft = 10;
let correctAnswer = 0; 
let isGameActive = false;

// --- THEME SYSTEM (DARK MODE) ---
function initTheme() {
    // Cek localStorage, jika tidak ada, default Light
    const savedTheme = localStorage.getItem('theme');
    const icon = document.querySelector('.icon-theme');
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        icon.innerText = '🌙'; // Ikon Bulan
    } else {
        document.body.classList.remove('dark-mode');
        icon.innerText = '☀️'; // Ikon Matahari
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

// Jalankan initTheme saat script dimuat
initTheme();

// --- NAVIGATION ---
function navigateTo(viewId) {
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

function selectHabit(habit) {
    if(habit === 'Math') navigateTo('view-chapters');
}

function selectChapter(category) {
    currentCategory = category;
    const title = category === 'integer' ? 'Bab Bilangan' : 'Bab Pecahan';
    document.getElementById('topic-title').innerText = title;
    navigateTo('view-topics');
}

function goToMenu() {
    document.getElementById('modal-gameover').style.display = 'none';
    navigateTo('view-menu');
}

// --- GAME LOGIC ---

function startGame(operation) {
    currentOperation = operation;
    currentScore = 0;
    lives = 3;
    isGameActive = true;
    
    updateHUD();
    navigateTo('view-quiz');
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
    document.getElementById('answer-input').value = '';
    document.getElementById('answer-input').focus();
    
    let qData;
    if (currentCategory === 'integer') {
        qData = generateIntegerQuestion(currentOperation);
    } else {
        qData = generateFractionQuestion(currentOperation);
    }

    correctAnswer = qData.answer;

    const mathEl = document.getElementById('math-expression');
    mathEl.innerHTML = `$$${qData.latex}$$`;
    
    const badge = document.getElementById('difficulty-label');
    badge.innerText = `Level: ${qData.difficulty}`;
    
    // Warna Badge
    if (qData.difficulty === 'LOTS') badge.style.background = 'var(--success)';
    else if (qData.difficulty === 'MOTS') badge.style.background = 'var(--warning)';
    else badge.style.background = 'var(--danger)';

    if (window.MathJax) {
        MathJax.typesetPromise([mathEl]).catch((err) => console.log(err.message));
    }
}

// --- TIMER SYSTEM ---
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

// --- ANSWER CHECKING ---
function handleEnter(e) {
    if (e.key === 'Enter') checkAnswer();
}

function checkAnswer() {
    const rawInput = document.getElementById('answer-input').value.trim();
    if (rawInput === '') return;
    
    const userVal = parseFractionInput(rawInput);
    
    if (Math.abs(userVal - correctAnswer) < 0.001) {
        currentScore += 10;
        showFeedback("BENAR!", true);
        updateHUD();
        setTimeout(nextQuestion, 500); 
    } else {
        handleWrongAnswer(false);
    }
}

function parseFractionInput(str) {
    if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 2) {
            return parseFloat(parts[0]) / parseFloat(parts[1]);
        }
    }
    return parseFloat(str);
}

function handleWrongAnswer(isTimeout) {
    lives--;
    updateHUD();
    
    if (isTimeout) showFeedback("WAKTU HABIS!", false);
    else showFeedback("SALAH!", false);

    if (lives <= 0) {
        endGame();
    } else {
        setTimeout(nextQuestion, 1000);
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
    startGame(currentOperation);
}

// --- GENERATORS (Sama seperti sebelumnya) ---

function generateIntegerQuestion(opType) {
    const diffRoll = Math.random();
    let difficulty, numCount, maxVal, useParens;

    if (diffRoll < 0.4) {
        difficulty = 'LOTS'; numCount = getRandomInt(2, 3); maxVal = 10; useParens = false;
    } else if (diffRoll < 0.8) {
        difficulty = 'MOTS'; numCount = getRandomInt(3, 4); maxVal = 20; useParens = true;
    } else {
        difficulty = 'HOTS'; numCount = getRandomInt(4, 6); maxVal = 50; useParens = true;
    }

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

            if (isValid) {
                return { difficulty, latex: res.view + " = ?", answer: result };
            }
        } catch (e) { continue; }
    }
    return { difficulty: 'LOTS', latex: '1 + 1 = ?', answer: 2 };
}

function buildExpression(nums, opType, useParens) {
    let sym = '+';
    let latexSym = '+';
    if(opType === 'subtraction') { sym = '-'; latexSym = '-'; }
    if(opType === 'multiplication') { sym = '*'; latexSym = '\\times'; }
    if(opType === 'division') { sym = '/'; latexSym = '\\div'; }

    if (nums.length === 2) {
        return { logic: `${nums[0]} ${sym} ${nums[1]}`, view: `${nums[0]} ${latexSym} ${nums[1]}` };
    }

    let logicParts = [...nums];
    let viewParts = [...nums];

    if (useParens) {
        const wrapIdx = getRandomInt(0, nums.length - 2);
        viewParts[wrapIdx] = `(${viewParts[wrapIdx]}`;
        viewParts[wrapIdx+1] = `${viewParts[wrapIdx+1]})`;
        logicParts[wrapIdx] = `(${logicParts[wrapIdx]}`;
        logicParts[wrapIdx+1] = `${logicParts[wrapIdx+1]})`;
    }

    return {
        logic: logicParts.join(` ${sym} `),
        view: viewParts.join(` ${latexSym} `)
    };
}

function generateFractionQuestion(opType) {
    const diffRoll = Math.random();
    let difficulty, count;
    const dens = [2, 3, 4, 5, 6, 8, 10]; 

    if (diffRoll < 0.4) {
        difficulty = 'LOTS'; count = 2;
    } else if (diffRoll < 0.8) {
        difficulty = 'MOTS'; count = 3;
    } else {
        difficulty = 'HOTS'; count = 3; 
    }

    for (let attempt = 0; attempt < 20; attempt++) {
        let fracParts = [];
        let viewStr = "";
        let logicStr = "";

        for(let i=0; i<count; i++){
            let d = dens[getRandomInt(0, dens.length-1)];
            let n = getRandomInt(1, d-1); 
            if(n===0) n=1; 
            fracParts.push({n, d});
        }

        let sym = '+';
        let latexSym = '+';
        if(opType === 'subtraction') { sym = '-'; latexSym = '-'; }
        if(opType === 'multiplication') { sym = '*'; latexSym = '\\times'; }
        if(opType === 'division') { sym = '/'; latexSym = '\\div'; }

        let views = fracParts.map(f => `\\frac{${f.n}}{${f.d}}`);
        let logics = fracParts.map(f => `(${f.n}/${f.d})`);

        viewStr = views.join(` ${latexSym} `);
        logicStr = logics.join(` ${sym} `);

        try {
            const result = new Function('return ' + logicStr)();
            let isValid = true;

            if(opType === 'subtraction' && result < 0) isValid = false;
            if(result === Infinity || isNaN(result)) isValid = false;
            
            if (isValid) {
                return { difficulty, latex: viewStr + " = ?", answer: result };
            }
        } catch(e) { continue; }
    }
    return { difficulty: 'LOTS', latex: '\\frac{1}{2} + \\frac{1}{2} = ?', answer: 1 };
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}