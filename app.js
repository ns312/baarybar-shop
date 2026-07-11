document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initPromoBar();
    initACShowcase();
    initBTUCalculator();
    initQuiz();
    initScrollAnimations();
});

function initTheme() {
    document.body.setAttribute('data-theme', 'light');
}

/* 2. Interactive AC Unit Showcase Animation */
function initACShowcase() {
    const acUnit = document.querySelector('.ac-unit');
    const screenTemp = document.querySelector('.ac-screen span');
    if (!acUnit || !screenTemp) return;

    // Simulate cooling flow periodically
    acUnit.classList.add('ac-active');
    
    let currentTemp = 18;
    
    // Allow user to click the unit to change temperature
    acUnit.addEventListener('click', () => {
        currentTemp = currentTemp <= 16 ? 24 : currentTemp - 1;
        screenTemp.textContent = `${currentTemp}°C`;
        
        // Add quick trigger pulse
        acUnit.style.transform = 'scale(0.98)';
        setTimeout(() => {
            acUnit.style.transform = 'none';
        }, 100);
    });
}

/* 3. Interactive BTU / Model Selector Calculator */
function initBTUCalculator() {
    const areaSlider = document.getElementById('calc-area');
    const areaValue = document.getElementById('calc-area-val');
    const heightButtons = document.querySelectorAll('.toggle-height');
    const sunButtons = document.querySelectorAll('.toggle-sun');
    
    const resultBTU = document.getElementById('result-btu');
    const resultModel = document.getElementById('result-model');
    const resultDesc = document.getElementById('result-desc');
    const resultBtn = document.getElementById('result-order-btn');

    if (!areaSlider || !resultBTU) return;

    let selectedHeight = 2.7; // default meters
    let selectedSun = 1.0;    // default multiplier

    // Height Buttons
    heightButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            heightButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedHeight = parseFloat(btn.dataset.val);
            calculate();
        });
    });

    // Sun exposure Buttons
    sunButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            sunButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedSun = parseFloat(btn.dataset.val);
            calculate();
        });
    });

    // Slider input change
    areaSlider.addEventListener('input', (e) => {
        areaValue.textContent = `${e.target.value} м²`;
        calculate();
    });

    function calculate() {
        const area = parseInt(areaSlider.value);
        
        // Base heat load calculation (Volume * sun factor * constant)
        const volume = area * selectedHeight;
        const heatLoadWatts = volume * selectedSun * 35; // approx 35W per m3
        
        // Convert Watts to BTU/h (1 W ≈ 3.412 BTU/h)
        const btuRequired = heatLoadWatts * 3.412;
        
        let powerClass = "07";
        let powerValue = "7000 BTU";
        let recommendedSquare = "до 20 м²";
        let modelRecommendation = "Midea / Otex 07 BTU";
        
        if (btuRequired <= 7500) {
            powerClass = "07";
            powerValue = "07 BTU";
            recommendedSquare = "до 23 м²";
            modelRecommendation = "Midea 07EF / Otex 07TP";
        } else if (btuRequired <= 10000) {
            powerClass = "09";
            powerValue = "09 BTU";
            recommendedSquare = "до 30 м²";
            modelRecommendation = "Midea 09EF / Otex 09TP";
        } else if (btuRequired <= 13500) {
            powerClass = "12";
            powerValue = "12 BTU";
            recommendedSquare = "до 40 м²";
            modelRecommendation = "Midea 12EF / Otex 12TP / Duke 12I";
        } else if (btuRequired <= 19500) {
            powerClass = "18";
            powerValue = "18 BTU";
            recommendedSquare = "до 55 м²";
            modelRecommendation = "Midea 18EF / Otex 18TP";
        } else {
            powerClass = "24";
            powerValue = "24 BTU";
            recommendedSquare = "до 80 м²";
            modelRecommendation = "Midea 24EF / Otex 24TP";
        }

        // Update UI
        resultBTU.textContent = powerValue;
        resultModel.textContent = modelRecommendation;
        resultDesc.textContent = `Оптимальная мощность для площади ${area} м² (высота ${selectedHeight}м, солнечная нагрузка ${selectedSun === 1.2 ? 'высокая' : selectedSun === 1.0 ? 'средняя' : 'минимальная'}).`;
        
        // Update WhatsApp Order Button link dynamically
        const waText = `Здравствуйте! Воспользовался калькулятором на сайте Baarybar.shop. Рассчитал мощность под комнату ${area} кв.м. Рекомендован класс: ${powerValue} (${modelRecommendation}). Хочу заказать с доставкой и установкой в день заказа!`;
        resultBtn.href = `https://wa.me/996502500874?text=${encodeURIComponent(waText)}`;
    }

    // Run initial calculation
    calculate();
}

