import { AxiosError } from "axios";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { authApi } from "../api/authApi";
import {
  QuestionBankOptionCreate,
  QuestionBankQuestion,
  QuestionBankQuestionCreate,
  QuestionBankQuestionType,
  questionBankApi,
} from "../api/questionBankApi";
import { User } from "../auth/authTypes";

const emptyOptions: QuestionBankOptionCreate[] = [
  { option_text: "", is_correct: true },
  { option_text: "", is_correct: false },
];

export function QuestionBankPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [questions, setQuestions] = useState<QuestionBankQuestion[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<QuestionBankQuestionType>("single_choice");
  const [options, setOptions] = useState<QuestionBankOptionCreate[]>(emptyOptions);
  const [topicId, setTopicId] = useState("");
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDescription, setQuizDescription] = useState("");
  const [createdQuizId, setCreatedQuizId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);
  const [deletingQuestionId, setDeletingQuestionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadQuestionBank() {
      setIsLoading(true);
      setError(null);

      try {
        const [userResponse, questionsResponse] = await Promise.all([
          authApi.getCurrentUser(),
          questionBankApi.getQuestions(),
        ]);
        if (!ignore) {
          setCurrentUser(userResponse.data);
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

    loadQuestionBank();

    return () => {
      ignore = true;
    };
  }, []);

  const selectedQuestions = useMemo(() => {
    const selectedIds = new Set(selectedQuestionIds);
    return questions.filter((question) => selectedIds.has(question.id));
  }, [questions, selectedQuestionIds]);

  async function handleSaveQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFormError(null);

    try {
      const payload: QuestionBankQuestionCreate = {
        question_text: questionText,
        question_type: questionType,
        options,
      };
      const response = editingQuestionId
        ? await questionBankApi.updateQuestion(String(editingQuestionId), payload)
        : await questionBankApi.createQuestion(payload);

      setQuestions((currentQuestions) =>
        editingQuestionId
          ? currentQuestions.map((question) => (question.id === editingQuestionId ? response.data : question))
          : [response.data, ...currentQuestions],
      );
      resetQuestionForm();
    } catch (caughtError) {
      setFormError(getErrorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteQuestion(questionId: number) {
    if (!window.confirm("Delete this question?")) {
      return;
    }

    setDeletingQuestionId(questionId);
    setError(null);

    try {
      await questionBankApi.deleteQuestion(String(questionId));
      setQuestions((currentQuestions) => currentQuestions.filter((question) => question.id !== questionId));
      setSelectedQuestionIds((currentIds) => currentIds.filter((id) => id !== questionId));
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setDeletingQuestionId(null);
    }
  }

  async function handleCreateQuiz(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreatingQuiz(true);
    setQuizError(null);
    setCreatedQuizId(null);

    try {
      const response = await questionBankApi.createQuizFromQuestions(topicId, {
        title: quizTitle,
        description: quizDescription.trim() ? quizDescription : undefined,
        question_ids: selectedQuestionIds,
      });
      setCreatedQuizId(response.data.id);
      setQuizTitle("");
      setQuizDescription("");
      setSelectedQuestionIds([]);
    } catch (caughtError) {
      setQuizError(getErrorMessage(caughtError));
    } finally {
      setIsCreatingQuiz(false);
    }
  }

  function startEdit(question: QuestionBankQuestion) {
    setEditingQuestionId(question.id);
    setQuestionText(question.question_text);
    setQuestionType(question.question_type);
    setOptions(question.options.map((option) => ({ option_text: option.option_text, is_correct: option.is_correct })));
    setFormError(null);
  }

  function resetQuestionForm() {
    setEditingQuestionId(null);
    setQuestionText("");
    setQuestionType("single_choice");
    setOptions(emptyOptions);
    setFormError(null);
  }

  function updateOption(index: number, field: keyof QuestionBankOptionCreate, value: string | boolean) {
    setOptions((currentOptions) =>
      currentOptions.map((option, optionIndex) => {
        if (optionIndex !== index) {
          return option;
        }
        return { ...option, [field]: value };
      }),
    );
  }

  function toggleSelectedQuestion(questionId: number) {
    setSelectedQuestionIds((currentIds) =>
      currentIds.includes(questionId) ? currentIds.filter((id) => id !== questionId) : [...currentIds, questionId],
    );
  }

  if (isLoading) {
    return (
      <section className="page-card">
        <h1>Question Bank</h1>
        <p>Loading question bank...</p>
      </section>
    );
  }

  if (currentUser && currentUser.role !== "teacher") {
    return <Navigate to="/student" replace />;
  }

  return (
    <div className="dashboard-grid">
      <section className="page-card">
        <div className="item-header">
          <div>
            <h1>Question Bank</h1>
            <p>Store reusable questions and build quizzes from selected items.</p>
          </div>
          <Link className="secondary-link" to="/teacher">
            Back to dashboard
          </Link>
        </div>
        {error ? <div className="form-error">{error}</div> : null}
      </section>

      <div className="two-column-layout">
        <section className="page-card">
          <h2>{editingQuestionId ? "Edit question" : "Add question"}</h2>
          <form className="form-placeholder compact-form" onSubmit={handleSaveQuestion}>
            <label>
              Question
              <textarea value={questionText} onChange={(event) => setQuestionText(event.target.value)} required />
            </label>
            <label>
              Type
              <select
                value={questionType}
                onChange={(event) => setQuestionType(event.target.value as QuestionBankQuestionType)}
              >
                <option value="single_choice">Single choice</option>
                <option value="multiple_choice">Multiple choice</option>
              </select>
            </label>

            <div className="question-bank-options">
              {options.map((option, index) => (
                <div key={index} className="question-bank-option-row">
                  <input
                    type="text"
                    placeholder={`Option ${index + 1}`}
                    value={option.option_text}
                    onChange={(event) => updateOption(index, "option_text", event.target.value)}
                    required
                  />
                  <label className="inline-check">
                    <input
                      type="checkbox"
                      checked={option.is_correct}
                      onChange={(event) => updateOption(index, "is_correct", event.target.checked)}
                    />
                    Correct
                  </label>
                </div>
              ))}
            </div>

            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={() => setOptions((current) => [...current, { option_text: "", is_correct: false }])}>
                + Add option
              </button>
              {options.length > 2 ? (
                <button type="button" className="secondary-button" onClick={() => setOptions((current) => current.slice(0, -1))}>
                  Remove last option
                </button>
              ) : null}
            </div>

            <div className="form-actions">
              <button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : editingQuestionId ? "Save question" : "Add question"}
              </button>
              {editingQuestionId ? (
                <button type="button" className="secondary-button" onClick={resetQuestionForm}>
                  Cancel
                </button>
              ) : null}
            </div>
            {formError ? <div className="form-error">{formError}</div> : null}
          </form>
        </section>

        <section className="page-card">
          <h2>Create quiz from selected questions</h2>
          <p>{selectedQuestions.length} question{selectedQuestions.length === 1 ? "" : "s"} selected.</p>
          <form className="form-placeholder compact-form" onSubmit={handleCreateQuiz}>
            <label>
              Topic ID
              <input value={topicId} onChange={(event) => setTopicId(event.target.value)} placeholder="Example: 1" required />
            </label>
            <label>
              Quiz title
              <input value={quizTitle} onChange={(event) => setQuizTitle(event.target.value)} placeholder="Review quiz" required />
            </label>
            <label>
              Description
              <textarea value={quizDescription} onChange={(event) => setQuizDescription(event.target.value)} />
            </label>
            <button type="submit" disabled={isCreatingQuiz || selectedQuestionIds.length === 0}>
              {isCreatingQuiz ? "Creating quiz..." : "Create quiz"}
            </button>
            {quizError ? <div className="form-error">{quizError}</div> : null}
            {createdQuizId ? (
              <Link className="secondary-link" to={`/quizzes/${createdQuizId}`}>
                Open created quiz
              </Link>
            ) : null}
          </form>
        </section>
      </div>

      <section className="page-card">
        <h2>Saved questions</h2>
        {questions.length === 0 ? (
          <p className="empty-state">No saved questions yet. Add reusable questions to build quizzes faster.</p>
        ) : (
          <ul className="course-list">
            {questions.map((question) => (
              <li key={question.id} className="course-item">
                <div className="item-header">
                  <label className="inline-check">
                    <input
                      type="checkbox"
                      checked={selectedQuestionIds.includes(question.id)}
                      onChange={() => toggleSelectedQuestion(question.id)}
                    />
                    Select
                  </label>
                  <div className="card-actions">
                    <button type="button" className="secondary-button" onClick={() => startEdit(question)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      disabled={deletingQuestionId === question.id}
                      onClick={() => handleDeleteQuestion(question.id)}
                    >
                      {deletingQuestionId === question.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
                <h3>{question.question_text}</h3>
                <p>{question.question_type === "single_choice" ? "Single choice" : "Multiple choice"}</p>
                <ul className="option-list">
                  {question.options.map((option) => (
                    <li key={option.id} className="option-item">
                      <span>{option.option_text}</span>
                      {option.is_correct ? <span className="correct-badge">Correct</span> : null}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail)) {
      return "Please check the form fields.";
    }
    return "Request failed. Please try again.";
  }

  return "Request failed. Please try again.";
}
