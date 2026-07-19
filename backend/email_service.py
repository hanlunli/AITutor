import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from email.utils import formataddr
from email.header import Header
import os
import uuid
import re
import markdown
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.mail.yahoo.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

def send_email(to_email: str, subject: str, body: str, inline_images: list = None):
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        print("Email credentials not configured in .env. Skipping email.")
        return False
        
    msg = MIMEMultipart('related')
    # Use formataddr to properly encode the sender name
    msg['From'] = formataddr((str(Header('AITutor', 'utf-8')), SMTP_USERNAME))
    msg['To'] = to_email
    msg['Subject'] = subject

    msg_alternative = MIMEMultipart('alternative')
    msg.attach(msg_alternative)
    msg_alternative.attach(MIMEText(body, 'html'))

    if inline_images:
        for cid, file_path in inline_images:
            try:
                with open(file_path, 'rb') as img_file:
                    img_data = img_file.read()
                import mimetypes
                from email.mime.image import MIMEImage
                ctype, encoding = mimetypes.guess_type(file_path)
                if ctype is None or not ctype.startswith('image/'):
                    ctype = 'image/png'
                maintype, subtype = ctype.split('/', 1)
                
                img_part = MIMEImage(img_data, _subtype=subtype)
                img_part.add_header('Content-ID', f'<{cid}>')
                img_part.add_header('Content-Disposition', 'inline')
                msg.attach(img_part)
            except Exception as e:
                import sys
                print(f"Failed to attach image {file_path}: {e}", file=sys.stderr)

    try:
        # Yahoo requires SSL on port 465
        server = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT)
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        import sys
        print(f"==================================================", file=sys.stderr)
        print(f"SUCCESS: Email sent to {to_email}", file=sys.stderr)
        print(f"SUBJECT: {subject}", file=sys.stderr)
        print(f"==================================================", file=sys.stderr)
        sys.stderr.flush()
        return True
    except Exception as e:
        import sys
        print(f"==================================================", file=sys.stderr)
        print(f"ERROR: Failed to send email to {to_email}", file=sys.stderr)
        print(f"DETAILS: {e}", file=sys.stderr)
        print(f"==================================================", file=sys.stderr)
        sys.stderr.flush()
        return False

def send_activation_email(to_email: str, code: str):
    subject = "AITutor Account Activation Code"
    body = f"""
    <html>
    <body>
        <h2>Welcome to AITutor!</h2>
        <p>Your account activation code is: <strong>{code}</strong></p>
        <p>Please enter this code in the application to complete your registration.</p>
    </body>
    </html>
    """
    return send_email(to_email, subject, body)

def send_calendar_invite(to_email: str, task_topic: str, start_time_iso: str, task_id: int, action: str = "REQUEST"):
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        print("Email credentials not configured in .env. Skipping email.")
        return False
        
    msg = MIMEMultipart('alternative')
    msg['From'] = formataddr((str(Header('AITutor', 'utf-8')), SMTP_USERNAME))
    msg['To'] = to_email
    
    if action == "REQUEST":
        subject = f"Class Reminder: {task_topic}"
        body = f"<p>Reminder for your class: <strong>{task_topic}</strong></p>"
    else:
        subject = f"Cancelled: Class Reminder: {task_topic}"
        body = f"<p>The reminder for your class <strong>{task_topic}</strong> has been cancelled.</p>"
        
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'html'))

    # Parse start time
    try:
        # Expected format: "2026-05-25T10:00"
        dt_start = datetime.strptime(start_time_iso, "%Y-%m-%dT%H:%M")
    except ValueError:
        dt_start = datetime.utcnow() + timedelta(days=1)
        
    dt_end = dt_start + timedelta(hours=1)
    
    dtstamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    dtstart_str = dt_start.strftime("%Y%m%dT%H%M%S")
    dtend_str = dt_end.strftime("%Y%m%dT%H%M%S")
    
    uid = f"aitutor-task-{task_id}@aitutor.local"
    
    ics_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AITutor//EN
