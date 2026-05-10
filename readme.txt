1. Environment Preparation
Install Node.js: Required to run the frontend code (LTS version recommended, e.g., node-v24.15.0-x64.msi).
Install Python: Required to run the backend code (Python 3.10+ recommended).
Install Ollama: Since your backend relies on Ollama to run the Large Language Model (LLM), it must be installed on the new computer.
After installation, run ollama run llama3.1 (or whichever model you configured in .env) in the terminal to ensure the model is downloaded and running in the background.

2. Transfer the Code
Copy the AITutor folder from your current computer to the new one (excluding Git-ignored folders like node_modules, venv, __pycache__, etc.), or pull the code via Git Clone.

3. Deploy the Backend
Open a terminal and navigate to the AITutor/backend directory:

Create and activate a virtual environment:
Windows:
python -m venv venv
.\venv\Scripts\activate
Mac/Linux:
python3 -m venv venv
source venv/bin/activate

Install dependencies:
pip install -r requirements.txt

Start the backend server:
uvicorn main:app --host 0.0.0.0 --port 8000

4. Deploy the Frontend
Open a new terminal and navigate to the AITutor/frontend directory:

Update the API URL: Open frontend/src/App.tsx and locate API_BASE around line 36.
If you only plan to access it locally on the new computer, change it to http://localhost:8000/api.
If you want to access it via mobile or LAN, change it to the new computer's local IP address (e.g., http://192.168.x.x:8000/api).

Install dependencies:
npm install

Start the frontend server:
npm run dev -- --host


================
To run download_ebook_pdfs.py：

Open a terminal (or PowerShell), navigate to the directory containing download_ebook_pdfs.py (the AITutor folder), and run the following command to install Playwright:
pip install playwright

Playwright needs to download its own browser binaries (like Chromium) to perform web automation. Run this command to download them:
playwright install chromium