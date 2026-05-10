# AITutor Frontend Architecture & Code Explanation

This document provides a comprehensive explanation of the `frontend` directory structure and a detailed logical block-by-block breakdown of the most important files in the AITutor project.

---

## 1. Directory Structure Overview

The `frontend` directory is a standard **React** application built with **Vite** (a fast modern build tool) and styled with **Tailwind CSS**.

*   **`package.json`**: Lists all the project dependencies (like `react`, `lucide-react` for icons, `katex` and `react-katex` for rendering math formulas) and scripts (`npm run dev`).
*   **`vite.config.ts`**: The configuration file for Vite.
*   **`index.html`**: The main HTML file that loads the React application into a `<div id="root"></div>`.
*   **`tailwind.config.js` / `postcss.config.js`**: Configuration files for the Tailwind CSS styling framework.
*   **`src/`**: This folder contains all the actual source code you wrote.
    *   **`main.tsx`**: The entry point of the React app. It grabs the `root` div from `index.html` and renders the `<App />` component inside it.
    *   **`index.css`**: Contains the base Tailwind CSS imports (`@tailwind base; @tailwind components; @tailwind utilities;`).
    *   **`App.tsx`**: **The core file.** It contains almost all the UI, state management, and logic for the entire application.

---

## 2. Detailed Breakdown of `src/App.tsx`

Because `App.tsx` is very large (over 1400 lines), explaining it literally line-by-line would be overwhelming. Instead, here is a detailed block-by-block explanation of how it works from top to bottom.

### Block 1: Imports and Types (Lines 1 - 35)
```typescript
import { useState, useEffect } from 'react'
import { CheckCircle2, ... } from 'lucide-react'
import { InlineMath, BlockMath } from 'react-katex';
```
*   **Imports**: It brings in React hooks (`useState`, `useEffect`), UI icons from `lucide-react`, and `react-katex` which is crucial for rendering the complex LaTeX math formulas extracted from the AoPS books.
*   **Interfaces**: It defines TypeScript interfaces to ensure data is structured correctly:
    *   `Task`: Represents a single day's topic (e.g., "Day 1: Angles").
    *   `Question`: Represents an interactive problem (multiple choice or free text).
    *   `EvaluationResult`: Represents whether an answer was graded as correct or incorrect by the backend LLM.

### Block 2: Helper Functions (Lines 37 - 130)
```typescript
const API_BASE = 'http://192.168.0.130:8000/api';

const getImageUrl = (pdfPath, imgRelPath) => { ... }
const getIconboxConfig = (iconType, title) => { ... }
const parseIconboxes = (text) => { ... }
```
*   **`API_BASE`**: Points to your Python backend server.
*   **`getImageUrl`**: Converts relative image paths found in the JSON (like `images/abc.png`) into full URLs that fetch the image from the backend API.
*   **`getIconboxConfig`**: A styling dictionary. If it sees an `important` box, it returns a red color and an Alert icon. If it sees a `concept` box, it returns a blue color and a Key icon.
*   **`parseIconboxes`**: A custom parser. Because iconboxes can be nested inside each other (e.g., an "Important" note inside a "Definition"), standard regex fails. This function carefully counts opening `[ICONBOX]` and closing `[/ICONBOX]` tags to split the text correctly.

### Block 3: The `MathText` Component (Lines 132 - 220)
```typescript
const MathText = ({ text, pdfPath }) => { ... }
```
This is a highly specialized, recursive React component. Its job is to take raw text from the JSON and render it beautifully.
*   **Step 1**: It cleans up weird LaTeX artifacts (like `\color[rgb]`).
*   **Step 2**: It uses `parseIconboxes` to see if there are any special UI boxes. If there are, it renders them as styled `<div>` elements with icons, and *recursively* calls `<MathText />` on the text inside them.
*   **Step 3**: It splits the remaining text by `[IMAGE: ...]` tags and renders actual `<img>` HTML tags.
*   **Step 4**: It splits the text by `$$...$$` (block math) and `$...$` (inline math) and uses `react-katex` to render the math formulas beautifully on the screen.

