const { useState, useEffect } = React;
const { motion, AnimatePresence } = window.Motion;

// Дефолтный набор
const defaultData = [
    { "word": "Encourage", "translation": "Поощрять" },
    { "word": "Sustainable", "translation": "Устойчивый" },
    { "word": "Development", "translation": "Развитие" },
    { "word": "Goal", "translation": "Цель" },
    { "word": "Decision", "translation": "Решение" }
];

// Утилита перемешивания
const shuffle = (array) => [...array].sort(() => Math.random() - 0.5);

const App = () => {
    const [status, setStatus] = useState('setup'); // setup, quiz, result
    const [jsonInput, setJsonInput] = useState(JSON.stringify(defaultData, null, 2));
    const [queue, setQueue] = useState([]); // Очередь вопросов
    const [currentIdx, setCurrentIdx] = useState(0);
    const [score, setScore] = useState(0);

    // Состояние текущего вопроса
    const [options, setOptions] = useState([]);
    const [selected, setSelected] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);

    // --- ЛОГИКА ГЕНЕРАЦИИ (MIXED MODE) ---
    const startQuiz = () => {
        try {
            const rawData = JSON.parse(jsonInput);
            if (rawData.length < 4) { alert("Нужно хотя бы 4 слова!"); return; }

            // 1. Создаем очередь. Для каждого слова СЛУЧАЙНО решаем:
            // mode: 'direct' (EN->RU) или 'inverse' (RU->EN)
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
            alert("Ошибка JSON");
        }
    };

    // Генерация вариантов ответа
    const generateOptions = (currentItem, allData) => {
        const targetMode = currentItem.mode;
        
        // Правильный ответ
        const correctText = targetMode === 'direct' ? currentItem.translation : currentItem.word;
        
        // Список "неправильных" (дистракторы)
        // Нам нужно отфильтровать текущее слово и взять ответы В ТОМ ЖЕ ЯЗЫКЕ, что и правильный ответ
        const pool = allData.filter(w => w.word !== currentItem.word);
        
        const distractors = pool.map(w => 
            targetMode === 'direct' ? w.translation : w.word
        );

        const selectedDistractors = shuffle(distractors).slice(0, 3);
        setOptions(shuffle([correctText, ...selectedDistractors]));
        
        // Сброс
        setSelected(null);
        setIsAnswered(false);
        setIsCorrect(false);
    };

    const handleCheck = (option) => {
        if (isAnswered) return; // Блокируем повторный клик

        const currentItem = queue[currentIdx];
        const correctVal = currentItem.mode === 'direct' ? currentItem.translation : currentItem.word;
        
        const correct = option === correctVal;
        
        setSelected(option);
        setIsAnswered(true);
        setIsCorrect(correct);

        if (correct) setScore(s => s + 1);

        // Авто-переход с задержкой (чтобы успеть увидеть результат)
        setTimeout(() => {
            if (currentIdx < queue.length - 1) {
                const nextIdx = currentIdx + 1;
                setCurrentIdx(nextIdx);
                generateOptions(queue[nextIdx], JSON.parse(jsonInput));
            } else {
                setStatus('result');
            }
        }, 1200); // 1.2 секунды задержка
    };

    // --- КОМПОНЕНТЫ ---

    // 1. НАСТРОЙКА
    if (status === 'setup') {
        return (
            <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="glass-card">
                <div className="title">Vocabulary Mix</div>
                <span className="label-tag">Вставь JSON данные</span>
                <textarea value={jsonInput} onChange={e => setJsonInput(e.target.value)} spellCheck="false" />
                <motion.button 
                    whileTap={{scale:0.97}} 
                    className="btn-primary" 
                    onClick={startQuiz}
                >
                    Начать практику
                </motion.button>
                <p style={{textAlign:'center', fontSize:'0.8rem', color:'rgba(255,255,255,0.3)', marginTop:'15px'}}>
                    Смешанный режим: EN-RU и RU-EN
                </p>
            </motion.div>
        );
    }

    // 2. РЕЗУЛЬТАТ
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

    // 3. ТЕСТ (QUIZ)
    const currentItem = queue[currentIdx];
    // Если режим direct: Спрашиваем Word -> Ждем Translation
    // Если режим inverse: Спрашиваем Translation -> Ждем Word
    const questionText = currentItem.mode === 'direct' ? currentItem.word : currentItem.translation;
    const questionLang = currentItem.mode === 'direct' ? "English" : "Russian";
    const progress = ((currentIdx) / queue.length) * 100;

    return (
        <div className="glass-card">
            {/* Progress Bar */}
            <div className="progress-bar" style={{width: `${progress}%`}}></div>
            
            <div style={{display:'flex', justifyContent:'space-between', color: 'rgba(255,255,255,0.3)', fontSize:'0.8rem', marginBottom:'20px'}}>
                <span>{currentIdx + 1} / {queue.length}</span>
                <span>{questionLang} Question</span>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIdx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                >
                    <h2 style={{textAlign:'center', fontSize:'2.2rem', margin:'10px 0 30px', fontWeight:'500'}}>
                        {questionText}
                    </h2>

                    <div>
                        {options.map((opt, i) => {
                            // Логика цвета кнопки
                            let statusClass = '';
                            const correctVal = currentItem.mode === 'direct' ? currentItem.translation : currentItem.word;
                            
                            if (isAnswered) {
                                if (opt === correctVal) statusClass = 'correct'; // Всегда подсвечиваем правильный
                                else if (opt === selected && selected !== correctVal) statusClass = 'wrong'; // Если выбрали этот и он неверный
                                else statusClass = ''; // Остальные серые
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
