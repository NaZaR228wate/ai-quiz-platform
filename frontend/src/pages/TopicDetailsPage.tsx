import { AxiosError } from "axios";
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { aiApi } from "../api/aiApi";
import { authApi } from "../api/authApi";
import { Material, materialsApi } from "../api/materialsApi";
import { Quiz, quizzesApi } from "../api/quizzesApi";
import { Topic, topicsApi } from "../api/topicsApi";
import { User } from "../auth/authTypes";

type GenerationState = {
  questionsCount: number;
  isGenerating: boolean;
  error: string | null;
  success: string | null;
};

export function TopicDetailsPage() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [generationStateByMaterialId, setGenerationStateByMaterialId] = useState<Record<number, GenerationState>>({});
  const [title, setTitle] = useState("");
  const [contentText, setContentText] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isQuizzesLoading, setIsQuizzesLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingMaterialId, setDeletingMaterialId] = useState<number | null>(null);
  const [deletingQuizId, setDeletingQuizId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quizzesError, setQuizzesError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [materialDeleteError, setMaterialDeleteError] = useState<string | null>(null);
  const [quizDeleteError, setQuizDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadTopicDetails() {
      if (!topicId) {
        setError("Topic not found or access denied.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setIsQuizzesLoading(true);
      setError(null);
      setQuizzesError(null);

      try {
        const userResponse = await authApi.getCurrentUser();

        if (!ignore) {
          setCurrentUser(userResponse.data);
        }

        if (userResponse.data.role !== "teacher") {
          return;
        }

        const [topicResponse, materialsResponse, quizzesResponse] = await Promise.all([
          topicsApi.getTopic(topicId),
          materialsApi.getMaterialsByTopic(topicId),
          quizzesApi.getQuizzesByTopic(topicId),
        ]);

        if (!ignore) {
          setTopic(topicResponse.data);
          setMaterials(materialsResponse.data);
          setQuizzes(quizzesResponse.data);
        }
      } catch (caughtError) {
        if (!ignore) {
          setError(getErrorMessage(caughtError));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
          setIsQuizzesLoading(false);
        }
      }
    }

    loadTopicDetails();

    return () => {
      ignore = true;
    };
  }, [topicId]);

  async function handleCreateMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!topicId) {
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await materialsApi.createMaterial(topicId, {
        title,
        content_text: contentText,
      });
      setMaterials((currentMaterials) => [...currentMaterials, response.data]);
      setTitle("");
      setContentText("");
      setIsCreateOpen(false);
    } catch (caughtError) {
      setCreateError(getErrorMessage(caughtError));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteMaterial(materialId: number) {
    if (!window.confirm("Delete this material? This action cannot be undone.")) {
      return;
    }

    setDeletingMaterialId(materialId);
    setMaterialDeleteError(null);

    try {
      await materialsApi.deleteMaterial(String(materialId));
      setMaterials((currentMaterials) => currentMaterials.filter((material) => material.id !== materialId));
    } catch (caughtError) {
      setMaterialDeleteError(getErrorMessage(caughtError));
    } finally {
      setDeletingMaterialId(null);
    }
  }

  async function handleDeleteQuiz(quizId: number) {
    if (!window.confirm("Delete this quiz? This action cannot be undone.")) {
      return;
    }

    setDeletingQuizId(quizId);
    setQuizDeleteError(null);

    try {
      await quizzesApi.deleteQuiz(String(quizId));
      setQuizzes((currentQuizzes) => currentQuizzes.filter((quiz) => quiz.id !== quizId));
    } catch (caughtError) {
      setQuizDeleteError(getErrorMessage(caughtError));
    } finally {
      setDeletingQuizId(null);
    }
  }

  function getGenerationState(materialId: number): GenerationState {
    return generationStateByMaterialId[materialId] ?? {
      questionsCount: 3,
      isGenerating: false,
      error: null,
      success: null,
    };
  }

  function updateGenerationState(materialId: number, nextState: Partial<GenerationState>) {
    setGenerationStateByMaterialId((currentState) => ({
      ...currentState,
      [materialId]: {
        ...currentState[materialId],
        questionsCount: currentState[materialId]?.questionsCount ?? 3,
        isGenerating: currentState[materialId]?.isGenerating ?? false,
        error: currentState[materialId]?.error ?? null,
        success: currentState[materialId]?.success ?? null,
        ...nextState,
      },
    }));
  }

  async function handleGenerateQuiz(material: Material) {
    const generationState = getGenerationState(material.id);
    const questionsCount = Math.min(10, Math.max(1, generationState.questionsCount));

    updateGenerationState(material.id, {
      questionsCount,
      isGenerating: true,
      error: null,
      success: null,
    });

    try {
      const response = await aiApi.generateQuizFromMaterial(material.id, {
        questions_count: questionsCount,
      });
      updateGenerationState(material.id, {
        isGenerating: false,
        success: "Quiz generated successfully.",
      });
      navigate(`/quizzes/${response.data.quiz_id}`);
    } catch (caughtError) {
      updateGenerationState(material.id, {
        isGenerating: false,
        error: getErrorMessage(caughtError),
      });
    }
  }

  async function reloadQuizzes() {
    if (!topicId) {
      return;
    }

    setIsQuizzesLoading(true);
    setQuizzesError(null);

    try {
      const response = await quizzesApi.getQuizzesByTopic(topicId);
      setQuizzes(response.data);
    } catch (caughtError) {
      setQuizzesError(getErrorMessage(caughtError));
    } finally {
      setIsQuizzesLoading(false);
    }
  }

  if (isLoading) {
    return (
      <section className="page-card">
        <h1>Topic Details</h1>
        <p>Loading topic details...</p>
      </section>
    );
  }

  if (currentUser && currentUser.role !== "teacher") {
    return (
      <section className="page-card">
        <h1>This page is only for teachers.</h1>
        <p>Students can open quizzes from the student dashboard or a session link.</p>
        <Link className="secondary-link" to="/student">
          Go to student dashboard
        </Link>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-card">
        <h1>Topic Details</h1>
        <div className="form-error">{error}</div>
      </section>
    );
  }

  return (
    <div className="dashboard-grid">
      <section className="page-card">
        <div className="item-header">
          <div>
            <h1>{cleanDemoText(topic?.title || "Topic")}</h1>
            <p>{topic?.description ? cleanDemoText(topic.description) : "No description provided."}</p>
          </div>
          {topic?.course_id ? (
            <Link className="secondary-link" to={`/courses/${topic.course_id}`}>
              Back to course
            </Link>
          ) : null}
        </div>
        <dl className="profile-list">
          <div>
            <dt>Created at</dt>
            <dd>{topic ? new Date(topic.created_at).toLocaleString() : ""}</dd>
          </div>
        </dl>
      </section>

      <div className="side-by-side">
        <section className="page-card">
          <div className="item-header">
            <h2>Materials</h2>
            {!isCreateOpen ? (
              <button type="button" className="secondary-button" onClick={() => setIsCreateOpen(true)}>
                + Add material
              </button>
            ) : null}
          </div>

          {isCreateOpen ? (
            <form className="form-placeholder form-wide compact-form" onSubmit={handleCreateMaterial}>
              <label>
                Title
                <input
                  type="text"
                  placeholder="Theory for linear equations"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                />
              </label>
              <label>
                Content text
                <textarea
                  className="material-textarea"
                  placeholder="Linear equation is an equation where the variable has power 1..."
                  value={contentText}
                  onChange={(event) => setContentText(event.target.value)}
                  required
                />
              </label>
              <div className="form-actions">
                <button type="submit" disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create material"}
                </button>
                <button type="button" className="secondary-button" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </button>
              </div>
              {createError ? <div className="form-error">{createError}</div> : null}
            </form>
          ) : null}

          {materialDeleteError ? <div className="form-error">{materialDeleteError}</div> : null}

          {materials.length === 0 ? (
            <p className="empty-state">No materials yet. Add learning material to generate a quiz.</p>
          ) : (
            <ul className="course-list">
              {materials.map((material) => {
                const generationState = getGenerationState(material.id);

                return (
                  <li key={material.id} className="course-item">
                    <div className="item-header">
                      <strong>{cleanDemoText(material.title)}</strong>
                      <div className="generate-controls">
                        <label>
                          Questions
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={generationState.questionsCount}
                            onChange={(event) =>
                              updateGenerationState(material.id, {
                                questionsCount: Number(event.target.value),
                                error: null,
                                success: null,
                              })
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={generationState.isGenerating}
                          onClick={() => handleGenerateQuiz(material)}
                        >
                          {generationState.isGenerating ? "Generating..." : "Generate quiz"}
                        </button>
                        {currentUser?.role === "teacher" ? (
                          <button
                            type="button"
                            className="danger-button"
                            disabled={deletingMaterialId === material.id}
                            onClick={() => handleDeleteMaterial(material.id)}
                          >
                            {deletingMaterialId === material.id ? "Deleting..." : "Delete"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <p>{getPreview(material.content_text)}</p>
                    <small>Created at {new Date(material.created_at).toLocaleString()}</small>
                    {generationState.success ? <div className="form-success">{generationState.success}</div> : null}
                    {generationState.error ? <div className="form-error">{generationState.error}</div> : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="page-card">
          <div className="item-header">
            <h2>Quizzes</h2>
            <button type="button" className="secondary-button" onClick={reloadQuizzes} disabled={isQuizzesLoading}>
              {isQuizzesLoading ? "Loading..." : "Refresh"}
            </button>
          </div>
          {quizzesError ? <div className="form-error">{quizzesError}</div> : null}
          {quizDeleteError ? <div className="form-error">{quizDeleteError}</div> : null}
          {isQuizzesLoading ? (
            <p>Loading quizzes...</p>
          ) : quizzes.length === 0 ? (
            <p className="empty-state">No quizzes yet. Generate a quiz from a material.</p>
          ) : (
            <ul className="course-list">
              {quizzes.map((quiz) => (
                <li key={quiz.id} className="course-item">
                  <div className="item-header">
                    <strong>{cleanDemoText(quiz.title)}</strong>
                    <div className="card-actions">
                      <button type="button" className="secondary-button" onClick={() => navigate(`/quizzes/${quiz.id}`)}>
                        Open
                      </button>
                      {currentUser?.role === "teacher" ? (
                        <button
                          type="button"
                          className="danger-button"
                          disabled={deletingQuizId === quiz.id}
                          onClick={() => handleDeleteQuiz(quiz.id)}
                        >
                          {deletingQuizId === quiz.id ? "Deleting..." : "Delete"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {quiz.description ? <p>{cleanDemoText(quiz.description)}</p> : null}
                  <small>Quiz reference: {quiz.id}</small>
                  <small>Created at {new Date(quiz.created_at).toLocaleString()}</small>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function cleanDemoText(value: string): string {
  const normalized = value.trim().toLowerCase();
  const replacements: Record<string, string> = {
    string: "Linear Equations",
    test: "Quadratic Equations",
    topic1: "Functions",
    topic2: "Geometry Basics",
    sample: "Graph Interpretation",
    "basic linear equations": "Solving linear equations",
  };

  return replacements[normalized] ?? value;
}

function getPreview(content: string): string {
  if (content.length <= 120) {
    return content;
  }

  return `${content.slice(0, 120)}...`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response?.status === 404) {
      return "Topic not found or access denied.";
    }

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
