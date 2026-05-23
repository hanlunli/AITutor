from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import os
import urllib.parse
import json
import hashlib
import random

import models, schemas
import llm
import email_service
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AITutor Timeline API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

@app.post("/api/auth/register")
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if user.role == 'student':
        if not user.parent_email:
            raise HTTPException(status_code=400, detail="Parent email is required for students")
        parent_user = db.query(models.User).filter(models.User.email == user.parent_email, models.User.role == 'parent').first()
        if not parent_user:
            raise HTTPException(status_code=400, detail="Parent email must belong to an existing parent account")

    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        if db_user.is_active:
            raise HTTPException(status_code=400, detail="Email already registered")
        # If not active, we can resend code
    
    code = str(random.randint(100000, 999999))
    
    if not db_user:
        db_user = models.User(
            email=user.email,
            hashed_password=hash_password(user.password),
            role=user.role,
            is_active=False,
            activation_code=code,
            parent_email=user.parent_email if user.role == 'student' else None
        )
        db.add(db_user)
    else:
        db_user.hashed_password = hash_password(user.password)
        db_user.role = user.role
        db_user.activation_code = code
        db_user.parent_email = user.parent_email if user.role == 'student' else None
        
    db.commit()
    
    # Send email
    email_service.send_activation_email(user.email, code)
    return {"message": "Activation code sent to email"}

@app.post("/api/auth/verify")
def verify_code(req: schemas.VerifyCodeRequest, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == req.email).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if db_user.activation_code != req.code:
        raise HTTPException(status_code=400, detail="Invalid activation code")
        
    db_user.is_active = True
    db_user.activation_code = None
    db.commit()
    return {"message": "Account activated successfully"}

