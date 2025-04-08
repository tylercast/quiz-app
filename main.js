// Register the ifEquals Handlebars helper
Handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
  return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
});

// Global state
const state = {
  studentName: '',
  quizId: '',
  currentQuestionIndex: 1,
  score: 0,
  startTime: null,
  timer: null
};

// Main app container
const app = document.getElementById('app');

// Load and compile Handlebars templates from the templates folder
async function loadTemplate(name) {
  const res = await fetch(`templates/${name}.handlebars`);
  const text = await res.text();
  return Handlebars.compile(text);
}

// Load the home screen
async function loadHome() {
  const template = await loadTemplate('home');
  app.innerHTML = template();

  // Event listener for the start form
  document.getElementById('start-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('student-name').value.trim();
    const quizSelect = document.getElementById('quiz-select').value;

    if (nameInput && quizSelect) {
      state.studentName = nameInput;
      state.quizId = quizSelect;
      state.currentQuestionIndex = 1;
      state.score = 0;
      state.startTime = Date.now();
      startTimer();
      loadQuestion();
    }
  });
}

// Start the timer
function startTimer() {
  state.timer = setInterval(() => {
    const now = Math.floor((Date.now() - state.startTime) / 1000);
    const timerDisplay = document.getElementById('timer');
    if (timerDisplay) {
      timerDisplay.textContent = `Time: ${now}s`;
    }
  }, 1000);
}

// Stop the timer
function stopTimer() {
  clearInterval(state.timer);
}

// Load a single question from local data (adjusted for subfolders)
async function loadQuestion() {
  try {
    // Determine the folder based on the quizId (javascript or python)
    const folder = state.quizId.toLowerCase(); // Assumes quizId is 'javascript' or 'python'
    const res = await fetch(`data/${folder}/${state.quizId}.json`);

    if (!res.ok) {
      showResult();
      return;
    }

    const quizData = await res.json();
    const currentQuestion = quizData.questions[state.currentQuestionIndex - 1];

    // If no more questions, show the result
    if (!currentQuestion) {
      showResult();
      return;
    }

    const template = await loadTemplate('quiz');
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);

    app.innerHTML = template({
      question: currentQuestion.question,
      type: currentQuestion.type,
      options: currentQuestion.options,
      answer: currentQuestion.answer,
      feedback: currentQuestion.feedback,
      score: state.score,
      total: state.currentQuestionIndex,
      time: elapsed
    });

    // Event listener for answer submission
    document.querySelector('.answer-form').addEventListener('submit', (e) => handleAnswer(e, currentQuestion.answer, currentQuestion.feedback));
  } catch (err) {
    console.error("Error loading question:", err);
  }
}

// Handle answer submission
async function handleAnswer(event, correctAnswer, feedbackText) {
  event.preventDefault();
  const form = event.target;
  const input = form.querySelector('[name="answer"]');
  const selected = form.querySelector('[name="answer"]:checked');
  let userAnswer = selected ? selected.value : input.value.trim();

  if (userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
    state.score++;
    app.innerHTML = `<div class="text-center mt-4"><h3 class="text-success">Awesome!</h3></div>`;
    setTimeout(() => {
      state.currentQuestionIndex++;
      loadQuestion();
    }, 1000);
  } else {
    const template = await loadTemplate('feedback');
    app.innerHTML = template({ feedbackText });
    document.getElementById('next-question-btn').addEventListener('click', () => {
      state.currentQuestionIndex++;
      loadQuestion();
    });
  }
}

// Show final result
async function showResult() {
  stopTimer();
  const template = await loadTemplate('result');
  const totalQuestions = state.currentQuestionIndex - 1;
  const passed = (state.score / totalQuestions) >= 0.8;
  const timeTaken = Math.floor((Date.now() - state.startTime) / 1000);

  app.innerHTML = template({
    studentName: state.studentName,
    score: state.score,
    total: totalQuestions,
    passed,
    time: timeTaken
  });

  document.getElementById('restart-btn').addEventListener('click', () => {
    state.currentQuestionIndex = 1;
    state.score = 0;
    state.startTime = Date.now();
    startTimer();
    loadQuestion();
  });

  document.getElementById('home-btn').addEventListener('click', () => {
    stopTimer();
    loadHome();
  });
}

// Start the app
window.addEventListener('DOMContentLoaded', loadHome);
