import { AxiosError } from "axios";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { authApi } from "../api/authApi";
import { Attempt, AttemptExplanation, AttemptStudyPlan, attemptsApi } from "../api/attemptsApi";
import { Quiz, QuizQuestion, quizzesApi } from "../api/quizzesApi";
import { User } from "../auth/authTypes";
import { downloadCertificatePdf } from "../utils/certificatePdf";

export function AttemptResultPage() {
  const { attemptId } = useParams();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);
  const [isStudyPlanLoading, setIsStudyPlanLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explanationError, setExplanationError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<AttemptExplanation | null>(null);
  const [studyPlanError, setStudyPlanError] = useState<string | null>(null);
  const [studyPlan, setStudyPlan] = useState<AttemptStudyPlan | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadAttemptResult() {
      if (!attemptId) {
        setError("Attempt not found or access denied.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [userResponse, attemptResponse] = await Promise.all([
          authApi.getCurrentUser(),
          attemptsApi.getAttempt(attemptId),
        ]);
        const loadedAttempt = attemptResponse.data;
        const [quizResponse, questionsResponse] = await Promise.all([
          quizzesApi.getQuiz(String(loadedAttempt.quiz_id)),
          quizzesApi.getQuizQuestions(String(loadedAttempt.quiz_id)),
        ]);

        if (!ignore) {
          setCurrentUser(userResponse.data);
          setAttempt(loadedAttempt);
          setQuiz(quizResponse.data);
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

    loadAttemptResult();

    return () => {
      ignore = true;
    };
  }, [attemptId]);

  const answersByQuestionId = useMemo(() => {
    return new Map(attempt?.answers.map((answer) => [answer.question_id, answer]) ?? []);
  }, [attempt]);

  async function handleExplainMistakes() {
    if (!attemptId) {
      return;
    }

    setIsExplanationLoading(true);
    setExplanationError(null);

    try {
      const response = await attemptsApi.getAttemptExplanation(attemptId);
      setExplanation(response.data);
    } catch (caughtError) {
      setExplanationError(getExplanationErrorMessage(caughtError));
    } finally {
      setIsExplanationLoading(false);
    }
  }

  async function handleGenerateStudyPlan() {
    if (!attemptId) {
      return;
    }

    setIsStudyPlanLoading(true);
    setStudyPlanError(null);

    try {
      const response = await attemptsApi.getAttemptStudyPlan(attemptId);
      setStudyPlan(response.data);
    } catch (caughtError) {
      setStudyPlanError(getStudyPlanErrorMessage(caughtError));
    } finally {
      setIsStudyPlanLoading(false);
    }
  }

  function handleDownloadCertificate() {
    if (!attempt || !quiz || !currentUser) {
      return;
    }

    downloadCertificatePdf({
      platformName: "AI Quiz Platform",
      studentName: currentUser.full_name || currentUser.email,
      quizName: quiz.title,
      score: `${attempt.score} / ${attempt.total_questions}`,
      completionDate: new Date(attempt.created_at).toLocaleString(),
    });
  }

  if (isLoading) {
    return (
      <section className="page-card">
        <h1>Attempt Result</h1>
        <p>Loading attempt result...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-card">
        <h1>Attempt Result</h1>
        <div className="form-error">{error}</div>
      </section>
    );
  }

  const percent =
    attempt && attempt.total_questions > 0 ? Math.round((attempt.score / attempt.total_questions) * 100) : 0;
  const resultMessage = percent >= 80 ? "Great result" : percent >= 50 ? "Good effort" : "Keep practicing";
  const hasIncorrectAnswers = Boolean(attempt?.answers.some((answer) => !answer.is_correct));

  return (
    <div className="dashboard-grid">
      <section className="page-card result-summary-card">
        <div className="item-header">
          <div>
            <span className="eyebrow">Quiz result</span>
            <h1>{quiz?.title || "Attempt Result"}</h1>
            <p>{quiz?.description || "Quiz result summary."}</p>
          </div>
          {attempt ? (
            <div className="link-actions">
              <Link className="secondary-link" to={`/quizzes/${attempt.quiz_id}`}>
                Back to quiz
              </Link>
              {currentUser?.role === "student" ? (
                <Link className="nav-button" to="/student">
                  Go to student dashboard
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="result-callout">
          <div>
            <span className="helper-text">🏆 Score</span>
            <strong>
              {attempt?.score} / {attempt?.total_questions}
            </strong>
          </div>
          <div>
            <span className="helper-text">📈 Percent</span>
            <strong>{percent}%</strong>
          </div>
          <p className={`result-message ${percent >= 80 ? "great" : percent >= 50 ? "good" : "practice"}`}>
            {resultMessage}
          </p>
        </div>

        <dl className="profile-list compact-result-list">
          <div>
            <dt>Attempt ID</dt>
            <dd>{attempt?.id}</dd>
          </div>
          <div>
            <dt>Submitted at</dt>
            <dd>{attempt ? new Date(attempt.created_at).toLocaleString() : ""}</dd>
          </div>
        </dl>

        {currentUser?.role === "student" ? (
          <div className="explanation-actions">
            <button type="button" className="nav-button" onClick={handleDownloadCertificate}>
              Download Certificate
            </button>
            <button
              type="button"
              className="nav-button"
              disabled={isStudyPlanLoading}
              onClick={handleGenerateStudyPlan}
            >
              {isStudyPlanLoading ? "Generating study plan..." : "Generate Study Plan"}
            </button>
            <button
              type="button"
              className="nav-button"
              disabled={isExplanationLoading || !hasIncorrectAnswers}
              onClick={handleExplainMistakes}
            >
              {isExplanationLoading ? "Generating explanation..." : "Explain my mistakes"}
            </button>
            {!hasIncorrectAnswers ? <p className="helper-text">No mistakes to explain. Great work.</p> : null}
            {studyPlanError ? <div className="form-error">{studyPlanError}</div> : null}
          </div>
        ) : null}
      </section>

      {studyPlan ? (
        <section className="page-card study-plan-card">
          <h2>AI Study Plan</h2>
          <div className="study-plan-grid">
            <StudyPlanSection title="Weak topics" items={studyPlan.weak_topics} />
            <StudyPlanSection title="What to study" items={studyPlan.what_to_study} />
            <StudyPlanSection title="Recommended order" items={studyPlan.recommended_order} />
            <StudyPlanSection title="Practice advice" items={studyPlan.practice_advice} />
          </div>
        </section>
      ) : null}

      {explanation || explanationError ? (
        <section className="page-card explanation-card">
          <h2>AI explanation</h2>
          {explanationError ? <div className="form-error">{explanationError}</div> : null}
          {explanation?.explanations.length === 0 ? (
            <p className="empty-state">No mistakes found for this attempt.</p>
          ) : null}
          {explanation?.explanations.length ? (
            <div className="explanation-list">
              {explanation.explanations.map((item, index) => (
                <article key={`${item.question_text}-${index}`} className="explanation-item">
                  <h3>{item.question_text}</h3>
                  <dl className="explanation-answer-grid">
                    <div>
                      <dt>Your answer</dt>
                      <dd>{item.incorrect_answer}</dd>
                    </div>
                    <div>
                      <dt>Correct answer</dt>
                      <dd>{item.correct_answer}</dd>
                    </div>
                  </dl>
                  <p>{item.explanation}</p>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="page-card">
        <h2>Answer review</h2>

        {questions.length === 0 ? (
          <p>No questions found for this quiz.</p>
        ) : (
          <ol className="question-list">
            {questions.map((question) => {
              const answer = answersByQuestionId.get(question.id);

              return (
                <li key={question.id} className="question-item">
                  <div className="question-header">
                    <h3>{question.question_text}</h3>
                    <span>{question.question_type}</span>
                  </div>

                  <ul className="option-list">
                    {question.options.map((option) => {
                      const isSelected = answer?.selected_option_id === option.id;
                      const isCorrectOption = answer?.correct_option_id === option.id;

                      return (
                        <li key={option.id} className={`option-item review-option ${isSelected ? "selected" : ""} ${isCorrectOption ? "correct" : ""}`}>
                          <span>{option.option_text}</span>
                          <span className="result-badges">
                            {isSelected && answer?.is_correct ? (
                              <span className="correct-badge">{"Your answer \u00b7 Correct"}</span>
                            ) : null}
                            {isSelected && answer && !answer.is_correct ? (
                              <span className="incorrect-badge">{"Your answer \u00b7 Incorrect"}</span>
                            ) : null}
                            {!isSelected && isCorrectOption ? (
                              <span className="correct-badge">Correct answer</span>
                            ) : null}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

function StudyPlanSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="study-plan-section">
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className="helper-text">No recommendations yet.</p>
      ) : (
        <ul>
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response?.status === 404) {
      return "Attempt not found or access denied.";
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

function getExplanationErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    if (detail === "OpenAI API key is not configured") {
      return "AI explanations are not configured yet. Please add OPENAI_API_KEY and try again.";
    }
    if (typeof detail === "string") {
      return detail;
    }

    return "Could not generate explanation. Please try again.";
  }

  return "Could not generate explanation. Please try again.";
}

function getStudyPlanErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    if (detail === "AI study plan is not configured. Please add OPENAI_API_KEY.") {
      return detail;
    }
    if (typeof detail === "string") {
      return detail;
    }

    return "Could not generate study plan. Please try again.";
  }

  return "Could not generate study plan. Please try again.";
}
