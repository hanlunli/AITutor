from pydantic import BaseModel
from typing import List, Optional

class UserCreate(BaseModel):
    email: str
    password: str
    role: str
    parent_email: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class DeleteAccountRequest(BaseModel):
    email: str
    password: str

class VerifyCodeRequest(BaseModel):
    email: str
    code: str

class DailyTaskBase(BaseModel):
    chapter: Optional[str] = None
    day_number: int
    topic: str
    class_content: str
    homework: str
    pdf_materials: List[str] = []
    videos: List[dict] = []
    class_data: Optional[dict] = None
    homework_data: Optional[dict] = None
    has_problems: Optional[bool] = True
    reminder_time: Optional[str] = None

class DailyTaskUpdate(BaseModel):
    class_status: Optional[str] = None
    homework_status: Optional[str] = None
    class_data: Optional[dict] = None
    homework_data: Optional[dict] = None
    student_email: Optional[str] = None
    reminder_time: Optional[str] = None

class DailyTask(DailyTaskBase):
    id: int
    course_id: int
    class_status: str
    homework_status: str

    class Config:
        from_attributes = True

class CourseBase(BaseModel):
    title: str
    description: Optional[str] = None
    student_email: Optional[str] = None

class Course(CourseBase):
    id: int
    tasks: List[DailyTask] = []

    class Config:
        from_attributes = True

class ParseRequest(BaseModel):
    course_file_path: str
    pdf_directory_path: str
    student_email: str

class ProblemCompletionRequest(BaseModel):
    student_email: str
    question: str
    solution: str = ""
    user_answers: List[str]
    is_correct: bool
    attempts: int
    chat_history: List[dict] = []

class EvaluateRequest(BaseModel):
    question: str
    user_answer: str
    expected_answer: Optional[str] = None
    solution: Optional[str] = None
    image: Optional[str] = None

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    question_context: str
    messages: List[ChatMessage]