METHOD:{action}
BEGIN:VEVENT
UID:{uid}
DTSTAMP:{dtstamp}
DTSTART;TZID=UTC:{dtstart_str}
DTEND;TZID=UTC:{dtend_str}
SUMMARY:{task_topic}
ORGANIZER;CN=AITutor:mailto:{SMTP_USERNAME}
ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:{to_email}
STATUS:{'CONFIRMED' if action == 'REQUEST' else 'CANCELLED'}
END:VEVENT
END:VCALENDAR"""

    part = MIMEBase('text', 'calendar', method=action)
    part.set_payload(ics_content)
    encoders.encode_base64(part)
    part.add_header('Content-Disposition', 'attachment; filename="invite.ics"')
    msg.attach(part)

    try:
        server = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT)
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        import sys
        print(f"==================================================", file=sys.stderr)
        print(f"SUCCESS: Calendar {action} sent to {to_email}", file=sys.stderr)
        print(f"SUBJECT: {subject}", file=sys.stderr)
        print(f"==================================================", file=sys.stderr)
        sys.stderr.flush()
        return True
    except Exception as e:
        import sys
        print(f"==================================================", file=sys.stderr)
        print(f"ERROR: Failed to send calendar invite to {to_email}", file=sys.stderr)
        print(f"DETAILS: {e}", file=sys.stderr)
        print(f"==================================================", file=sys.stderr)
        sys.stderr.flush()
        return False
    subject = "AITutor Account Activation Code"
    body = f"""
    <html>
    <body>
        <h2>Welcome to AITutor!</h2>
        <p>Your account activation code is: <strong>{code}</strong></p>
        <p>Please enter this code in the application to complete your registration.</p>
    </body>
    </html>
    """
    return send_email(to_email, subject, body)

import re
import markdown
import uuid
import urllib.parse

import re
import markdown
import uuid
import urllib.parse

def format_math_text_for_email(text: str, base_url: str, pdf_path: str, inline_images: list) -> str:
    if not text:
        return ""
    
    # Clean some basic LaTeX artifacts
    text = re.sub(r'\\color\[rgb\]\{[^}]+\}', '', text)
    text = re.sub(r'\\(?:overarc|overparen|wideparen)\{\$?([^{}$]+)\$?\}', r'\\stackrel{\\frown}{\1}', text)
    text = text.replace('\ufffd', '')
    
    # Clean up LaTeX math
    text = text.replace('$$', '')
    text = text.replace('$', '')
    text = re.sub(r'\\boxed\s*{([^}]+)}', r'[\1]', text)
    text = re.sub(r'\\text{([^}]+)}', r'\1', text)
    text = re.sub(r'\\textbf{([^}]+)}', r'<b>\1</b>', text)
    text = re.sub(r'\\frac{([^{}]+)}{([^{}]+)}', r'(\1)/(\2)', text)
    text = re.sub(r'\\sqrt{([^{}]+)}', r'√(\1)', text)
    
    replacements = {
        r'\cdot': '·',
        r'\times': '×',
        r'\div': '÷',
        r'\leq': '≤',
        r'\geq': '≥',
        r'\neq': '≠',
        r'\approx': '≈',
        r'\pm': '±',
        r'\circ': '°',
        r'^\circ': '°',
        r'\angle': '∠',
        r'\triangle': '△',
        r'\pi': 'π',
        r'\infty': '∞',
        r'\rightarrow': '→',
        r'\Rightarrow': '⇒',
        r'^2': '²',
        r'^3': '³',
        r'\left': '',
        r'\right': '',
        r'\,': ' ',
        r'\ ': ' ',
        r'\quad': '    ',
        r'\{': '{',
        r'\}': '}',
        r'\%': '%',
        r'\$': '$',
        r'\#': '#',
        r'\_': '_',
        r'\&': '&',
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
        
    text = re.sub(r'\\begin{align\*?}(.*?)\\end{align\*?}', r'\1', text, flags=re.DOTALL)
    text = re.sub(r'\\begin{cases}(.*?)\\end{cases}', r'\1', text, flags=re.DOTALL)
    text = re.sub(r'\\begin{array}{.*?}(.*?)\\end{array}', r'\1', text, flags=re.DOTALL)
    
    # Format [ICONBOX:type:title]
    def replace_iconbox(match):
        title = match.group(2)
        if title:
            return f"\n**{title}**\n"
        return "\n"
    text = re.sub(r'\[ICONBOX:([^:]+):([^\]]*)\]', replace_iconbox, text)
    text = text.replace('[/ICONBOX]', '\n')
    
    # Replace [IMAGE: images/hash.png] and ![alt](images/hash.png)
    if pdf_path:
        base_dir = pdf_path.rsplit('/', 1)[0] if '/' in pdf_path else pdf_path.rsplit('\\', 1)[0]
        
        def replace_image(match):
            img_rel_path = match.group(1).strip()
            abs_path = f"{base_dir}/{img_rel_path}"
            cid = f"img_{uuid.uuid4().hex}"
            inline_images.append((cid, abs_path))
            return f'<br><img src="cid:{cid}" style="max-width: 100%; height: auto; margin: 10px 0;" /><br>'
            
        # Match [IMAGE: path]
        text = re.sub(r'\[IMAGE:\s*([^\]]+)\]', replace_image, text)
        # Match ![alt](path)
        text = re.sub(r'!\[[^\]]*\]\(([^)]+)\)', replace_image, text)
    
    # Convert basic markdown to HTML
    html = markdown.markdown(text)
    return html

def send_problem_completion_email(student_email: str, parent_email: str, task_topic: str, question_number: str, question: str, solution: str, user_answers: list, is_correct: bool, attempts: int, chat_history: list, base_url: str = "", pdf_path: str = ""):
    subject = f"AITutor Update: Student answered a question in {task_topic}"
    
    inline_images = []
    
    formatted_question = format_math_text_for_email(question, base_url, pdf_path, inline_images)
    
    chat_html = ""
    if chat_history and len(chat_history) > 0:
        chat_html = "<h3>AI Chat History</h3><ul>"
        for msg in chat_history:
            role = "Student" if msg.get("role") == "user" else "AI Tutor"
            content = format_math_text_for_email(msg.get('content', ''), base_url, pdf_path, inline_images)
            chat_html += f"<li><strong>{role}:</strong> {content}</li>"
        chat_html += "</ul>"
        
    status = "Correct" if is_correct else "Incorrect (Max attempts reached)"
    
    answers_html = "<h3>Student's Answer Attempts</h3><ol>"
    for idx, ans in enumerate(user_answers):
        formatted_ans = format_math_text_for_email(ans, base_url, pdf_path, inline_images) if ans != '[Image Uploaded]' else ans
        answers_html += f"<li>{formatted_ans}</li>"
    answers_html += "</ol>"
    
    solution_html = ""
    if solution:
        formatted_solution = format_math_text_for_email(solution, base_url, pdf_path, inline_images)
        solution_html = f"<h3>Official Solution</h3><div>{formatted_solution}</div>"
    
    question_heading = f"<h3>Question {question_number}</h3>" if question_number else "<h3>Question</h3>"
    
    body = f"""
    <html>
    <body>
        <h2>AITutor Problem Report</h2>
        <p><strong>Student:</strong> {student_email}</p>
        <p><strong>Task:</strong> {task_topic}</p>
        <hr>
        {question_heading}
        <div>{formatted_question}</div>
        {solution_html}
        {answers_html}
        <p><strong>Status:</strong> {status}</p>
        <p><strong>Attempts:</strong> {attempts}</p>
        {chat_html}
    </body>
    </html>
    """
    
    if not parent_email:
        import sys
        print(f"WARNING: No parent email found in the database for student {student_email}. Skipping report email.", file=sys.stderr)
        sys.stderr.flush()
        return False
        
    return send_email(parent_email, subject, body, inline_images)

def send_combined_task_completion_report(student_email: str, parent_email: str, task_topic: str, class_stats: dict, homework_stats: dict):
    subject = f"AITutor Update: Student completed {task_topic}"
    
    def format_stats(stats, title):
        if not stats:
            return ""
        total_q = stats.get('total', 0)
        correct_q = stats.get('correct', 0)
        attempts_info = stats.get('attempts', {})
        
        avg_attempts = 0
        if correct_q > 0:
            total_attempts = sum(attempts_info.get(str(i), 1) for i in range(total_q))
            avg_attempts = total_attempts / max(1, total_q)
            
        return f"""
        <h3>{title}</h3>
        <ul>
            <li><strong>Total Questions:</strong> {total_q}</li>
            <li><strong>Correctly Answered:</strong> {correct_q}</li>
            <li><strong>Accuracy:</strong> {int((correct_q/max(1, total_q))*100)}%</li>
            <li><strong>Average Attempts per Question:</strong> {avg_attempts:.1f}</li>
        </ul>
        """
        
    class_html = format_stats(class_stats, "Study & Problems")
    homework_html = format_stats(homework_stats, "Exercises")
    
    body = f"""
    <html>
    <body>
        <h2>AITutor Progress Report</h2>
        <p><strong>Student:</strong> {student_email}</p>
        <p><strong>Task:</strong> {task_topic}</p>
        <hr>
        {class_html}
        {homework_html}
        <p>Log in to the AITutor Parent Dashboard to view detailed answers and progress.</p>
    </body>
    </html>
    """
    
    if not parent_email:
        import sys
        print(f"WARNING: No parent email found in the database for student {student_email}. Skipping report email.", file=sys.stderr)
        sys.stderr.flush()
        return False
        
    return send_email(parent_email, subject, body, inline_images)