/* 4. Interactive Quiz (Мастер подбора) Logic */
function initQuiz() {
    const steps = document.querySelectorAll('.quiz-step');
    const progressFill = document.querySelector('.quiz-progress-fill');
    const answerCards = document.querySelectorAll('.quiz-answer-card');
    const btnPrev = document.getElementById('quiz-prev');
    const btnNext = document.getElementById('quiz-next');
    const quizResultCard = document.getElementById('quiz-result-card');
    const quizWaBtn = document.getElementById('quiz-wa-btn');

    if (steps.length === 0 || !btnNext) return;

    let currentStepIdx = 0;
    const selectedAnswers = {
        roomType: '',
        area: '',
        inverter: '',
        budget: ''
    };

    // Card selection event
    answerCards.forEach(card => {
        card.addEventListener('click', () => {
            const stepId = card.closest('.quiz-step').id;
            const parentStep = card.closest('.quiz-step');
            
            // Unselect sibling cards
            parentStep.querySelectorAll('.quiz-answer-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');

            // Save choice
            const optionKey = parentStep.dataset.option;
            selectedAnswers[optionKey] = card.dataset.value;

            // Automatically proceed to next step after brief delay
            setTimeout(() => {
                navigate(1);
            }, 300);
        });
    });

    btnNext.addEventListener('click', () => navigate(1));
    btnPrev.addEventListener('click', () => navigate(-1));

    function navigate(direction) {
        // Validate if choice made in current step before moving forward
        if (direction === 1) {
            const currentStep = steps[currentStepIdx];
            const hasSelection = currentStep.querySelector('.quiz-answer-card.selected');
            if (!hasSelection && currentStepIdx < steps.length - 1) {
                alert('Пожалуйста, выберите один из вариантов ответа.');
                return;
            }
        }

        // Hide current step
        steps[currentStepIdx].classList.remove('active');
        
        currentStepIdx += direction;

        // Ensure indices inside bounds
        if (currentStepIdx < 0) currentStepIdx = 0;
        if (currentStepIdx >= steps.length) currentStepIdx = steps.length - 1;

        // Show new step
        steps[currentStepIdx].classList.add('active');

        // Update progress bar
        const progressPercent = ((currentStepIdx + 1) / steps.length) * 100;
        progressFill.style.width = `${progressPercent}%`;

        // Update Footer Buttons Visibility
        btnPrev.style.visibility = currentStepIdx > 0 ? 'visible' : 'hidden';
        
        if (currentStepIdx === steps.length - 1) {
            // Last step (Result summary)
            btnNext.style.display = 'none';
            showQuizResults();
        } else {
            btnNext.style.display = 'inline-flex';
            btnNext.textContent = 'Далее';
        }
    }

    function showQuizResults() {
        const textSummary = `Помещение: ${selectedAnswers.roomType}, Площадь: ${selectedAnswers.area}, Тип: ${selectedAnswers.inverter}, Бюджет: ${selectedAnswers.budget}.`;
        quizResultCard.textContent = textSummary;

        // Generate WhatsApp link with quiz answers
        const waMessage = `Здравствуйте! Прошел тест-опросник подбора кондиционера на сайте Baarybar.shop.\n\nМои требования:\n- Тип комнаты: ${selectedAnswers.roomType}\n- Примерная площадь: ${selectedAnswers.area}\n- Тип кондиционера: ${selectedAnswers.inverter}\n- Ценовой бюджет: ${selectedAnswers.budget}\n\nПожалуйста, подберите подходящие модели кондиционеров и проконсультируйте по установке в день заказа!`;
        quizWaBtn.href = `https://wa.me/996502500874?text=${encodeURIComponent(waMessage)}`;
    }
}

/* 5. Smooth Scroll & Animate-on-Scroll Trigger using IntersectionObserver */
function initScrollAnimations() {
    const animElements = document.querySelectorAll('.glass-card, .product-card, .section-header');
    
    const observerOptions = {
        root: null,
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px' // triggers slightly before entering viewport
    };

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                obs.unobserve(entry.target);
            }
        });
    }, observerOptions);

    animElements.forEach(el => {
        // Initial state
        el.style.opacity = '0';
        el.style.transform = 'translateY(25px)';
        el.style.transition = 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        observer.observe(el);
    });
}

/* Promo Bar and Modal management */
function initPromoBar() {
    const timerEl = document.getElementById('promo-timer');
    if (!timerEl) return;

    let timeKey = 'promo_timer_seconds';
    let duration = parseInt(sessionStorage.getItem(timeKey));
    if (isNaN(duration) || duration <= 0) {
        duration = 600; // 10 minutes default
    }

    function updateTimer() {
        let minutes = Math.floor(duration / 60);
        let seconds = duration % 60;
        
        timerEl.textContent = 
            (minutes < 10 ? '0' : '') + minutes + ':' + 
            (seconds < 10 ? '0' : '') + seconds;

        if (duration <= 0) {
            duration = 600; // Reset timer for repeating urgency
        } else {
            duration--;
        }
        sessionStorage.setItem(timeKey, duration);
    }

    updateTimer();
    setInterval(updateTimer, 1000);
}

// Modal functions
window.openDeflectorModal = function() {
    const modal = document.getElementById('deflector-modal');
    if (modal) modal.classList.add('active');
}

window.closeDeflectorModal = function() {
    const modal = document.getElementById('deflector-modal');
    if (modal) modal.classList.remove('active');
}

// Close modal on click outside
window.addEventListener('click', (e) => {
    const modal = document.getElementById('deflector-modal');
    if (e.target === modal) {
        modal.classList.remove('active');
    }
});

