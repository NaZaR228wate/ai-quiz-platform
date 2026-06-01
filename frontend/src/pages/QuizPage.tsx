import { AxiosError } from "axios";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { attemptsApi } from "../api/attemptsApi";
import { authApi } from "../api/authApi";
import { Quiz, QuizAnalytics, QuizQuestion, quizzesApi } from "../api/quizzesApi";
import { QuizSession, sessionsApi } from "../api/sessionsApi";
import { User } from "../auth/authTypes";

export function QuizPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [analytics, setAnalytics] = useState<QuizAnalytics | null>(null);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [selectedOptionByQuestionId, setSelectedOptionByQuestionId] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isClosingSession, setIsClosingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadQuiz() {
      if (!quizId) {
        setError("Quiz not found or access denied.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setAnalytics(null);
      setAnalyticsError(null);

      try {
        const [userResponse, quizResponse, questionsResponse] = await Promise.all([
          authApi.getCurrentUser(),
          quizzesApi.getQuiz(quizId),
          quizzesApi.getQuizQuestions(quizId),
        ]);

        if (!ignore) {
          setCurrentUser(userResponse.data);
          setQuiz(quizResponse.data);
          setQuestions(questionsResponse.data);
        }

        if (userResponse.data.role === "teacher") {
          if (!ignore) {
            setIsAnalyticsLoading(true);
          }

          try {
            const analyticsResponse = await quizzesApi.getQuizAnalytics(quizId);
            if (!ignore) {
              setAnalytics(analyticsResponse.data);
            }
          } catch (caughtError) {
            if (!ignore) {
              setAnalyticsError(getAnalyticsErrorMessage(caughtError));
            }
          } finally {
            if (!ignore) {
              setIsAnalyticsLoading(false);
            }
          }
        }
      } catch (caughtError) {
        if (!ignore) {
          setError(getErrorMessage(caughtError));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadQuiz();

    return () => {
      ignore = true;
    };
  }, [quizId]);

  useEffect(() => {
    if (questions.length === 0) {
      setActiveQuestionIndex(0);
      return;
    }

    setActiveQuestionIndex((currentIndex) => Math.min(currentIndex, questions.length - 1));
  }, [questions.length]);

  async function handleSubmitQuiz() {
    if (!quizId) {
      return;
    }

    if (questions.some((question) => selectedOptionByQuestionId[question.id] === undefined)) {
      setSubmitError("Please answer all questions.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await attemptsApi.createAttempt(quizId, {
        answers: questions.map((question) => ({
          question_id: question.id,
          selected_option_id: selectedOptionByQuestionId[question.id],
        })),
      });
      navigate(`/attempts/${response.data.id}`);
    } catch (caughtError) {
      setSubmitError(getErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStartSession() {
    if (!quizId) {
      return;
    }

    setIsStartingSession(true);
    setSessionError(null);
    setCopySuccess(null);

    try {
      const response = await sessionsApi.createSession(quizId);
      setSession(response.data);
    } catch (caughtError) {
      setSessionError(getErrorMessage(caughtError));
    } finally {
      setIsStartingSession(false);
    }
  }

  async function handleCopyCode() {
    if (!session) {
      return;
    }

    try {
      await navigator.clipboard.writeText(session.code);
      setCopySuccess("Code copied.");
    } catch {
      setCopySuccess("Copy failed. Select and copy the code manually.");
    }
  }

  async function handleCloseSession() {
    if (!session || !window.confirm("Close this session?")) {
      return;
    }

    setIsClosingSession(true);
    setSessionError(null);

    try {
      const response = await sessionsApi.closeSession(String(session.id));
      setSession(response.data);
    } catch (caughtError) {
      setSessionError(getErrorMessage(caughtError));
    } finally {
      setIsClosingSession(false);
    }
  }

  const answeredCount = questions.filter((question) => selectedOptionByQuestionId[question.id] !== undefined).length;
  const progressPercent = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
  const activeQuestion = questions[activeQuestionIndex];
  const canShowSubmit = activeQuestionIndex === questions.length - 1 || answeredCount === questions.length;

  if (isLoading) {
    return (
      <section className="page-card">
        <h1>Quiz</h1>
        <p>Loading quiz...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-card">
        <h1>Quiz</h1>
        <div className="form-error">{error}</div>
      </section>
    );
  }

  return (
    <div className="dashboard-grid">
      {currentUser?.role === "teacher" && session ? (
        <div className="live-session-bar">
          <div className="live-session-bar__main">
            <span className="helper-text">Live session</span>
            <strong className="live-session-bar__code">{session.code}</strong>
            <span className={`status-badge ${session.status}`}>{session.status}</span>
            {copySuccess ? <span className="copied-text">{copySuccess === "Code copied." ? "Copied" : copySuccess}</span> : null}
          </div>
          <div className="live-session-bar__actions">
            <button type="button" className="secondary-button" onClick={handleCopyCode}>
              Copy code
            </button>
            <Link className="secondary-link" to={`/sessions/${session.id}`}>
              Open dashboard
            </Link>
            {session.status === "active" ? (
              <button type="button" className="danger-button" disabled={isClosingSession} onClick={handleCloseSession}>
                {isClosingSession ? "Closing..." : "Close session"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <section className={currentUser?.role === "student" ? "page-card quiz-hero-card" : "page-card"}>
        <div className="item-header">
          <div>
            {currentUser?.role === "student" ? <span className="eyebrow">Quiz taking</span> : null}
            <h1>{quiz?.title}</h1>
            <p>{quiz?.description || "No description provided."}</p>
          </div>
          {currentUser?.role === "teacher" && quiz?.topic_id ? (
            <Link className="secondary-link" to={`/topics/${quiz.topic_id}`}>
              Back to topic
            </Link>
          ) : null}
          {currentUser?.role === "student" ? (
            <Link className="secondary-link" to="/student">
              Back to student dashboard
            </Link>
          ) : null}
        </div>

        <dl className={currentUser?.role === "student" ? "quiz-meta-list" : "profile-list"}>
          <div>
            <dt>Quiz ID</dt>
            <dd>{quiz?.id}</dd>
          </div>
          <div>
            <dt>Created at</dt>
            <dd>{quiz ? new Date(quiz.created_at).toLocaleString() : ""}</dd>
          </div>
        </dl>
      </section>

      {currentUser?.role === "teacher" ? (
        <section className="page-card">
          <div className="item-header">
            <div>
              <h2>Live session</h2>
              <p>Start a live session and share the code with students.</p>
            </div>
            <button type="button" className="nav-button" disabled={isStartingSession} onClick={handleStartSession}>
              {isStartingSession ? "Starting..." : "Start session"}
            </button>
          </div>

          {session ? <p className="helper-text">Session controls stay visible at the top while you scroll.</p> : null}

          {sessionError ? <div className="form-error">{sessionError}</div> : null}
        </section>
      ) : null}

      <section className={currentUser?.role === "student" ? "page-card student-quiz-card" : "page-card"}>
        <div className="item-header">
          <div>
            <h2>Questions</h2>
            {currentUser?.role === "student" ? <p>Answer all questions and submit when ready.</p> : null}
          </div>
          {currentUser?.role === "teacher" ? (
            <a className="secondary-link" href="#quiz-analytics">
              View analytics
            </a>
          ) : null}
        </div>

        {currentUser?.role === "student" && questions.length > 0 ? (
          <div className="quiz-progress quiz-progress-sticky">
            <div className="quiz-progress__label">
              <span>
                Answered {answeredCount} / {questions.length}
              </span>
              <strong>{progressPercent}%</strong>
            </div>
            <div className="progress-track" aria-hidden="true">
              <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        ) : null}

        {questions.length === 0 ? (
          <p>No questions yet.</p>
        ) : currentUser?.role === "teacher" ? (
          <ol className="question-list">
            {questions.map((question, questionIndex) => (
              <li key={question.id} className="question-item">
                <div className="question-header">
                  <div>
                    {currentUser?.role === "student" ? (
                      <span className="question-count">
                        Question {questionIndex + 1} of {questions.length}
                      </span>
                    ) : null}
                    <h3>{question.question_text}</h3>
                  </div>
                  {currentUser?.role === "teacher" ? <span>{question.question_type}</span> : null}
                </div>
                <ul className="option-list">
                  {question.options.map((option) => {
                    const inputId = `question-${question.id}-option-${option.id}`;
                    const isSelected = selectedOptionByQuestionId[question.id] === option.id;

                    return (
                      <li key={option.id} className={`option-item ${currentUser?.role === "student" ? "quiz-option-card" : ""} ${isSelected ? "selected" : ""}`}>
                        {currentUser?.role === "student" ? (
                          <label className="radio-option quiz-radio-option" htmlFor={inputId}>
                            <input
                              id={inputId}
                              type="radio"
                              name={`question-${question.id}`}
                              checked={selectedOptionByQuestionId[question.id] === option.id}
                              onChange={() => {
                                setSelectedOptionByQuestionId((currentSelection) => ({
                                  ...currentSelection,
                                  [question.id]: option.id,
                                }));
                                setSubmitError(null);
                              }}
                            />
                            <span>{option.option_text}</span>
                          </label>
                        ) : (
                  <span>{option.option_text}</span>
                        )}
                        {currentUser?.role === "teacher" && option.is_correct ? (
                          <span className="correct-badge">Correct</span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
        ) : activeQuestion ? (
          <div className="quiz-taking-layout">
            <aside className="question-sidebar">
              <h3>Questions</h3>
              <div className="question-nav-list">
                {questions.map((question, questionIndex) => {
                  const isCurrent = questionIndex === activeQuestionIndex;
                  const isAnswered = selectedOptionByQuestionId[question.id] !== undefined;

                  return (
                    <button
                      key={question.id}
                      type="button"
                      className={`question-nav-button ${isCurrent ? "current" : ""} ${isAnswered ? "answered" : ""}`}
                      onClick={() => setActiveQuestionIndex(questionIndex)}
                    >
                      <span>Question {questionIndex + 1}</span>
                      <small>{isAnswered ? "Answered" : "Unanswered"}</small>
                    </button>
                  );
                })}
              </div>
            </aside>

            <div className="question-main">
              <article className="question-item active-question-card">
                <div className="question-header">
                  <div>
                    <span className="question-count">
                      Question {activeQuestionIndex + 1} of {questions.length}
                    </span>
                    <h3>{activeQuestion.question_text}</h3>
                  </div>
                </div>
                <ul className="option-list">
                  {activeQuestion.options.map((option) => {
                    const inputId = `question-${activeQuestion.id}-option-${option.id}`;
                    const isSelected = selectedOptionByQuestionId[activeQuestion.id] === option.id;

                    return (
                      <li key={option.id} className={`option-item quiz-option-card ${isSelected ? "selected" : ""}`}>
                        <label className="radio-option quiz-radio-option" htmlFor={inputId}>
                          <input
                            id={inputId}
                            type="radio"
                            name={`question-${activeQuestion.id}`}
                            checked={isSelected}
                            onChange={() => {
                              setSelectedOptionByQuestionId((currentSelection) => ({
                                ...currentSelection,
                                [activeQuestion.id]: option.id,
                              }));
                              setSubmitError(null);
                            }}
                          />
                          <span>{option.option_text}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </article>

              <div className="question-actions">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={activeQuestionIndex === 0}
                  onClick={() => setActiveQuestionIndex((currentIndex) => Math.max(0, currentIndex - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={activeQuestionIndex === questions.length - 1}
                  onClick={() =>
                    setActiveQuestionIndex((currentIndex) => Math.min(questions.length - 1, currentIndex + 1))
                  }
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {currentUser?.role === "student" && questions.length > 0 && canShowSubmit ? (
          <div className="submit-panel sticky-submit-panel">
            <div>
              <strong>Ready to submit?</strong>
              <p>{answeredCount === questions.length ? "All questions are answered." : `Answer ${questions.length - answeredCount} more question${questions.length - answeredCount === 1 ? "" : "s"}.`}</p>
            </div>
            <button type="button" className="nav-button" disabled={isSubmitting} onClick={handleSubmitQuiz}>
              {isSubmitting ? "Submitting..." : "Submit quiz"}
            </button>
            {submitError ? <div className="form-error">{submitError}</div> : null}
          </div>
        ) : null}
      </section>

      {currentUser?.role === "teacher" ? (
        <section className="page-card" id="quiz-analytics">
          <h2>Analytics</h2>

          {isAnalyticsLoading ? <p>Loading analytics...</p> : null}
          {analyticsError ? <div className="form-error">{analyticsError}</div> : null}

          {!isAnalyticsLoading && !analyticsError && analytics ? (
            <>
              {analytics.attempts_count === 0 ? <p>No attempts yet.</p> : null}

              <dl className="analytics-grid">
                <div>
                  <dt>Attempts count</dt>
                  <dd>{analytics.attempts_count}</dd>
                </div>
                <div>
                  <dt>Average score</dt>
                  <dd>{analytics.average_score}</dd>
                </div>
                <div>
                  <dt>Average percent</dt>
                  <dd>{analytics.average_percent}%</dd>
                </div>
                <div>
                  <dt>Total questions</dt>
                  <dd>{analytics.total_questions}</dd>
                </div>
                <div>
                  <dt>Best score</dt>
                  <dd>{analytics.best_score}</dd>
                </div>
                <div>
                  <dt>Worst score</dt>
                  <dd>{analytics.worst_score}</dd>
                </div>
              </dl>
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response?.status === 404) {
      return "Quiz not found or access denied.";
    }

    const detail = error.response?.data?.detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail)) {
      return "Please check the request.";
    }
    return "Request failed. Please try again.";
  }

  return "Request failed. Please try again.";
}

function getAnalyticsErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response?.status === 403) {
      return "You do not have permission to view analytics.";
    }
    if (error.response?.status === 404) {
      return "Analytics not found or access denied.";
    }

    const detail = error.response?.data?.detail;
    if (typeof detail === "string") {
      return detail;
    }
    return "Could not load analytics.";
  }

  return "Could not load analytics.";
}
