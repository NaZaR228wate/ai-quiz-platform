import { AxiosError } from "axios";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { authApi } from "../api/authApi";
import { Attempt, attemptsApi } from "../api/attemptsApi";
import { Quiz, QuizQuestion, quizzesApi } from "../api/quizzesApi";
import { User } from "../auth/authTypes";

export function AttemptResultPage() {
  const { attemptId } = useParams();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      </section>

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
