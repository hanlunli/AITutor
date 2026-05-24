import { useState, useEffect } from 'react'
import { CheckCircle2, FileText, Loader2, X, MessageSquare, Send, Image as ImageIcon, BookOpen, Pencil, Key, AlertCircle, Ban, Dices, Music, Box, PlayCircle, LogOut, Trash2, Sparkles, Users, UserX, Calendar } from 'lucide-react'
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

// Define types
interface Task {
  id: number;
  course_id: number;
  chapter?: string;
  day_number: number;
  topic: string;
  class_content: string;
  homework: string;
  pdf_materials: string[];
  class_status: string;
  homework_status: string;
  class_data?: any;
  homework_data?: any;
  has_problems?: boolean;
  reminder_time?: string | null;
}

interface Question {
  type: 'mcq' | 'free_text';
  number?: string;
  text: string;
  options?: string[];
  answer?: string;
  solution?: string;
  hints?: { text: string }[];
}

interface EvaluationResult {
  correct: boolean;
}

const API_BASE = 'http://localhost:8000/api';
//const API_BASE = 'http://192.168.0.130:8000/api';
//const API_BASE = 'http://10.14.5.162:8000/api';

const getImageUrl = (pdfPath: string, imgRelPath: string) => {
  const dir = pdfPath.replace(/[\/\\][^/\\]*$/, '');
  const absPath = dir + '/' + imgRelPath;
  return `${API_BASE}/files/${encodeURIComponent(absPath)}`;
};

const getIconboxConfig = (iconType: string, title: string) => {
  let IconComp: any = Key;
  let bgColor = 'bg-[#f4fafa]';
  let borderColor = 'border-[#75baba]';
  let textColor = 'text-[#19335c]';
  let iconColor = 'text-[#19335c]';
  let defaultTitle = '';
  
  switch (iconType) {
    case 'concept': IconComp = Key; defaultTitle = 'Concept:'; break;
    case 'important': IconComp = AlertCircle; defaultTitle = 'Important:'; break;
    case 'warning': IconComp = Ban; defaultTitle = 'WARNING!!'; break;
    case 'game': IconComp = Dices; defaultTitle = 'Game:'; break;
    case 'sidenote': IconComp = Music; defaultTitle = 'Sidenote:'; break;
    case 'bogus': IconComp = Box; defaultTitle = 'Bogus Solution:'; break;
    case 'extra': IconComp = PlayCircle; defaultTitle = 'Extra!'; break;
    case 'definition': IconComp = null; defaultTitle = 'Definitions:'; break;
  }
  return { IconComp, bgColor, borderColor, textColor, iconColor, displayTitle: defaultTitle || title };
};

const parseIconboxes = (text: string) => {
  const parts: string[] = [];
  let current = 0;
  while (current < text.length) {
    const startIdx = text.indexOf('[ICONBOX:', current);
    if (startIdx === -1) {
      parts.push(text.slice(current));
      break;
    }
    
    if (startIdx > current) {
      parts.push(text.slice(current, startIdx));
    }
    
    let depth = 1;
    let searchIdx = startIdx + 9;
    let endIdx = -1;
    
    while (searchIdx < text.length) {
      const nextOpen = text.indexOf('[ICONBOX:', searchIdx);
      const nextClose = text.indexOf('[/ICONBOX]', searchIdx);
      
      if (nextClose === -1) {
        break;
      }
      
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        searchIdx = nextOpen + 9;
      } else {
        depth--;
        if (depth === 0) {
          endIdx = nextClose + 10;
          break;
        }
        searchIdx = nextClose + 10;
      }
    }
    
    if (endIdx !== -1) {
      parts.push(text.slice(startIdx, endIdx));
      current = endIdx;
    } else {
      parts.push(text.slice(startIdx));
      break;
    }
  }
  return parts;
};

