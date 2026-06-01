import { AxiosError } from "axios";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { QuizQuestion, quizzesApi } from "../api/quizzesApi";
import { SessionByCode, sessionsApi } from "../api/sessionsApi";

type LocationState = {
  session?: SessionByCode;
};

export function SessionTakePage() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionByCode | null>((location.state as LocationState | null)?.session ?? null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [selectedOptionByQuestionId, setSelectedOptionByQuestionId] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadSessionTake() {
      if (!sessionId) {
        setError("Session not found or access denied.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const sessionResponse = session ?? (await sessionsApi.getSessionForTake(sessionId)).data;
        const questionsResponse = await quizzesApi.getQuizQuestions(String(sessionResponse.quiz_id));

        if (!ignore) {
          setSession(sessionResponse);
          setQuestions(questionsResponse.data);
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

    loadSessionTake();

    return () => {
      ignore = true;
    };
  }, [session, sessionId]);

  useEffect(() => {
    if (questions.length === 0) {
      setActiveQuestionIndex(0);
      return;
    }

    setActiveQuestionIndex((currentIndex) => Math.min(currentIndex, questions.length - 1));
  }, [questions.length]);

  async function handleSubmitSessionQuiz() {
    if (!sessionId) {
      return;
    }

    if (questions.some((question) => selectedOptionByQuestionId[question.id] === undefined)) {
      setSubmitError("Please answer all questions.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await sessionsApi.createSessionAttempt(sessionId, {
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

  const answeredCount = questions.filter((question) => selectedOptionByQuestionId[question.id] !== undefined).length;
  const progressPercent = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
  const activeQuestion = questions[activeQuestionIndex];
  const canShowSubmit = activeQuestionIndex === questions.length - 1 || answeredCount === questions.length;

  if (isLoading) {
    return (
      <section className="page-card">
        <h1>Session Quiz</h1>
        <p>Loading session quiz...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-card empty-session-state">
        <span className="eyebrow">Live session</span>
        <h1>Session Quiz</h1>
        <div className="form-error">{error}</div>
      </section>
    );
  }

  if (session?.status === "closed") {
    return (
      <section className="page-card empty-session-state">
        <span className="eyebrow">Live session</span>
        <h1>This session is closed.</h1>
        <p>Ask your teacher for a new session code.</p>
        <button type="button" className="secondary-button" onClick={() => navigate("/student")}>
          Back to student dashboard
        </button>
      </section>
    );
  }

  return (
    <div className="dashboard-grid">
      <section className="page-card quiz-hero-card">
        <div className="item-header">
          <div>
            <span className="eyebrow">Live quiz</span>
            <h1>{session?.quiz.title}</h1>
            <p>{session?.quiz.description || "Answer all questions and submit when ready."}</p>
          </div>
          <span className={`status-badge ${session?.status}`}>{session?.status}</span>
        </div>
        <div className="session-panel">
          <span className="helper-text">Session code</span>
          <strong className="session-code">{session?.code}</strong>
        </div>
      </section>

      <section className="page-card student-quiz-card">
        <h2>Questions</h2>

        {questions.length > 0 ? (
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
                    const inputId = `session-question-${activeQuestion.id}-option-${option.id}`;
                    const isSelected = selectedOptionByQuestionId[activeQuestion.id] === option.id;

                    return (
                      <li key={option.id} className={`option-item quiz-option-card ${isSelected ? "selected" : ""}`}>
                        <label className="radio-option quiz-radio-option" htmlFor={inputId}>
                          <input
                            id={inputId}
                            type="radio"
                            name={`session-question-${activeQuestion.id}`}
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

        {questions.length > 0 && canShowSubmit ? (
          <div className="submit-panel sticky-submit-panel">
            <div>
              <strong>Ready to submit?</strong>
              <p>{answeredCount === questions.length ? "All questions are answered." : `Answer ${questions.length - answeredCount} more question${questions.length - answeredCount === 1 ? "" : "s"}.`}</p>
            </div>
            <button type="button" className="nav-button" disabled={isSubmitting} onClick={handleSubmitSessionQuiz}>
              {isSubmitting ? "Submitting..." : "Submit session quiz"}
            </button>
            {submitError ? <div className="form-error">{submitError}</div> : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response?.status === 404) {
      return "Session not found or access denied.";
    }

    const detail = error.response?.data?.detail;
    if (detail === "Session is closed") {
      return "Session is closed.";
    }
    if (detail === "You have already submitted this session.") {
      return "You have already submitted this session.";
    }
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
