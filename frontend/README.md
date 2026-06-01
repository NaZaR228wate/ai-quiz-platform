# AI Quiz Platform Frontend

React + Vite + TypeScript frontend skeleton for the AI Quiz Platform.

## Setup

Install dependencies:

```bash
npm install
```

Create local environment file:

```bash
copy .env.example .env
```

Set backend API URL:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Run frontend:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

## Backend Connection

The API client reads `VITE_API_BASE_URL` from `.env`.

If an access token exists in `localStorage`, Axios adds:

```text
Authorization: Bearer <token>
```

If there is no token, requests are sent without `Authorization`.

Axios is used because this project will need a shared base URL, auth headers, and later response/error interceptors.

## Auth Flow

Login page calls:

```text
POST /auth/login
GET /auth/me
```

After login, the access token is saved to `localStorage`.

Redirect rules:

- `teacher` -> `/teacher`
- `student` -> `/student`

Register page calls:

```text
POST /auth/register
```

After successful registration, the user is redirected to `/login` with:

```text
Account created. Please log in.
```

Logout removes the token and redirects to `/login`.

## Pages

- `/`
- `/login`
- `/register`
- `/teacher`
- `/student`
- `/courses`
- `/courses/:courseId`
- `/topics/:topicId`
- `/quizzes/:quizId`
- `/attempts/:attemptId`

## Next Step

Step 14 should add the first real dashboard data view.