const MathText = ({ text, pdfPath }: { text: string, pdfPath?: string }) => {
  if (!text) return null;
  // Remove \color[rgb]{...} which appears in some raw math text
  const cleanText = text.replace(/\\color\[rgb\]\{[^}]+\}/g, '')
    // Fix nested overarc/overparen like \overarc{$MN$} -> \stackrel{\frown}{MN}
    .replace(/\\(?:overarc|overparen|wideparen)\{\$?([^{}$]+)\$?\}/g, '\\stackrel{\\frown}{$1}')
    // Remove □ character
    .replace(/□/g, '')
    // Remove "Solution for Problem X.X: " prefix
    .replace(/^Solution(?: for Problem [\d.]+)?:\s*/i, '');
  
  const iconboxParts = parseIconboxes(cleanText);

  return (
    <span>
      {iconboxParts.map((ibPart, ibIdx) => {
        if (ibPart.startsWith('[ICONBOX:') && ibPart.endsWith('[/ICONBOX]')) {
           const firstBracketEnd = ibPart.indexOf(']');
           if (firstBracketEnd !== -1) {
             const header = ibPart.slice(9, firstBracketEnd);
             const content = ibPart.slice(firstBracketEnd + 1, -10);
             const firstColon = header.indexOf(':');
             const iconType = firstColon !== -1 ? header.slice(0, firstColon) : header;
             const title = firstColon !== -1 ? header.slice(firstColon + 1) : '';
             
             const { IconComp, bgColor, borderColor, textColor, iconColor, displayTitle } = getIconboxConfig(iconType, title);

             const parsedContent = parseIconboxes(content);
             const mainTextParts = parsedContent.filter(p => !p.startsWith('[ICONBOX:'));
             const innerIconboxParts = parsedContent.filter(p => p.startsWith('[ICONBOX:'));

             return (
               <div key={ibIdx} className={`flex flex-col border ${borderColor} ${bgColor} my-4`}>
                 <div className="flex flex-row">
                   <div className="flex-shrink-0 w-36 py-4 px-2 flex flex-col items-center justify-start">
                     {displayTitle && <span className={`font-bold text-[15px] mb-2 text-center ${textColor}`}>{displayTitle}</span>}
                     {IconComp && <IconComp className={`w-7 h-7 ${iconColor}`} />}
                   </div>
                   <div className="text-gray-800 py-4 pr-4 w-full">
                     <MathText text={mainTextParts.join('').trim()} pdfPath={pdfPath} />
                   </div>
                 </div>
                 
                 {innerIconboxParts.map((innerPart, i) => {
                   const innerFirstBracketEnd = innerPart.indexOf(']');
                   if (innerFirstBracketEnd !== -1) {
                     const innerHeader = innerPart.slice(9, innerFirstBracketEnd);
                     const innerContent = innerPart.slice(innerFirstBracketEnd + 1, -10);
                     const innerFirstColon = innerHeader.indexOf(':');
                     const innerIconType = innerFirstColon !== -1 ? innerHeader.slice(0, innerFirstColon) : innerHeader;
                     const innerTitle = innerFirstColon !== -1 ? innerHeader.slice(innerFirstColon + 1) : '';
                     
                     const innerConfig = getIconboxConfig(innerIconType, innerTitle);
                     
                     return (
                       <div key={i} className="flex flex-row mb-4">
                         <div className="flex-shrink-0 w-36 py-0 px-2 flex flex-col items-center justify-start">
                           {innerConfig.displayTitle && <span className={`font-bold text-[15px] mb-2 text-center ${innerConfig.textColor}`}>{innerConfig.displayTitle}</span>}
                           {innerConfig.IconComp && <innerConfig.IconComp className={`w-7 h-7 ${innerConfig.iconColor}`} />}
                         </div>
                         <div className="text-gray-800 py-0 pr-4 w-full">
                           <MathText text={innerContent.trim()} pdfPath={pdfPath} />
                         </div>
                       </div>
                     );
                   }
                   return null;
                 })}
               </div>
             );
           }
        }
        
        // Splitting text by [IMAGE: ...] and math
        const imageParts = ibPart.split(/(\[IMAGE:\s*[^\]]+\])/g);

        return (
          <span key={ibIdx}>
            {imageParts.map((imgPart, i) => {
              if (imgPart.startsWith('[IMAGE:') && imgPart.endsWith(']')) {
                const imgRelPath = imgPart.slice(7, -1).trim();
                const imgSrc = pdfPath ? getImageUrl(pdfPath, imgRelPath) : '';
                return (
                  <div key={i} className="my-4 max-w-[80%] sm:max-w-[60%] mx-auto rounded shadow-sm border border-slate-200 p-3 bg-white flex justify-center">
                    <img 
                      src={imgSrc} 
                      alt="Problem graphic" 
                      crossOrigin="anonymous"
                      className="max-w-full h-auto block"
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        if (!img.src.toLowerCase().endsWith('.png')) return;
                        try {
                          const c = document.createElement('canvas');
                          c.width = img.naturalWidth; c.height = img.naturalHeight;
                          const ctx = c.getContext('2d');
                          if (!ctx) return;
                          ctx.drawImage(img, 0, 0);
                          const data = ctx.getImageData(0, 0, c.width, c.height).data;
                          let hasTransparent = false, isWhite = true;
                          for (let j = 0; j < data.length; j += 4) {
                            if (data[j+3] < 50) hasTransparent = true;
                            else if (data[j] < 200 || data[j+1] < 200 || data[j+2] < 200) {
                              isWhite = false; break;
                            }
                          }
                          if (hasTransparent && isWhite) img.classList.add('invert');
                        } catch (err) {}
                      }}
                    />
                  </div>
                );
              }
              
              // Extract math first to avoid '*' inside math breaking the formatting
              const mathBlocks: string[] = [];
              const textWithPlaceholders = imgPart.replace(/(\$\$.*?\$\$|\$.*?\$)/g, (match) => {
                mathBlocks.push(match);
                return `__MATH_${mathBlocks.length - 1}__`;
              });

              // We also need to handle cases where there are quotes around the asterisks, like *"..."* or *“...”*
              const styleParts = textWithPlaceholders.split(/(\*\*.*?\*\*|\*“.*?”\*|\*".*?"\*|\*.*?\*)/g);
              
              return (
                <span key={i}>
                  {styleParts.map((sPart, j) => {
                    if (!sPart) return null;
                    
                    let content = sPart;
                    let isBold = false;
                    let isItalic = false;
                    
                    if (sPart.startsWith('**') && sPart.endsWith('**')) {
                      isBold = true;
                      content = sPart.slice(2, -2);
                    } else if (sPart.startsWith('*“') && sPart.endsWith('”*')) {
                      isItalic = true;
                      content = `“${sPart.slice(2, -2)}”`;
                    } else if (sPart.startsWith('*"') && sPart.endsWith('"*')) {
                      isItalic = true;
                      content = `"${sPart.slice(2, -2)}"`;
                    } else if (sPart.startsWith('*') && sPart.endsWith('*')) {
                      isItalic = true;
                      content = sPart.slice(1, -1);
                    }
                    
                    const contentParts = content.split(/__MATH_(\d+)__/g);
                    
                    const renderedContent = contentParts.map((part, k) => {
                      if (k % 2 === 1) { // It's a math placeholder index
                        const mathIdx = parseInt(part, 10);
                        const mathStr = mathBlocks[mathIdx];
                        if (mathStr.startsWith('$$') && mathStr.endsWith('$$')) {
                          return <BlockMath key={k} math={mathStr.slice(2, -2)} errorColor={'#cc0000'} renderError={() => <span className="text-red-500 font-mono text-sm">{mathStr}</span>} />;
                        }
                        return <InlineMath key={k} math={mathStr.slice(1, -1)} errorColor={'#cc0000'} renderError={() => <span className="text-red-500 font-mono text-sm">{mathStr}</span>} />;
                      }
                      
                      return (
                        <span key={k}>
                          {part.split('\n').map((line, lIdx, arr) => (
                            <span key={lIdx}>
                              {line}
                              {lIdx < arr.length - 1 && <br />}
                            </span>
                          ))}
                        </span>
                      );
                    });

                    if (isBold) return <strong key={j}>{renderedContent}</strong>;
                    if (isItalic) return <em key={j}>{renderedContent}</em>;
                    return <span key={j}>{renderedContent}</span>;
                  })}
                </span>
              );
            })}
          </span>
        );
      })}
    </span>
  );
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error("Failed to convert file"));
      }
    };
    reader.onerror = error => reject(error);
  });
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const ProblemChat = ({ question, pdfPath, isParent }: { question: Question, pdfPath?: string, isParent?: boolean }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  if (isParent) return null;

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const questionContext = `
Question: ${question.text}
${question.options ? `Options: ${question.options.join(', ')}` : ''}
${question.answer ? `Expected Answer: ${question.answer}` : ''}
${question.solution ? `Solution: ${question.solution}` : ''}
${question.hints ? `Hints: ${question.hints.map(h => h.text).join(' ')}` : ''}
`;

    try {
      const res = await fetch(`${API_BASE}/chat_problem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_context: questionContext,
          messages: [...messages, userMsg]
        })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Error communicating with AI tutor.' }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Network error communicating with AI tutor.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 mt-4"
      >
        <MessageSquare className="w-4 h-4 mr-1" /> Discuss with AI Tutor
      </button>
    );
  }

  return (
    <div className="mt-4 border border-blue-200 rounded-lg overflow-hidden flex flex-col bg-white">
      <div className="bg-blue-50 px-4 py-2 border-b border-blue-200 flex justify-between items-center">
        <span className="font-semibold text-blue-800 flex items-center"><MessageSquare className="w-4 h-4 mr-2"/> AI Tutor</span>
        <button onClick={() => setIsOpen(false)} className="text-blue-600 hover:text-blue-800"><X className="w-4 h-4"/></button>
      </div>
      <div className="p-4 max-h-64 overflow-y-auto space-y-4 bg-gray-50/50">
        {messages.length === 0 ? (
          <div className="text-gray-500 text-sm text-center">Ask me anything about this problem!</div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg px-4 py-2 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                {msg.role === 'assistant' ? <MathText text={msg.content} pdfPath={pdfPath} /> : msg.content}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 text-gray-500 rounded-lg px-4 py-2 text-sm flex items-center">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> AI is thinking...
            </div>
          </div>
        )}
      </div>
      <div className="p-2 bg-white border-t border-gray-200 flex">
        <input 
          type="text" 
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Ask a question..."
          className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
        />
        <button 
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const App = () => {
  const [userEmail, setUserEmail] = useState<string>(() => localStorage.getItem('userEmail') || '');
  const [userRole, setUserRole] = useState<'parent' | 'student' | null>(() => (localStorage.getItem('userRole') as 'parent' | 'student') || null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => !!localStorage.getItem('userEmail') && !!localStorage.getItem('userRole'));
  
  // Auth state
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'verify'>('login');
  const [authPassword, setAuthPassword] = useState('');
  const [authParentEmail, setAuthParentEmail] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [generatedCourses, setGeneratedCourses] = useState<any[]>([]);
  const [courseTitle, setCourseTitle] = useState('AITutor Timeline');
  const [loading, setLoading] = useState(false);
  const [showCourseSelector, setShowCourseSelector] = useState(false);
  const [reminderModalTask, setReminderModalTask] = useState<Task | null>(null);
  const [reminderTime, setReminderTime] = useState<string>('');
  const [reminderLoading, setReminderLoading] = useState(false);
  const [showStudentSelector, setShowStudentSelector] = useState(false);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentEmail, setSelectedStudentEmail] = useState<string>('');

  // Modals state
  const [activeClassTask, setActiveClassTask] = useState<Task | null>(null);
  const [classQuestions, setClassQuestions] = useState<Question[]>([]);
  const [classContentFlow, setClassContentFlow] = useState<any[]>([]);
  const [classAnswers, setClassAnswers] = useState<Record<number, string>>({});
  const [classEvaluation, setClassEvaluation] = useState<Record<number, EvaluationResult>>({});
  const [classAttempts, setClassAttempts] = useState<Record<number, number>>({});
  const [classImages, setClassImages] = useState<Record<number, string>>({});
  const [showClassSolutions, setShowClassSolutions] = useState<Record<number, boolean>>({});
  const [classLoading, setClassLoading] = useState(false);
  const [evaluatingClass, setEvaluatingClass] = useState<Record<number, boolean>>({});
  const [classCurrentIndex, setClassCurrentIndex] = useState(0);

  const [activeHomeworkTask, setActiveHomeworkTask] = useState<Task | null>(null);
  const [homeworkQuestions, setHomeworkQuestions] = useState<Question[]>([]);
  const [homeworkAnswers, setHomeworkAnswers] = useState<Record<number, string>>({});
  const [homeworkEvaluations, setHomeworkEvaluations] = useState<Record<number, EvaluationResult>>({});
  const [homeworkAttempts, setHomeworkAttempts] = useState<Record<number, number>>({});
  const [homeworkImages, setHomeworkImages] = useState<Record<number, string>>({});
  const [showHomeworkSolutions, setShowHomeworkSolutions] = useState<Record<number, boolean>>({});
  const [homeworkLoading, setHomeworkLoading] = useState(false);
  const [evaluatingHomework, setEvaluatingHomework] = useState<Record<number, boolean>>({});
  const [homeworkCurrentIndex, setHomeworkCurrentIndex] = useState(0);

  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      const studentEmailQuery = userRole === 'parent' ? selectedStudentEmail : userEmail;
      const [tasksRes, coursesRes, availableCoursesRes] = await Promise.all([
        fetch(`${API_BASE}/tasks`), // Tasks are fetched all at once, then filtered by course
        fetch(`${API_BASE}/courses${studentEmailQuery ? `?student_email=${encodeURIComponent(studentEmailQuery)}` : ''}`),
        fetch(`${API_BASE}/available_courses`)
      ]);
      const tasksData = await tasksRes.json();
      const coursesData = await coursesRes.json();
      const availableCoursesData = await availableCoursesRes.json();
      
      setAllTasks(tasksData);
      setGeneratedCourses(coursesData);
      setAvailableCourses(availableCoursesData);
      
      if (availableCoursesData && availableCoursesData.length > 0 && !selectedCourseId) {
        setSelectedCourseId(availableCoursesData[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStudents = async () => {
    if (userRole === 'parent') {
      try {
        const res = await fetch(`${API_BASE}/students?parent_email=${encodeURIComponent(userEmail)}`);
        const data = await res.json();
        setStudents(data);
        if (data.length > 0 && !selectedStudentEmail) {
          setSelectedStudentEmail(data[0].email);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      if (userRole === 'parent') {
        fetchStudents();
      } else {
        fetchTasks();
      }
    }
  }, [isLoggedIn, userRole]);

  useEffect(() => {
    if (isLoggedIn && userRole === 'parent' && selectedStudentEmail) {
      fetchTasks();
    }
  }, [selectedStudentEmail]);

  useEffect(() => {
    if (!selectedCourseId || !availableCourses.length) {
      setTasks([]);
      setCourseTitle('AITutor Timeline');
      return;
    }
    
    const selectedAvailable = availableCourses.find(c => c.id === selectedCourseId);
    if (selectedAvailable) {
      setCourseTitle(selectedAvailable.title);
      const generated = generatedCourses.find(c => c.title === selectedAvailable.title);
      if (generated) {
        setTasks(allTasks.filter(t => t.course_id === generated.id));
      } else {
        setTasks([]);
      }
    }
  }, [selectedCourseId, allTasks, generatedCourses, availableCourses]);

  const handleParse = async () => {
    if (!selectedCourseId) {
      alert("Please select a course first.");
      return;
    }
    const studentEmailToUse = userRole === 'parent' ? selectedStudentEmail : userEmail;
    if (!studentEmailToUse) {
      alert("Please select a student first.");
      return;
    }
    
    const selectedCourse = availableCourses.find(c => c.id === selectedCourseId);
    if (!selectedCourse) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_file_path: selectedCourse.file_path,
          pdf_directory_path: selectedCourse.pdf_dir,
          student_email: studentEmailToUse
        })
      });
      if (res.ok) {
        await fetchTasks();
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.detail}`);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCourse = async () => {
    const generated = generatedCourses.find(c => c.title === courseTitle);
    if (!generated) return;
    
    if (!confirm(`Are you sure you want to clear the course "${courseTitle}" for student ${selectedStudentEmail}? All progress will be lost.`)) {
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE}/courses/${generated.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchTasks();
      } else {
        alert('Failed to clear course');
      }
    } catch (e) {
      console.error(e);
      alert('Network error');
    }
  };

  const handleDeleteAccount = async () => {
    const password = prompt("Please enter your password to confirm account deletion:");
    if (!password) return;

    if (!confirm("Are you ABSOLUTELY sure you want to delete your account? This action cannot be undone. If you are a parent, this will also delete all associated student accounts.")) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, password: password })
      });

      if (res.ok) {
        alert("Account deleted successfully.");
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userRole');
        setIsLoggedIn(false);
        setUserEmail('');
        setUserRole(null);
      } else {
        const errorData = await res.json();
        alert(`Failed to delete account: ${errorData.detail}`);
      }
    } catch (e) {
      console.error(e);
      alert("Network error while trying to delete account.");
    }
  };

  const toggleStatus = async (taskId: number, field: 'class_status' | 'homework_status', currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: newStatus, student_email: userEmail })
      });
      if (res.ok) {
        const updatedTask = await res.json();
        setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetReminder = async (action: 'set' | 'clear') => {
    if (!reminderModalTask) return;
    setReminderLoading(true);
    try {
      const payload = {
        student_email: userRole === 'parent' ? selectedStudentEmail : userEmail,
        reminder_time: action === 'clear' ? 'clear' : reminderTime
      };
      
      const res = await fetch(`${API_BASE}/tasks/${reminderModalTask.id}/reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setTasks(tasks.map(t => t.id === reminderModalTask.id ? { ...t, reminder_time: action === 'clear' ? null : reminderTime } : t));
        setReminderModalTask(null);
      } else {
        alert('Failed to update reminder');
      }
    } catch (e) {
      console.error(e);
      alert('Error updating reminder');
    } finally {
      setReminderLoading(false);
    }
  };

  const openClassContent = async (task: Task) => {
    setActiveClassTask(task);
    setClassLoading(true);
    setClassQuestions([]);
    setClassContentFlow([]);
    setClassCurrentIndex(0);
    
    // Load from saved data if available
    const savedData = task.class_data || { answers: {}, evaluations: {}, images: {}, attempts: {} };
    
    // Clean up buggy saved data (where empty answers were marked as correct due to previous bug)
    const cleanEvals = { ...(savedData.evaluations || {}) };
    const cleanAttempts = { ...(savedData.attempts || {}) };
    Object.keys(cleanEvals).forEach(key => {
      const idx = parseInt(key);
      const hasAnswer = (savedData.answers?.[idx] || '').trim() !== '';
      const hasImage = !!savedData.images?.[idx];
      if (!hasAnswer && !hasImage && cleanEvals[idx]?.correct) {
        delete cleanEvals[idx];
        delete cleanAttempts[idx];
      }
    });

    setClassAnswers(savedData.answers || {});
    setClassEvaluation(cleanEvals);
    setClassImages(savedData.images || {});
    setClassAttempts(cleanAttempts);
    setShowClassSolutions({});
    try {
      const isReviewOrChallenge = task.pdf_materials?.[0]?.endsWith('pr.pdf') || task.pdf_materials?.[0]?.endsWith('pc.pdf');
      
      const [questionsRes, contentRes] = await Promise.all([
        fetch(`${API_BASE}/tasks/${task.id}/generate_class_questions`, { method: 'POST' }),
        isReviewOrChallenge ? Promise.resolve({ ok: false, json: () => Promise.resolve([]) }) : fetch(`${API_BASE}/tasks/${task.id}/read_content`, { method: 'POST' })
      ]);
      
      let qData = [];
      let cData = [];
      
      if (questionsRes.ok) {
        qData = await questionsRes.json();
      }
      if (contentRes.ok) {
        cData = await contentRes.json();
      }
      
      if ((!Array.isArray(qData) || qData.length === 0) && (!Array.isArray(cData) || cData.length === 0)) {
         alert("No content or questions found for this section.");
         setActiveClassTask(null);
      } else {
         setClassQuestions(qData);
         setClassContentFlow(cData);
         // Initialize solutions to be shown by default for parents
         const initialShow: Record<number, boolean> = {};
         qData.forEach((_: any, i: number) => initialShow[i] = true);
         cData.forEach((item: any, i: number) => {
           if (item.type === 'problem') initialShow[i] = true;
         });
         setShowClassSolutions(initialShow);
      }
    } catch(e) {
      console.error(e);
      alert('Error fetching content');
      setActiveClassTask(null);
    } finally {
      setClassLoading(false);
    }
  };

  const submitSingleClassQuestion = async (idx: number) => {
    setEvaluatingClass(prev => ({ ...prev, [idx]: true }));
    const newEvals: Record<number, EvaluationResult> = { ...classEvaluation };
    let newAttempts = { ...classAttempts };

    const q = classQuestions[idx];
    const userAns = classAnswers[idx] || '';

    if (q.type === 'mcq') {
      const isCorrect = userAns === q.answer;
      newEvals[idx] = { correct: isCorrect };
      if (!isCorrect) newAttempts[idx] = (newAttempts[idx] || 0) + 1;
    } else {
      try {
        const res = await fetch(`${API_BASE}/evaluate_answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q.text, user_answer: userAns, expected_answer: q.answer, solution: q.solution, image: classImages[idx] || null })
        });
        if (res.ok) {
          const evalResult = await res.json();
          newEvals[idx] = evalResult;
          if (!evalResult.correct) newAttempts[idx] = (newAttempts[idx] || 0) + 1;
        } else {
          console.error('Failed to evaluate answer:', await res.text());
          newEvals[idx] = { correct: false };
          newAttempts[idx] = (newAttempts[idx] || 0) + 1;
        }
      } catch (e) {
        console.error(e);
        newEvals[idx] = { correct: false };
        newAttempts[idx] = (newAttempts[idx] || 0) + 1;
      }
    }

    setClassEvaluation(newEvals);
    setClassAttempts(newAttempts);
    setEvaluatingClass(prev => ({ ...prev, [idx]: false }));

    if (activeClassTask) {
      // isAllDoneNow should check if EVERY question in classQuestions has EITHER correct eval OR >= 2 attempts
      // We need to use newEvals and newAttempts which contain the state AFTER this submission
      const isAllDoneNow = classQuestions.every((_, i) => {
        // If it's the current question, use the new state
        if (i === idx) {
           return newEvals[i]?.correct || newAttempts[i] >= 2;
        }
        // Otherwise, use the new state (which copied the old state for other questions)
        return newEvals[i]?.correct || newAttempts[i] >= 2;
      });
      
      const classData = { answers: classAnswers, evaluations: newEvals, images: classImages, attempts: newAttempts };
      
      try {
        const payload: any = { class_data: classData, student_email: userEmail };
        if (isAllDoneNow) payload.class_status = 'completed';
        
        const res = await fetch(`${API_BASE}/tasks/${activeClassTask.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (res.ok) {
          const updatedTask = await res.json();
          setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
          setActiveClassTask(updatedTask);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const openHomework = async (task: Task) => {
    setActiveHomeworkTask(task);
    setHomeworkLoading(true);
      setHomeworkQuestions([]);
      setHomeworkCurrentIndex(0);
    
    // Load from saved data if available
    const savedData = task.homework_data || { answers: {}, evaluations: {}, images: {}, attempts: {} };
    
    setHomeworkAnswers(savedData.answers || {});
    setHomeworkImages(savedData.images || {});
    
    try {
      const resQuestions = await fetch(`${API_BASE}/tasks/${task.id}/extract_homework`, { method: 'POST' });
      
      if (resQuestions.ok) {
        const data = await resQuestions.json();
        if (!Array.isArray(data) || data.length === 0) {
            // Requirement 2: If no exercises found, do not show in web, mark as completed directly.
            await toggleStatus(task.id, 'homework_status', 'pending'); // Set to completed
            setActiveHomeworkTask(null);
        } else {
            setHomeworkQuestions(data);
            
            // Clean up buggy saved data (where empty answers were marked as correct due to previous bug)
            const cleanEvals = { ...(savedData.evaluations || {}) };
            const cleanAttempts = { ...(savedData.attempts || {}) };
            Object.keys(cleanEvals).forEach(key => {
              const idx = parseInt(key);
              const hasAnswer = (savedData.answers?.[idx] || '').trim() !== '';
              const hasImage = !!savedData.images?.[idx];
              if (!hasAnswer && !hasImage && cleanEvals[idx]?.correct) {
                delete cleanEvals[idx];
                delete cleanAttempts[idx];
              }
            });
            setHomeworkEvaluations(cleanEvals);
            setHomeworkAttempts(cleanAttempts);
            
            // Initialize solutions to be shown by default for parents
            const initialShow: Record<number, boolean> = {};
            data.forEach((_: any, i: number) => initialShow[i] = true);
            setShowHomeworkSolutions(initialShow);
        }
      } else {
        const errorData = await resQuestions.json().catch(() => ({}));
        alert(`Failed to extract homework: ${errorData.detail || 'Unknown error'}`);
        setActiveHomeworkTask(null);
      }
    } catch(e) {
      console.error(e);
      alert('Error fetching homework');
      setActiveHomeworkTask(null);
    } finally {
      setHomeworkLoading(false);
    }
  };

  const submitSingleHomeworkQuestion = async (idx: number) => {
    setEvaluatingHomework(prev => ({ ...prev, [idx]: true }));
    const newEvals: Record<number, EvaluationResult> = { ...homeworkEvaluations };
    let newAttempts = { ...homeworkAttempts };

    const q = homeworkQuestions[idx];
    const userAns = homeworkAnswers[idx] || '';

    if (q.type === 'mcq') {
      const isCorrect = userAns === q.answer;
      newEvals[idx] = { correct: isCorrect };
      if (!isCorrect) newAttempts[idx] = (newAttempts[idx] || 0) + 1;
    } else {
      try {
        const res = await fetch(`${API_BASE}/evaluate_answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q.text, user_answer: userAns, expected_answer: q.answer, solution: q.solution, image: homeworkImages[idx] || null })
        });
        if (res.ok) {
          const evalResult = await res.json();
          newEvals[idx] = evalResult;
          if (!evalResult.correct) newAttempts[idx] = (newAttempts[idx] || 0) + 1;
        } else {
          console.error('Failed to evaluate answer:', await res.text());
          newEvals[idx] = { correct: false };
          newAttempts[idx] = (newAttempts[idx] || 0) + 1;
        }
      } catch (e) {
        console.error(e);
        newEvals[idx] = { correct: false };
        newAttempts[idx] = (newAttempts[idx] || 0) + 1;
      }
    }

    setHomeworkEvaluations(newEvals);
    setHomeworkAttempts(newAttempts);
    setEvaluatingHomework(prev => ({ ...prev, [idx]: false }));

    if (activeHomeworkTask) {
      const isAllDoneNow = homeworkQuestions.every((_, i) => {
        if (i === idx) {
           return newEvals[i]?.correct || newAttempts[i] >= 2;
        }
        return newEvals[i]?.correct || newAttempts[i] >= 2;
      });
      const classData = { answers: homeworkAnswers, evaluations: newEvals, images: homeworkImages, attempts: newAttempts };
      
      try {
        const payload: any = { homework_data: classData, student_email: userEmail };
        if (isAllDoneNow) payload.homework_status = 'completed';
        
        const res = await fetch(`${API_BASE}/tasks/${activeHomeworkTask.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (res.ok) {
          const updatedTask = await res.json();
          setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
          setActiveHomeworkTask(updatedTask);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const validTasks = tasks.filter(t => t.class_status !== 'na' || t.homework_status !== 'na');
  const completedDays = validTasks.filter(t => 
    (t.class_status === 'completed' || t.class_status === 'na') && 
    (t.homework_status === 'completed' || t.homework_status === 'na')
  ).length;
  const totalDays = validTasks.length;
  const progress = totalDays === 0 ? 0 : Math.round((completedDays / totalDays) * 100);

  if (!isLoggedIn) {
    const handleAuthSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthError('');
      setAuthLoading(true);

      try {
        if (authMode === 'register') {
          if (!userRole) {
            setAuthError('Please select a role (Parent or Student)');
            setAuthLoading(false);
            return;
          }
          if (userRole === 'student' && !authParentEmail.trim()) {
            setAuthError('Students must provide a parent email address');
            setAuthLoading(false);
            return;
          }
          const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              email: userEmail.trim(), 
              password: authPassword, 
              role: userRole,
              parent_email: userRole === 'student' ? authParentEmail.trim() : null
            })
          });
          const data = await res.json();
          if (res.ok) {
            setAuthMode('verify');
          } else {
            setAuthError(data.detail || 'Registration failed');
          }
        } else if (authMode === 'verify') {
          const res = await fetch(`${API_BASE}/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail.trim(), code: authCode })
          });
          const data = await res.json();
          if (res.ok) {
            alert('Account activated successfully! Please log in.');
            setAuthMode('login');
            setAuthPassword('');
            setAuthCode('');
          } else {
            setAuthError(data.detail || 'Verification failed');
          }
        } else if (authMode === 'login') {
          const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail.trim(), password: authPassword })
          });
          const data = await res.json();
          if (res.ok) {
            localStorage.setItem('userEmail', data.email);
            localStorage.setItem('userRole', data.role);
            setUserRole(data.role as 'parent' | 'student');
            setIsLoggedIn(true);
          } else {
            setAuthError(data.detail || 'Login failed');
          }
        }
      } catch (err) {
        setAuthError('Network error. Please try again.');
      } finally {
        setAuthLoading(false);
      }
    };

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {authMode === 'login' ? 'Sign in to AITutor' : authMode === 'register' ? 'Create an Account' : 'Verify Email'}
            </h2>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleAuthSubmit}>
            {authError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm border border-red-200">
                {authError}
              </div>
            )}
            
            {authMode === 'register' && (
              <div className="flex justify-center gap-8 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="role" value="student" checked={userRole === 'student'} onChange={() => setUserRole('student')} className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-900 font-medium">Student</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="role" value="parent" checked={userRole === 'parent'} onChange={() => setUserRole('parent')} className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-900 font-medium">Parent</span>
                </label>
              </div>
            )}

            <div className="rounded-md shadow-sm space-y-3">
              {(authMode === 'login' || authMode === 'register') && (
                <>
                  <div>
                    <label htmlFor="email-address" className="sr-only">Email address</label>
                    <input
                      id="email-address"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                      placeholder="Email address"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="sr-only">Password</label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                      placeholder="Password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                    />
                  </div>
                  {authMode === 'register' && userRole === 'student' && (
                    <div>
                      <label htmlFor="parent-email" className="sr-only">Parent Email</label>
                      <input
                        id="parent-email"
                        name="parent_email"
                        type="email"
                        required
                        className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                        placeholder="Parent's Email Address"
                        value={authParentEmail}
                        onChange={(e) => setAuthParentEmail(e.target.value)}
                      />
                    </div>
                  )}
                </>
              )}

              {authMode === 'verify' && (
                <div>
                  <p className="text-sm text-gray-600 mb-3 text-center">We sent a 6-digit code to <strong>{userEmail}</strong></p>
                  <label htmlFor="code" className="sr-only">Verification Code</label>
                  <input
                    id="code"
                    name="code"
                    type="text"
                    required
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm text-center tracking-widest text-lg"
                    placeholder="000000"
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={authLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : authMode === 'login' ? 'Sign in' : authMode === 'register' ? 'Register' : 'Verify & Activate'}
              </button>
            </div>
            
            <div className="text-center text-sm">
              {authMode === 'login' ? (
                <p className="text-gray-600">Don't have an account? <button type="button" onClick={() => {setAuthMode('register'); setAuthError('');}} className="text-blue-600 hover:underline">Register here</button></p>
              ) : authMode === 'register' ? (
                <p className="text-gray-600">Already have an account? <button type="button" onClick={() => {setAuthMode('login'); setAuthError('');}} className="text-blue-600 hover:underline">Sign in</button></p>
              ) : (
                <p className="text-gray-600"><button type="button" onClick={() => {setAuthMode('register'); setAuthError('');}} className="text-blue-600 hover:underline">Back to registration</button></p>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  }

  const isParent = userRole === 'parent';

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-indigo-50 to-fuchsia-50 py-6 sm:py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Header & Progress */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200/60 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-blue-500 to-sky-400"></div>
          
          {/* Top Row: Title & Account Actions */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
            <div className="flex items-start gap-4 flex-1 pr-4">
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowCourseSelector(true)}
                  className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center shrink-0 mt-1 hover:bg-indigo-200 transition-colors cursor-pointer"
                  title="Select Course"
                >
                  <BookOpen className="w-6 h-6 text-indigo-600" />
                </button>
                {isParent && students.length > 0 && (
                  <button 
                    onClick={() => setShowStudentSelector(true)}
                    className="w-12 h-12 bg-fuchsia-100 rounded-2xl flex items-center justify-center shrink-0 mt-1 hover:bg-fuchsia-200 transition-colors cursor-pointer"
                    title="Select Student"
                  >
                    <Users className="w-6 h-6 text-fuchsia-600" />
                  </button>
                )}
              </div>
              <div className="flex flex-col pt-1 w-full overflow-hidden">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight pb-1 pr-2 break-words">{courseTitle}</h1>
                {isParent && selectedStudentEmail && (
                  <span className="text-sm font-medium text-slate-500 mt-1">Student: {selectedStudentEmail}</span>
                )}
              </div>
            </div>

            {/* Account Actions */}
            <div className="flex items-center gap-2 shrink-0 self-end md:self-start">
              {isParent && (
                <button 
                  onClick={handleParse}
                  disabled={loading || !selectedCourseId || !selectedStudentEmail}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-2 rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                  {loading ? 'Generating...' : 'Generate Timeline'}
                </button>
              )}
              {isParent && generatedCourses.find(c => c.title === courseTitle) && (
                <button 
                  onClick={handleClearCourse}
                  className="text-rose-600 bg-rose-50 hover:bg-rose-100 text-sm font-medium px-3 py-2 rounded-xl transition-colors flex items-center shadow-sm"
                  title="Clear Course"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" /> Clear Course
                </button>
              )}
              <button 
                onClick={() => {
                  localStorage.removeItem('userEmail');
                  localStorage.removeItem('userRole');
                  setIsLoggedIn(false);
                  setUserEmail('');
                  setUserRole(null);
                }}
                className="text-slate-500 hover:text-slate-700 text-sm font-medium px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors flex items-center"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
              <button 
                onClick={handleDeleteAccount}
                className="text-red-500 hover:text-red-700 text-sm font-medium px-3 py-2 rounded-xl hover:bg-red-50 transition-colors flex items-center"
                title="Delete Account"
              >
                <UserX className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm font-semibold text-slate-700">
              <span className="flex items-center">Overall Progress</span>
              <span className="bg-slate-50 px-3 py-1 rounded-full border border-slate-200 shadow-sm">{completedDays} / {totalDays} Tasks ({progress}%)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
              <div className="bg-gradient-to-r from-indigo-500 to-blue-500 h-3 rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        </div>

        {/* Timeline Section */}
        <div className="space-y-8">
          {(() => {
            const chapters: {name: string, tasks: Task[]}[] = [];
            let currentChapter: string | null = null;
            let currentTasks: Task[] = [];
            tasks.forEach(task => {
              const chapName = task.chapter || "Chapter";
              if (chapName !== currentChapter) {
                if (currentChapter !== null) {
                  chapters.push({ name: currentChapter, tasks: currentTasks });
                }
                currentChapter = chapName;
                currentTasks = [task];
              } else {
                currentTasks.push(task);
              }
            });
            if (currentChapter !== null) {
              chapters.push({ name: currentChapter, tasks: currentTasks });
            }

            if (chapters.length === 0) return null;

            // Default to the first chapter if none is selected
            const activeChapterName = expandedChapter || chapters[0].name;
            const activeChapter = chapters.find(c => c.name === activeChapterName) || chapters[0];

            return (
              <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                {/* Chapter Tabs (Sidebar on Desktop, Horizontal Scroll on Mobile) */}
                <div className="md:w-1/3 lg:w-1/4 shrink-0">
                  <div className="sticky top-6 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-4 md:pb-0 hide-scrollbar">
                    {chapters.map((chap, cIdx) => {
                      const isActive = chap.name === activeChapterName;
                      const completedTasks = chap.tasks.filter(t => 
                        (t.class_status === 'completed' || t.class_status === 'na') && 
                        (t.homework_status === 'completed' || t.homework_status === 'na')
                      ).length;
                      const isAllCompleted = completedTasks === chap.tasks.length && chap.tasks.length > 0;
                      const chapterProgress = chap.tasks.length > 0 ? Math.round((completedTasks / chap.tasks.length) * 100) : 0;
                      
                      return (
                        <button
                          key={cIdx}
                          onClick={() => setExpandedChapter(chap.name)}
                          className={`text-left px-5 py-4 rounded-2xl transition-all duration-300 flex-shrink-0 md:flex-shrink flex flex-col gap-1 border ${
                            isActive 
                              ? 'bg-indigo-600 text-white shadow-md border-indigo-600' 
                              : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200 hover:border-indigo-200'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>Chapter {cIdx + 1}</span>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-500'}`}>{completedTasks}/{chap.tasks.length}</span>
                              {isAllCompleted && <CheckCircle2 className={`w-4 h-4 ${isActive ? 'text-emerald-300' : 'text-emerald-500'}`} />}
                            </div>
                          </div>
                          <span className={`font-semibold text-sm sm:text-base line-clamp-2 ${isActive ? 'text-white' : 'text-slate-800'}`}>{chap.name.replace(/^\d+[\.\s]*/, '')}</span>
                          <div className="mt-2 w-full bg-black/10 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-indigo-500'}`} 
                              style={{ width: `${chapterProgress}%` }}
                            ></div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Chapter Content */}
                <div className="md:w-2/3 lg:w-3/4">
                  <div className="mb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center">
                      {activeChapter.name.replace(/^\d+[\.\s]*/, '')}
                    </h2>
                  </div>
                  
                  <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                    {activeChapter.tasks.map((task) => {
                      const firstPdf = task.pdf_materials?.[0] || '';
                      const isReview = firstPdf.endsWith('pr.pdf');
                      const isChallenge = firstPdf.endsWith('pc.pdf');
                      
                      let classContentTitle = "Problems";
                      if (isReview) {
                        classContentTitle = "Review Problems";
                      } else if (isChallenge) {
                        classContentTitle = "Challenge Problems";
                      }

                      return (
                        <div key={task.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 bg-indigo-100 text-indigo-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                            <span className="font-bold text-sm">{task.day_number}</span>
                          </div>
                          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                              <div className="flex items-center flex-wrap gap-3">
                                <h3 className="text-lg font-bold text-slate-800 leading-tight">{task.topic.replace(/^Chapter\s+\d+\s*/i, '')}</h3>
                                  {task.pdf_materials && task.pdf_materials.length > 0 && (
                                    <a 
                                      href={`${API_BASE}/files/${encodeURIComponent(task.pdf_materials[0])}`}
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-black transition-colors"
                                    >
                                      <FileText className="w-3.5 h-3.5 mr-1" /> PDF
                                    </a>
                                  )}
                                  {!isParent && (
                                    <button
                                      onClick={() => {
                                        setReminderModalTask(task);
                                        setReminderTime(task.reminder_time || '');
                                      }}
                                      className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${task.reminder_time ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                      title={task.reminder_time ? "Edit Reminder" : "Add Reminder"}
                                    >
                                      <Calendar className="w-3.5 h-3.5 mr-1" /> {task.reminder_time ? "Reminder Set" : "Reminder"}
                                    </button>
                                  )}
                                </div>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                              {task.class_status !== 'na' && (
                                <button 
                                  onClick={() => openClassContent(task)}
                                  className={`flex-1 flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${task.class_status === 'completed' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'}`}
                                >
                                  {task.class_status === 'completed' ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <BookOpen className="w-4 h-4 mr-2" />}
                                  {isReview || isChallenge ? classContentTitle : (task.has_problems ? 'Study & Problems' : 'Study')}
                                </button>
                              )}
                              {!isReview && !isChallenge && task.homework_status !== 'na' && (
                                <button 
                                  onClick={() => openHomework(task)}
                                  className={`flex-1 flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${task.homework_status === 'completed' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'}`}
                                >
                                  {task.homework_status === 'completed' ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Pencil className="w-4 h-4 mr-2" />}
                                  Exercises
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
          {tasks.length === 0 && !loading && (
            <div className="text-center py-16 text-slate-500 bg-white rounded-3xl border border-slate-200 border-dashed">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-lg font-medium text-slate-600">No tasks generated yet</p>
              <p className="text-sm mt-1">Select a course and click "Generate Timeline" to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* Reminder Modal */}
      {reminderModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-indigo-600" />
                Set Reminder
              </h2>
              <button onClick={() => setReminderModalTask(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">Set a Google Calendar reminder for <strong>{reminderModalTask.topic}</strong>. We will send an invite to your email.</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Reminder Date & Time</label>
                <input 
                  type="datetime-local" 
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                />
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3">
              {reminderModalTask.reminder_time && (
                <button
                  onClick={() => handleSetReminder('clear')}
                  disabled={reminderLoading}
                  className="px-4 py-2 text-sm font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors disabled:opacity-50"
                >
                  {reminderLoading ? 'Clearing...' : 'Clear Reminder'}
                </button>
              )}
              <button
                onClick={() => handleSetReminder('set')}
                disabled={reminderLoading || !reminderTime}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reminderLoading ? 'Saving...' : 'Save Reminder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Selection Modal */}
      {showCourseSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-indigo-600" />
                Select Course
              </h2>
              <button onClick={() => setShowCourseSelector(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
              {availableCourses.length === 0 ? (
                <p className="text-center text-slate-500 py-4">No courses available.</p>
              ) : (
                availableCourses.map(course => (
                  <button
                    key={course.id}
                    onClick={() => {
                      setSelectedCourseId(course.id);
                      setShowCourseSelector(false);
                    }}
                    className={`w-full text-left px-5 py-4 rounded-xl transition-all flex items-center justify-between group ${selectedCourseId === course.id ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200 shadow-sm' : 'hover:bg-slate-50 text-slate-700 border border-transparent hover:border-slate-200'}`}
                  >
                    <span className="line-clamp-2 pr-4">{course.title}</span>
                    {selectedCourseId === course.id && <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Student Selection Modal */}
      {showStudentSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 flex items-center">
                <Users className="w-5 h-5 mr-2 text-fuchsia-600" />
                Select Student
              </h2>
              <button onClick={() => setShowStudentSelector(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
              {students.length === 0 ? (
                <p className="text-center text-slate-500 py-4">No students available.</p>
              ) : (
                students.map(s => (
                  <button
                    key={s.email}
                    onClick={() => {
                      setSelectedStudentEmail(s.email);
                      setShowStudentSelector(false);
                    }}
                    className={`w-full text-left px-5 py-4 rounded-xl transition-all flex items-center justify-between group ${selectedStudentEmail === s.email ? 'bg-fuchsia-50 text-fuchsia-700 font-semibold border border-fuchsia-200 shadow-sm' : 'hover:bg-slate-50 text-slate-700 border border-transparent hover:border-slate-200'}`}
                  >
                    <span className="line-clamp-2 pr-4">{s.email}</span>
                    {selectedStudentEmail === s.email && <CheckCircle2 className="w-5 h-5 text-fuchsia-600 shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Class Content Modal */}
      {activeClassTask && (() => {
        const isTaskCompleted = activeClassTask.class_status === 'completed';

        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white sm:rounded-3xl shadow-2xl w-full h-full sm:h-auto max-w-5xl sm:max-h-[90vh] flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-blue-500"></div>
            <button 
              onClick={() => setActiveClassTask(null)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-2xl font-bold text-slate-900 pr-12">{activeClassTask.topic.replace(/^Chapter\s+\d+\s*/i, '')}</h2>
            </div>
            <div className="p-6 sm:p-8 overflow-y-auto flex-grow space-y-8 bg-slate-50/30">
              {classLoading && classQuestions.length === 0 && classContentFlow.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
                  <p className="text-lg font-medium">Loading content...</p>
                </div>
              ) : (
                <div className="space-y-6 max-w-4xl mx-auto">
                  {classContentFlow.length > 0 ? (
                    classContentFlow.map((item, flowIdx) => {
                      if (item.type === 'paragraph') {
                        return <p key={flowIdx} className="text-slate-800 text-lg leading-relaxed"><MathText text={item.text} pdfPath={activeClassTask.pdf_materials?.[0]} /></p>;
                      } else if (item.type === 'summary') {
                        return (
                          <div key={flowIdx} className="bg-amber-50 border-l-4 border-amber-400 p-5 rounded-r-xl text-slate-800 shadow-sm">
                            <MathText text={item.text} pdfPath={activeClassTask.pdf_materials?.[0]} />
                          </div>
                        );
                      } else if (item.type === 'image_block') {
                        return <div key={flowIdx} className="my-6"><MathText text={item.text} pdfPath={activeClassTask.pdf_materials?.[0]} /></div>;
                      } else if (item.type === 'iconbox') {
                        return <MathText key={flowIdx} text={`[ICONBOX:${item.iconType}:${item.title || ''}]\n${item.text}\n[/ICONBOX]`} pdfPath={activeClassTask.pdf_materials?.[0]} />;
                      } else if (item.type === 'problem_box') {
                        // Find matching question
                        const qIdx = classQuestions.findIndex(q => q.number === item.number);
                        if (qIdx === -1) {
                           // If problem not found in parsed questions, just show a placeholder
                           return (
                             <div key={flowIdx} className="bg-slate-100 p-5 rounded-xl text-center text-slate-500 border border-slate-200 border-dashed">
                               {item.number} (Interactive element not available)
                             </div>
                           );
                        }
                        const q = classQuestions[qIdx];
                        const idx = qIdx; // mapping index for answers and evaluation
                        return (
                          <div key={flowIdx} className="space-y-4 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm my-10">
                            <div className="flex justify-between items-start mb-4">
                              <p className="font-medium text-slate-800 text-lg leading-relaxed"><span className="text-indigo-600 font-bold mr-3 bg-indigo-50 px-2 py-1 rounded-lg">{q.number || (idx + 1) + '.'}</span><MathText text={q.text} pdfPath={activeClassTask.pdf_materials?.[0]} /></p>
                              {isParent && (q.solution || q.answer) && (
                                <button
                                  onClick={() => setShowClassSolutions(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                  className="flex-shrink-0 ml-4 text-sm font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                  {showClassSolutions[idx] ? 'Hide Solution' : 'Show Solution'}
                                </button>
                              )}
                            </div>

                            {isParent && (q.solution || q.answer) && showClassSolutions[idx] && (
                              <div className="p-5 bg-indigo-50/50 rounded-xl border border-indigo-100 text-sm text-slate-800 mb-6">
                                <h4 className="font-bold text-indigo-800 mb-3 flex items-center"><BookOpen className="w-4 h-4 mr-2" /> Solution:</h4>
                                {q.answer && (
                                  <div className="mb-3 bg-white p-4 rounded-lg shadow-sm border border-slate-100"><strong>Answer:</strong> <MathText text={q.answer} pdfPath={activeClassTask.pdf_materials?.[0]} /></div>
                                )}
                                {q.solution && (
                                  <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100"><MathText text={q.solution} pdfPath={activeClassTask.pdf_materials?.[0]} /></div>
                                )}
                              </div>
                            )}
                            
                            {q.type === 'mcq' && q.options ? (
                              <div className="space-y-3 mt-4">
                                {q.options.map((opt, optIdx) => (
                                  <label key={optIdx} className="flex items-center space-x-4 p-4 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-all">
                                    <input 
                                      type="radio" 
                                      name={`class_q_${idx}`}
                                      value={opt}
                                      checked={classAnswers[idx] === opt}
                                      onChange={(e) => setClassAnswers({...classAnswers, [idx]: e.target.value})}
                                      disabled={isParent || isTaskCompleted || classEvaluation[idx]?.correct || classAttempts[idx] >= 2}
                                      className="w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-500 disabled:opacity-50"
                                    />
                                    <span className="text-slate-700 font-medium"><MathText text={opt} pdfPath={activeClassTask.pdf_materials?.[0]} /></span>
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <div className="space-y-3 mt-4">
                                <textarea
                                  value={classAnswers[idx] || ''}
                                  onChange={(e) => setClassAnswers({...classAnswers, [idx]: e.target.value})}
                                  disabled={isParent || isTaskCompleted || classEvaluation[idx]?.correct || classAttempts[idx] >= 2}
                                  className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-slate-100 disabled:text-slate-500 transition-shadow"
                                  rows={5}
                                  placeholder={isParent ? "Student's answer will appear here..." : "Type your answer here..."}
                                />
                                <div className="flex items-center gap-4">
                                  {!(isParent || isTaskCompleted || classEvaluation[idx]?.correct || classAttempts[idx] >= 2) && (
                                  <label className="cursor-pointer flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-700 rounded-lg transition-colors">
                                    <ImageIcon className="w-4 h-4 mr-2 text-slate-500" />
                                    Upload Work (Image)
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      className="hidden" 
                                      onChange={async (e) => {
                                        if (e.target.files && e.target.files[0]) {
                                          try {
                                            const base64 = await fileToBase64(e.target.files[0]);
                                            setClassImages(prev => ({...prev, [idx]: base64}));
                                          } catch(err) {
                                            console.error(err);
                                            alert("Failed to load image.");
                                          }
                                        }
                                      }} 
                                    />
                                  </label>
                                  )}
                                  {classImages[idx] && (
                                    <div className="relative mt-2">
                                      <img src={`data:image/jpeg;base64,${classImages[idx]}`} alt="uploaded" className="h-20 rounded-lg border border-slate-200 shadow-sm" />
                                      {!(isParent || isTaskCompleted || classEvaluation[idx]?.correct || classAttempts[idx] >= 2) && (
                                      <button 
                                        onClick={() => setClassImages(prev => {const newImgs={...prev}; delete newImgs[idx]; return newImgs;})} 
                                        className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 hover:bg-rose-600 shadow-sm transition-colors"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {classEvaluation[idx] && (
                              <div className={`mt-3 p-4 rounded-xl text-sm font-semibold flex items-center ${classEvaluation[idx].correct ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                {classEvaluation[idx].correct ? <CheckCircle2 className="w-5 h-5 mr-2" /> : <AlertCircle className="w-5 h-5 mr-2" />}
                                {classEvaluation[idx].correct ? 'Correct!' : 'Incorrect.'}
                              </div>
                            )}

                            {(!isParent && (classEvaluation[idx]?.correct || (classAttempts[idx] >= 2 && !classEvaluation[idx]?.correct))) && (
                              <div className={`mt-4 p-5 border rounded-xl text-sm text-slate-800 ${classEvaluation[idx]?.correct ? 'bg-emerald-50/50 border-emerald-100' : 'bg-indigo-50/50 border-indigo-100'}`}>
                                <h4 className={`font-bold mb-3 flex items-center ${classEvaluation[idx]?.correct ? 'text-emerald-800' : 'text-indigo-800'}`}>
                                  <BookOpen className="w-4 h-4 mr-2" /> Correct Answer / Solution:
                                </h4>
                                {q.answer && (
                                  <div className="mb-3 bg-white p-3 rounded-lg border border-slate-100 shadow-sm"><strong>Answer:</strong> <MathText text={q.answer} pdfPath={activeClassTask.pdf_materials?.[0]} /></div>
                                )}
                                  {q.solution && (
                                    <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm"><MathText text={q.solution} pdfPath={activeClassTask.pdf_materials?.[0]} /></div>
                                  )}
                                {!q.answer && !q.solution && (
                                  <div className="text-slate-500 italic">No official solution provided for this question.</div>
                                )}
                              </div>
                            )}

                            {!(isParent || isTaskCompleted || classEvaluation[idx]?.correct || classAttempts[idx] >= 2) && (
                              <div className="mt-6 flex justify-end">
                                <button 
                                  onClick={() => submitSingleClassQuestion(idx)}
                                  disabled={evaluatingClass[idx] || (!(classAnswers[idx] || '').trim() && !classImages[idx])}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {evaluatingClass[idx] && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                  {evaluatingClass[idx] ? 'Evaluating...' : 'Submit Answer'}
                                </button>
                              </div>
                            )}
                            
                            <div className="mt-6 border-t border-slate-100 pt-4">
                              <ProblemChat key={`class-chat-${idx}`} question={q} pdfPath={activeClassTask.pdf_materials?.[0]} isParent={isParent} />
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })
                  ) : (
                    <>
                      {/* Pagination Bar */}
                      <div className="flex flex-wrap gap-2 mb-8">
                        {classQuestions.map((_, idx) => {
                          let bgColor = "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200";
                          if (idx === classCurrentIndex) bgColor = "bg-indigo-600 text-white shadow-md ring-4 ring-indigo-100 border-indigo-600";
                          else if (classEvaluation[idx]?.correct) bgColor = "bg-emerald-500 text-white border-emerald-500 shadow-sm";
                          else if (classEvaluation[idx] && !classEvaluation[idx].correct) bgColor = "bg-rose-500 text-white border-rose-500 shadow-sm";
                          else if (classAnswers[idx] || classImages[idx]) bgColor = "bg-indigo-300 text-white border-indigo-300 shadow-sm";
                          
                          return (
                            <button
                              key={idx}
                              onClick={() => setClassCurrentIndex(idx)}
                              className={`w-11 h-11 rounded-xl font-bold flex items-center justify-center transition-all duration-200 ${bgColor}`}
                            >
                              {idx + 1}
                            </button>
                          );
                        })}
                      </div>

                      {classQuestions.map((q, idx) => {
                        if (idx !== classCurrentIndex) return null;
                        return (
                        <div key={idx} className="space-y-4 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                          <p className="font-medium text-slate-800 text-lg leading-relaxed"><span className="text-indigo-600 font-bold mr-3 bg-indigo-50 px-2 py-1 rounded-lg">{q.number || (idx + 1) + '.'}</span><MathText text={q.text} pdfPath={activeClassTask.pdf_materials?.[0]} /></p>
                          {q.solution && (
                            <button
                              onClick={() => setShowClassSolutions(prev => ({ ...prev, [idx]: !prev[idx] }))}
                              className="flex-shrink-0 ml-4 text-sm font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              {showClassSolutions[idx] ? 'Hide Solution' : 'Show Solution'}
                            </button>
                          )}
                        </div>
                        
                          {q.solution && showClassSolutions[idx] && (
                              <div className="p-5 bg-indigo-50/50 rounded-xl border border-indigo-100 text-sm text-slate-800 mb-6">
                                <h4 className="font-bold text-indigo-800 mb-3 flex items-center"><BookOpen className="w-4 h-4 mr-2" /> Solution:</h4>
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100"><MathText text={q.solution} pdfPath={activeClassTask.pdf_materials?.[0]} /></div>
                              </div>
                            )}
                        
                        {q.type === 'mcq' && q.options ? (
                          <div className="space-y-3 mt-4">
                            {q.options.map((opt, optIdx) => (
                              <label key={optIdx} className="flex items-center space-x-4 p-4 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-all">
                                <input 
                                  type="radio" 
                                  name={`class_q_${idx}`}
                                  value={opt}
                                  checked={classAnswers[idx] === opt}
                                  onChange={(e) => setClassAnswers({...classAnswers, [idx]: e.target.value})}
                                  disabled={isParent || isTaskCompleted || classEvaluation[idx]?.correct || classAttempts[idx] >= 2}
                                  className="w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-500 disabled:opacity-50"
                                />
                                <span className="text-slate-700 font-medium"><MathText text={opt} pdfPath={activeClassTask.pdf_materials?.[0]} /></span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-3 mt-4">
                            <textarea
                              value={classAnswers[idx] || ''}
                              onChange={(e) => setClassAnswers({...classAnswers, [idx]: e.target.value})}
                              disabled={isParent || isTaskCompleted || classEvaluation[idx]?.correct || classAttempts[idx] >= 2}
                              className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-slate-100 disabled:text-slate-500 transition-shadow"
                              rows={5}
                              placeholder={isParent ? "Student's answer will appear here..." : "Type your answer here..."}
                            />
                            <div className="flex items-center gap-4">
                              {!(isParent || isTaskCompleted || classEvaluation[idx]?.correct || classAttempts[idx] >= 2) && (
                              <label className="cursor-pointer flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-700 rounded-lg transition-colors">
                                <ImageIcon className="w-4 h-4 mr-2 text-slate-500" />
                                Upload Work (Image)
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  onChange={async (e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      try {
                                        const base64 = await fileToBase64(e.target.files[0]);
                                        setClassImages(prev => ({...prev, [idx]: base64}));
                                      } catch(err) {
                                        console.error(err);
                                        alert("Failed to load image.");
                                      }
                                    }
                                  }} 
                                />
                              </label>
                              )}
                              {classImages[idx] && (
                                <div className="relative mt-2">
                                  <img src={`data:image/jpeg;base64,${classImages[idx]}`} alt="uploaded" className="h-20 rounded-lg border border-slate-200 shadow-sm" />
                                  {!(isParent || isTaskCompleted || classEvaluation[idx]?.correct || classAttempts[idx] >= 2) && (
                                  <button 
                                    onClick={() => setClassImages(prev => {const newImgs={...prev}; delete newImgs[idx]; return newImgs;})} 
                                    className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 hover:bg-rose-600 shadow-sm transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                            {classEvaluation[idx] && (
                              <div className={`mt-3 p-4 rounded-xl text-sm font-semibold flex items-center ${classEvaluation[idx].correct ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                {classEvaluation[idx].correct ? <CheckCircle2 className="w-5 h-5 mr-2" /> : <AlertCircle className="w-5 h-5 mr-2" />}
                                {classEvaluation[idx].correct ? 'Correct!' : 'Incorrect.'}
                              </div>
                            )}

                            {(!isParent && (classEvaluation[idx]?.correct || (classAttempts[idx] >= 2 && !classEvaluation[idx]?.correct))) && (
                              <div className={`mt-4 p-5 border rounded-xl text-sm text-slate-800 ${classEvaluation[idx]?.correct ? 'bg-emerald-50/50 border-emerald-100' : 'bg-indigo-50/50 border-indigo-100'}`}>
                                <h4 className={`font-bold mb-3 flex items-center ${classEvaluation[idx]?.correct ? 'text-emerald-800' : 'text-indigo-800'}`}>
                                  <BookOpen className="w-4 h-4 mr-2" /> Correct Answer / Solution:
                                </h4>
                                {q.answer && (
                                  <div className="mb-3 bg-white p-3 rounded-lg border border-slate-100 shadow-sm"><strong>Answer:</strong> <MathText text={q.answer} pdfPath={activeClassTask.pdf_materials?.[0]} /></div>
                                )}
                                  {q.solution && (
                                    <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm"><MathText text={q.solution} pdfPath={activeClassTask.pdf_materials?.[0]} /></div>
                                  )}
                                {!q.answer && !q.solution && (
                                  <div className="text-slate-500 italic">No official solution provided for this question.</div>
                                )}
                              </div>
                            )}

                            {!(isParent || isTaskCompleted || classEvaluation[idx]?.correct || classAttempts[idx] >= 2) && (
                              <div className="mt-6 flex justify-end">
                                <button 
                                  onClick={() => submitSingleClassQuestion(idx)}
                                  disabled={evaluatingClass[idx] || (!(classAnswers[idx] || '').trim() && !classImages[idx])}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {evaluatingClass[idx] && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                  {evaluatingClass[idx] ? 'Evaluating...' : 'Submit Answer'}
                                </button>
                              </div>
                            )}
                            
                            <div className="mt-6 border-t border-slate-100 pt-4">
                              <ProblemChat key={`class-chat-${idx}`} question={q} pdfPath={activeClassTask.pdf_materials?.[0]} isParent={isParent} />
                            </div>
                          </div>
                      );
                    })}
                    </>
                  )}
                </div>
              )}
            </div>
            {(classQuestions.length > 0 || classContentFlow.length > 0) && (
              <div className="p-5 sm:p-8 border-t border-slate-100 bg-slate-50/80 sm:rounded-b-3xl flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0 mt-auto">
                  {(!classContentFlow || classContentFlow.length === 0) && classQuestions.length > 0 && (
                    <div className="text-sm font-medium text-slate-500 order-2 sm:order-1 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                      {classQuestions.filter((_, i) => classEvaluation[i]?.correct || classAttempts[i] >= 2).length} / {classQuestions.length} completed
                    </div>
                  )}
                  <div className="order-1 sm:order-2 w-full sm:w-auto flex gap-3">
                    {(!classContentFlow || classContentFlow.length === 0) && classQuestions.length > 0 && classCurrentIndex > 0 && (
                      <button
                        onClick={() => setClassCurrentIndex(prev => prev - 1)}
                        className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 sm:py-2.5 px-5 rounded-xl border border-slate-200 shadow-sm transition-all"
                      >
                        Previous
                      </button>
                    )}
                    {(!classContentFlow || classContentFlow.length === 0) && classQuestions.length > 0 && classCurrentIndex < classQuestions.length - 1 && (
                      <button
                        onClick={() => setClassCurrentIndex(prev => prev + 1)}
                        className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 sm:py-2.5 px-5 rounded-xl border border-slate-200 shadow-sm transition-all"
                      >
                        Next
                      </button>
                    )}
                    {classQuestions.length === 0 ? (
                      isParent || activeClassTask.class_status === 'completed' ? (
                        <button 
                          onClick={() => setActiveClassTask(null)}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-3 sm:py-2.5 px-6 rounded-xl transition-all flex items-center justify-center w-full sm:w-auto"
                        >
                          Close
                        </button>
                      ) : (
                        <button 
                          onClick={async () => {
                            await toggleStatus(activeClassTask.id, 'class_status', 'pending');
                            setActiveClassTask(null);
                          }}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 sm:py-2.5 px-6 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center w-full sm:w-auto"
                        >
                          <CheckCircle2 className="w-5 h-5 mr-2" /> Mark as Read & Close
                        </button>
                      )
                    ) : classQuestions.every((_, idx) => classEvaluation[idx]?.correct || classAttempts[idx] >= 2) || activeClassTask.class_status === 'completed' ? (
                      <button 
                        onClick={() => setActiveClassTask(null)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 sm:py-2.5 px-6 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center w-full sm:w-auto"
                      >
                        <CheckCircle2 className="w-5 h-5 mr-2" /> All Done! (Close)
                      </button>
                    ) : (
                      <button 
                        onClick={() => setActiveClassTask(null)}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-3 sm:py-2.5 px-6 rounded-xl transition-all flex items-center justify-center w-full sm:w-auto"
                      >
                        Close
                      </button>
                    )}
                  </div>
              </div>
            )}
          </div>
        </div>
        );
      })()}

      {/* Homework Modal */}
      {activeHomeworkTask && (() => {
        const isTaskCompleted = activeHomeworkTask.homework_status === 'completed';

        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white sm:rounded-3xl shadow-2xl w-full h-full sm:h-auto max-w-4xl sm:max-h-[90vh] flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-500 to-orange-500"></div>
            <button 
              onClick={() => setActiveHomeworkTask(null)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center">
                <Pencil className="w-6 h-6 mr-3 text-rose-500" />
                Exercises
              </h2>
            </div>
            <div className="p-6 sm:p-8 overflow-y-auto flex-grow space-y-8 bg-slate-50/30">
              {homeworkLoading && homeworkQuestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <Loader2 className="w-10 h-10 animate-spin mb-4 text-rose-500" />
                  <p className="text-lg font-medium">Loading exercises...</p>
                </div>
              ) : (
                <div className="space-y-6">
                      {/* Pagination Bar */}
                      <div className="flex flex-wrap gap-2 mb-8">
                        {homeworkQuestions.map((_, idx) => {
                          let bgColor = "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200";
                          if (idx === homeworkCurrentIndex) bgColor = "bg-rose-500 text-white shadow-md ring-4 ring-rose-100 border-rose-500";
                          else if (homeworkEvaluations[idx]?.correct) bgColor = "bg-emerald-500 text-white border-emerald-500 shadow-sm";
                          else if (homeworkEvaluations[idx] && !homeworkEvaluations[idx].correct) bgColor = "bg-rose-500 text-white border-rose-500 shadow-sm";
                          else if (homeworkAnswers[idx] || homeworkImages[idx]) bgColor = "bg-rose-300 text-white border-rose-300 shadow-sm";
                          
                          return (
                            <button
                              key={idx}
                              onClick={() => setHomeworkCurrentIndex(idx)}
                              className={`w-11 h-11 rounded-xl font-bold flex items-center justify-center transition-all duration-200 ${bgColor}`}
                            >
                              {idx + 1}
                            </button>
                          );
                        })}
                      </div>

                      {homeworkQuestions.map((q, idx) => {
                        if (idx !== homeworkCurrentIndex) return null;
                        return (
                        <div key={idx} className="space-y-4 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                          <p className="font-medium text-slate-800 text-lg leading-relaxed"><span className="text-rose-600 font-bold mr-3 bg-rose-50 px-2 py-1 rounded-lg">{q.number || (idx + 1) + '.'}</span><MathText text={q.text} pdfPath={activeHomeworkTask.pdf_materials?.[0]} /></p>
                            {isParent && (q.solution || q.answer) && (
                              <button
                                onClick={() => setShowHomeworkSolutions(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                className="flex-shrink-0 ml-4 text-sm font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                {showHomeworkSolutions[idx] ? 'Hide Solution' : 'Show Solution'}
                              </button>
                            )}
                          </div>
                          
                            {isParent && (q.solution || q.answer) && showHomeworkSolutions[idx] && (
                              <div className="p-5 bg-rose-50/50 rounded-xl border border-rose-100 text-sm text-slate-800 mb-6">
                                <h4 className="font-bold text-rose-800 mb-3 flex items-center"><BookOpen className="w-4 h-4 mr-2" /> Solution:</h4>
                                {q.answer && (
                                  <div className="mb-3 bg-white p-4 rounded-lg shadow-sm border border-slate-100"><strong>Answer:</strong> <MathText text={q.answer} pdfPath={activeHomeworkTask.pdf_materials?.[0]} /></div>
                                )}
                                {q.solution && (
                                  <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100"><MathText text={q.solution} pdfPath={activeHomeworkTask.pdf_materials?.[0]} /></div>
                                )}
                              </div>
                            )}
                        
                        {q.type === 'mcq' && q.options ? (
                          <div className="space-y-3 mt-4">
                            {q.options.map((opt, optIdx) => (
                              <label key={optIdx} className="flex items-center space-x-4 p-4 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-rose-50 hover:border-rose-200 transition-all">
                                <input 
                                  type="radio" 
                                  name={`homework_q_${idx}`}
                                  value={opt}
                                  checked={homeworkAnswers[idx] === opt}
                                  onChange={(e) => setHomeworkAnswers({...homeworkAnswers, [idx]: e.target.value})}
                                  disabled={isParent || isTaskCompleted || homeworkEvaluations[idx]?.correct || homeworkAttempts[idx] >= 2}
                                  className="w-5 h-5 text-rose-600 border-slate-300 focus:ring-rose-500 disabled:opacity-50"
                                />
                                <span className="text-slate-700 font-medium"><MathText text={opt} pdfPath={activeHomeworkTask.pdf_materials?.[0]} /></span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-3 mt-4">
                            <textarea
                              value={homeworkAnswers[idx] || ''}
                              onChange={(e) => setHomeworkAnswers({...homeworkAnswers, [idx]: e.target.value})}
                              disabled={isParent || isTaskCompleted || homeworkEvaluations[idx]?.correct || homeworkAttempts[idx] >= 2}
                              className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none disabled:bg-slate-100 disabled:text-slate-500 transition-shadow"
                              rows={5}
                              placeholder={isParent ? "Student's answer will appear here..." : "Type your answer here..."}
                            />
                            <div className="flex items-center gap-4">
                              {!(isParent || isTaskCompleted || homeworkEvaluations[idx]?.correct || homeworkAttempts[idx] >= 2) && (
                              <label className="cursor-pointer flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-700 rounded-lg transition-colors">
                                <ImageIcon className="w-4 h-4 mr-2 text-slate-500" />
                                Upload Work (Image)
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  onChange={async (e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      try {
                                        const base64 = await fileToBase64(e.target.files[0]);
                                        setHomeworkImages(prev => ({...prev, [idx]: base64}));
                                      } catch(err) {
                                        console.error(err);
                                        alert("Failed to load image.");
                                      }
                                    }
                                  }} 
                                />
                              </label>
                              )}
                              {homeworkImages[idx] && (
                                <div className="relative mt-2">
                                  <img src={`data:image/jpeg;base64,${homeworkImages[idx]}`} alt="uploaded" className="h-20 rounded-lg border border-slate-200 shadow-sm" />
                                  {!(isParent || isTaskCompleted || homeworkEvaluations[idx]?.correct || homeworkAttempts[idx] >= 2) && (
                                  <button 
                                    onClick={() => setHomeworkImages(prev => {const newImgs={...prev}; delete newImgs[idx]; return newImgs;})} 
                                    className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 hover:bg-rose-600 shadow-sm transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {homeworkEvaluations[idx] && (
                          <div className={`mt-3 p-4 rounded-xl text-sm font-semibold flex items-center ${homeworkEvaluations[idx].correct ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                            {homeworkEvaluations[idx].correct ? <CheckCircle2 className="w-5 h-5 mr-2" /> : <AlertCircle className="w-5 h-5 mr-2" />}
                            {homeworkEvaluations[idx].correct ? 'Correct!' : 'Incorrect.'}
                          </div>
                        )}

                          {(!isParent && (homeworkEvaluations[idx]?.correct || (homeworkAttempts[idx] >= 2 && !homeworkEvaluations[idx]?.correct))) && (
                            <div className={`mt-4 p-5 border rounded-xl text-sm text-slate-800 ${homeworkEvaluations[idx]?.correct ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
                            <h4 className={`font-bold mb-3 flex items-center ${homeworkEvaluations[idx]?.correct ? 'text-emerald-800' : 'text-rose-800'}`}>
                              <BookOpen className="w-4 h-4 mr-2" /> Correct Answer / Solution:
                            </h4>
                              {q.answer && (
                                <div className="mb-3 bg-white p-4 rounded-lg shadow-sm border border-slate-100"><strong>Answer:</strong> <MathText text={q.answer} pdfPath={activeHomeworkTask.pdf_materials?.[0]} /></div>
                              )}
                                {q.solution && (
                                  <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100"><MathText text={q.solution} pdfPath={activeHomeworkTask.pdf_materials?.[0]} /></div>
                                )}
                            {!q.answer && !q.solution && (
                              <div className="text-slate-500 italic">No official solution provided for this question.</div>
                            )}
                          </div>
                        )}

                        {!(isParent || isTaskCompleted || homeworkEvaluations[idx]?.correct || homeworkAttempts[idx] >= 2) && (
                          <div className="mt-6 flex justify-end">
                            <button 
                              onClick={() => submitSingleHomeworkQuestion(idx)}
                              disabled={evaluatingHomework[idx] || (!(homeworkAnswers[idx] || '').trim() && !homeworkImages[idx])}
                              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {evaluatingHomework[idx] && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                              {evaluatingHomework[idx] ? 'Evaluating...' : 'Submit Answer'}
                            </button>
                          </div>
                        )}
                        
                        <div className="mt-6 border-t border-slate-100 pt-4">
                          <ProblemChat key={`hw-chat-${idx}`} question={q} pdfPath={activeHomeworkTask.pdf_materials?.[0]} isParent={isParent} />
                        </div>
                      </div>
                    );
                  })}
            </div>
          )}
        </div>
        {homeworkQuestions.length > 0 && (
          <div className="p-5 sm:p-8 border-t border-slate-100 bg-slate-50/80 sm:rounded-b-3xl flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0 mt-auto">
              <div className="text-sm font-medium text-slate-500 order-2 sm:order-1 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                {homeworkQuestions.filter((_, i) => homeworkEvaluations[i]?.correct || homeworkAttempts[i] >= 2).length} / {homeworkQuestions.length} completed
              </div>
              <div className="order-1 sm:order-2 w-full sm:w-auto flex gap-3">
                {homeworkCurrentIndex > 0 && (
                  <button
                    onClick={() => setHomeworkCurrentIndex(prev => prev - 1)}
                    className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 sm:py-2.5 px-5 rounded-xl border border-slate-200 shadow-sm transition-all"
                  >
                    Previous
                  </button>
                )}
                {homeworkCurrentIndex < homeworkQuestions.length - 1 && (
                  <button
                    onClick={() => setHomeworkCurrentIndex(prev => prev + 1)}
                    className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 sm:py-2.5 px-5 rounded-xl border border-slate-200 shadow-sm transition-all"
                  >
                    Next
                  </button>
                )}
                {homeworkQuestions.every((_, idx) => homeworkEvaluations[idx]?.correct || homeworkAttempts[idx] >= 2) || activeHomeworkTask.homework_status === 'completed' ? (
                  <button 
                    onClick={() => setActiveHomeworkTask(null)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 sm:py-2.5 px-6 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center w-full sm:w-auto"
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" /> All Done! (Close)
                  </button>
                ) : (
                  <button 
                    onClick={() => setActiveHomeworkTask(null)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-3 sm:py-2.5 px-6 rounded-xl transition-all flex items-center justify-center w-full sm:w-auto"
                  >
                    Close
                  </button>
                )}
              </div>
          </div>
        )}
      </div>
    </div>
    );
  })()}
    </div>
  );
}

export default App
