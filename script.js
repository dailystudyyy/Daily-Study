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
let maxTime = 10;
let correctAnswer = ""; 
let isGameActive = false;

// ANTI-DUPLICATE SYSTEM
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
    if (savedTheme === 'dark') document.body.classList.add('dark-mode');
}
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
}
initTheme();

// ==========================================
// 3. NAVIGATION SYSTEM
// ==========================================
function navigateTo(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

function selectHabit(habit) {
    currentHabit = habit;
    navigateTo(habit === 'Math' ? 'view-math-chapters' : 'view-english-modes');
}

function selectChapter(category) {
    currentCategory = category;
    const intB = document.querySelectorAll('.topic-common');
    const expB = document.getElementById('btn-exponent-start');

    if (category === 'exponent_chapter') {
        intB.forEach(b => b.style.display = 'none');
        expB.style.display = 'flex';
        document.getElementById('topic-title').innerText = 'Bab Eksponen';
    } else {
        intB.forEach(b => b.style.display = 'flex');
        expB.style.display = 'none';
        document.getElementById('topic-title').innerText = category === 'integer' ? 'Bab Bilangan' : 'Bab Pecahan';
    }
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
function startGame(mode) {
    if(currentHabit === 'Math') currentOperation = mode;
    
    currentScore = 0; lives = 3; isGameActive = true;
    maxTime = (mode === 'exponent_drill') ? 40 : 10;
    
    // Soft Reset
    if (QuestionHistory.math.size > 200) QuestionHistory.math.clear();
    
    updateHUD();
    navigateTo('view-quiz');
    
    const inp = document.getElementById('answer-input');
    inp.type = 'text'; inp.inputMode = 'text';
    
    const indic = document.getElementById('mode-indicator');
    if(currentHabit === 'Math') { 
        inp.placeholder = "Jawab..."; indic.innerText = ""; 
    } else { 
        inp.placeholder = "Terjemahkan..."; 
        indic.innerText = currentEnglishMode === 'en_to_id' ? "English ➜ Indonesia" : "Indonesia ➜ English"; 
    }
    
    nextQuestion();
}

function updateHUD() {
    document.getElementById('score').innerText = currentScore;
    document.getElementById('lives').innerText = lives;
    document.getElementById('feedback-msg').innerText = "";
}

function nextQuestion() {
    if(!isGameActive) return;
    resetTimer();
    document.getElementById('answer-input').value = '';
    document.getElementById('answer-input').focus();
    
    let qData;
    if(currentHabit === 'English') {
        qData = getUniqueEnglishQuestion();
    } else {
        let gen;
        if(currentOperation === 'exponent_drill') gen = generateExponentQuestion;
        else if(currentCategory === 'integer') gen = () => generateIntegerQuestion(currentOperation);
        else gen = () => generateFractionQuestion(currentOperation);
        qData = getUniqueMathQuestion(gen);
    }
    
    correctAnswer = qData.answer;
    
    const txt = document.getElementById('question-text');
    const math = document.getElementById('math-expression');
    
    if(currentHabit === 'English') {
        txt.style.display = 'block'; math.style.display = 'none';
        txt.innerHTML = qData.content;
        txt.className = 'english-text';
    } else {
        txt.style.display = 'none'; math.style.display = 'block';
        math.innerHTML = `$$${qData.latex}$$`;
        math.className = 'math-text';
        if(window.MathJax) MathJax.typesetPromise([math]).catch(()=>{});
    }
    
    const badge = document.getElementById('difficulty-label');
    badge.innerText = qData.difficulty;
    badge.style.background = qData.difficulty === 'LOTS' ? 'var(--success)' : (qData.difficulty === 'MOTS' ? 'var(--warning)' : 'var(--danger)');
}

// ==========================================
// 5. ENGINES & GENERATORS
// ==========================================

function getUniqueMathQuestion(genFunc) {
    let q, sig, attempts = 0;
    do { 
        q = genFunc(); 
        sig = `${currentCategory}|${currentOperation}|${q.latex}`; 
        attempts++; 
    } while(QuestionHistory.math.has(sig) && attempts < 10);
    QuestionHistory.math.add(sig);
    return q;
}

function getUniqueEnglishQuestion() {
    const r = Math.random();
    let d = r < 0.4 ? 'LOTS' : (r < 0.8 ? 'MOTS' : 'HOTS');
    
    if(QuestionHistory.english[d].length === 0) {
        QuestionHistory.english[d] = vocabDatabase.filter(i => i.diff === d).sort(() => Math.random() - 0.5);
    }
    
    const item = QuestionHistory.english[d].pop() || vocabDatabase[0];
    let q = currentEnglishMode === 'en_to_id' ? item.en : item.id;
    let a = currentEnglishMode === 'en_to_id' ? item.id : item.en;
    return { difficulty: item.diff, content: q, answer: a };
}

// --- GENERATORS ---
function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateIntegerQuestion(op) {
    let diff = 'LOTS', n = 2, max = 10, par = false;
    const r = Math.random();
    if(r < 0.4) { diff='LOTS'; n=getRandomInt(2,3); max=15; }
    else if(r < 0.8) { diff='MOTS'; n=getRandomInt(3,4); max=30; par=true; }
    else { diff='HOTS'; n=getRandomInt(4,5); max=60; par=true; }
    
    for(let i=0; i<20; i++) {
        let nums = []; for(let j=0; j<n; j++) nums.push(getRandomInt(op.includes('multi')||op.includes('div')?2:1, max));
        let exp = buildExp(nums, op, par);
        try {
            let res = new Function('return ' + exp.logic)();
            if(Number.isInteger(res) && res !== Infinity && !isNaN(res)) {
                if(op === 'subtraction' && res < 0) continue;
                return { difficulty: diff, latex: exp.view + " = ?", answer: res };
            }
        } catch(e){}
    }
    return { difficulty: 'LOTS', latex: '10 + 5 = ?', answer: 15 };
}

function buildExp(nums, op, par) {
    let s = '+', l = '+';
    if(op === 'subtraction') { s='-'; l='-'; }
    if(op === 'multiplication') { s='*'; l='\\times'; }
    if(op === 'division') { s='/'; l='\\div'; }
    
    let lg = [...nums], vw = [...nums];
    if(par && nums.length > 2) {
        let idx = getRandomInt(0, nums.length-2);
        vw[idx] = `(${vw[idx]}`; vw[idx+1] = `${vw[idx+1]})`;
        lg[idx] = `(${lg[idx]}`; lg[idx+1] = `${lg[idx+1]})`;
    }
    return { logic: lg.join(` ${s} `), view: vw.join(` ${l} `) };
}

function generateFractionQuestion(op) {
    let diff = 'LOTS', c = 2; const dens = [2,3,4,5,6,8,10];
    const r = Math.random();
    if(r < 0.4) c=2; else if(r < 0.8) { diff='MOTS'; c=3; } else { diff='HOTS'; c=3; }
    
    for(let i=0; i<20; i++) {
        let nums = [];
        for(let j=0; j<c; j++) {
            let d = dens[getRandomInt(0, dens.length-1)];
            let n = getRandomInt(1, d-1) || 1;
            nums.push({n,d});
        }
        let s = '+', l = '+';
        if(op === 'subtraction') { s='-'; l='-'; }
        if(op === 'multiplication') { s='*'; l='\\times'; }
        if(op === 'division') { s='/'; l='\\div'; }
        
        let logic = nums.map(x=>`(${x.n}/${x.d})`).join(s);
        let view = nums.map(x=>`\\frac{${x.n}}{${x.d}}`).join(` ${l} `);
        
        try {
            let res = new Function('return ' + logic)();
            if(Number.isFinite(res) && !isNaN(res)) {
                if(op === 'subtraction' && res < 0) continue;
                return { difficulty: diff, latex: view + " = ?", answer: res };
            }
        } catch(e){}
    }
    return { difficulty: 'LOTS', latex: '\\frac{1}{2} + \\frac{1}{2} = ?', answer: 1 };
}

function generateExponentQuestion() {
    let diff = 'LOTS'; const r = Math.random();
    const bases = [2,3,4,5,10]; const b = bases[getRandomInt(0, bases.length-1)];
    let l = "", a = 0;
    
    if(r < 0.4) {
        let p = getRandomInt(0,3); l = `${b}^{${p}}`; a = Math.pow(b, p);
    } else if(r < 0.8) {
        diff = 'MOTS';
        if(Math.random() > 0.5) {
            let p1=getRandomInt(1,3), p2=getRandomInt(1,3);
            l = `${b}^{${p1}} \\times ${b}^{${p2}}`; a = Math.pow(b, p1+p2);
        } else {
            let p1=getRandomInt(3,6), p2=getRandomInt(1,2);
            l = `${b}^{${p1}} \\div ${b}^{${p2}}`; a = Math.pow(b, p1-p2);
        }
    } else {
        diff = 'HOTS';
        if(Math.random() < 0.5) {
            let baseSmall = b > 3 ? 2 : b;
            let p1=2, p2=getRandomInt(2,3);
            l = `(${baseSmall}^{${p1}})^{${p2}}`; a = Math.pow(baseSmall, p1*p2);
        } else {
            let p1=getRandomInt(2,4), p2=getRandomInt(2,4), p3=p1+p2-getRandomInt(0,2);
            l = `\\frac{${b}^{${p1}} \\times ${b}^{${p2}}}{${b}^{${p3}}}`; a = Math.pow(b, p1+p2-p3);
        }
    }
    return { difficulty: diff, latex: l + " = ?", answer: a };
}

// --- TIMER & HANDLER ---
function resetTimer() {
    clearInterval(timerInterval); timeLeft = maxTime; updateTimerUI();
    timerInterval = setInterval(() => {
        timeLeft -= 0.1; updateTimerUI();
        if(timeLeft <= 0) handleWrong(true);
    }, 100);
}
function updateTimerUI() {
    const p = (timeLeft / maxTime) * 100;
    document.getElementById('timer-fill').style.width = `${p}%`;
    document.getElementById('timer-fill').style.background = timeLeft < 3 ? 'var(--danger)' : 'var(--primary-blue)';
}
function handleEnter(e) { if(e.key === 'Enter') checkAnswer(); }
function checkAnswer() {
    const val = document.getElementById('answer-input').value.trim();
    if(!val) return;
    let correct = false;
    if(currentHabit === 'Math') {
        const num = val.includes('/') ? (parseFloat(val.split('/')[0])/parseFloat(val.split('/')[1])) : parseFloat(val.replace(',', '.'));
        if(Math.abs(num - correctAnswer) < 0.001) correct = true;
    } else {
        if(val.toLowerCase() === correctAnswer.toString().toLowerCase()) correct = true;
    }
    
    if(correct) {
        currentScore += 10; showMsg("BENAR!", true);
        updateHUD(); setTimeout(nextQuestion, 500);
    } else handleWrong(false);
}
function handleWrong(timeout) {
    lives--; updateHUD();
    let msg = timeout ? "WAKTU HABIS!" : "SALAH!";
    if (currentHabit === 'English') msg += ` (${correctAnswer})`; 
    else msg += ` Jwb: ${correctAnswer}`;
    showMsg(msg, false);
    if(lives <= 0) endGame();
    else setTimeout(nextQuestion, 2000);
}
function showMsg(t, s) {
    const el = document.getElementById('feedback-msg');
    el.innerText = t; el.style.color = s ? 'var(--success)' : 'var(--danger)';
}
function endGame() {
    isGameActive = false; clearInterval(timerInterval);
    document.getElementById('modal-gameover').style.display = 'flex';
    document.getElementById('final-score').innerText = currentScore;
}
function restartGame() {
    document.getElementById('modal-gameover').style.display = 'none';
    if(currentHabit === 'English') startGame(currentEnglishMode);
    else if(currentCategory === 'exponent_chapter') startGame('exponent_drill');
    else startGame(currentOperation);
}

// --- DATABASE ENGLISH (Example) ---
const vocabDatabase = [
    {en:"Cat",id:"Kucing",diff:"LOTS"}, {en:"Dog",id:"Anjing",diff:"LOTS"}, {en:"Eat",id:"Makan",diff:"LOTS"},
    {en:"Sleep",id:"Tidur",diff:"LOTS"}, {en:"Book",id:"Buku",diff:"LOTS"}, {en:"Water",id:"Air",diff:"LOTS"},
    {en:"Wake up",id:"Bangun",diff:"MOTS"}, {en:"Give up",id:"Menyerah",diff:"MOTS"}, {en:"Environment",id:"Lingkungan",diff:"MOTS"},
    {en:"Government",id:"Pemerintah",diff:"MOTS"}, {en:"Usually",id:"Biasanya",diff:"MOTS"},
    {en:"Ambiguity",id:"Ambiguitas",diff:"HOTS"}, {en:"Phenomenon",id:"Fenomena",diff:"HOTS"},
    {en:"Sustainability",id:"Keberlanjutan",diff:"HOTS"}, {en:"Vulnerable",id:"Rentan",diff:"HOTS"},
    {en:"Inevitable",id:"Tak terelakkan",diff:"HOTS"}, {en:"Perspective",id:"Sudut pandang",diff:"HOTS"}
];