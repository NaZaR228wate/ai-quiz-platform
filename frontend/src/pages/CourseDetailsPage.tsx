import { AxiosError } from "axios";
import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { authApi } from "../api/authApi";
import { Course, coursesApi } from "../api/coursesApi";
import { Topic, topicsApi } from "../api/topicsApi";
import { User } from "../auth/authTypes";

export function CourseDetailsPage() {
  const { courseId } = useParams();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingTopicId, setDeletingTopicId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadCourseDetails() {
      if (!courseId) {
        setError("Course not found or access denied.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [userResponse, courseResponse, topicsResponse] = await Promise.all([
          authApi.getCurrentUser(),
          coursesApi.getCourse(courseId),
          topicsApi.getTopicsByCourse(courseId),
        ]);

        if (!ignore) {
          setCurrentUser(userResponse.data);
          setCourse(courseResponse.data);
          setTopics(topicsResponse.data);
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

    loadCourseDetails();

    return () => {
      ignore = true;
    };
  }, [courseId]);

  async function handleCreateTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!courseId) {
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await topicsApi.createTopic(courseId, {
        title,
        description: description.trim() ? description : undefined,
      });
      setTopics((currentTopics) => [...currentTopics, response.data]);
      setTitle("");
      setDescription("");
      setIsCreateOpen(false);
    } catch (caughtError) {
      setCreateError(getErrorMessage(caughtError));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteTopic(topicId: number) {
    if (!window.confirm("Delete this topic? This action cannot be undone.")) {
      return;
    }

    setDeletingTopicId(topicId);
    setDeleteError(null);

    try {
      await topicsApi.deleteTopic(String(topicId));
      setTopics((currentTopics) => currentTopics.filter((topic) => topic.id !== topicId));
    } catch (caughtError) {
      setDeleteError(getErrorMessage(caughtError));
    } finally {
      setDeletingTopicId(null);
    }
  }

  if (isLoading) {
    return (
      <section className="page-card">
        <h1>Course Details</h1>
        <p>Loading course details...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-card">
        <h1>Course Details</h1>
        <div className="form-error">{error}</div>
      </section>
    );
  }

  return (
    <div className="dashboard-grid">
      <div className="split-layout">
        <section className="page-card">
          <div className="item-header">
            <div>
              <h1>{cleanDemoText(course?.title || "Course")}</h1>
              <p>{course?.description ? cleanDemoText(course.description) : "No description provided."}</p>
            </div>
            <Link className="secondary-link" to="/teacher">
              Back to teacher dashboard
            </Link>
          </div>
          <dl className="profile-list">
            <div>
              <dt>Created at</dt>
              <dd>{course ? new Date(course.created_at).toLocaleString() : ""}</dd>
            </div>
          </dl>
        </section>

        <section className="page-card">
          <div className="item-header">
            <h2>Add topic</h2>
            {currentUser?.role === "teacher" && !isCreateOpen ? (
              <button type="button" className="secondary-button" onClick={() => setIsCreateOpen(true)}>
                + Add topic
              </button>
            ) : null}
          </div>

          {currentUser?.role === "teacher" && isCreateOpen ? (
            <form className="form-placeholder compact-form" onSubmit={handleCreateTopic}>
              <label>
                Title
                <input
                  type="text"
                  placeholder="Linear equations"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                />
              </label>
              <label>
                Description
                <textarea
                  placeholder="Basic linear equations"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
              <div className="form-actions">
                <button type="submit" disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create topic"}
                </button>
                <button type="button" className="secondary-button" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </button>
              </div>
              {createError ? <div className="form-error">{createError}</div> : null}
            </form>
          ) : (
            <p>Add lessons or chapters inside this course.</p>
          )}

          {deleteError ? <div className="form-error">{deleteError}</div> : null}
        </section>
      </div>

      <section className="page-card">
        <h2>Topics</h2>
        {topics.length === 0 ? (
          <p className="empty-state">No topics yet. Add a topic for this course.</p>
        ) : (
          <ul className="course-list">
            {topics.map((topic) => (
              <li key={topic.id} className="course-item">
                <div className="item-header">
                  <Link to={`/topics/${topic.id}`}>{cleanDemoText(topic.title)}</Link>
                  <div className="card-actions">
                    <Link className="secondary-link" to={`/topics/${topic.id}`}>
                      Open
                    </Link>
                    {currentUser?.role === "teacher" ? (
                      <button
                        type="button"
                        className="danger-button"
                        disabled={deletingTopicId === topic.id}
                        onClick={() => handleDeleteTopic(topic.id)}
                      >
                        {deletingTopicId === topic.id ? "Deleting..." : "Delete"}
                      </button>
                    ) : null}
                  </div>
                </div>
                {topic.description ? <p>{cleanDemoText(topic.description)}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
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

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response?.status === 404) {
      return "Course not found or access denied.";
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
