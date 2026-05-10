# `download_ebook_pdfs.py` Code Explanation

This script is a web scraper and data extractor built with Python and Playwright. Its main goal is to log into the "Art of Problem Solving" (AoPS) website, navigate through an online textbook, extract the interactive problems and reading content into structured JSON files, and save offline HTML and PDF copies of the book's chapters.

---

### 1. Imports and Setup (Lines 1-7)
```python
from playwright.sync_api import sync_playwright
import os, re, json, urllib.parse, hashlib
```
*   **`playwright`**: A library used to automate and control web browsers. It allows the script to click buttons, wait for content to load, and extract data just like a real user.
*   **`os, re, json, urllib.parse, hashlib`**: Standard Python libraries used for file system operations, regular expressions (text matching), JSON formatting, URL manipulation, and generating unique hashes for image filenames.

### 2. JavaScript Helper Constant (Lines 8-85)
```python
JS_HELPERS = """ ... """
```
This is a large string containing JavaScript code that will be injected and run inside the browser.
*   **`applyMarkdownFormatting(clone)`**: This JS function takes a piece of the webpage (a DOM node clone) and cleans it up before extracting text.
    *   It removes useless hyperlinks (like links that just say "here").
    *   It replaces LaTeX math images with their raw text (`alt` attribute).
    *   It converts HTML bold (`<strong>`, `<b>`) and italic (`<em>`, `<i>`) tags into Markdown format (`**bold**` and `*italic*`).
    *   **Nested Iconboxes**: It specifically looks for special AoPS UI boxes (like "Important", "Warning", "Definition") and converts them into custom Markdown tags like `[ICONBOX:important:Important]...[/ICONBOX]`.

### 3. Global Variables & Filename Helper (Lines 87-96)
```python
DIRECTORY_URL = "https://artofproblemsolving.com/ebooks/intro-geometry-ebook/c0toc"
LINK_SELECTOR = "a" 
STATE_FILE = "auth_state.json"
def sanitize_filename(url): ...
```
*   **`DIRECTORY_URL`**: The starting page (Table of Contents) of the book.
*   **`STATE_FILE`**: The file where the script saves your login cookies so you don't have to log in every time you run it.
*   **`sanitize_filename(url)`**: A helper function that takes a web URL and converts it into a safe filename for saving to your computer (e.g., replacing slashes with underscores).

### 4. Browser Automation Helpers (Lines 98-185)
These functions simulate a user interacting with the webpage to reveal hidden content before extracting it.
*   **`click_reset_buttons(page)`**: AoPS problems are interactive. If a user previously answered a question, it might show a green checkmark instead of the original question. This function finds all "Reset" buttons on the page, clicks them, and clicks "OK" on the confirmation popup to reset the page to a clean slate.
*   **`expand_all_hints(page)`**: Many math problems have hidden hints. This function repeatedly clicks all "Show Hint" buttons until no more hints are hidden (it loops because some hints reveal sub-hints).
*   **`show_all_solutions(page)`**: To reveal the official solution, the website requires the user to type something first. This function finds all text input boxes, types "test" into them, and then clicks all the "Show Solution" buttons to force the page to load the answers.

### 5. Extracting Problems (`extract_problems_to_json`) (Lines 187-389)
This is a massive function that pulls out the interactive questions (Problems, Exercises, Review, Challenge).
*   **Lines 191-200**: It checks the URL to figure out what type of page it is (e.g., if it ends in `pr`, it's a "Review Problems" page).
*   **Lines 202-330**: It injects a huge block of JavaScript (`page.evaluate(...)`) into the browser.
    *   It finds every problem container on the page.
    *   It uses `processNode()` (which uses the `JS_HELPERS` from earlier) to clean up the HTML and convert it to text.
    *   It extracts the problem number, the main question text, all the hints, and the official solution.
    *   It packages all this into a list of JSON objects.
*   **Lines 332-376**: Back in Python, it processes the images found in those problems.
    *   It downloads every image to a local `images/` folder.
    *   It generates a unique MD5 hash for the image name so names don't conflict.
    *   It updates the JSON text to point to the local image path instead of the web URL.
    *   Finally, it saves the extracted data to a JSON file (e.g., `..._Problems.json`).

### 6. Extracting Reading Content (`extract_content_flow_to_json`) (Lines 391-573)
While the previous function extracts interactive questions, this function extracts the reading material (the actual textbook text).
*   It injects JavaScript to traverse the webpage element by element.
*   It ignores the interactive problem boxes (because the previous function already handled them).
*   It categorizes the reading content into types: `paragraph`, `summary`, `image_block`, or `iconbox`.
*   Just like the problem extractor, it downloads all the images locally and saves the final reading flow into a `..._Content.json` file.

### 7. Saving Offline HTML and PDF (`save_offline_html` & `cleanup_page`) (Lines 575-769)
*   **`save_offline_html(page, html_filename)`**: This function creates a standalone HTML file that works without the internet. It finds all images and CSS stylesheets on the page, downloads them, converts them into Base64 text strings, and embeds them directly inside the HTML file.
*   **`cleanup_page(page)`**: Before saving a PDF, we don't want the website's top navigation bar, footer, or sidebars in the document. This function injects CSS to hide all website menus, removes shadows, and forces the textbook content to take up 100% of the screen width.

### 8. The Main Execution Loop (`main`) (Lines 771-995)
This is where the script actually starts running.
*   **Lines 775-808 (Login Phase)**:
    *   It checks if `auth_state.json` exists.
    *   If it doesn't, it opens a visible browser window, navigates to the AoPS website, and pauses. It waits for you to manually log in with your username and password, then press Enter in the terminal. It saves your login cookies.
*   **Lines 810-843 (Link Gathering)**:
    *   It opens a hidden (headless) browser using your saved login.
    *   It goes to the Table of Contents and scrapes every single chapter link.
*   **Lines 847-910 (The Scraping Loop)**:
    *   It loops through every single link one by one.
    *   It skips links that have already been downloaded (resuming where it left off if it crashed).
    *   For each page, it runs the sequence: `click_reset_buttons` -> `expand_all_hints` -> `show_all_solutions` -> `extract_problems_to_json` -> `extract_content_flow_to_json`.
    *   Then it resets the page again, runs `save_offline_html`, runs `cleanup_page` to hide menus, and finally calls `page.pdf()` to save a beautiful PDF version of the chapter.
*   **Lines 912-985 (Retry Logic)**:
    *   Web scraping is prone to network timeouts. If any page fails to download, it adds it to a `failed_links` list.
    *   It will retry failed links up to 3 times before finally giving up.

---
**Summary**: This script is a highly robust pipeline that logs you in, clicks through every chapter of a digital textbook, forces all hidden answers to reveal themselves, parses the math and text into clean JSON for your custom frontend, and saves offline backups of the book.