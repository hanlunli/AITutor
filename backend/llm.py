import os
import json
import re
import requests
from dotenv import load_dotenv

load_dotenv()

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

# Fallback to Ollama if needed (e.g. for vision)
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_VISION_MODEL = os.getenv("OLLAMA_VISION_MODEL", "llama3.2-vision")

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

def _call_ollama_vision(prompt: str, image_base64: str) -> str:
    url = f"{OLLAMA_HOST}/api/generate"
    payload = {
        "model": OLLAMA_VISION_MODEL,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "images": [image_base64]
    }

    try:
        # Vision models are slower to load/run than text models, especially on first call
        response = requests.post(url, json=payload, timeout=180)
        response.raise_for_status()
        resp_json = response.json()

        response_text = resp_json.get("response", "")
        prompt_tokens = resp_json.get("prompt_eval_count", 0)
        completion_tokens = resp_json.get("eval_count", 0)

        print("="*40 + " LLM CALL (Ollama Vision) " + "="*40)
        print(f"MODEL: {payload.get('model')}")
        print(f"PROMPT:\n{prompt}")
        print("-" * 80)
        print(f"RESPONSE:\n{response_text}")
        print("-" * 80)
        print(f"TOKENS: Input={prompt_tokens}, Output={completion_tokens}")
        print("="*101)

        return response_text
    except requests.exceptions.ConnectionError:
        raise RuntimeError(f"Could not reach Ollama at {OLLAMA_HOST}. Make sure Ollama is installed and running.")
    except Exception as e:
        print(f"Error calling Ollama Vision: {e}")
        raise RuntimeError(f"Ollama Vision error: {str(e)}")

def evaluate_answer(question: str, user_answer: str, expected_answer: str = None, solution: str = None, image_base64: str = None) -> dict:
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
    # Calling the model and parsing its response are distinct failure modes: a call
    # failure (e.g. Ollama not running) is a grading-service error, not a wrong answer,
    # and the frontend needs to tell those apart so it doesn't burn a student's attempt
    # on an infrastructure hiccup.
    try:
        if image_base64:
            # DeepSeek doesn't support vision yet, fallback to Ollama for images
            response_text = _call_ollama_vision(prompt, image_base64)
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