### Block 4: The `ProblemChat` Component (Lines 222 - 365)
```typescript
const ProblemChat = ({ question, pdfPath }) => { ... }
```
This component handles the "AI Tutor" chat window attached to every problem.
*   **State**: It tracks `messages` (the chat history), `input` (what the user is typing), and `isOpen` (whether the chat window is expanded or collapsed).
*   **`sendMessage`**: When the user clicks send, it adds their message to the chat, sends the whole history + the problem context to the backend (`/api/chat_problem`), waits for the LLM to reply, and appends the AI's response to the chat window.
*   **UI**: It renders a collapsible chat interface with a text input and a send button.

### Block 5: The Main `App` Component & State (Lines 367 - 400)
```typescript
function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeClassTask, setActiveClassTask] = useState<Task | null>(null);
  // ... dozens of state variables
```
This is the master component. It holds the "memory" (state) of the entire app:
*   `tasks`: The list of all chapters/days loaded from the syllabus.
*   `activeClassTask` / `activeHomeworkTask`: Which task the user is currently viewing.
*   `classQuestions` / `homeworkQuestions`: The list of questions for the current task.
*   `classContentFlow`: The reading material for the current task.
*   `classAnswers`, `classEvaluations`, `classAttempts`: Tracks what the user typed, whether the AI graded it correct, and how many times they tried.

### Block 6: Core App Functions (Lines 402 - 700)
*   **`fetchTasks` & `parseCourse`**: Functions to load the syllabus JSON file, send it to the backend to create the database records, and fetch the list of tasks to display in the sidebar.
*   **`openClassContent(task)`**: When a user clicks "Study & Problems", this function resets the current state, fetches the `_Content.json` (reading material) and `_Problems.json` (interactive questions) from the backend, and displays them.
*   **`openHomework(task)`**: Similar to above, but fetches `_Exercises.json` for the homework view.
*   **`submitSingleQuestion(idx)` & `submitSingleHomeworkQuestion(idx)`**: When the user clicks "Submit" on a specific problem:
    1. It grabs the user's text answer or uploaded image.
    2. It sends it to the backend (`/api/evaluate_answer`) along with the official solution.
    3. The backend LLM grades it and returns `true` or `false`.
    4. It updates the UI to show "Correct!" (green) or "Incorrect" (red). If incorrect twice, it reveals the official solution.
    5. It checks if *all* questions in the task are now completed. If yes, it tells the backend to mark the whole Task as "completed".

### Block 7: The Main Render UI (Lines 702 - 1450)
The `return (...)` statement defines the actual layout of the app using Tailwind CSS classes.
*   **Header**: Shows the Course Title, a progress bar (calculating how many tasks are completed vs total), and an input box to load a new `course_mapping.json`.
*   **Layout**: A flexbox layout with a Sidebar (left) and a Main Content Area (right).
*   **Sidebar**: Maps through the `tasks` array. For each task, it shows the title and buttons for "Study & Problems" and "Exercises".
*   **Main Content Area**:
    *   If nothing is selected, it shows a welcome message.
    *   If a task is selected, it renders the Reading Content (`classContentFlow.map(...)`) using the `<MathText />` component.
    *   **Pagination Bar**: It renders a row of numbered buttons (`1, 2, 3...`) to let the user navigate between interactive questions one by one. The buttons change color based on status (gray = unattempted, blue = current/answered, green = correct, red = incorrect).
    *   **Question Display**: It renders the currently selected question (`classQuestions[currentIndex]`). It shows radio buttons for multiple-choice, or a text area and image upload button for free-response.
    *   **Grading & Solutions**: If evaluated, it shows the correct/incorrect banner. If completed, it reveals the official answer and solution.
    *   **AI Tutor**: It attaches the `<ProblemChat />` component to the bottom of the question.
    *   **Navigation**: "Previous", "Next", and "All Done! (Close)" buttons at the very bottom.

## Summary
The `frontend` is a highly dynamic React application. It acts as a specialized PDF/JSON reader that understands AoPS math formatting, manages complex state for student answers and AI grading, and communicates seamlessly with your Python backend to fetch content and evaluate math problems.