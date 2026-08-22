import os
import json
import re
import base64
import requests
from dotenv import load_dotenv

load_dotenv()

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

# Fallback to Ollama if DeepSeek's text API is unavailable
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")

# DeepSeek can't see images, so grading falls back to a vision-capable model
# whenever the question, the official answer/solution, or the student's
# submission includes an image.
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
OPENAI_VISION_MODEL = os.getenv("OPENAI_VISION_MODEL", "gpt-5.4-mini")

IMAGE_TAG_RE = re.compile(r'\[IMAGE:\s*([^\]]+)\]')
IMAGE_MIME_TYPES = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
}

def _call_ollama(messages: list, json_format: bool = False, model: str = "llama3.1") -> str:
    url = f"{OLLAMA_HOST}/api/chat"
    payload = {
        "model": model,
        "messages": messages,
        "stream": False
    }
    
    if json_format:
        payload["format"] = "json"
        
    try:
        response = requests.post(url, json=payload, timeout=100)
        response.raise_for_status()
        resp_json = response.json()
        
        response_text = resp_json["message"]["content"]
        prompt_tokens = resp_json.get("prompt_eval_count", 0)
        completion_tokens = resp_json.get("eval_count", 0)
        
        print("="*40 + " LLM CALL (Ollama Fallback) " + "="*40)
        print(f"MODEL: {payload.get('model')}")
        for msg in messages:
            print(f"[{msg['role'].upper()}]:\n{msg['content']}\n")
        print("-" * 80)
        print(f"RESPONSE:\n{response_text}")
        print("-" * 80)
        print(f"TOKENS: Input={prompt_tokens}, Output={completion_tokens}")
        print("="*101)
        
        return response_text
    except Exception as e:
        print(f"Error calling Ollama fallback: {e}")
        raise RuntimeError(f"Ollama fallback error: {str(e)}")

def _call_deepseek(messages: list, json_format: bool = False, model: str = None) -> str:
    if not DEEPSEEK_API_KEY:
        print("DEEPSEEK_API_KEY is not set in .env, falling back to Ollama")
        return _call_ollama(messages, json_format)
        
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model or DEEPSEEK_MODEL,
        "messages": messages,
        "stream": False
    }
    
    if json_format:
        payload["response_format"] = {"type": "json_object"}
        
    try:
        # Added verify=False to bypass SSL certificate verification issues
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload, timeout=100, verify=False)
        response.raise_for_status()
        resp_json = response.json()
        
        response_text = resp_json["choices"][0]["message"]["content"]
        prompt_tokens = resp_json.get("usage", {}).get("prompt_tokens", 0)
        completion_tokens = resp_json.get("usage", {}).get("completion_tokens", 0)
        
        print("="*40 + " LLM CALL (DeepSeek) " + "="*40)
        print(f"MODEL: {payload.get('model')}")
        for msg in messages:
            print(f"[{msg['role'].upper()}]:\n{msg['content']}\n")
        print("-" * 80)
        print(f"RESPONSE:\n{response_text}")
        print("-" * 80)
        print(f"TOKENS: Input={prompt_tokens}, Output={completion_tokens}")
        print("="*101)
        
        return response_text
    except Exception as e:
        print("!" * 40 + " DEEPSEEK ERROR " + "!" * 40)
        print(f"TYPE: {type(e).__name__}")
        print(f"MESSAGE: {e}")
        if isinstance(e, requests.exceptions.RequestException) and e.response is not None:
            print(f"STATUS CODE: {e.response.status_code}")
            print(f"RESPONSE BODY: {e.response.text}")
        print("Falling back to Ollama 3.1...")
        print("!" * 97)
        return _call_ollama(messages, json_format)

def _call_openai_vision(prompt: str, images: list) -> str:
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not set in .env")

    content = [{"type": "text", "text": prompt}]
    for img in images:
        content.append({
            "type": "image_url",
            "image_url": {"url": f"data:{img['mime']};base64,{img['b64']}"}
        })

    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": OPENAI_VISION_MODEL,
        "messages": [{"role": "user", "content": content}],
        "response_format": {"type": "json_object"}
    }

    try:
        response = requests.post(OPENAI_API_URL, headers=headers, json=payload, timeout=120)
        response.raise_for_status()
        resp_json = response.json()

        response_text = resp_json["choices"][0]["message"]["content"]
        prompt_tokens = resp_json.get("usage", {}).get("prompt_tokens", 0)
        completion_tokens = resp_json.get("usage", {}).get("completion_tokens", 0)

        print("="*40 + " LLM CALL (OpenAI Vision) " + "="*40)
        print(f"MODEL: {payload.get('model')} ({len(images)} image(s))")
        print(f"PROMPT:\n{prompt}")
        print("-" * 80)
        print(f"RESPONSE:\n{response_text}")
        print("-" * 80)
        print(f"TOKENS: Input={prompt_tokens}, Output={completion_tokens}")
        print("="*101)

        return response_text
    except Exception as e:
        print("!" * 40 + " OPENAI VISION ERROR " + "!" * 40)
        print(f"TYPE: {type(e).__name__}")
        print(f"MESSAGE: {e}")
        if isinstance(e, requests.exceptions.RequestException) and e.response is not None:
            print(f"STATUS CODE: {e.response.status_code}")
            print(f"RESPONSE BODY: {e.response.text}")
        print("!" * 102)
        raise RuntimeError(f"OpenAI Vision error: {str(e)}")