@app.post("/api/auth/login")
def login_user(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user:
        raise HTTPException(status_code=400, detail="Invalid credentials")
        
    if db_user.hashed_password != hash_password(user.password):
        raise HTTPException(status_code=400, detail="Invalid credentials")
        
    if not db_user.is_active:
        raise HTTPException(status_code=400, detail="Account not activated. Please register again to get a new code.")
        
    return {"email": db_user.email, "role": db_user.role}

@app.delete("/api/auth/delete")
def delete_account(req: schemas.DeleteAccountRequest, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == req.email).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if db_user.hashed_password != hash_password(req.password):
        raise HTTPException(status_code=400, detail="Invalid credentials")
        
    if db_user.role == 'parent':
        # Delete all students associated with this parent
        students = db.query(models.User).filter(models.User.parent_email == db_user.email).all()
        for student in students:
            # Also delete courses associated with student
            db.query(models.Course).filter(models.Course.student_email == student.email).delete()
            db.delete(student)
            
    # Delete courses associated with this user (if student)
    if db_user.role == 'student':
        db.query(models.Course).filter(models.Course.student_email == db_user.email).delete()
        
    db.delete(db_user)
    db.commit()
    return {"message": "Account deleted successfully"}

@app.post("/api/parse", response_model=schemas.Course)
async def parse_course(request: schemas.ParseRequest, db: Session = Depends(get_db)):
    # 0. Read file and directory
    if not os.path.exists(request.course_file_path) or not os.path.isfile(request.course_file_path):
        raise HTTPException(status_code=400, detail="Course mapping file not found")
        
    if not request.course_file_path.lower().endswith('.json'):
        raise HTTPException(status_code=400, detail="Only .json files are supported")

    # Auto-infer PDF directory if not provided
    pdf_dir = request.pdf_directory_path.strip() if request.pdf_directory_path else ""
    if not pdf_dir:
        pdf_dir = os.path.dirname(os.path.abspath(request.course_file_path))

    pdf_paths = []
    if pdf_dir and os.path.exists(pdf_dir) and os.path.isdir(pdf_dir):
        for root, _, files in os.walk(pdf_dir):
            for file in files:
                if file.lower().endswith('.pdf'):
                    pdf_paths.append(os.path.join(root, file))

    try:
        with open(request.course_file_path, 'r', encoding='utf-8') as f:
            mapping_data = json.load(f)
            
        course_title = "My Course"
        
        # Try to infer title from filename if available
        filename = os.path.basename(request.course_file_path)
        course_id = filename.replace("toc_mapping_", "").replace(".json", "")
        if course_id == "intro-counting":
            course_title = "Introduction to Counting and Probability"
        elif course_id == "intro-geometry":
            course_title = "Introduction to Geometry"
        elif course_id != "toc_mapping":
            course_title = course_id.replace("-", " ").title()

        if len(mapping_data) > 0 and "book title" in mapping_data[0]:
            course_title = mapping_data[0]["book title"]
            mapping_data = mapping_data[1:]
        
        class DummyTask:
            def __init__(self, day_number, topic, class_content, homework, pdf_materials, chapter=None):
                self.day_number = day_number
                self.topic = topic
                self.class_content = class_content
                self.homework = homework
                self.pdf_materials = pdf_materials
                self.chapter = chapter

        parsed_tasks = []
        day_counter = 1
        for item in mapping_data:
            parent_title = item.get("title")

            # If there are children, iterate through them
            if "children" in item and isinstance(item["children"], list):
                for child in item["children"]:
                    title = child.get("title", f"Day {day_counter}")
                    pdf = child.get("pdf")
                    pdfs = [pdf] if pdf else []
                    
                    parsed_tasks.append(DummyTask(
                        day_number=day_counter,
                        topic=title,
                        class_content=f"Study: {title}",
                        homework=f"Review {title}",
                        pdf_materials=pdfs,
                        chapter=parent_title
                    ))
                    day_counter += 1
            else:
                title = item.get("title", f"Day {day_counter}")
                pdf = item.get("pdf")
                pdfs = [pdf] if pdf else []
                parsed_tasks.append(DummyTask(
                    day_number=day_counter,
                    topic=title,
                    class_content=f"Study: {title}",
                    homework=f"Review {title}",
                    pdf_materials=pdfs,
                    chapter=None
                ))
                day_counter += 1
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse JSON mapping: {str(e)}")

    # Map filenames back to absolute paths (prioritize shallower directories by keeping first match)
    pdf_name_to_path = {}
    for p in pdf_paths:
        name = os.path.basename(p)
        if name not in pdf_name_to_path:
            pdf_name_to_path[name] = p
    
    # 2. Create Course
    existing_course = db.query(models.Course).filter(
        models.Course.title == course_title,
        models.Course.student_email == request.student_email
    ).first()
    if existing_course:
        db.delete(existing_course)
        db.commit()

    db_course = models.Course(
        title=course_title, 
        description="Generated from JSON mapping",
        student_email=request.student_email
    )
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    
    # 3. Create Tasks
    for task_data in parsed_tasks:
        resolved_pdfs = []
        for pdf_ref in task_data.pdf_materials:
            if not pdf_ref:
                continue
            if os.path.exists(pdf_ref):
                resolved_pdfs.append(pdf_ref)
            else:
                # Try to match by filename
                basename = os.path.basename(pdf_ref)
                if basename in pdf_name_to_path:
                    resolved_pdfs.append(pdf_name_to_path[basename])
                else:
                    # Fallback: construct absolute path based on pdf_dir
                    fallback_path = os.path.join(pdf_dir, basename)
                    resolved_pdfs.append(fallback_path if os.path.exists(fallback_path) else pdf_ref)
                    
        class_status = "pending"
        homework_status = "pending"
        
        if resolved_pdfs:
            pdf_path = resolved_pdfs[0]
            base_path = os.path.splitext(pdf_path)[0]
            
            if pdf_path.endswith("pr.pdf"):
                if not os.path.exists(base_path + "_Review.json") and not os.path.exists(base_path + "_Content.json"):
                    class_status = "na"
                homework_status = "na"
            elif pdf_path.endswith("pc.pdf"):
                if not os.path.exists(base_path + "_Challenge.json") and not os.path.exists(base_path + "_Content.json"):
                    class_status = "na"
                homework_status = "na"
            else:
                if not os.path.exists(base_path + "_Problems.json") and not os.path.exists(base_path + "_Content.json"):
                    class_status = "na"
                if not os.path.exists(base_path + "_Exercises.json"):
                    homework_status = "na"
        else:
            class_status = "na"
            homework_status = "na"
            
        db_task = models.DailyTask(
            course_id=db_course.id,
            chapter=getattr(task_data, 'chapter', None),
            day_number=task_data.day_number,
            topic=task_data.topic,
            class_content=task_data.class_content,
            homework=task_data.homework,
            pdf_materials=resolved_pdfs,
            class_status=class_status,
            homework_status=homework_status
        )
        db.add(db_task)
    
    db.commit()
    db.refresh(db_course)
    return db_course

@app.get("/api/files/{filepath:path}")
def get_file(filepath: str):
    # URL decode the filepath just in case
    filepath = urllib.parse.unquote(filepath)
    
    # Resolve the absolute path
    abs_filepath = os.path.abspath(filepath)
    
    # Security check: ensure it doesn't escape the project root
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if not abs_filepath.startswith(project_root):
        raise HTTPException(status_code=400, detail="Invalid filepath: Access denied")
        
    if not os.path.exists(abs_filepath):
        print(f"File not found on disk: {abs_filepath}")
        raise HTTPException(status_code=404, detail="File not found")
        
    return FileResponse(abs_filepath, headers={"Cache-Control": "no-cache, no-store, must-revalidate"})

@app.delete("/api/tasks")
def clear_all_tasks(db: Session = Depends(get_db)):
    db.query(models.DailyTask).delete()
    db.query(models.Course).delete()
    db.commit()
    return {"message": "All tasks cleared"}

@app.get("/")
def read_root():
    return {"message": "Welcome to AITutor Timeline API"}

@app.get("/api/available_courses")
def get_available_courses():
    import glob
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    mapping_files = glob.glob(os.path.join(root_dir, "toc_mapping*.json"))
    courses = []
    for file_path in mapping_files:
        filename = os.path.basename(file_path)
        # Extract course name from filename, e.g., toc_mapping_intro-counting.json -> intro-counting
        if filename == "toc_mapping.json":
            course_id = "default"
            pdf_dir = "output_pdfs" # or whatever default is
        else:
            course_id = filename.replace("toc_mapping_", "").replace(".json", "")
            pdf_dir = f"output_pdfs_{course_id}-ebook"
        
        # Read the title from the json if possible
        if course_id == "intro-counting":
            title = "Introduction to Counting and Probability"
        elif course_id == "intro-geometry":
            title = "Introduction to Geometry"
        else:
            title = course_id.replace("-", " ").title()
            
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if len(data) > 0 and "book title" in data[0]:
                    title = data[0]["book title"]
        except:
            pass
            
        courses.append({
            "id": course_id,
            "title": title,
            "file_path": f"..\\{filename}",
            "pdf_dir": f"..\\{pdf_dir}"
        })
    return courses

@app.get("/api/courses", response_model=List[schemas.Course])
def get_courses(student_email: str = None, db: Session = Depends(get_db)):
    query = db.query(models.Course)
    if student_email:
        query = query.filter(models.Course.student_email == student_email)
    return query.all()

@app.delete("/api/courses/{course_id}")
def delete_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    db.delete(course)
    db.commit()
    return {"message": "Course deleted"}

@app.get("/api/students")
def get_students(parent_email: str, db: Session = Depends(get_db)):
    students = db.query(models.User).filter(
        models.User.role == 'student',
        models.User.parent_email == parent_email
    ).all()
    return [{"email": s.email} for s in students]

@app.get("/api/tasks", response_model=List[schemas.DailyTask])
def get_tasks(course_id: int = None, db: Session = Depends(get_db)):
    query = db.query(models.DailyTask)
    if course_id:
        query = query.filter(models.DailyTask.course_id == course_id)
    return query.order_by(models.DailyTask.day_number).all()

def _calculate_stats(data: dict):
    if not data:
        return {}
    
    evals = data.get('evaluations', {})
    attempts = data.get('attempts', {})
    
    total = len(evals) if evals else len(attempts)
    correct = sum(1 for v in evals.values() if v.get('correct'))
    
    return {
        'total': total,
        'correct': correct,
        'attempts': attempts
    }

@app.patch("/api/tasks/{task_id}", response_model=schemas.DailyTask)
def update_task_status(task_id: int, task_update: schemas.DailyTaskUpdate, db: Session = Depends(get_db)):
    db_task = db.query(models.DailyTask).filter(models.DailyTask.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    old_class_status = db_task.class_status
    old_homework_status = db_task.homework_status
    
    if task_update.class_status is not None:
        db_task.class_status = task_update.class_status
        
    if task_update.homework_status is not None:
        db_task.homework_status = task_update.homework_status
        
    if task_update.class_data is not None:
        db_task.class_data = task_update.class_data
    if task_update.homework_data is not None:
        db_task.homework_data = task_update.homework_data

    def is_completed(c_status, h_status):
        c_done = c_status in ['completed', 'na']
        h_done = h_status in ['completed', 'na']
        return c_done and h_done

    was_completed = is_completed(old_class_status, old_homework_status)
    is_now_completed = is_completed(db_task.class_status, db_task.homework_status)

    if not was_completed and is_now_completed:
        try:
            class_stats = _calculate_stats(db_task.class_data) if db_task.class_status == 'completed' else None
            homework_stats = _calculate_stats(db_task.homework_data) if db_task.homework_status == 'completed' else None
            
            parent_email = None
            if task_update.student_email:
                student_user = db.query(models.User).filter(models.User.email == task_update.student_email).first()
                if student_user and student_user.parent_email:
                    parent_email = student_user.parent_email
                
            email_service.send_combined_task_completion_report(
                student_email=task_update.student_email or "Student",
                parent_email=parent_email,
                task_topic=db_task.topic,
                class_stats=class_stats,
                homework_stats=homework_stats
            )
        except Exception as e:
            import sys
            print(f"==================================================", file=sys.stderr)
            print(f"ERROR: Failed to send completion email", file=sys.stderr)
            print(f"DETAILS: {e}", file=sys.stderr)
            print(f"==================================================", file=sys.stderr)
            sys.stderr.flush()
            
    db.commit()
    db.refresh(db_task)
    return db_task

@app.post("/api/tasks/{task_id}/generate_class_questions")
def generate_class_questions_endpoint(task_id: int, db: Session = Depends(get_db)):
    db_task = db.query(models.DailyTask).filter(models.DailyTask.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    pdf_paths = db_task.pdf_materials
    if not pdf_paths:
        return []
        
    pdf_path = pdf_paths[0]
    base_path = os.path.splitext(pdf_path)[0]
    
    if pdf_path.endswith("pr.pdf"):
        json_path = base_path + "_Review.json"
    elif pdf_path.endswith("pc.pdf"):
        json_path = base_path + "_Challenge.json"
    else:
        json_path = base_path + "_Problems.json"
        
    if os.path.exists(json_path):
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error reading JSON: {str(e)}")
    return []

@app.post("/api/tasks/{task_id}/extract_homework")
def extract_homework_endpoint(task_id: int, db: Session = Depends(get_db)):
    db_task = db.query(models.DailyTask).filter(models.DailyTask.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    pdf_paths = db_task.pdf_materials
    if not pdf_paths:
        return []
        
    pdf_path = pdf_paths[0]
    if pdf_path.endswith("pr.pdf") or pdf_path.endswith("pc.pdf"):
        return []
        
    base_path = os.path.splitext(pdf_path)[0]
    json_path = base_path + "_Exercises.json"
    
    if os.path.exists(json_path):
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error reading JSON: {str(e)}")
    return []

@app.post("/api/tasks/{task_id}/read_content")
def read_content_endpoint(task_id: int, db: Session = Depends(get_db)):
    db_task = db.query(models.DailyTask).filter(models.DailyTask.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    pdf_paths = db_task.pdf_materials
    if not pdf_paths:
        return []
        
    pdf_path = pdf_paths[0]
    base_path = os.path.splitext(pdf_path)[0]
    json_path = base_path + "_Content.json"
    
    if os.path.exists(json_path):
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error reading JSON: {str(e)}")
    return []

@app.post("/api/evaluate_answer")
def evaluate_answer_endpoint(request: schemas.EvaluateRequest):
    result = llm.evaluate_answer(request.question, request.user_answer, request.expected_answer, request.solution, request.image)
    return result

@app.post("/api/chat_problem")
def chat_problem_endpoint(request: schemas.ChatRequest):
    return llm.chat_problem(request.question_context, request.messages)
