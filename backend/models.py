from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String) # 'parent' or 'student'
    is_active = Column(Boolean, default=False)
    activation_code = Column(String, nullable=True)
    parent_email = Column(String, nullable=True) # Only used if role is 'student'

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    student_email = Column(String, index=True, nullable=True)
    
    tasks = relationship("DailyTask", back_populates="course", cascade="all, delete-orphan")

class DailyTask(Base):
    __tablename__ = "daily_tasks"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    chapter = Column(String, nullable=True)
    day_number = Column(Integer)
    topic = Column(String)
    class_content = Column(Text)
    homework = Column(Text)
    pdf_materials = Column(JSON, default=list)  # List of PDF file paths
    
    class_status = Column(String, default="pending")  # pending, completed, na
    homework_status = Column(String, default="pending")  # pending, completed, na
    class_data = Column(JSON, nullable=True)
    homework_data = Column(JSON, nullable=True)
    reminder_time = Column(String, nullable=True)

    course = relationship("Course", back_populates="tasks")

    @property
    def has_problems(self) -> bool:
        import os
        if self.pdf_materials:
            pdf_path = self.pdf_materials[0]
            base_path = os.path.splitext(pdf_path)[0]
            backend_dir = os.path.dirname(os.path.abspath(__file__))
            abs_base_path = os.path.abspath(os.path.join(backend_dir, base_path))
            return os.path.exists(abs_base_path + "_Problems.json")
        return False
