import os
import json
import re
import requests
from dotenv import load_dotenv

load_dotenv()

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1")
OLLAMA_VISION_MODEL = os.getenv("OLLAMA_VISION_MODEL", "llama3.2-vision")

def _call_ollama(prompt: str, json_format: bool = False, images: list = None, model: str = None) -> str:
    url = f"{OLLAMA_HOST}/api/generate"
    payload = {
        "model": model or OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False
    }
    if json_format:
        payload["format"] = "json"
    if images:
        payload["images"] = images
        
    try:
        response = requests.post(url, json=payload, timeout=300)
        response.raise_for_status()
        resp_json = response.json()
        
        response_text = resp_json.get("response", "")
        prompt_tokens = resp_json.get("prompt_eval_count", 0)
        completion_tokens = resp_json.get("eval_count", 0)
        
        print("="*40 + " LLM CALL (Generate) " + "="*40)
        print(f"MODEL: {payload.get('model')}")
        print(f"PROMPT:\n{prompt}")
        print("-" * 80)
        print(f"RESPONSE:\n{response_text}")
        print("-" * 80)
        print(f"TOKENS: Input={prompt_tokens}, Output={completion_tokens}")
        print("="*101)
        
        return response_text
    except Exception as e:
        print(f"Error calling Ollama: {e}")
        raise RuntimeError(f"Ollama error: {str(e)}")

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
    try:
        model_to_use = OLLAMA_VISION_MODEL if image_base64 else OLLAMA_MODEL
        images_list = [image_base64] if image_base64 else None
        
        response_text = _call_ollama(prompt, json_format=True, images=images_list, model=model_to_use)
        if not response_text:
            return {"correct": False}
            
        result = json.loads(response_text)
        
        # Ensure 'correct' is a boolean to prevent JavaScript truthiness bugs
        if isinstance(result.get("correct"), str):
            result["correct"] = str(result["correct"]).lower() == "true"
            
        return result
    except Exception as e:
        print(f"Evaluation error: {e}")
        return {"correct": False}

def chat_problem(question_context: str, messages: list) -> dict:
    url = f"{OLLAMA_HOST}/api/chat"
    
    system_prompt = f"""You are an expert tutor helping a student with a specific problem.
Here is the context of the problem:
{question_context}

Answer the student's questions in a helpful, encouraging way. Do not just give the answer directly unless they are completely stuck, but guide them to it. Explain concepts clearly. Keep it concise."""

    ollama_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        ollama_messages.append({"role": msg.role, "content": msg.content})
        
    payload = {
        "model": OLLAMA_MODEL,
        "messages": ollama_messages,
        "stream": False
    }
    
    try:
        response = requests.post(url, json=payload, timeout=300)
        response.raise_for_status()
        resp_json = response.json()
        
        reply_text = resp_json.get("message", {}).get("content", "")
        prompt_tokens = resp_json.get("prompt_eval_count", 0)
        completion_tokens = resp_json.get("eval_count", 0)
        
        print("="*40 + " LLM CALL (Chat) " + "="*40)
        print(f"MODEL: {payload.get('model')}")
        for msg in ollama_messages:
            print(f"[{msg['role'].upper()}]:\n{msg['content']}\n")
        print("-" * 80)
        print(f"RESPONSE:\n{reply_text}")
        print("-" * 80)
        print(f"TOKENS: Input={prompt_tokens}, Output={completion_tokens}")
        print("="*97)
        
        return {"reply": reply_text}
    except Exception as e:
        print(f"Error calling Ollama chat: {e}")
        return {"reply": f"Sorry, I encountered an error connecting to the AI: {str(e)}"}