def _svg_to_png_bytes(svg_path: str) -> bytes:
    from playwright.sync_api import sync_playwright
    with open(svg_path, 'r', encoding='utf-8') as f:
        svg_content = f.read()
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page()
            page.set_content(f"<html><body style='margin:0'>{svg_content}</body></html>")
            element = page.query_selector('svg')
            return element.screenshot() if element else page.screenshot()
        finally:
            browser.close()

def _load_image_as_base64(abs_path: str):
    if not os.path.exists(abs_path):
        print(f"Referenced image not found on disk: {abs_path}")
        return None

    ext = os.path.splitext(abs_path)[1].lower()
    if ext == '.svg':
        try:
            png_bytes = _svg_to_png_bytes(abs_path)
        except Exception as e:
            print(f"Failed to rasterize SVG {abs_path}: {e}")
            return None
        return {"mime": "image/png", "b64": base64.b64encode(png_bytes).decode('utf-8')}

    mime = IMAGE_MIME_TYPES.get(ext)
    if not mime:
        print(f"Unsupported image type for grading: {abs_path}")
        return None
    with open(abs_path, 'rb') as f:
        return {"mime": mime, "b64": base64.b64encode(f.read()).decode('utf-8')}

def _extract_embedded_images(text: str, pdf_path: str) -> list:
    if not text or not pdf_path:
        return []

    backend_dir = os.path.dirname(os.path.abspath(__file__))
    pdf_dir = os.path.dirname(os.path.abspath(os.path.join(backend_dir, pdf_path)))

    images = []
    for rel_path in IMAGE_TAG_RE.findall(text):
        abs_path = os.path.normpath(os.path.join(pdf_dir, rel_path.strip()))
        img = _load_image_as_base64(abs_path)
        if img:
            images.append(img)
    return images

def evaluate_answer(question: str, user_answer: str, expected_answer: str = None, solution: str = None, image_base64: str = None, pdf_path: str = None) -> dict:
    expected_text = f"Expected Answer: {expected_answer}\n" if expected_answer else ""
    solution_text = f"Official Solution/Explanation: {solution}\n" if solution else ""

    user_ans_text = f"Student's Answer Text: {user_answer}\n" if user_answer else ""
    image_text = "The student has also provided an image of their solution process.\n" if image_base64 else ""

    prompt = f"""
You are an expert tutor grading a student's submission.

Question: {question}
{expected_text}{solution_text}
{user_ans_text}{image_text}

TASK:
Evaluate if the student's answer is correct.
- Return TRUE if the student's answer is mathematically equivalent, logically correct, or demonstrates they have found the right answer. Be forgiving of formatting differences (e.g., '5' vs 'x=5', '0.5' vs '1/2').
- Return FALSE if the answer is incorrect, completely off-base, or a random guess.

Provide a JSON object with:
{{
    "correct": true or false
}}

Return ONLY the JSON object.
"""
    # DeepSeek is text-only, so any image - a diagram embedded in the question/answer/
    # solution, or a photo the student uploaded of their work - routes grading to a
    # vision-capable model instead.
    images = []
    if image_base64:
        images.append({"mime": "image/jpeg", "b64": image_base64})
    for text_field in (question, expected_answer, solution):
        images.extend(_extract_embedded_images(text_field, pdf_path))

    # Calling the model and parsing its response are distinct failure modes: a call
    # failure (e.g. the vision API being unreachable) is a grading-service error, not a
    # wrong answer, and the frontend needs to tell those apart so it doesn't burn a
    # student's attempt on an infrastructure hiccup.
    try:
        if images:
            response_text = _call_openai_vision(prompt, images)
        else:
            messages = [{"role": "user", "content": prompt}]
            response_text = _call_deepseek(messages, json_format=True)
    except Exception as e:
        print(f"Evaluation error: {e}")
        return {"correct": False, "error": str(e)}

    try:
        if not response_text:
            return {"correct": False, "error": "Empty response from AI"}

        # Clean up potential markdown formatting from DeepSeek response
        response_text = response_text.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]

        result = json.loads(response_text)

        # Ensure 'correct' is a boolean to prevent JavaScript truthiness bugs
        if isinstance(result.get("correct"), str):
            result["correct"] = str(result["correct"]).lower() == "true"

        return result
    except Exception as e:
        print(f"Evaluation parse error: {e}")
        return {"correct": False, "error": "Could not parse AI response"}

def chat_problem(question_context: str, messages: list) -> dict:
    system_prompt = f"""You are an expert tutor helping a student with a specific problem.
Here is the context of the problem:
{question_context}

Answer the student's questions in a helpful, encouraging way. UNDER NO CIRCUMSTANCES should you directly give the final answer to the student. Your goal is to guide them to the correct answer through Socratic questioning and hints. If they are completely stuck, break the problem down into smaller, manageable steps. Never perform the final calculation or state the final answer for them. Explain concepts clearly. Keep it concise."""

    deepseek_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        deepseek_messages.append({"role": msg.role, "content": msg.content})
        
    try:
        reply_text = _call_deepseek(deepseek_messages)
        return {"reply": reply_text}
    except Exception as e:
        print(f"Error calling DeepSeek chat: {e}")
        return {"reply": f"Sorry, I encountered an error connecting to the AI: {str(e)}"}
