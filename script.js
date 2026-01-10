const { useState, useEffect } = React;
const { motion, AnimatePresence } = window.Motion;

const STORAGE_KEY = 'vocabulary_trainer_data_v1';

const defaultData = [
    { "word": "Encourage", "translation": "Поощрять" },
    { "word": "Sustainable", "translation": "Устойчивый" },
    { "word": "Development", "translation": "Развитие" },
    { "word": "Goal", "translation": "Цель" },
    { "word": "Decision", "translation": "Решение" }
];

const shuffle = (array) => [...array].sort(() => Math.random() - 0.5);

const App = () => {
    const [jsonInput, setJsonInput] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? saved : JSON.stringify(defaultData, null, 2);
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, jsonInput);
    }, [jsonInput]);

    const [status, setStatus] = useState('setup');
    const [queue, setQueue] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [score, setScore] = useState(0);

    const [options, setOptions] = useState([]);
    const [selected, setSelected] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);

    // --- ЛОГИКА ОЗВУЧКИ (TTS) ---
    const speak = (text) => {
        if (!window.speechSynthesis) return;
        // Прерываем предыдущую фразу, если она была
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US"; // Принудительно английский
        utterance.rate = 0.9;     // Чуть помедленнее
        
        // Выбираем голос (опционально, берет первый доступный английский)
        const voices = window.speechSynthesis.getVoices();
        const enVoice = voices.find(v => v.lang.startsWith('en'));
        if (enVoice) utterance.voice = enVoice;

        window.speechSynthesis.speak(utterance);
    };

    // Эффект для авто-озвучки при смене вопроса
    useEffect(() => {
        if (status === 'quiz' && queue.length > 0) {
            const item = queue[currentIdx];
            // Озвучиваем автоматически только если вопрос на Английском (режим direct)
            if (item.mode === 'direct') {
                // Небольшая задержка, чтобы анимация успела начаться
                setTimeout(() => speak(item.word), 300);
            }
        }
    }, [currentIdx, status, queue]);

    const resetStorage = () => {
        if(confirm("Сбросить слова к стандартным?")) {
            const def = JSON.stringify(defaultData, null, 2);
            setJsonInput(def);
            localStorage.setItem(STORAGE_KEY, def);
        }
    };

    const startQuiz = () => {
        try {
            const rawData = JSON.parse(jsonInput);
            if (rawData.length < 4) { alert("Нужно хотя бы 4 слова!"); return; }

            const mixedQueue = shuffle(rawData).map(item => ({
                ...item,
                mode: Math.random() > 0.5 ? 'direct' : 'inverse'
            }));

            setQueue(mixedQueue);
            setCurrentIdx(0);
            setScore(0);
            setStatus('quiz');
            generateOptions(mixedQueue[0], rawData);
        } catch (e) {
            alert("Ошибка JSON! Проверь запятые и кавычки.");
        }
    };

    const generateOptions = (currentItem, allData) => {
        const targetMode = currentItem.mode;
        const correctText = targetMode === 'direct' ? currentItem.translation : currentItem.word;
        const pool = allData.filter(w => w.word !== currentItem.word);
        
        const distractors = pool.map(w => 
            targetMode === 'direct' ? w.translation : w.word
        );

        const selectedDistractors = shuffle(distractors).slice(0, 3);
        setOptions(shuffle([correctText, ...selectedDistractors]));
        
        setSelected(null);
        setIsAnswered(false);
        setIsCorrect(false);
    };

    const handleCheck = (option) => {
        if (isAnswered) return;

        const currentItem = queue[currentIdx];
        const correctVal = currentItem.mode === 'direct' ? currentItem.translation : currentItem.word;
        const correct = option === correctVal;
        
        setSelected(option);
        setIsAnswered(true);
        setIsCorrect(correct);

        if (correct) setScore(s => s + 1);

        setTimeout(() => {
            if (currentIdx < queue.length - 1) {
                const nextIdx = currentIdx + 1;
                setCurrentIdx(nextIdx);
                generateOptions(queue[nextIdx], JSON.parse(jsonInput));
            } else {
                setStatus('result');
            }
        }, 1200);
    };

    // --- RENDER ---
    
    if (status === 'setup') {
        return (
            <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="glass-card">
                <div className="title">Vocabulary Mix</div>
                <span className="label-tag">Вставь JSON данные</span>
                <textarea 
                    value={jsonInput} 
                    onChange={e => setJsonInput(e.target.value)} 
                    spellCheck="false" 
                    placeholder='[{"word": "...", "translation": "..."}]'
                />
                <motion.button whileTap={{scale:0.97}} className="btn-primary" onClick={startQuiz}>
                    Начать практику
                </motion.button>
                
                <div style={{textAlign:'center'}}>
                    <p style={{fontSize:'0.8rem', color:'rgba(255,255,255,0.3)', marginTop:'15px', marginBottom:'5px'}}>
                        Слова сохраняются автоматически
                    </p>
                    <span className="reset-link" onClick={resetStorage}>Сбросить к стандартным</span>
                </div>
            </motion.div>
        );
    }

    if (status === 'result') {
        const percent = Math.round((score / queue.length) * 100);
        return (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} className="glass-card" style={{textAlign:'center'}}>
                <span className="label-tag">Результат</span>
                <h1 className="result-score">{percent}%</h1>
                <p style={{color: '#94a3b8', margin: '10px 0 30px'}}>
                    Ты ответил верно на {score} из {queue.length}
                </p>
                <motion.button whileTap={{scale:0.97}} className="btn-primary" onClick={startQuiz}>
                    Повторить
                </motion.button>
                <div style={{marginTop:'15px', cursor:'pointer', color:'rgba(255,255,255,0.4)', fontSize:'0.9rem'}} onClick={() => setStatus('setup')}>
                    Изменить слова
                </div>
            </motion.div>
        );
    }

    const currentItem = queue[currentIdx];
    // Определяем текст вопроса
    const questionText = currentItem.mode === 'direct' ? currentItem.word : currentItem.translation;
    // Определяем язык вопроса (для отображения и логики кнопки)
    const isEnglishQuestion = currentItem.mode === 'direct';
    
    const progress = ((currentIdx) / queue.length) * 100;

    return (
        <div className="glass-card">
            <div className="progress-bar" style={{width: `${progress}%`}}></div>
            <div style={{display:'flex', justifyContent:'space-between', color: 'rgba(255,255,255,0.3)', fontSize:'0.8rem', marginBottom:'20px'}}>
                <span>{currentIdx + 1} / {queue.length}</span>
                <span>{isEnglishQuestion ? "English" : "Russian"} Question</span>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIdx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* Блок с вопросом и кнопкой звука */}
                    <div className="question-row">
                        <h2 style={{textAlign:'center', fontSize:'2.2rem', margin:0, fontWeight:'500'}}>
                            {questionText}
                        </h2>
                        
                        {/* Показываем динамик только если это Английское слово */}
                        {isEnglishQuestion && (
                            <motion.button 
                                className="speak-btn"
                                whileTap={{scale:0.9}}
                                onClick={() => speak(questionText)}
                                title="Прослушать"
                            >
                                🔊
                            </motion.button>
                        )}
                    </div>

                    <div>
                        {options.map((opt, i) => {
                            let statusClass = '';
                            const correctVal = currentItem.mode === 'direct' ? currentItem.translation : currentItem.word;
                            
                            if (isAnswered) {
                                if (opt === correctVal) statusClass = 'correct';
                                else if (opt === selected && selected !== correctVal) statusClass = 'wrong';
                                else statusClass = '';
                            }

                            return (
                                <motion.button
                                    key={i}
                                    initial={{opacity: 0, x: -20}}
                                    animate={{opacity: 1, x: 0}}
                                    transition={{delay: i * 0.05}}
                                    className={`btn-option ${statusClass}`}
                                    onClick={() => handleCheck(opt)}
                                    disabled={isAnswered}
                                    whileTap={!isAnswered ? { scale: 0.98 } : {}}
                                >
                                    {opt}
                                </motion.button>
                            )
                        })}
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
