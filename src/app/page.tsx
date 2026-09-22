"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { BlockMath } from "react-katex";

import { MathService } from "@/services/math";
import { ProgressService } from "@/services/progress";
import { QuizService } from "@/services/quiz";
import { TeacherService } from "@/services/teacher";
import { VisionService } from "@/services/vision";
import { VoiceService } from "@/services/voice";
import { LearningService } from "@/services/learning";
import type { PracticeSession, QuizSession, Tab, TeacherMessage } from "@/types";

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "mentor", label: "Mentor", icon: "◎" },
  { id: "autopsy", label: "Mistake Autopsy", icon: "⚡" },
  { id: "practice", label: "Practice", icon: "∑" },
  { id: "quiz", label: "Quiz", icon: "◔" },
  { id: "learn", label: "Learn", icon: "⇢" },
  { id: "progress", label: "Progress", icon: "▣" },
];


const defaultMessages: TeacherMessage[] = [
  {
    id: 1,
    role: "teacher",
    text: "Hello. What would you like to learn today?",
    tone: "calm",
    suggestions: ["Explain fractions", "Solve 2x + 7 = 19", "Check my work"],
  },
];

import { ChatGPTView } from "@/components/chat/ChatGPTView";

export default function Home() {
  const lessons = useMemo(() => LearningService.getLessons(), []);
  const profile = useMemo(() => ProgressService.getProfile(), []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>("mentor");
  const [messages, setMessages] = useState<TeacherMessage[]>(defaultMessages);
  const [question, setQuestion] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [practiceSession, setPracticeSession] = useState<PracticeSession | null>(null);
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [quizTimeLeft, setQuizTimeLeft] = useState(60);
  const [quizSetupDifficulty, setQuizSetupDifficulty] = useState<string>("Medium");
  const [quizSetupTopic, setQuizSetupTopic] = useState<string | null>(null);
  const [quizSetupCount, setQuizSetupCount] = useState<number>(10);
  const [quizResults, setQuizResults] = useState<null | { correct: number; wrong: number; skipped: number; accuracy: number; score: number; averageTime: number; performanceLevel?: string }>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [scanStage, setScanStage] = useState<string | null>(null);
  const [checkWorkText, setCheckWorkText] = useState("");
  const [teacherState, setTeacherState] = useState<"idle" | "listening" | "thinking" | "explaining" | "encouraging" | "celebrating">("idle");

  useEffect(() => {
    if (!quizSession || quizResults) return;

    const interval = window.setInterval(() => {
      setQuizTimeLeft((current) => {
        if (current <= 1) {
          handleQuizAnswer(-1, true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [quizSession, quizResults]);

  const currentPracticeQuestion = practiceSession ? practiceSession.questions[practiceSession.currentIndex] : null;
  const currentQuizQuestion = quizSession ? quizSession.questions[quizSession.currentIndex] : null;

  const pushTeacherMessage = (message: TeacherMessage) => {
    setMessages((previous) => [...previous, message]);
  };

  const handleSendQuestion = (customQuestion?: string) => {
    const value = (customQuestion ?? question).trim();
    if (!value) return;

    setMessages((previous) => [...previous, { id: Date.now(), role: "user", text: value }]);
    setQuestion("");
    setIsThinking(true);
    setTeacherState("thinking");

    window.setTimeout(async () => {
      const reply = await TeacherService.ask(value);
      pushTeacherMessage(reply);
      setIsThinking(false);
      setTeacherState("explaining");
    }, 100);
  };

  const handleHint = () => {
    setIsThinking(true);
    setTeacherState("thinking");
    window.setTimeout(() => {
      pushTeacherMessage(TeacherService.giveHint(question || "Solve the current problem"));
      setIsThinking(false);
      setTeacherState("encouraging");
    }, 700);
  };

  const startPractice = (category = "Multiplication", difficulty = "Medium") => {
    const questions = TeacherService.generatePractice(category);
    setPracticeSession({
      category,
      difficulty,
      questions,
      currentIndex: 0,
      score: 0,
      answers: [],
    });
    setActiveTab("practice");
    setTeacherState("celebrating");
    pushTeacherMessage({
      id: Date.now(),
      role: "teacher",
      text: `Let’s practice ${category.toLowerCase()} for 10 minutes. I’ll guide you through each question and explain the reasoning as we go.`,
      tone: "encouraging",
    });
  };

  const handlePracticeAnswer = (selectedIndex: number) => {
    if (!practiceSession || !currentPracticeQuestion) return;

    const isCorrect = selectedIndex === currentPracticeQuestion.correctIndex;
    const nextAnswers = [
      ...practiceSession.answers,
      { questionId: currentPracticeQuestion.id, selectedIndex, isCorrect },
    ];

    const nextScore = practiceSession.score + (isCorrect ? 1 : 0);
    const nextIndex = practiceSession.currentIndex + 1;

    if (nextIndex < practiceSession.questions.length) {
      setPracticeSession({
        ...practiceSession,
        currentIndex: nextIndex,
        score: nextScore,
        answers: nextAnswers,
      });
      pushTeacherMessage({
        id: Date.now(),
        role: "teacher",
        text: isCorrect ? "Exactly. That step is correct. Let’s move to the next one." : `Not quite. ${currentPracticeQuestion.explanation}`,
        tone: isCorrect ? "celebratory" : "analytical",
      });
    } else {
      setPracticeSession({
        ...practiceSession,
        currentIndex: practiceSession.questions.length,
        score: nextScore,
        answers: nextAnswers,
      });
      pushTeacherMessage({
        id: Date.now(),
        role: "teacher",
        text: `Practice complete. You scored ${nextScore}/${practiceSession.questions.length}. ${currentPracticeQuestion.explanation}`,
        tone: "celebratory",
      });
    }
  };

  const startQuiz = (difficulty = "Medium", topic?: string, count: number = 10) => {
    const newSession = QuizService.createSession(difficulty, topic, count);
    setQuizSession(newSession);
    setQuizResults(null);
    setQuizTimeLeft(QuizService.getTimeLimit(difficulty));
    setActiveTab("quiz");
    setTeacherState("encouraging");
  };

  const handleQuizAnswer = (selectedIndex: number, timedOut = false) => {
    if (!quizSession || !currentQuizQuestion) return;

    const isCorrect = selectedIndex === currentQuizQuestion.correctIndex;
    const timeSpent = timedOut ? QuizService.getTimeLimit(quizSession.difficulty) : Math.max(1, QuizService.getTimeLimit(quizSession.difficulty) - quizTimeLeft + 1);

    const nextAnswers = [
      ...quizSession.answers,
      { questionId: currentQuizQuestion.id, selectedIndex, isCorrect, timeSpent },
    ];

    const updatedSession: QuizSession = {
      ...quizSession,
      answers: nextAnswers,
      currentIndex: quizSession.currentIndex + 1,
      score: quizSession.score + (isCorrect ? 1 : 0),
    };

    if (updatedSession.currentIndex >= updatedSession.questions.length) {
      const result = QuizService.calculateResults(updatedSession);
      setQuizResults(result);
      setQuizSession(updatedSession);
      setQuizTimeLeft(0);
      pushTeacherMessage({
        id: Date.now(),
        role: "teacher",
        text: `You scored ${result.correct}/${updatedSession.questions.length}. You did well on fundamentals, but multi-step percentage questions are still the next place to sharpen your skill.`,
        tone: "analytical",
      });
      return;
    }

    setQuizSession(updatedSession);
    setQuizTimeLeft(QuizService.getTimeLimit(updatedSession.difficulty));
    pushTeacherMessage({
      id: Date.now(),
      role: "teacher",
      text: timedOut ? "Time’s up. Let’s review the idea behind this question and then continue." : isCorrect ? "Correct. That technique is exactly right." : `Good attempt. ${currentQuizQuestion.explanation}`,
      tone: isCorrect ? "celebratory" : "analytical",
    });
  };

  const handleAnalyzeImage = (file?: File) => {
    const targetFile = file ?? new File(["sample"], "math-problem.png", { type: "image/png" });
    const detected = VisionService.extractMath(targetFile.name);
    setSelectedImage(URL.createObjectURL(targetFile));
    setScanStage("Analyzing image...");

    window.setTimeout(() => setScanStage("Detecting mathematics..."), 700);
    window.setTimeout(() => setScanStage("Reading problem..."), 1400);
    window.setTimeout(() => setScanStage("Understanding the question..."), 2200);
    window.setTimeout(() => {
      setScanStage("Preparing explanation...");
      setTeacherState("thinking");
      pushTeacherMessage({
        id: Date.now(),
        role: "teacher",
        text: `I found this problem: ${detected.text}. Let’s solve it carefully and explain why each step is valid.`,
        tone: "calm",
      });
    }, 3000);
  };

  const handleCheckWork = () => {
    if (!checkWorkText.trim()) return;

    const result = MathService.verifyAnswer(checkWorkText, "20");
    pushTeacherMessage({
      id: Date.now(),
      role: "teacher",
      text: `I checked your work. ${result.feedback} I found the first mistake is in the step where the operation was not reversed correctly.`,
      tone: "analytical",
      suggestions: ["Explain this step", "Give me a similar problem", "Show complete solution"],
    });
  };

  const renderMath = (expression: string) => (
    <div className="math-block">
      <BlockMath math={expression} />
    </div>
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark">M</div>
          <div>
            <div className="brand-name">MathMentor AI</div>
            <div className="brand-tag">Futuristic AI Math Tutor</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab("mentor")}
          className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#070B16] font-bold text-sm shadow-[0_0_20px_rgba(76,215,246,0.2)] transition-all flex items-center justify-center gap-2"
        >
          <span>+ New AI Chat</span>
        </button>

        <nav className="nav-stack" aria-label="Main navigation">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`nav-item ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="ghost-button">Profile</button>
          <button type="button" className="ghost-button">Settings</button>
        </div>
      </aside>

      <main className="content-panel p-0 h-screen overflow-hidden">
        {activeTab === "mentor" && (
          <div className="h-full w-full">
            <ChatGPTView />
          </div>
        )}


        {activeTab === "practice" && (
          <section className="content-grid">
            <div className="panel-card wide">
              <div className="card-title">Practice</div>
              <div className="chip-row">
                {['Multiplication', 'Fractions', 'Percentages', 'Algebra'].map((category) => (
                  <button key={category} type="button" className="chip" onClick={() => startPractice(category, 'Medium')}>
                    {category}
                  </button>
                ))}
              </div>

              {!practiceSession ? (
                <div className="empty-state">
                  <p>Choose a concept to begin a focused 10-minute practice session.</p>
                </div>
              ) : currentPracticeQuestion ? (
                <div className="practice-flow">
                  <div className="question-meta">
                    <span>{practiceSession.category}</span>
                    <span>{practiceSession.difficulty}</span>
                    <span>
                      {practiceSession.currentIndex + 1} / {practiceSession.questions.length}
                    </span>
                  </div>
                  <div className="question-text">{currentPracticeQuestion.prompt}</div>
                  <div className="options-grid">
                    {currentPracticeQuestion.options.map((option, optionIndex) => (
                      <button key={option} type="button" className="option-button" onClick={() => handlePracticeAnswer(optionIndex)}>
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <p>Session complete. Review the coach feedback and try another topic.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "quiz" && (
          <section className="content-grid">
            <div className="panel-card wide">
              <div className="card-title">Quiz Engine</div>

              {!quizSession ? (
                <div className="space-y-6">
                  {/* Step 1: Difficulty */}
                  <div>
                    <h4 className="text-sm font-semibold text-cyan-400 mb-2">Step 1: Choose Difficulty</h4>
                    <div className="chip-row">
                      {["Very Easy", "Easy", "Medium", "Hard", "Very Hard"].map((diff) => (
                        <button
                          key={diff}
                          type="button"
                          className={`chip ${quizSetupDifficulty === diff ? "active border-cyan-400 bg-cyan-500/20 text-cyan-300" : ""}`}
                          onClick={() => {
                            setQuizSetupDifficulty(diff);
                            setQuizSetupTopic(null);
                          }}
                        >
                          {diff} ({QuizService.getTimeLimit(diff)}s/q)
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 2: Topics */}
                  <div>
                    <h4 className="text-sm font-semibold text-cyan-400 mb-2">
                      Step 2: Choose Topic ({quizSetupDifficulty === "Very Hard" ? "Advanced Math Allowed" : "Numerical Mathematics Only"})
                    </h4>
                    <div className="chip-row flex-wrap">
                      <button
                        type="button"
                        className={`chip ${quizSetupTopic === null ? "active border-cyan-400 bg-cyan-500/20 text-cyan-300" : ""}`}
                        onClick={() => setQuizSetupTopic(null)}
                      >
                        All Topics
                      </button>
                      {(quizSetupDifficulty === "Very Hard"
                        ? [...QuizService.BASIC_TOPICS, ...QuizService.ADVANCED_TOPICS]
                        : QuizService.BASIC_TOPICS
                      ).map((topic) => (
                        <button
                          key={topic}
                          type="button"
                          className={`chip ${quizSetupTopic === topic ? "active border-cyan-400 bg-cyan-500/20 text-cyan-300" : ""}`}
                          onClick={() => setQuizSetupTopic(topic)}
                        >
                          {topic}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 3: Question Count & Start */}
                  <div>
                    <h4 className="text-sm font-semibold text-cyan-400 mb-2">Step 3: Question Count</h4>
                    <div className="chip-row">
                      {[5, 10, 20, 30].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          className={`chip ${quizSetupCount === cnt ? "active border-cyan-400 bg-cyan-500/20 text-cyan-300" : ""}`}
                          onClick={() => setQuizSetupCount(cnt)}
                        >
                          {cnt} Questions
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="button"
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-[#070B16] font-bold text-base hover:opacity-90 transition-all shadow-[0_0_20px_rgba(76,215,246,0.3)]"
                      onClick={() => startQuiz(quizSetupDifficulty, quizSetupTopic || undefined, quizSetupCount)}
                    >
                      🚀 Start {quizSetupDifficulty} Quiz ({quizSetupCount} Questions)
                    </button>
                  </div>
                </div>
              ) : quizResults ? (
                <div className="quiz-results space-y-4">
                  <div className="results-topline grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-[#0F172A] border border-[#1E293B]">
                    <div><strong className="text-2xl text-cyan-400">{quizResults.score}</strong><span className="block text-xs text-[#94A3B8]">Score</span></div>
                    <div><strong className="text-2xl text-emerald-400">{quizResults.correct}</strong><span className="block text-xs text-[#94A3B8]">Correct</span></div>
                    <div><strong className="text-2xl text-rose-400">{quizResults.wrong}</strong><span className="block text-xs text-[#94A3B8]">Wrong</span></div>
                    <div><strong className="text-2xl text-amber-400">{quizResults.accuracy}%</strong><span className="block text-xs text-[#94A3B8]">Accuracy</span></div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0F172A] border border-[#1E293B]">
                    <span className="text-xs text-cyan-400 font-semibold uppercase">Performance Analysis</span>
                    <p className="text-sm mt-1 text-[#E2E8F0]">
                      Level: <strong>{quizResults.performanceLevel}</strong> • Avg speed: {quizResults.averageTime}s per question.
                    </p>
                  </div>
                  <button type="button" className="w-full py-2.5 rounded-xl bg-cyan-500 text-[#070B16] font-bold text-sm" onClick={() => setQuizSession(null)}>
                    Take Another Quiz
                  </button>
                </div>
              ) : currentQuizQuestion ? (
                <div className="practice-flow space-y-4">
                  <div className="question-meta flex justify-between items-center text-xs text-[#94A3B8] pb-2 border-b border-[#1E293B]">
                    <span>Difficulty: <strong className="text-cyan-400">{quizSession?.difficulty}</strong></span>
                    <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">{quizTimeLeft}s left</span>
                    <span>Question {(quizSession?.currentIndex ?? 0) + 1} of {quizSession?.questions.length}</span>
                  </div>
                  <div className="question-text text-lg font-semibold text-white py-2">{currentQuizQuestion.prompt}</div>
                  <div className="options-grid grid grid-cols-1 md:grid-cols-2 gap-3">
                    {currentQuizQuestion.options.map((option, optionIndex) => (
                      <button key={option} type="button" className="option-button p-3 rounded-xl bg-[#111827] border border-[#1F293D] hover:border-cyan-400/50 hover:bg-[#1E293B] text-left text-sm text-white font-medium transition-all" onClick={() => handleQuizAnswer(optionIndex)}>
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <p>Session ended.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "learn" && (
          <section className="content-grid">
            <div className="panel-card wide">
              <div className="card-title">Learn</div>
              <div className="lesson-grid">
                {lessons.map((lesson) => (
                  <div key={lesson.id} className="lesson-card">
                    <div className="lesson-header">
                      <span>{lesson.category}</span>
                      <span>{lesson.level}</span>
                    </div>
                    <h3>{lesson.title}</h3>
                    <p>{lesson.summary}</p>
                    <ul>
                      {lesson.objectives.map((objective) => (
                        <li key={objective}>{objective}</li>
                      ))}
                    </ul>
                    <button type="button" className="primary small" onClick={() => handleSendQuestion(`Teach me ${lesson.title}`)}>
                      Start lesson
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === "autopsy" && (
          <section className="content-grid">
            <div className="panel-card wide">
              <div className="card-title">Mistake Autopsy — Diagnostic Analysis</div>
              <div className="flex flex-col gap-space-lg">
                <div className="p-space-md rounded-xl bg-surface-container-low border border-error/30 flex flex-col gap-space-sm">
                  <div className="flex items-center justify-between">
                    <span className="px-space-xs py-1 rounded bg-error/20 text-error font-label-sm uppercase font-semibold">
                      Conceptual Blindspot — ID #ERR-809
                    </span>
                    <span className="text-outline text-body-sm">Time Spent: 4m 12s</span>
                  </div>
                  <h3>Convergence of Series ∑ₙ₌₁─────────── (-1)ⁿ / (√n + (-1)ⁿ)</h3>
                  <p className="text-on-surface-variant">
                    Submitted Hypothesis: “Converges by Alternating Series Test because (-1)ⁿ alternates and terms go to zero as n → ∞.”
                  </p>
                  <div className="p-space-sm rounded bg-surface-container text-tertiary border border-tertiary/30">
                    <strong>Prof. Hawthorne's Dissection:</strong> The terms alternate and tend to zero, but they <u>do not decrease monotonically</u>. Perform asymptotic expansion:
                    <div className="my-2 p-2 bg-surface-container-lowest rounded text-secondary font-mono">
                      (-1)ⁿ / (√n + (-1)ⁿ) = (-1)ⁿ / √n - 1/n + O(n⁻³/²)
                    </div>
                    The second series is the diverging harmonic series -∑(1/n). Hence, the entire series <strong>diverges</strong>.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                  <div className="p-space-md rounded-xl bg-surface-container border border-outline-variant/20">
                    <span className="text-outline text-label-sm uppercase">Accuracy Metric</span>
                    <div className="text-headline-lg font-bold text-secondary mt-1">85%</div>
                    <span className="text-body-sm text-on-surface-variant">10/12 Solved • 2 autopsies</span>
                  </div>
                  <div className="p-space-md rounded-xl bg-surface-container border border-outline-variant/20">
                    <span className="text-outline text-label-sm uppercase">Cognitive Efficiency</span>
                    <div className="text-headline-lg font-bold text-tertiary mt-1">91%</div>
                    <span className="text-body-sm text-on-surface-variant">+4.2% vs average speed</span>
                  </div>
                  <div className="p-space-md rounded-xl bg-surface-container border border-outline-variant/20">
                    <span className="text-outline text-label-sm uppercase">Reasoning Precision</span>
                    <div className="text-headline-lg font-bold text-primary mt-1">94%</div>
                    <span className="text-body-sm text-on-surface-variant">Formal proof structure valid</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === "progress" && (
          <section className="content-grid">
            <div className="panel-card wide">
              <div className="card-title">Progress</div>
              <div className="stats-grid">
                <div className="stat-card"><span>Accuracy</span><strong>{profile.accuracy}%</strong></div>
                <div className="stat-card"><span>Questions solved</span><strong>{profile.questionsSolved}</strong></div>
                <div className="stat-card"><span>Learning time</span><strong>{profile.learningTime}h</strong></div>
                <div className="stat-card"><span>Quiz performance</span><strong>{profile.quizPerformance}%</strong></div>
              </div>
              <div className="progress-list">
                <div className="progress-row">
                  <label>Fractions</label>
                  <div className="progress-track"><span style={{ width: "73%" }} /></div>
                </div>
                <div className="progress-row">
                  <label>Percentages</label>
                  <div className="progress-track"><span style={{ width: "88%" }} /></div>
                </div>
                <div className="progress-row">
                  <label>Algebra</label>
                  <div className="progress-track"><span style={{ width: "82%" }} /></div>
                </div>
              </div>
              <div className="insight-box">
                <strong>Teacher insight:</strong> “You are improving steadily. Fractions are your next focus area, and short sessions with mixed numbers will help the most.”
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
