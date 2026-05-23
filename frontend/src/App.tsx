import { useState, useEffect } from 'react'
import { CheckCircle2, FileText, Loader2, X, MessageSquare, Send, Image as ImageIcon, BookOpen, Pencil, Key, AlertCircle, Ban, Dices, Music, Box, PlayCircle } from 'lucide-react'
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
    .replace(/\\(?:overarc|overparen|wideparen)\{\$?([^{}$]+)\$?\}/g, '\\stackrel{\\frown}{$1}');
  
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
                return <img key={i} src={imgSrc} alt="Problem graphic" className="my-4 max-w-full h-auto rounded shadow-sm border border-gray-200 block mx-auto bg-white p-2" />;
              }
              
              // Render math in text part
              const mathParts = imgPart.split(/(\$\$.*?\$\$|\$.*?\$)/g);
              return (
                <span key={i}>
                  {mathParts.map((part, j) => {
                    if (part.startsWith('$$') && part.endsWith('$$')) {
                      return <BlockMath key={j} math={part.slice(2, -2)} errorColor={'#cc0000'} renderError={() => <span className="text-red-500 font-mono text-sm">{part}</span>} />;
                    }
                    if (part.startsWith('$') && part.endsWith('$')) {
                      return <InlineMath key={j} math={part.slice(1, -1)} errorColor={'#cc0000'} renderError={() => <span className="text-red-500 font-mono text-sm">{part}</span>} />;
                    }
                    
                    // Handle bold and italics in plain text parts
                    const styleParts = part.split(/(\*\*.*?\*\*|\*.*?\*)/g);
                    return (
                      <span key={j}>
                        {styleParts.map((sPart, k) => {
                          if (sPart.startsWith('**') && sPart.endsWith('**')) {
                            return <strong key={k}>{sPart.slice(2, -2)}</strong>;
                          }
                          if (sPart.startsWith('*') && sPart.endsWith('*')) {
                            return <em key={k}>{sPart.slice(1, -1)}</em>;
                          }
                          return (
                            <span key={k}>
                              {sPart.split('\n').map((line, lIdx, arr) => (
                                <span key={lIdx}>
                                  {line}
                                  {lIdx < arr.length - 1 && <br />}
                                </span>
                              ))}
                            </span>
                          );
                        })}
                      </span>
                    );
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

  const toggleStatus = async (taskId: number, field: 'class_status' | 'homework_status', currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: newStatus, student_email: userEmail })
      });
      if (res.ok) {
        setTasks(tasks.map(t => t.id === taskId ? { ...t, [field]: newStatus } : t));
      }
    } catch (e) {
      console.error(e);
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
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8 px-2 sm:px-4 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-8">
        
        {/* Header & Progress */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
            <h1 className="text-2xl font-bold text-gray-900">{courseTitle}</h1>
            <div className="flex flex-wrap items-center gap-2">
              {isParent && students.length > 0 && (
                <select 
                  value={selectedStudentEmail} 
                  onChange={(e) => setSelectedStudentEmail(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {students.map(s => (
                    <option key={s.email} value={s.email}>{s.email}</option>
                  ))}
                </select>
              )}
              <select 
                value={selectedCourseId} 
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableCourses.map(course => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
              {isParent && (
                <>
                  <button 
                    onClick={handleParse}
                    disabled={loading || !selectedCourseId || !selectedStudentEmail}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1.5 px-3 rounded transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                    {loading ? 'Generating...' : 'Generate Timeline'}
                  </button>
                  {generatedCourses.find(c => c.title === courseTitle) && (
                    <button 
                      onClick={handleClearCourse}
                      className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-1.5 px-3 rounded transition-colors flex items-center justify-center"
                    >
                      Clear Course
                    </button>
                  )}
                </>
              )}
              <button 
                onClick={() => {
                  localStorage.removeItem('userEmail');
                  localStorage.removeItem('userRole');
                  setIsLoggedIn(false);
                  setUserEmail('');
                  setUserRole(null);
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium py-1.5 px-3 rounded transition-colors flex items-center justify-center"
              >
                Sign out
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium text-gray-600">
              <span>Overall Progress</span>
              <span>{completedDays} / {totalDays} Tasks ({progress}%)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        </div>


        {/* Timeline Section */}
        <div className="space-y-6">
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

            return chapters.map((chap, cIdx) => (
              <div key={cIdx} className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-gray-200 pb-2 mb-0">{chap.name}</h2>
                <div className="bg-white rounded-b-xl shadow-sm border border-t-0 border-gray-200 divide-y divide-gray-100">
                  {chap.tasks.map(task => {
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
                      <div key={task.id} className="p-4 sm:px-6 sm:py-5 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-grow">
                          <h3 className="text-lg font-semibold text-gray-800">{task.topic}</h3>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3">
                          {task.class_status !== 'na' && (
                            <button
                              onClick={() => openClassContent(task)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${task.class_status === 'completed' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'}`}
                            >
                              {task.class_status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                              {isReview || isChallenge ? classContentTitle : 'Study & Problems'}
                            </button>
                          )}

                          {!isReview && !isChallenge && task.homework_status !== 'na' && (
                            <button
                              onClick={() => openHomework(task)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${task.homework_status === 'completed' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'}`}
                            >
                              {task.homework_status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                              Exercises
                            </button>
                          )}

                          {task.pdf_materials && task.pdf_materials.length > 0 && (
                            <a 
                              href={`${API_BASE}/files/${encodeURIComponent(task.pdf_materials[0])}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors border border-red-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <FileText className="w-4 h-4" />
                              PDF
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
          {tasks.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-500">
              No tasks generated yet. Paste a syllabus above to get started!
            </div>
          )}
        </div>
      </div>

      {/* Class Content Modal */}
      {activeClassTask && (() => {
        const isTaskCompleted = activeClassTask.class_status === 'completed';

        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white sm:rounded-xl shadow-xl w-full h-full sm:h-auto max-w-3xl sm:max-h-[90vh] flex flex-col relative">
            <button 
              onClick={() => setActiveClassTask(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900">{activeClassTask.topic}</h2>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto flex-grow space-y-8">
              {classLoading && classQuestions.length === 0 && classContentFlow.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-600" />
                  <p>Loading content...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {classContentFlow.length > 0 ? (
                    classContentFlow.map((item, flowIdx) => {
                      if (item.type === 'paragraph') {
                        return <p key={flowIdx} className="text-gray-800 text-lg leading-relaxed"><MathText text={item.text} pdfPath={activeClassTask.pdf_materials?.[0]} /></p>;
                      } else if (item.type === 'summary') {
                        return (
                          <div key={flowIdx} className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded text-gray-800">
                            <MathText text={item.text} pdfPath={activeClassTask.pdf_materials?.[0]} />
                          </div>
                        );
                      } else if (item.type === 'image_block') {
                        return <div key={flowIdx}><MathText text={item.text} pdfPath={activeClassTask.pdf_materials?.[0]} /></div>;
                      } else if (item.type === 'iconbox') {
                        return <MathText key={flowIdx} text={`[ICONBOX:${item.iconType}:${item.title || ''}]\n${item.text}\n[/ICONBOX]`} pdfPath={activeClassTask.pdf_materials?.[0]} />;
                      } else if (item.type === 'problem_box') {
                        // Find matching question
                        const qIdx = classQuestions.findIndex(q => q.number === item.number);
                        if (qIdx === -1) {
                           // If problem not found in parsed questions, just show a placeholder
                           return (
                             <div key={flowIdx} className="bg-gray-100 p-4 rounded text-center text-gray-500">
                               {item.number} (Interactive element not available)
                             </div>
                           );
                        }
                        const q = classQuestions[qIdx];
                        const idx = qIdx; // mapping index for answers and evaluation
                        return (
                          <div key={flowIdx} className="space-y-3 bg-gray-50 p-5 rounded-lg border border-gray-100 my-8 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                              <p className="font-medium text-gray-800"><span className="text-blue-600 mr-2">{q.number || (idx + 1) + '.'}</span><MathText text={q.text} pdfPath={activeClassTask.pdf_materials?.[0]} /></p>
                              {q.solution && (
                                <button
                                  onClick={() => setShowClassSolutions(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                  className="flex-shrink-0 ml-4 text-sm font-medium text-blue-600 hover:text-blue-800"
                                >
                                  {showClassSolutions[idx] ? 'Hide Solution' : 'Show Solution'}
                                </button>
                              )}
                            </div>

                            {q.solution && showClassSolutions[idx] && (
                              <div className="p-4 bg-blue-50/50 rounded border border-blue-100 text-sm text-gray-800 mb-4">
                                <h4 className="font-bold text-blue-800 mb-2">Solution:</h4>
                                <MathText text={q.solution} pdfPath={activeClassTask.pdf_materials?.[0]} />
                              </div>
                            )}
                            
                            {q.type === 'mcq' && q.options ? (
                              <div className="space-y-2 mt-3">
                                {q.options.map((opt, optIdx) => (
                                  <label key={optIdx} className="flex items-center space-x-3 p-3 rounded-md bg-white border border-gray-200 cursor-pointer hover:bg-blue-50 transition-colors">
                                    <input 
                                      type="radio" 
                                      name={`class_q_${idx}`}
                                      value={opt}
                                      checked={classAnswers[idx] === opt}
                                      onChange={(e) => setClassAnswers({...classAnswers, [idx]: e.target.value})}
                                      disabled={isParent || isTaskCompleted || classEvaluation[idx]?.correct || classAttempts[idx] >= 2}
                                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                                    />
                                    <span className="text-gray-700"><MathText text={opt} pdfPath={activeClassTask.pdf_materials?.[0]} /></span>
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <div className="space-y-2 mt-3">
                                <textarea
                                  value={classAnswers[idx] || ''}
                                  onChange={(e) => setClassAnswers({...classAnswers, [idx]: e.target.value})}
                                  disabled={isParent || isTaskCompleted || classEvaluation[idx]?.correct || classAttempts[idx] >= 2}
                                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                  rows={4}
                                  placeholder={isParent ? "Student's answer will appear here..." : "Type your answer here..."}
                                />
                                <div className="flex items-center gap-4">
                                  {!(isParent || isTaskCompleted || classEvaluation[idx]?.correct || classAttempts[idx] >= 2) && (
                                  <label className="cursor-pointer flex items-center text-sm font-medium text-blue-600 hover:text-blue-800">
                                    <ImageIcon className="w-4 h-4 mr-1" />
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
                                      <img src={`data:image/jpeg;base64,${classImages[idx]}`} alt="uploaded" className="h-16 rounded border border-gray-200" />
                                      {!(isParent || isTaskCompleted || classEvaluation[idx]?.correct || classAttempts[idx] >= 2) && (
                                      <button 
                                        onClick={() => setClassImages(prev => {const newImgs={...prev}; delete newImgs[idx]; return newImgs;})} 
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
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
                              <div className={`mt-3 p-3 rounded-md text-sm font-medium ${classEvaluation[idx].correct ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                {classEvaluation[idx].correct ? 'Correct!' : 'Incorrect.'}
                              </div>
                            )}

                            {(classEvaluation[idx]?.correct || (classAttempts[idx] >= 2 && !classEvaluation[idx]?.correct)) && (
                              <div className={`mt-3 p-4 border rounded-lg text-sm text-gray-800 ${classEvaluation[idx]?.correct ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                                <h4 className={`font-bold mb-2 ${classEvaluation[idx]?.correct ? 'text-green-800' : 'text-blue-800'}`}>Correct Answer / Solution:</h4>
                                {q.answer && (
                                  <div className="mb-2"><strong>Answer:</strong> <MathText text={q.answer} pdfPath={activeClassTask.pdf_materials?.[0]} /></div>
                                )}
                                {q.solution && (
                                  <div><strong>Solution:</strong> <MathText text={q.solution} pdfPath={activeClassTask.pdf_materials?.[0]} /></div>
                                )}
                                {!q.answer && !q.solution && (
                                  <div className="text-gray-500 italic">No official solution provided for this question.</div>
                                )}
                              </div>
                            )}

                            {!(isParent || isTaskCompleted || classEvaluation[idx]?.correct || classAttempts[idx] >= 2) && (
                              <div className="mt-4 flex justify-end">
                                <button 
                                  onClick={() => submitSingleClassQuestion(idx)}
                                  disabled={evaluatingClass[idx] || (!(classAnswers[idx] || '').trim() && !classImages[idx])}
                                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {evaluatingClass[idx] && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                  {evaluatingClass[idx] ? 'Evaluating...' : 'Submit'}
                                </button>
                              </div>
                            )}
                            
                            <ProblemChat key={`class-chat-${idx}`} question={q} pdfPath={activeClassTask.pdf_materials?.[0]} isParent={isParent} />
                          </div>
                        );
                      }
                      return null;
                    })
                  ) : (
                    <>
                      {/* Pagination Bar */}
                      <div className="flex flex-wrap gap-2 mb-6">
                        {classQuestions.map((_, idx) => {
                          let bgColor = "bg-gray-200 text-gray-700 hover:bg-gray-300";
                          if (idx === classCurrentIndex) bgColor = "bg-blue-600 text-white ring-2 ring-blue-300 ring-offset-1";
                          else if (classEvaluation[idx]?.correct) bgColor = "bg-green-500 text-white";
                          else if (classEvaluation[idx] && !classEvaluation[idx].correct) bgColor = "bg-red-500 text-white";
                          else if (classAnswers[idx] || classImages[idx]) bgColor = "bg-blue-400 text-white";
                          
                          return (
                            <button
                              key={idx}
                              onClick={() => setClassCurrentIndex(idx)}
                              className={`w-10 h-10 rounded-full font-semibold flex items-center justify-center transition-all ${bgColor}`}
                            >
                              {idx + 1}
                            </button>
                          );
                        })}
                      </div>

                      {classQuestions.map((q, idx) => {
                        if (idx !== classCurrentIndex) return null;
                        return (
                        <div key={idx} className="space-y-3 bg-gray-50 p-5 rounded-lg border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-medium text-gray-800"><span className="text-blue-600 mr-2">{q.number || (idx + 1) + '.'}</span><MathText text={q.text} pdfPath={activeClassTask.pdf_materials?.[0]} /></p>
                          {q.solution && (
                            <button
                              onClick={() => setShowClassSolutions(prev => ({ ...prev, [idx]: !prev[idx] }))}
                              className="flex-shrink-0 ml-4 text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                              {showClassSolutions[idx] ? 'Hide Solution' : 'Show Solution'}
                            </button>
                          )}
                        </div>

                        {q.solution && showClassSolutions[idx] && (
                          <div className="p-4 bg-blue-50/50 rounded border border-blue-100 text-sm text-gray-800 mb-4">
                            <h4 className="font-bold text-blue-800 mb-2">Solution:</h4>
                            <MathText text={q.solution} pdfPath={activeClassTask.pdf_materials?.[0]} />
                          </div>
                        )}
                        
                        {q.type === 'mcq' && q.options ? (
                          <div className="space-y-2 mt-3">
                            {q.options.map((opt, optIdx) => (
                              <label key={optIdx} className="flex items-center space-x-3 p-3 rounded-md bg-white border border-gray-200 cursor-pointer hover:bg-blue-50 transition-colors">
                                <input 
                                  type="radio" 
                                  name={`class_q_${idx}`}
                                  value={opt}
                                  checked={classAnswers[idx] === opt}
                                  onChange={(e) => setClassAnswers({...classAnswers, [idx]: e.target.value})}
                                  disabled={isParent || isTaskCompleted || classEvaluation[idx]?.correct || classAttempts[idx] >= 2}
                                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                                />
                                <span className="text-gray-700"><MathText text={opt} pdfPath={activeClassTask.pdf_materials?.[0]} /></span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-2 mt-3">
                            <textarea
                              value={classAnswers[idx] || ''}
                              onChange={(e) => setClassAnswers({...classAnswers, [idx]: e.target.value})}
                              disabled={isParent || isTaskCompleted || classEvaluation[idx]?.correct || classAttempts[idx] >= 2}
                              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                              rows={4}
                              placeholder={isParent ? "Student's answer will appear here..." : "Type your answer here..."}
                            />
                            <div className="flex items-center gap-4">
                              {!(isParent || isTaskCompleted || classEvaluation[idx]?.correct || classAttempts[idx] >= 2) && (
                              <label className="cursor-pointer flex items-center text-sm font-medium text-blue-600 hover:text-blue-800">
                                <ImageIcon className="w-4 h-4 mr-1" />
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
                                  <img src={`data:image/jpeg;base64,${classImages[idx]}`} alt="uploaded" className="h-16 rounded border border-gray-200" />
                                  {!(isParent || isTaskCompleted || classEvaluation[idx]?.correct || classAttempts[idx] >= 2) && (
                                  <button 
                                    onClick={() => setClassImages(prev => {const newImgs={...prev}; delete newImgs[idx]; return newImgs;})} 
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
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
                          <div className={`mt-3 p-3 rounded-md text-sm font-medium ${classEvaluation[idx].correct ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {classEvaluation[idx].correct ? 'Correct!' : 'Incorrect.'}
                          </div>
                        )}

                        {(classEvaluation[idx]?.correct || (classAttempts[idx] >= 2 && !classEvaluation[idx]?.correct)) && (
                          <div className={`mt-3 p-4 border rounded-lg text-sm text-gray-800 ${classEvaluation[idx]?.correct ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                            <h4 className={`font-bold mb-2 ${classEvaluation[idx]?.correct ? 'text-green-800' : 'text-blue-800'}`}>Correct Answer / Solution:</h4>
                            {q.answer && (
                              <div className="mb-2"><strong>Answer:</strong> <MathText text={q.answer} pdfPath={activeClassTask.pdf_materials?.[0]} /></div>
                            )}
                            {q.solution && (
                              <div><strong>Solution:</strong> <MathText text={q.solution} pdfPath={activeClassTask.pdf_materials?.[0]} /></div>
                            )}
                            {!q.answer && !q.solution && (
                              <div className="text-gray-500 italic">No official solution provided for this question.</div>
                            )}
                          </div>
                        )}

                            {!(isParent || isTaskCompleted || classEvaluation[idx]?.correct || classAttempts[idx] >= 2) && (
                              <div className="mt-4 flex justify-end">
                                <button 
                                  onClick={() => submitSingleClassQuestion(idx)}
                                  disabled={evaluatingClass[idx] || (!(classAnswers[idx] || '').trim() && !classImages[idx])}
                                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {evaluatingClass[idx] && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                  {evaluatingClass[idx] ? 'Evaluating...' : 'Submit'}
                                </button>
                              </div>
                            )}
                        
                        <ProblemChat key={`class-chat-${idx}`} question={q} pdfPath={activeClassTask.pdf_materials?.[0]} isParent={isParent} />
                      </div>
                      );
                    })}
                    </>
                  )}
                </div>
              )}
            </div>
            {(classQuestions.length > 0 || classContentFlow.length > 0) && (
              <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50 sm:rounded-b-xl flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0 mt-auto">
                  {(!classContentFlow || classContentFlow.length === 0) && classQuestions.length > 0 && (
                    <div className="text-sm text-gray-500 order-2 sm:order-1">
                      {classQuestions.filter((_, i) => classEvaluation[i]?.correct || classAttempts[i] >= 2).length} / {classQuestions.length} completed
                    </div>
                  )}
                  <div className="order-1 sm:order-2 w-full sm:w-auto flex gap-2">
                    {(!classContentFlow || classContentFlow.length === 0) && classQuestions.length > 0 && classCurrentIndex > 0 && (
                      <button
                        onClick={() => setClassCurrentIndex(prev => prev - 1)}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 sm:py-2.5 px-4 rounded-lg transition-colors"
                      >
                        Previous
                      </button>
                    )}
                    {(!classContentFlow || classContentFlow.length === 0) && classQuestions.length > 0 && classCurrentIndex < classQuestions.length - 1 && (
                      <button
                        onClick={() => setClassCurrentIndex(prev => prev + 1)}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 sm:py-2.5 px-4 rounded-lg transition-colors"
                      >
                        Next
                      </button>
                    )}
                    {classQuestions.length === 0 ? (
                      <button 
                        onClick={async () => {
                          if (activeClassTask.class_status !== 'completed') {
                            await toggleStatus(activeClassTask.id, 'class_status', 'pending');
                          }
                          setActiveClassTask(null);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 sm:py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center w-full sm:w-auto"
                      >
                        <CheckCircle2 className="w-5 h-5 mr-2" /> Mark as Read & Close
                      </button>
                    ) : classQuestions.every((_, idx) => classEvaluation[idx]?.correct || classAttempts[idx] >= 2) || activeClassTask.class_status === 'completed' ? (
                      <button 
                        onClick={() => setActiveClassTask(null)}
                        className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 sm:py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center w-full sm:w-auto"
                      >
                        <CheckCircle2 className="w-5 h-5 mr-2" /> All Done! (Close)
                      </button>
                    ) : (
                      <button 
                        onClick={() => setActiveClassTask(null)}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 sm:py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center w-full sm:w-auto"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white sm:rounded-xl shadow-xl w-full h-full sm:h-auto max-w-3xl sm:max-h-[90vh] flex flex-col relative">
            <button 
              onClick={() => setActiveHomeworkTask(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900">Exercises</h2>
              <p className="text-sm text-gray-500 mt-1">Complete exercises extracted from the PDF.</p>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto flex-grow space-y-8">
              {homeworkLoading && homeworkQuestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-600" />
                  <p>Loading content...</p>
                </div>
              ) : (
                <div className="space-y-6">
                      {/* Pagination Bar */}
                      <div className="flex flex-wrap gap-2 mb-6">
                        {homeworkQuestions.map((_, idx) => {
                          let bgColor = "bg-gray-200 text-gray-700 hover:bg-gray-300";
                          if (idx === homeworkCurrentIndex) bgColor = "bg-blue-600 text-white ring-2 ring-blue-300 ring-offset-1";
                          else if (homeworkEvaluations[idx]?.correct) bgColor = "bg-green-500 text-white";
                          else if (homeworkEvaluations[idx] && !homeworkEvaluations[idx].correct) bgColor = "bg-red-500 text-white";
                          else if (homeworkAnswers[idx] || homeworkImages[idx]) bgColor = "bg-blue-400 text-white";
                          
                          return (
                            <button
                              key={idx}
                              onClick={() => setHomeworkCurrentIndex(idx)}
                              className={`w-10 h-10 rounded-full font-semibold flex items-center justify-center transition-all ${bgColor}`}
                            >
                              {idx + 1}
                            </button>
                          );
                        })}
                      </div>

                      {homeworkQuestions.map((q, idx) => {
                        if (idx !== homeworkCurrentIndex) return null;
                        return (
                        <div key={idx} className="space-y-3 bg-gray-50 p-5 rounded-lg border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-medium text-gray-800"><span className="text-blue-600 mr-2">{q.number || (idx + 1) + '.'}</span><MathText text={q.text} pdfPath={activeHomeworkTask.pdf_materials?.[0]} /></p>
                          {q.solution && (
                            <button
                              onClick={() => setShowHomeworkSolutions(prev => ({ ...prev, [idx]: !prev[idx] }))}
                              className="flex-shrink-0 ml-4 text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                              {showHomeworkSolutions[idx] ? 'Hide Solution' : 'Show Solution'}
                            </button>
                          )}
                        </div>

                        {q.solution && showHomeworkSolutions[idx] && (
                          <div className="p-4 bg-blue-50/50 rounded border border-blue-100 text-sm text-gray-800 mb-4">
                            <h4 className="font-bold text-blue-800 mb-2">Solution:</h4>
                            <MathText text={q.solution} pdfPath={activeHomeworkTask.pdf_materials?.[0]} />
                          </div>
                        )}
                        
                        {q.type === 'mcq' && q.options ? (
                          <div className="space-y-2 mt-3">
                            {q.options.map((opt, optIdx) => (
                              <label key={optIdx} className="flex items-center space-x-3 p-3 rounded-md bg-white border border-gray-200 cursor-pointer hover:bg-blue-50 transition-colors">
                                <input 
                                  type="radio" 
                                  name={`homework_q_${idx}`}
                                  value={opt}
                                  checked={homeworkAnswers[idx] === opt}
                                  onChange={(e) => setHomeworkAnswers({...homeworkAnswers, [idx]: e.target.value})}
                                  disabled={isParent || isTaskCompleted || homeworkEvaluations[idx]?.correct || homeworkAttempts[idx] >= 2}
                                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                                />
                                <span className="text-gray-700"><MathText text={opt} pdfPath={activeHomeworkTask.pdf_materials?.[0]} /></span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-2 mt-3">
                            <textarea
                              value={homeworkAnswers[idx] || ''}
                              onChange={(e) => setHomeworkAnswers({...homeworkAnswers, [idx]: e.target.value})}
                              disabled={isParent || isTaskCompleted || homeworkEvaluations[idx]?.correct || homeworkAttempts[idx] >= 2}
                              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                              rows={4}
                              placeholder={isParent ? "Student's answer will appear here..." : "Type your answer here..."}
                            />
                            <div className="flex items-center gap-4">
                              {!(isParent || isTaskCompleted || homeworkEvaluations[idx]?.correct || homeworkAttempts[idx] >= 2) && (
                              <label className="cursor-pointer flex items-center text-sm font-medium text-blue-600 hover:text-blue-800">
                                <ImageIcon className="w-4 h-4 mr-1" />
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
                                  <img src={`data:image/jpeg;base64,${homeworkImages[idx]}`} alt="uploaded" className="h-16 rounded border border-gray-200" />
                                  {!(isParent || isTaskCompleted || homeworkEvaluations[idx]?.correct || homeworkAttempts[idx] >= 2) && (
                                  <button 
                                    onClick={() => setHomeworkImages(prev => {const newImgs={...prev}; delete newImgs[idx]; return newImgs;})} 
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
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
                          <div className={`mt-3 p-3 rounded-md text-sm font-medium ${homeworkEvaluations[idx].correct ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {homeworkEvaluations[idx].correct ? 'Correct!' : 'Incorrect.'}
                          </div>
                        )}

                        {(homeworkEvaluations[idx]?.correct || (homeworkAttempts[idx] >= 2 && !homeworkEvaluations[idx]?.correct)) && (
                          <div className={`mt-3 p-4 border rounded-lg text-sm text-gray-800 ${homeworkEvaluations[idx]?.correct ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                            <h4 className={`font-bold mb-2 ${homeworkEvaluations[idx]?.correct ? 'text-green-800' : 'text-blue-800'}`}>Correct Answer / Solution:</h4>
                            {q.answer && (
                              <div className="mb-2"><strong>Answer:</strong> <MathText text={q.answer} pdfPath={activeHomeworkTask.pdf_materials?.[0]} /></div>
                            )}
                            {q.solution && (
                              <div><strong>Solution:</strong> <MathText text={q.solution} pdfPath={activeHomeworkTask.pdf_materials?.[0]} /></div>
                            )}
                            {!q.answer && !q.solution && (
                              <div className="text-gray-500 italic">No official solution provided for this question.</div>
                            )}
                          </div>
                        )}

                        {!(isParent || isTaskCompleted || homeworkEvaluations[idx]?.correct || homeworkAttempts[idx] >= 2) && (
                          <div className="mt-4 flex justify-end">
                            <button 
                              onClick={() => submitSingleHomeworkQuestion(idx)}
                              disabled={evaluatingHomework[idx] || (!(homeworkAnswers[idx] || '').trim() && !homeworkImages[idx])}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {evaluatingHomework[idx] && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                              {evaluatingHomework[idx] ? 'Evaluating...' : 'Submit'}
                            </button>
                          </div>
                        )}
                        
                        <ProblemChat key={`homework-chat-${idx}`} question={q} pdfPath={activeHomeworkTask.pdf_materials?.[0]} isParent={isParent} />
                      </div>
                      );
                    })}
                </div>
              )}
            </div>
            {homeworkQuestions.length > 0 && (
              <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50 sm:rounded-b-xl flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0 mt-auto">
                  {homeworkQuestions.length > 0 && (
                    <div className="text-sm text-gray-500 order-2 sm:order-1">
                      {homeworkQuestions.filter((_, i) => homeworkEvaluations[i]?.correct || homeworkAttempts[i] >= 2).length} / {homeworkQuestions.length} completed
                    </div>
                  )}
                  <div className="order-1 sm:order-2 w-full sm:w-auto flex gap-2">
                    {homeworkQuestions.length > 0 && homeworkCurrentIndex > 0 && (
                      <button
                        onClick={() => setHomeworkCurrentIndex(prev => prev - 1)}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 sm:py-2.5 px-4 rounded-lg transition-colors"
                      >
                        Previous
                      </button>
                    )}
                    {homeworkQuestions.length > 0 && homeworkCurrentIndex < homeworkQuestions.length - 1 && (
                      <button
                        onClick={() => setHomeworkCurrentIndex(prev => prev + 1)}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 sm:py-2.5 px-4 rounded-lg transition-colors"
                      >
                        Next
                      </button>
                    )}
                    {homeworkQuestions.every((_, idx) => homeworkEvaluations[idx]?.correct || homeworkAttempts[idx] >= 2) || activeHomeworkTask.homework_status === 'completed' ? (
                      <button 
                        onClick={() => setActiveHomeworkTask(null)}
                        className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 sm:py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center w-full sm:w-auto"
                      >
                        <CheckCircle2 className="w-5 h-5 mr-2" /> All Done! (Close)
                      </button>
                    ) : (
                      <button 
                        onClick={() => setActiveHomeworkTask(null)}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 sm:py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center w-full sm:w-auto"
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
