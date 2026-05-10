# AITutor Backend Architecture & Code Explanation

This document provides a comprehensive explanation of the `backend` directory structure and a detailed logical block-by-block breakdown of the most important Python files in the AITutor project.

---

## 1. Directory Structure Overview

The `backend` directory is a **FastAPI** application. It serves as the bridge between the React frontend, the SQLite database, the local file system (for PDFs/JSONs), and the local LLM (Ollama).

*   **`venv/` & `__pycache__/`**: Standard Python folders. `venv` contains the isolated Python environment and installed packages. `__pycache__` contains compiled Python files for faster execution.
*   **`.env`**: Stores environment variables, such as `OLLAMA_HOST` (e.g., `http://localhost:11434`), `OLLAMA_MODEL`, and `OLLAMA_VISION_MODEL`.
*   **`requirements.txt`**: Lists all the Python dependencies required to run the server (e.g., `fastapi`, `uvicorn`, `sqlalchemy`, `requests`).
*   **`aitutor.db`**: The local SQLite database file where course structures, tasks, and user progress are saved.
*   **`database.py`**: Sets up the connection to the SQLite database using SQLAlchemy.
*   **`models.py`**: Defines the database tables (ORM models).
*   **`schemas.py`**: Defines Pydantic models used to validate incoming API requests and format outgoing API responses.
*   **`llm.py`**: Handles all communication with the local Ollama AI models.
*   **`main.py`**: **The core file.** It initializes the FastAPI server and defines all the API endpoints (URLs) that the frontend calls.

---

## 2. Detailed Breakdown of Important Files

### `database.py`
This file is short but crucial. It configures how the backend talks to the database.
*   It creates an `engine` pointing to `sqlite:///./aitutor.db`.
*   It creates a `SessionLocal` class which is used to spawn individual database sessions for each API request.
*   It provides a `get_db()` dependency function that FastAPI uses to safely open and close database connections for every request.

### `models.py` (Database Tables)
This file defines the actual structure of the data saved in `aitutor.db` using SQLAlchemy.
*   **`Course`**: Represents a full course (e.g., "Intro to Geometry"). It has an ID, title, and description.
*   **`DailyTask`**: Represents a single lesson/chapter. It links back to a `Course` (via `course_id`). It stores the day number, topic, paths to the PDF materials, and the user's progress (`class_status` and `homework_status` which can be "pending", "completed", or "na").

### `schemas.py` (Data Validation)
While `models.py` defines how data is *stored*, `schemas.py` defines how data is *transmitted* over the internet using Pydantic.
*   It defines classes like `DailyTaskBase`, `Course`, `ParseRequest`, `EvaluateRequest`, and `ChatRequest`.
*   When the frontend sends a POST request to evaluate an answer, FastAPI automatically checks if the incoming data matches the `EvaluateRequest` schema (ensuring it has a `question` and `user_answer` string). If it doesn't match, it automatically rejects the request.

### `llm.py` (AI Integration)
This file acts as the wrapper around your local Ollama instance.
*   **`_call_ollama(...)`**: A private helper function that makes the actual HTTP POST request to the Ollama API (`http://localhost:11434/api/generate`). It handles standard text prompts, JSON formatting, and passing base64 images to vision models. It also prints beautiful debug logs to the terminal.
*   **`evaluate_answer(...)`**: Called when a student submits an answer.
    *   It constructs a highly specific prompt for the AI, acting as an "expert tutor".
    *   It feeds the AI the question, the expected answer, the official solution, and the student's answer (and optionally an image of their work).
    *   It forces the AI to reply with a strict JSON object: `{"correct": true}` or `{"correct": false}`.
    *   It dynamically switches to `OLLAMA_VISION_MODEL` (e.g., `llama3.2-vision`) if an image is provided.
*   **`chat_problem(...)`**: Called when a student uses the AI Tutor chat window. It formats the chat history and the problem context, sending it to Ollama's `/api/chat` endpoint to get a conversational response.

### `main.py` (The API Server)
This is the largest and most important file in the backend. It defines the FastAPI application and all the routes.

*   **Setup (Lines 1-24)**: Initializes the FastAPI app, creates the database tables if they don't exist (`models.Base.metadata.create_all`), and configures CORS so the React frontend (running on a different port) is allowed to communicate with it.
*   **`/api/parse` (Lines 26-172)**: The most complex endpoint.
    *   It takes a `course_mapping.json` file path and a directory containing PDFs.
    *   It reads the JSON to understand the syllabus hierarchy (chapters -> days).
    *   It scans the directory for PDFs and intelligently matches them to the syllabus days.
    *   It checks if the corresponding `_Problems.json`, `_Exercises.json`, and `_Content.json` files exist to determine if a day has "Class" or "Homework" available (setting status to "pending" or "na").
    *   It saves all this structured data into the SQLite database.
*   **`/api/files/{filepath}` (Lines 174-187)**: A file server endpoint. Because the frontend cannot directly read files from your C: drive for security reasons, it asks the backend for them. This endpoint takes a path (like `images/abc.png`), checks if it exists, and returns the actual file to the browser.
*   **CRUD Endpoints (Lines 189-228)**:
    *   `/api/tasks` (DELETE): Wipes the database clean.
    *   `/api/courses` (GET): Returns the list of courses.
    *   `/api/tasks` (GET): Returns the syllabus tasks for the sidebar.
    *   `/api/tasks/{task_id}` (PATCH): Updates a task's status (e.g., changing it from "pending" to "completed" when the user finishes all questions).
*   **Content Fetching Endpoints (Lines 230-303)**:
    *   `/api/tasks/.../generate_class_questions`
    *   `/api/tasks/.../extract_homework`
    *   `/api/tasks/.../read_content`
    *   These three endpoints look up a specific task in the database, find its associated PDF path, figure out the corresponding `_Problems.json`, `_Exercises.json`, or `_Content.json` file, read the JSON from the hard drive, and send it to the frontend.
*   **AI Endpoints (Lines 305-313)**:
    *   `/api/evaluate_answer`: Receives the student's answer from the frontend and passes it to `llm.evaluate_answer()`.
    *   `/api/chat_problem`: Receives the chat history and passes it to `llm.chat_problem()`.

## Summary
The backend is a robust, lightweight API. It uses **FastAPI** for speed and automatic validation, **SQLAlchemy** to remember the course structure, and custom logic in `llm.py` to turn a local **Ollama** instance into a strict math grader and helpful tutor.