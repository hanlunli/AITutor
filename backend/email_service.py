import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from email.header import Header
import os
from dotenv import load_dotenv

load_dotenv()

SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.mail.yahoo.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

def send_email(to_email: str, subject: str, body: str):
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        print("Email credentials not configured in .env. Skipping email.")
        return False
        
    msg = MIMEMultipart()
    # Use formataddr to properly encode the sender name
    msg['From'] = formataddr((str(Header('AITutor', 'utf-8')), SMTP_USERNAME))
    msg['To'] = to_email
    msg['Subject'] = subject

    msg.attach(MIMEText(body, 'html'))

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
        
    return send_email(parent_email, subject, body)
