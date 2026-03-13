import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  LogOut, 
  ClipboardList, 
  BarChart3, 
  User, 
  FileSpreadsheet, 
  CheckCircle2,
  Calendar,
  Clock,
  Type,
  Hash,
  ListTodo,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  ArrowLeft,
  Pencil,
  Users,
  UserPlus,
  UserMinus,
  Link as LinkIcon,
  Globe,
  Download,
  Loader2,
  QrCode,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  AlignLeft,
  Sigma,
  Sparkles,
  FileText
} from 'lucide-react';
import { 
  PieChart as RePieChart, 
  Pie, 
  Cell, 
  BarChart as ReBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  ImageRun, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  AlignmentType, 
  HeadingLevel 
} from 'docx';
import { saveAs } from 'file-saver';
import { GoogleGenAI } from "@google/genai";
import { QRCodeSVG } from 'qrcode.react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Auth Context ---
interface User {
  id: number;
  username: string;
  role: 'admin' | 'respondent';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// --- Components ---

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <nav className="bg-white border-b border-zinc-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <div className="bg-indigo-600 p-2 rounded-lg">
          <ClipboardList className="text-white w-5 h-5" />
        </div>
        <span className="font-bold text-xl tracking-tight text-zinc-900">SurveyMaster Pro</span>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-zinc-600">
          <User className="w-4 h-4" />
          <span className="text-sm font-medium">{user.username} ({user.role})</span>
        </div>
        <button 
          onClick={() => { logout(); navigate('/login'); }}
          className="flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </nav>
  );
};

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
        navigate(data.user.role === 'admin' ? '/admin' : '/survey');
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError('Connection failed');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-zinc-200/50 p-10 border border-zinc-100"
      >
        <div className="text-center mb-10">
          <div className="inline-block bg-indigo-600 p-4 rounded-2xl mb-4">
            <ClipboardList className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900">Welcome Back</h1>
          <p className="text-zinc-500 mt-2">Sign in to manage your surveys</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-2">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="Enter your username"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
          <button 
            type="submit"
            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-200"
          >
            Sign In
          </button>
        </form>

        <p className="text-center mt-8 text-zinc-500 text-sm">
          Don't have an account? <Link to="/register" className="text-indigo-600 font-bold hover:underline">Register here</Link>
        </p>
      </motion.div>
    </div>
  );
};

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        navigate('/login');
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (e) {
      setError('Connection failed');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-zinc-200/50 p-10 border border-zinc-100"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-zinc-900">Create Account</h1>
          <p className="text-zinc-500 mt-2">Join SurveyMaster Pro today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-2">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="Choose a username"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
          <button 
            type="submit"
            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-200"
          >
            Register
          </button>
        </form>

        <p className="text-center mt-8 text-zinc-500 text-sm">
          Already have an account? <Link to="/login" className="text-indigo-600 font-bold hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
};

const AdminDashboard = () => {
  const { token } = useAuth();
  const [surveys, setSurveys] = useState<any[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<any | null>(null);
  const isRTL = selectedSurvey?.language === 'dv';
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState<any | null>(null);
  const [editingSurvey, setEditingSurvey] = useState<any | null>(null);
  const [newSurvey, setNewSurvey] = useState({ title: '', description: '', is_public: false, language: 'en' });

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [respondents, setRespondents] = useState<any[]>([]);
  const [assignedUserIds, setAssignedUserIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'preview' | 'assignments'>('stats');
  const [vizPreferences, setVizPreferences] = useState<Record<number, string>>({});
  const [generatingReport, setGeneratingReport] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean, title: string, message: string, onConfirm: () => void } | null>(null);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  useEffect(() => {
    fetchSurveys();
  }, []);

  useEffect(() => {
    if (selectedSurvey) {
      fetchStats();
      fetchQuestions();
      fetchRespondents();
      fetchAssignments();
    }
  }, [selectedSurvey]);

  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState<{text: string, type: string, options: string[]}>({ text: '', type: 'mcq', options: [''] });

  const handleAddQuestion = async () => {
    if (!selectedSurvey) return;
    try {
      const res = await fetch(`/api/admin/surveys/${selectedSurvey.id}/questions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newQuestion),
      });
      if (res.ok) {
        fetchQuestions();
        setShowAddQuestionModal(false);
        setNewQuestion({ text: '', type: 'mcq', options: [''] });
      }
    } catch (e) {
      console.error('Failed to add question:', e);
    }
  };

  const fetchRespondents = async () => {
    const res = await fetch('/api/admin/respondents', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setRespondents(data);
    }
  };

  const fetchAssignments = async () => {
    if (!selectedSurvey) return;
    const res = await fetch(`/api/admin/surveys/${selectedSurvey.id}/assignments`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setAssignedUserIds(data);
    }
  };

  const calculateNumberStats = (data: { answer: string, count: number }[]) => {
    const values: number[] = [];
    data.forEach(d => {
      const val = parseFloat(d.answer);
      if (!isNaN(val)) {
        for (let i = 0; i < d.count; i++) {
          values.push(val);
        }
      }
    });

    if (values.length === 0) return null;

    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    const counts: Record<number, number> = {};
    let maxCount = 0;
    let modes: number[] = [];
    values.forEach(v => {
      counts[v] = (counts[v] || 0) + 1;
      if (counts[v] > maxCount) {
        maxCount = counts[v];
        modes = [v];
      } else if (counts[v] === maxCount) {
        modes.push(v);
      }
    });

    return { 
      mean: mean.toFixed(2), 
      median: median.toFixed(2), 
      mode: modes.join(', ') 
    };
  };

  const handleToggleAssignment = async (userId: number, isAssigned: boolean) => {
    if (!selectedSurvey) return;
    const endpoint = isAssigned ? 'unassign' : 'assign';
    try {
      const res = await fetch(`/api/admin/surveys/${selectedSurvey.id}/${endpoint}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        fetchAssignments();
      }
    } catch (e) {
      console.error('Failed to toggle assignment:', e);
    }
  };

  const fetchSurveys = async () => {
    const res = await fetch('/api/admin/surveys', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setSurveys(data);
    }
  };

  const generateAIReport = async () => {
    if (!selectedSurvey || stats.length === 0) return;
    setGeneratingReport(true);
    try {
      // 1. Prepare data for Gemini and for the report text
      const questionBreakdown = Array.from(new Set(stats.map(s => s.question_id))).map(qId => {
        const qStats = stats.filter(s => s.question_id === qId);
        const qText = qStats[0]?.text;
        const qType = qStats[0]?.type;
        const total = qStats.reduce((acc, curr) => acc + curr.count, 0);
        
        let details = "";
        if (qType === 'number') {
          const s = calculateNumberStats(qStats);
          details = `Mean: ${s?.mean}, Median: ${s?.median}, Mode: ${s?.mode}`;
        } else {
          details = qStats.map(s => `${s.answer}: ${s.count} (${((s.count / total) * 100).toFixed(1)}%)`).join('\n');
        }
        
        return {
          text: qText,
          type: qType,
          details: details
        };
      });

      const statsSummary = questionBreakdown.map(q => `Question: ${q.text}\nType: ${q.type}\nData: ${q.details}`).join('\n\n');

      const prompt = `Analyze the following survey results for the survey titled "${selectedSurvey.title}". 
      Provide a professional report with the following sections:
      1. Executive Summary: A brief overview of the results.
      2. Key Insights: Use numbered bullets (1., 2., 3., etc.) for each insight.
      3. Recommendations: Use standard bullet points (• or -) for each recommendation.
      
      IMPORTANT: Do NOT use any Markdown formatting symbols like asterisks (*) or hashes (#) in your response. Use plain text only for the content, with clear section titles.
      
      Data:
      ${statsSummary}`;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      let aiAnalysis = response.text || "Failed to generate analysis.";
      // Remove any remaining * or # symbols
      aiAnalysis = aiAnalysis.replace(/[*#]/g, '');

      // 2. Create Word Document
      const sections: any[] = [
        new Paragraph({
          text: `Survey Analysis Report: ${selectedSurvey.title}`,
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          text: `Generated on ${new Date().toLocaleDateString()}`,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ text: "", spacing: { after: 400 } }),
        new Paragraph({
          text: "Executive Summary & AI Analysis",
          heading: HeadingLevel.HEADING_1,
        }),
      ];

      // Add AI Analysis text
      aiAnalysis.split('\n').forEach(line => {
        if (line.trim()) {
          sections.push(new Paragraph({
            children: [new TextRun(line)],
            spacing: { before: 200 },
          }));
        }
      });

      sections.push(new Paragraph({ text: "", spacing: { after: 400 } }));
      sections.push(new Paragraph({
        text: "Detailed Question Breakdown",
        heading: HeadingLevel.HEADING_1,
      }));

      // Add Question Breakdown text
      questionBreakdown.forEach(q => {
        sections.push(new Paragraph({
          children: [new TextRun({ text: q.text, bold: true })],
          spacing: { before: 400 },
        }));
        sections.push(new Paragraph({
          children: [new TextRun({ text: `Type: ${q.type}`, italics: true })],
        }));
        
        q.details.split('\n').forEach(detailLine => {
          sections.push(new Paragraph({
            children: [new TextRun(detailLine)],
            indent: { left: 720 }, // Indent details
          }));
        });
      });

      const doc = new Document({
        sections: [{
          properties: {},
          children: sections,
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${selectedSurvey.title.replace(/\s+/g, '_')}_Analysis_Report.docx`);

    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate AI report. Please try again.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleCreateSurvey = async () => {
    const method = editingSurvey ? 'PUT' : 'POST';
    const url = editingSurvey ? `/api/admin/surveys/${editingSurvey.id}` : '/api/admin/surveys';
    
    const res = await fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(newSurvey),
    });
    if (res.ok) {
      fetchSurveys();
      setShowCreateModal(false);
      setEditingSurvey(null);
      setNewSurvey({ title: '', description: '', is_public: false, language: 'en' });
    }
  };

  const handleEditSurvey = (survey: any) => {
    setEditingSurvey(survey);
    setNewSurvey({ 
      title: survey.title, 
      description: survey.description, 
      is_public: survey.is_public === 1,
      language: survey.language || 'en'
    });
    setShowCreateModal(true);
  };

  const handleDeleteSurvey = async (id: number) => {
    setConfirmModal({
      show: true,
      title: isRTL ? 'ސާވޭ ފޮހެލުން' : 'Delete Survey',
      message: isRTL ? 'މި ސާވޭއާއި މީގެ ހުރިހާ ޑޭޓާއެއް ފޮހެލަން ބޭނުންތަ؟' : 'Delete this survey and all its data?',
      onConfirm: async () => {
        const res = await fetch(`/api/admin/surveys/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          fetchSurveys();
          setConfirmModal(null);
        }
      }
    });
  };

  const handleDownloadResults = async () => {
    if (!selectedSurvey) return;
    try {
      const res = await fetch(`/api/admin/surveys/${selectedSurvey.id}/export`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `survey_results_${selectedSurvey.id}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download results');
      }
    } catch (e) {
      console.error(e);
      alert('An error occurred while downloading results');
    }
  };

  const fetchQuestions = async () => {
    if (!selectedSurvey) return;
    const res = await fetch(`/api/surveys/${selectedSurvey.id}/questions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setQuestions(data);
    }
  };

  const handleUpdateJump = async (optionId: number, nextOrder: number | null) => {
    try {
      const res = await fetch(`/api/admin/options/${optionId}/jump`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ next_question_order: nextOrder }),
      });
      if (res.ok) {
        fetchQuestions();
      }
    } catch (e) {
      console.error('Failed to update jump:', e);
    }
  };

  const handleDeleteQuestion = async (id: number) => {
    setConfirmModal({
      show: true,
      title: isRTL ? 'ސުވާލު ފޮހެލުން' : 'Delete Question',
      message: isRTL ? 'މި ސުވާލު ފޮހެލަން ބޭނުންތަ؟' : 'Are you sure you want to delete this question?',
      onConfirm: async () => {
        if (!selectedSurvey) return;
        try {
          const res = await fetch(`/api/admin/surveys/${selectedSurvey.id}/questions/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            fetchQuestions();
            fetchStats();
            setConfirmModal(null);
          }
        } catch (e) {
          console.error('Failed to delete question:', e);
        }
      }
    });
  };

  const handleClearAll = async () => {
    setConfirmModal({
      show: true,
      title: isRTL ? 'ހުރިހާ ސުވާލެއް ފޮހެލުން' : 'Clear All Questions',
      message: isRTL ? 'ހުރިހާ ސުވާލަކާއި ޖަވާބުތައް ފޮހެލަން ބޭނުންތަ؟' : 'Are you sure you want to delete ALL questions and responses for this survey? This cannot be undone.',
      onConfirm: async () => {
        if (!selectedSurvey) return;
        try {
          const res = await fetch(`/api/admin/surveys/${selectedSurvey.id}/questions`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            fetchQuestions();
            fetchStats();
            setConfirmModal(null);
          }
        } catch (e) {
          console.error('Failed to clear questions:', e);
        }
      }
    });
  };

  const handleReorderQuestion = async (id: number, direction: 'up' | 'down') => {
    if (!selectedSurvey) return;
    try {
      const res = await fetch(`/api/admin/surveys/${selectedSurvey.id}/questions/${id}/reorder`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ direction })
      });
      if (res.ok) {
        fetchQuestions();
      }
    } catch (e) {
      console.error('Failed to reorder question:', e);
    }
  };

  const handleUpdateQuestionType = async (id: number, type: string) => {
    if (!selectedSurvey) return;
    try {
      const res = await fetch(`/api/admin/surveys/${selectedSurvey.id}/questions/${id}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type })
      });
      if (res.ok) {
        fetchQuestions();
        fetchStats();
      }
    } catch (e) {
      console.error('Failed to update question type:', e);
    }
  };

  const fetchStats = async () => {
    if (!selectedSurvey) return;
    const res = await fetch(`/api/admin/surveys/${selectedSurvey.id}/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setStats(data);
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedSurvey) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/admin/surveys/${selectedSurvey.id}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Success! Uploaded ${data.count} questions.`);
        setFile(null);
        fetchStats();
        fetchQuestions();
      } else {
        setMessage(data.error);
      }
    } catch (e) {
      setMessage('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (!selectedSurvey) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-zinc-900">Surveys</h1>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all"
          >
            <Plus className="w-5 h-5" />
            Create Survey
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {surveys.map((survey) => (
            <div key={survey.id} className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-zinc-900">{survey.title}</h3>
                  {survey.is_public === 1 && (
                    <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      PUBLIC
                    </span>
                  )}
                  {survey.language === 'dv' && (
                    <span className="bg-amber-50 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      DV (RTL)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {survey.is_public === 1 && (
                    <>
                      <button 
                        onClick={() => setShowQRModal(survey)}
                        className="text-zinc-300 hover:text-indigo-600 transition-colors"
                        title="Show QR Code"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          const url = `${window.location.origin}/public/survey/${survey.id}`;
                          navigator.clipboard.writeText(url);
                          alert('Public link copied to clipboard!');
                        }}
                        className="text-zinc-300 hover:text-indigo-600 transition-colors"
                        title="Copy Public Link"
                      >
                        <LinkIcon className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => handleEditSurvey(survey)}
                    className="text-zinc-300 hover:text-indigo-600 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteSurvey(survey.id)}
                    className="text-zinc-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-zinc-500 text-sm mb-6 line-clamp-2">{survey.description}</p>
              <button 
                onClick={() => setSelectedSurvey(survey)}
                className="w-full bg-zinc-100 text-zinc-900 font-bold py-3 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"
              >
                Manage Survey
              </button>
            </div>
          ))}
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-6">{editingSurvey ? 'Edit Survey' : 'Create New Survey'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">Title</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newSurvey.title}
                    onChange={(e) => setNewSurvey({ ...newSurvey, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">Description</label>
                  <textarea 
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px]"
                    value={newSurvey.description}
                    onChange={(e) => setNewSurvey({ ...newSurvey, description: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <input 
                    type="checkbox" 
                    id="is_public"
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    checked={newSurvey.is_public}
                    onChange={(e) => setNewSurvey({ ...newSurvey, is_public: e.target.checked })}
                  />
                  <label htmlFor="is_public" className="text-sm font-bold text-zinc-700 cursor-pointer">
                    Public Access
                    <span className="block text-xs font-normal text-zinc-500">Anyone with the link can fill this survey</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">Language</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newSurvey.language}
                    onChange={(e) => setNewSurvey({ ...newSurvey, language: e.target.value })}
                  >
                    <option value="en">English (LTR)</option>
                    <option value="dv">Dhivehi (RTL)</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingSurvey(null);
                      setNewSurvey({ title: '', description: '', is_public: false, language: 'en' });
                    }}
                    className="flex-1 px-4 py-3 rounded-xl font-bold text-zinc-500 hover:bg-zinc-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCreateSurvey}
                    className="flex-1 px-4 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all"
                  >
                    {editingSurvey ? 'Save Changes' : 'Create'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showQRModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white w-full max-w-sm p-8 rounded-3xl shadow-2xl text-center"
            >
              <h2 className="text-2xl font-bold mb-2">{showQRModal.title}</h2>
              <p className="text-zinc-500 text-sm mb-6">Scan this QR code to access the survey</p>
              
              <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100 flex justify-center mb-6">
                <QRCodeSVG 
                  value={`${window.location.origin}/public/survey/${showQRModal.id}`}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => {
                    const svg = document.querySelector('.bg-zinc-50 svg');
                    if (svg) {
                      const svgData = new XMLSerializer().serializeToString(svg);
                      const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
                      const url = URL.createObjectURL(svgBlob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `${showQRModal.title.replace(/\s+/g, '_')}_QR.svg`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }
                  }}
                  className="w-full py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download SVG
                </button>
                <button 
                  onClick={() => setShowQRModal(null)}
                  className="w-full py-3 rounded-xl font-bold text-zinc-500 hover:bg-zinc-100 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedSurvey(null)}
            className="p-2 hover:bg-zinc-100 rounded-lg transition-all"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">{selectedSurvey.title}</h1>
            <p className="text-sm text-zinc-500">Managing survey content and results</p>
          </div>
        </div>
        <div className="flex bg-zinc-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('stats')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === 'stats' ? "bg-white text-indigo-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            Stats & Upload
          </button>
          <button 
            onClick={() => setActiveTab('preview')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === 'preview' ? "bg-white text-indigo-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            Preview Questions
          </button>
          <button 
            onClick={() => setActiveTab('assignments')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === 'assignments' ? "bg-white text-indigo-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            Assignments
          </button>
        </div>
      </div>

      {activeTab === 'assignments' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm"
        >
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Manage Assignments
            </h2>
            <p className="text-sm text-zinc-500">Assign this survey to specific respondents</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {respondents.map((user) => {
              const isAssigned = assignedUserIds.includes(user.id);
              return (
                <div 
                  key={user.id} 
                  className={cn(
                    "p-4 rounded-2xl border transition-all flex items-center justify-between",
                    isAssigned ? "border-indigo-200 bg-indigo-50/50" : "border-zinc-100 bg-zinc-50/30"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                      isAssigned ? "bg-indigo-600 text-white" : "bg-zinc-200 text-zinc-500"
                    )}>
                      {user.username[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900">{user.username}</p>
                      <p className="text-xs text-zinc-500">ID: {user.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleAssignment(user.id, isAssigned)}
                    className={cn(
                      "p-2 rounded-xl transition-all",
                      isAssigned 
                        ? "text-red-600 hover:bg-red-100" 
                        : "text-indigo-600 hover:bg-indigo-100"
                    )}
                    title={isAssigned ? "Unassign" : "Assign"}
                  >
                    {isAssigned ? <UserMinus className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  </button>
                </div>
              );
            })}
            {respondents.length === 0 && (
              <div className="col-span-full text-center py-12 text-zinc-400">
                No respondents found in the system.
              </div>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === 'stats' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
              <h2 className="text-xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
                <Download className="w-5 h-5 text-indigo-600" />
                Export Data
              </h2>
              <p className="text-sm text-zinc-500 mb-6">Download all survey responses as an Excel spreadsheet for analysis.</p>
              <button 
                onClick={handleDownloadResults}
                className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download Results (.xlsx)
              </button>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
              <h2 className="text-xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                Upload Questions
              </h2>
              <p className="text-sm text-zinc-500 mb-6">
                Upload an Excel file with columns: <code className="bg-zinc-100 px-1 rounded">text</code>, <code className="bg-zinc-100 px-1 rounded">type</code>, and <code className="bg-zinc-100 px-1 rounded">options</code>.
              </p>
              
              <div className="space-y-4">
                <label className="block">
                  <div className="border-2 border-dashed border-zinc-200 rounded-2xl p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer group">
                    <FileSpreadsheet className="w-10 h-10 text-zinc-300 group-hover:text-indigo-400 mx-auto mb-3 transition-colors" />
                    <span className="text-sm font-medium text-zinc-600 block">
                      {file ? file.name : 'Select Excel File'}
                    </span>
                    <input 
                      type="file" 
                      accept=".xlsx, .xls" 
                      className="hidden" 
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                  </div>
                </label>

                <button 
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  {uploading ? 'Uploading...' : 'Upload Now'}
                </button>

                {message && (
                  <p className={cn(
                    "text-sm font-medium p-3 rounded-lg text-center",
                    message.includes('Success') ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                  )}>
                    {message}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-indigo-600 p-8 rounded-3xl text-white shadow-lg shadow-indigo-200">
              <h3 className="font-bold text-lg mb-4">Required Format</h3>
              <div className="space-y-4 text-sm text-indigo-100">
                <p>Your Excel file must have these headers:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><span className="font-bold text-white">text</span>: The question</li>
                  <li><span className="font-bold text-white">type</span>: mcq, text, date, time, number</li>
                  <li><span className="font-bold text-white">options</span>: Comma-separated. For branching, use <code className="bg-indigo-700 px-1 rounded">Option [Jump:Order]</code></li>
                </ul>
                <div className="bg-indigo-700/50 p-3 rounded-xl border border-indigo-400/30">
                  <p className="font-mono text-[10px] leading-tight">
                    text | type | options<br/>
                    Do you like cats? | mcq | Yes[Jump:3], No[Jump:4]<br/>
                    What's your cat's name? | text | <br/>
                    Why not? | text | 
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="lg:col-span-2">
            <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm min-h-[600px]">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  Response Statistics
                </h2>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={generateAIReport}
                    disabled={generatingReport || stats.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingReport ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {generatingReport ? 'Analyzing...' : 'AI Analysis Report'}
                  </button>
                  <button 
                    onClick={fetchStats}
                    className="text-sm font-semibold text-zinc-500 hover:text-zinc-700"
                  >
                    Refresh Data
                  </button>
                </div>
              </div>

              {stats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-zinc-400">
                  <BarChart3 className="w-16 h-16 mb-4 opacity-20" />
                  <p>No responses recorded yet.</p>
                </div>
              ) : (
                <div className={cn("space-y-6", isRTL && "font-dhivehi")} dir={isRTL ? 'rtl' : 'ltr'}>
                  {/* Group stats by question */}
                  {Array.from(new Set(stats.map(s => s.question_id))).map((qId: number) => {
                    const qStats = stats.filter(s => s.question_id === qId);
                    const qText = qStats[0]?.text;
                    const qType = qStats[0]?.type;
                    const pref = vizPreferences[qId] || (qType === 'mcq' ? 'bar' : (qType === 'number' ? 'stats' : 'text'));
                    const totalResponses = qStats.reduce((acc, curr) => acc + curr.count, 0);

                    return (
                      <div key={qId} className="question-card border border-zinc-100 rounded-2xl p-6 hover:bg-zinc-50/50 transition-colors bg-white">
                        <div className="flex justify-between items-start mb-6">
                          <h3 className={cn("font-bold text-zinc-800", isRTL && "text-right")}>{qText}</h3>
                          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg ml-4">
                            {qType === 'mcq' && (
                              <>
                                <button 
                                  onClick={() => setVizPreferences({ ...vizPreferences, [qId]: 'bar' })}
                                  className={cn("p-1.5 rounded-md transition-all", pref === 'bar' ? "bg-white shadow-sm text-indigo-600" : "text-zinc-500 hover:text-zinc-800")}
                                >
                                  <BarChartIcon className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => setVizPreferences({ ...vizPreferences, [qId]: 'pie' })}
                                  className={cn("p-1.5 rounded-md transition-all", pref === 'pie' ? "bg-white shadow-sm text-indigo-600" : "text-zinc-500 hover:text-zinc-800")}
                                >
                                  <PieChartIcon className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {qType === 'number' && (
                              <>
                                <button 
                                  onClick={() => setVizPreferences({ ...vizPreferences, [qId]: 'stats' })}
                                  className={cn("p-1.5 rounded-md transition-all", pref === 'stats' ? "bg-white shadow-sm text-indigo-600" : "text-zinc-500 hover:text-zinc-800")}
                                >
                                  <Sigma className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => setVizPreferences({ ...vizPreferences, [qId]: 'bar' })}
                                  className={cn("p-1.5 rounded-md transition-all", pref === 'bar' ? "bg-white shadow-sm text-indigo-600" : "text-zinc-500 hover:text-zinc-800")}
                                >
                                  <BarChartIcon className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button 
                              onClick={() => setVizPreferences({ ...vizPreferences, [qId]: 'text' })}
                              className={cn("p-1.5 rounded-md transition-all", pref === 'text' ? "bg-white shadow-sm text-indigo-600" : "text-zinc-500 hover:text-zinc-800")}
                            >
                              <AlignLeft className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {pref === 'bar' && (
                          <div className="h-[300px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                              <ReBarChart data={qStats}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                                <XAxis dataKey="answer" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                                <Tooltip 
                                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                  formatter={(value: number) => [`${value} (${((value / totalResponses) * 100).toFixed(1)}%)`, 'Count']}
                                />
                                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} label={{ position: 'top', formatter: (val: number) => `${((val / totalResponses) * 100).toFixed(0)}%`, fontSize: 10, fill: '#6366f1' }} />
                              </ReBarChart>
                            </ResponsiveContainer>
                          </div>
                        )}

                        {pref === 'pie' && (
                          <div className="h-[300px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                              <RePieChart>
                                <Pie
                                  data={qStats}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="count"
                                  nameKey="answer"
                                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                >
                                  {qStats.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                  formatter={(value: number) => [`${value} (${((value / totalResponses) * 100).toFixed(1)}%)`, 'Count']}
                                />
                                <Legend />
                              </RePieChart>
                            </ResponsiveContainer>
                          </div>
                        )}

                        {pref === 'stats' && qType === 'number' && (
                          <div className="grid grid-cols-3 gap-4 mt-4">
                            {(() => {
                              const s = calculateNumberStats(qStats);
                              if (!s) return <p className="col-span-3 text-zinc-400">No numeric data</p>;
                              return (
                                <>
                                  <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                                    <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Mean</p>
                                    <p className="text-2xl font-bold text-zinc-900">{s.mean}</p>
                                  </div>
                                  <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                                    <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Median</p>
                                    <p className="text-2xl font-bold text-zinc-900">{s.median}</p>
                                  </div>
                                  <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                                    <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Mode</p>
                                    <p className="text-2xl font-bold text-zinc-900">{s.mode}</p>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        )}

                        {pref === 'text' && (
                          <div className="space-y-3 mt-4">
                            {qStats.map((s, idx) => (
                              <div key={idx} className={cn("flex items-center justify-between p-3 rounded-xl bg-white border border-zinc-100", isRTL && "flex-row-reverse")}>
                                <div className={cn("flex flex-col", isRTL && "text-right")}>
                                  <span className="text-sm text-zinc-700 font-medium">{s.answer}</span>
                                  <span className="text-[10px] text-zinc-400">{((s.count / totalResponses) * 100).toFixed(1)}% of total</span>
                                </div>
                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md ml-4">{s.count} {s.count === 1 ? 'response' : 'responses'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className={cn("bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm min-h-[600px]", isRTL && "font-dhivehi")} dir={isRTL ? 'rtl' : 'ltr'}>
          <div className={cn("flex justify-between items-center mb-8", isRTL && "flex-row-reverse")}>
            <h2 className={cn("text-xl font-bold text-zinc-900 flex items-center gap-2", isRTL && "flex-row-reverse")}>
              <ClipboardList className="w-5 h-5 text-indigo-600" />
              {isRTL ? 'ސުވާލުތަކުގެ ޕްރިވިއު' : 'Question Preview'}
            </h2>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowAddQuestionModal(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all"
              >
                <Plus className="w-4 h-4" />
                {isRTL ? 'ސުވާލެއް އިތުރުކުރޭ' : 'Add Question'}
              </button>
              <button 
                onClick={handleClearAll}
                className="text-sm font-semibold text-red-600 hover:text-red-700 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </button>
              <button 
                onClick={fetchQuestions}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Refresh Questions
              </button>
            </div>
          </div>

          {questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-zinc-400">
              <ClipboardList className="w-16 h-16 mb-4 opacity-20" />
              <p>No questions uploaded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {questions.map((q, idx) => (
                <motion.div 
                  key={q.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-6 rounded-2xl border border-zinc-100 bg-zinc-50/30"
                >
                  <div className={cn("flex items-center justify-between mb-4", isRTL && "flex-row-reverse")}>
                    <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                      <select
                        value={q.type}
                        onChange={(e) => handleUpdateQuestionType(q.id, e.target.value)}
                        className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider outline-none border-none cursor-pointer hover:bg-indigo-100 transition-all appearance-none"
                      >
                        <option value="mcq">MCQ</option>
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="time">Time</option>
                      </select>
                      <span className="text-xs text-zinc-400 font-mono">#{q.question_order + 1}</span>
                    </div>
                    <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                      <button 
                        onClick={() => handleReorderQuestion(q.id, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-zinc-300 hover:text-indigo-600 disabled:opacity-0 transition-all"
                        title="Move Up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleReorderQuestion(q.id, 'down')}
                        disabled={idx === questions.length - 1}
                        className="p-1 text-zinc-300 hover:text-indigo-600 disabled:opacity-0 transition-all"
                        title="Move Down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete Question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className={cn("font-bold text-zinc-800 mb-4", isRTL && "text-right")}>{q.text}</h3>
                  {q.type === 'mcq' && q.options && (
                    <div className="space-y-3">
                      {q.options.map((opt: any) => (
                        <div key={opt.id} className={cn("text-sm text-zinc-600 flex flex-col gap-2 p-3 rounded-xl bg-white border border-zinc-100", isRTL && "text-right")}>
                          <div className={cn("flex items-center gap-2 font-medium", isRTL && "flex-row-reverse")}>
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                            {opt.text}
                          </div>
                          <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                            <span className="text-[10px] text-zinc-400 uppercase font-bold">{isRTL ? 'ދާންވީ ސުވާލު:' : 'Jump to:'}</span>
                            <select 
                              value={opt.next_question_order === null ? 'none' : opt.next_question_order}
                              onChange={(e) => {
                                const val = e.target.value === 'none' ? null : parseInt(e.target.value);
                                handleUpdateJump(opt.id, val);
                              }}
                              className="text-[10px] bg-zinc-50 border border-zinc-200 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="none">{isRTL ? 'ޖެހިގެން އިން ސުވާލު' : 'Next Question'}</option>
                              {questions.map((targetQ) => (
                                <option key={targetQ.id} value={targetQ.question_order}>
                                  #{targetQ.question_order + 1}: {targetQ.text.substring(0, 20)}...
                                </option>
                              ))}
                              <option value={questions.length}>End Survey</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {q.type !== 'mcq' && (
                    <div className="text-xs italic text-zinc-400">
                      {q.type === 'text' && 'Open text response'}
                      {q.type === 'date' && 'Date picker input'}
                      {q.type === 'time' && 'Time picker input'}
                      {q.type === 'number' && 'Numeric input only'}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAddQuestionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-lg p-8 rounded-3xl shadow-2xl"
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <h2 className="text-2xl font-bold mb-6">{isRTL ? 'އާ ސުވާލެއް ހަދާ' : 'Add New Question'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">{isRTL ? 'ސުވާލު' : 'Question Text'}</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newQuestion.text}
                  onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                  placeholder={isRTL ? 'ސުވާލު ލިޔުއްވާ' : 'Enter question text'}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">{isRTL ? 'ބާވަތް' : 'Question Type'}</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'mcq', label: isRTL ? 'އިޚްތިޔާރީ' : 'Multiple Choice', icon: ListTodo },
                    { id: 'text', label: isRTL ? 'ލިޔުން' : 'Text Input', icon: Type },
                    { id: 'number', label: isRTL ? 'ނަންބަރު' : 'Number Input', icon: Hash },
                    { id: 'date', label: isRTL ? 'ތާރީޚް' : 'Date Input', icon: Calendar },
                    { id: 'time', label: isRTL ? 'ގަޑި' : 'Time Input', icon: Clock },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setNewQuestion({ ...newQuestion, type: t.id })}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-xl border transition-all text-sm font-bold",
                        newQuestion.type === t.id 
                          ? "border-indigo-600 bg-indigo-50 text-indigo-600" 
                          : "border-zinc-100 bg-zinc-50 text-zinc-500 hover:border-zinc-200"
                      )}
                    >
                      <t.icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {newQuestion.type === 'mcq' && (
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-zinc-700 mb-1">{isRTL ? 'އިޚްތިޔާރުތައް' : 'Options'}</label>
                  {newQuestion.options.map((opt, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input 
                        type="text" 
                        className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...newQuestion.options];
                          newOpts[idx] = e.target.value;
                          setNewQuestion({ ...newQuestion, options: newOpts });
                        }}
                        placeholder={`${isRTL ? 'އިޚްތިޔާރު' : 'Option'} ${idx + 1}`}
                      />
                      {newQuestion.options.length > 1 && (
                        <button 
                          onClick={() => {
                            const newOpts = newQuestion.options.filter((_, i) => i !== idx);
                            setNewQuestion({ ...newQuestion, options: newOpts });
                          }}
                          className="p-2 text-zinc-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button 
                    onClick={() => setNewQuestion({ ...newQuestion, options: [...newQuestion.options, ''] })}
                    className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mt-2"
                  >
                    <Plus className="w-4 h-4" />
                    {isRTL ? 'އިތުރު އިޚްތިޔާރެއް' : 'Add Option'}
                  </button>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => {
                    setShowAddQuestionModal(false);
                    setNewQuestion({ text: '', type: 'mcq', options: [''] });
                  }}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-zinc-500 hover:bg-zinc-100 transition-all"
                >
                  {isRTL ? 'ކެންސަލް' : 'Cancel'}
                </button>
                <button 
                  onClick={handleAddQuestion}
                  disabled={!newQuestion.text || (newQuestion.type === 'mcq' && newQuestion.options.some(o => !o))}
                  className="flex-1 px-4 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  {isRTL ? 'އިތުރުކުރޭ' : 'Add Question'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-sm p-8 rounded-3xl shadow-2xl text-center"
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{confirmModal.title}</h2>
            <p className="text-zinc-500 text-sm mb-8">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-3 rounded-xl font-bold text-zinc-500 hover:bg-zinc-100 transition-all"
              >
                {isRTL ? 'ކެންސަލް' : 'Cancel'}
              </button>
              <button 
                onClick={confirmModal.onConfirm}
                className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-all"
              >
                {isRTL ? 'ފޮހެލާ' : 'Delete'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const RespondentDashboard = () => {
  const { token } = useAuth();
  const [surveys, setSurveys] = useState<any[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<number[]>([]);

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/surveys', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSurveys(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async (surveyId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/surveys/${surveyId}/questions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSurvey = (survey: any) => {
    setSelectedSurvey(survey);
    fetchQuestions(survey.id);
  };

  const currentQuestion = questions[currentIndex];

  const handleNext = () => {
    if (!answers[currentQuestion.id]) {
      alert('Please answer the question before proceeding.');
      return;
    }

    let nextIndex = currentIndex + 1;

    // Check for branching logic
    if (currentQuestion.type === 'mcq') {
      const selectedOpt = currentQuestion.options.find((o: any) => o.text === answers[currentQuestion.id]);
      if (selectedOpt && selectedOpt.next_question_order !== null) {
        nextIndex = selectedOpt.next_question_order;
      }
    }

    setHistory([...history, currentIndex]);
    setCurrentIndex(nextIndex);
  };

  const handleBack = () => {
    if (history.length === 0) return;
    const prevIndex = history[history.length - 1];
    setHistory(history.slice(0, -1));
    setCurrentIndex(prevIndex);
  };

  const handleSubmit = async () => {
    if (!answers[currentQuestion.id]) {
      alert('Please answer the final question before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      // We only submit the answers that were actually reached in the flow
      const reachedQuestionIds = [...history, currentIndex].map(idx => questions[idx].id);
      const payload = reachedQuestionIds.map(id => ({
        questionId: id,
        answer: answers[id]
      }));

      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answers: payload }),
      });

      if (res.ok) {
        setSubmitted(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center mt-20">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-12 rounded-3xl border border-zinc-200 shadow-sm"
        >
          <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="text-emerald-600 w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">Thank You!</h2>
          <p className="text-zinc-500 mb-8">Your responses have been successfully recorded. We appreciate your time.</p>
          <button 
            onClick={() => window.location.reload()}
            className="text-indigo-600 font-bold hover:underline"
          >
            Submit another response
          </button>
        </motion.div>
      </div>
    );
  }

  if (!selectedSurvey) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold text-zinc-900 mb-8">Available Surveys</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {surveys.map((survey) => (
            <div key={survey.id} className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-md transition-all">
              <h3 className="text-2xl font-bold text-zinc-900 mb-2">{survey.title}</h3>
              <p className="text-zinc-500 mb-8">{survey.description}</p>
              <button 
                onClick={() => handleSelectSurvey(survey)}
                className="bg-indigo-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-indigo-700 transition-all"
              >
                Start Survey
              </button>
            </div>
          ))}
          {surveys.length === 0 && (
            <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-dashed border-zinc-200">
              <ClipboardList className="w-16 h-16 text-zinc-200 mx-auto mb-4" />
              <p className="text-zinc-400 font-medium">No surveys available at the moment.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isLastQuestion = currentIndex >= questions.length - 1 || 
    (currentQuestion.type === 'mcq' && 
     currentQuestion.options.find((o: any) => o.text === answers[currentQuestion.id])?.next_question_order >= questions.length);

  const isRTL = selectedSurvey?.language === 'dv';

  return (
    <div className={cn("max-w-3xl mx-auto p-8 pb-24", isRTL && "font-dhivehi")} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedSurvey(null)}
            className="p-2 hover:bg-zinc-100 rounded-lg transition-all"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className={cn(isRTL && "text-right")}>
            <h1 className="text-3xl font-bold text-zinc-900 mb-2">{selectedSurvey.title}</h1>
            <p className="text-zinc-500">
              {isRTL ? `ސުވާލު ${currentIndex + 1} އިން ${questions.length}` : `Question ${currentIndex + 1} of ${questions.length}`}
            </p>
          </div>
        </div>
        <div className="w-32 h-2 bg-zinc-100 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-indigo-600"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <motion.div 
        key={currentQuestion.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-md transition-all"
      >
        <div className={cn("flex items-start gap-4 mb-8", isRTL && "flex-row-reverse")}>
          <span className="bg-indigo-50 text-indigo-600 font-bold w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg">
            {currentIndex + 1}
          </span>
          <h3 className={cn("text-xl font-bold text-zinc-800 pt-1 leading-tight", isRTL && "text-right flex-1")}>{currentQuestion.text}</h3>
        </div>

        <div className="space-y-6">
          {currentQuestion.type === 'mcq' && (
            <div className="grid grid-cols-1 gap-3">
              {currentQuestion.options.map((opt: any) => (
                <label key={opt.text} className={cn(
                  "flex items-center gap-4 p-5 rounded-2xl border transition-all cursor-pointer group",
                  answers[currentQuestion.id] === opt.text 
                    ? "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600" 
                    : "border-zinc-100 hover:border-indigo-200 hover:bg-zinc-50",
                  isRTL && "flex-row-reverse"
                )}>
                  <input 
                    type="radio" 
                    name={`q-${currentQuestion.id}`} 
                    value={opt.text}
                    checked={answers[currentQuestion.id] === opt.text}
                    onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
                    className="w-5 h-5 text-indigo-600 border-zinc-300 focus:ring-indigo-500"
                  />
                  <span className={cn(
                    "font-bold transition-colors flex-1",
                    answers[currentQuestion.id] === opt.text ? "text-indigo-900" : "text-zinc-700",
                    isRTL && "text-right"
                  )}>{opt.text}</span>
                </label>
              ))}
            </div>
          )}

          {currentQuestion.type === 'text' && (
            <div className="relative">
              <Type className={cn("absolute top-5 w-6 h-6 text-zinc-400 pointer-events-none", isRTL ? "right-5" : "left-5")} />
              <textarea 
                className={cn(
                  "w-full pr-6 py-5 rounded-2xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all min-h-[160px] text-lg",
                  isRTL ? "pr-14 pl-6 text-right" : "pl-14 pr-6"
                )}
                placeholder={isRTL ? "ޖަވާބު މިތާ ލިޔުއްވާ..." : "Type your answer here..."}
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
              />
            </div>
          )}

          {currentQuestion.type === 'date' && (
            <div className="relative">
              <Calendar className={cn("absolute top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-400 pointer-events-none", isRTL ? "right-5" : "left-5")} />
              <input 
                type="date" 
                className={cn(
                  "w-full pr-6 py-5 rounded-2xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg",
                  isRTL ? "pr-14 pl-6 text-right" : "pl-14 pr-6"
                )}
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
              />
            </div>
          )}

          {currentQuestion.type === 'time' && (
            <div className="relative">
              <Clock className={cn("absolute top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-400 pointer-events-none", isRTL ? "right-5" : "left-5")} />
              <input 
                type="time" 
                className={cn(
                  "w-full pr-6 py-5 rounded-2xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg",
                  isRTL ? "pr-14 pl-6 text-right" : "pl-14 pr-6"
                )}
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
              />
            </div>
          )}

          {currentQuestion.type === 'number' && (
            <div className="relative">
              <Hash className={cn("absolute top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-400 pointer-events-none", isRTL ? "right-5" : "left-5")} />
              <input 
                type="number" 
                className={cn(
                  "w-full pr-6 py-5 rounded-2xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg",
                  isRTL ? "pr-14 pl-6 text-right" : "pl-14 pr-6"
                )}
                placeholder="0"
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
              />
            </div>
          )}
        </div>
      </motion.div>

      <div className="mt-12 flex items-center justify-between">
        <button 
          onClick={handleBack}
          disabled={history.length === 0}
          className={cn(
            "flex items-center gap-2 text-zinc-500 font-bold hover:text-zinc-800 disabled:opacity-0 transition-all",
            isRTL && "flex-row-reverse"
          )}
        >
          {isRTL ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {isRTL ? 'ފަހަތަށް' : 'Back'}
        </button>

        {!isLastQuestion ? (
          <button 
            onClick={handleNext}
            className={cn(
              "bg-indigo-600 text-white font-bold px-10 py-4 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-xl shadow-indigo-200 flex items-center gap-2",
              isRTL && "flex-row-reverse"
            )}
          >
            {isRTL ? 'ކުރިއަށް' : 'Next Question'}
            {isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        ) : (
          <button 
            onClick={handleSubmit}
            disabled={submitting}
            className={cn(
              "bg-emerald-600 text-white font-bold px-10 py-4 rounded-2xl hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-xl shadow-emerald-200 flex items-center gap-2",
              isRTL && "flex-row-reverse"
            )}
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            {submitting ? (isRTL ? 'ފޮނުވަނީ...' : 'Submitting...') : (isRTL ? 'ނިންމާލާ' : 'Complete Survey')}
          </button>
        )}
      </div>
    </div>
  );
};

// --- Main App ---

const PublicSurvey = () => {
  const { id } = useParams();
  const [survey, setSurvey] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSurvey();
  }, [id]);

  const fetchSurvey = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/surveys/${id}`);
      if (!res.ok) throw new Error('Survey not found or not public');
      const data = await res.json();
      setSurvey(data);
      
      const qRes = await fetch(`/api/public/surveys/${id}/questions`);
      if (!qRes.ok) throw new Error('Failed to load questions');
      const qData = await qRes.json();
      setQuestions(qData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    const currentQuestion = questions[currentIndex];
    if (!answers[currentQuestion.id]) {
      alert('Please answer the question before proceeding.');
      return;
    }

    let nextIndex = currentIndex + 1;
    if (currentQuestion.type === 'mcq') {
      const selectedOpt = currentQuestion.options.find((o: any) => o.text === answers[currentQuestion.id]);
      if (selectedOpt && selectedOpt.next_question_order !== null) {
        nextIndex = selectedOpt.next_question_order;
      }
    }

    setHistory([...history, currentIndex]);
    setCurrentIndex(nextIndex);
  };

  const handleBack = () => {
    if (history.length === 0) return;
    const prevIndex = history[history.length - 1];
    setHistory(history.slice(0, -1));
    setCurrentIndex(prevIndex);
  };

  const handleSubmit = async () => {
    const currentQuestion = questions[currentIndex];
    if (!answers[currentQuestion.id]) {
      alert('Please answer the final question before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const reachedQuestionIds = [...history, currentIndex].map(idx => questions[idx].id);
      const payload: Record<number, string> = {};
      reachedQuestionIds.forEach(id => {
        payload[id] = answers[id];
      });

      const res = await fetch(`/api/public/surveys/${id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: payload }),
      });

      if (res.ok) {
        setSubmitted(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-8">
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm text-center max-w-md">
          <h2 className="text-2xl font-bold text-zinc-900 mb-4">Error</h2>
          <p className="text-zinc-500 mb-6">{error}</p>
          <Link to="/" className="text-indigo-600 font-bold hover:underline">Go Home</Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-8">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-12 rounded-3xl border border-zinc-200 shadow-sm text-center max-w-2xl"
        >
          <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="text-emerald-600 w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">Thank You!</h2>
          <p className="text-zinc-500">Your responses have been successfully recorded. We appreciate your time.</p>
        </motion.div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex >= questions.length - 1 || 
    (currentQuestion.type === 'mcq' && 
     currentQuestion.options.find((o: any) => o.text === answers[currentQuestion.id])?.next_question_order >= questions.length);

  const isRTL = survey?.language === 'dv';

  return (
    <div className={cn("min-h-screen bg-zinc-50 py-12 px-4", isRTL && "font-dhivehi")} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-10 flex items-center justify-between">
          <div className={cn(isRTL && "text-right")}>
            <h1 className="text-3xl font-bold text-zinc-900 mb-2">{survey.title}</h1>
            <p className="text-zinc-500">
              {isRTL ? `ސުވާލު ${currentIndex + 1} އިން ${questions.length}` : `Question ${currentIndex + 1} of ${questions.length}`}
            </p>
          </div>
          <div className="w-32 h-2 bg-zinc-200 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-indigo-600"
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        <motion.div 
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm"
        >
          <div className={cn("flex items-start gap-4 mb-8", isRTL && "flex-row-reverse")}>
            <span className="bg-indigo-50 text-indigo-600 font-bold w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg">
              {currentIndex + 1}
            </span>
            <h3 className={cn("text-xl font-bold text-zinc-800 pt-1 leading-tight", isRTL && "text-right flex-1")}>{currentQuestion.text}</h3>
          </div>

          <div className="space-y-6">
            {currentQuestion.type === 'mcq' && (
              <div className="grid grid-cols-1 gap-3">
                {currentQuestion.options.map((opt: any) => (
                  <label key={opt.text} className={cn(
                    "flex items-center gap-4 p-5 rounded-2xl border transition-all cursor-pointer group",
                    answers[currentQuestion.id] === opt.text 
                      ? "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600" 
                      : "border-zinc-100 hover:border-indigo-200 hover:bg-zinc-50",
                    isRTL && "flex-row-reverse"
                  )}>
                    <input 
                      type="radio" 
                      name={`q-${currentQuestion.id}`} 
                      value={opt.text}
                      checked={answers[currentQuestion.id] === opt.text}
                      onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
                      className="w-5 h-5 text-indigo-600 border-zinc-300 focus:ring-indigo-500"
                    />
                    <span className={cn(
                      "font-bold transition-colors flex-1",
                      answers[currentQuestion.id] === opt.text ? "text-indigo-900" : "text-zinc-700",
                      isRTL && "text-right"
                    )}>{opt.text}</span>
                  </label>
                ))}
              </div>
            )}

            {currentQuestion.type === 'text' && (
              <div className="relative">
                <Type className={cn("absolute top-5 w-6 h-6 text-zinc-400 pointer-events-none", isRTL ? "right-5" : "left-5")} />
                <textarea 
                  className={cn(
                    "w-full pr-6 py-5 rounded-2xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all min-h-[160px] text-lg",
                    isRTL ? "pr-14 pl-6 text-right" : "pl-14 pr-6"
                  )}
                  placeholder={isRTL ? "ޖަވާބު މިތާ ލިޔުއްވާ..." : "Type your answer here..."}
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
                />
              </div>
            )}

            {currentQuestion.type === 'date' && (
              <div className="relative">
                <Calendar className={cn("absolute top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-400 pointer-events-none", isRTL ? "right-5" : "left-5")} />
                <input 
                  type="date" 
                  className={cn(
                    "w-full pr-6 py-5 rounded-2xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg",
                    isRTL ? "pr-14 pl-6 text-right" : "pl-14 pr-6"
                  )}
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
                />
              </div>
            )}

            {currentQuestion.type === 'time' && (
              <div className="relative">
                <Clock className={cn("absolute top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-400 pointer-events-none", isRTL ? "right-5" : "left-5")} />
                <input 
                  type="time" 
                  className={cn(
                    "w-full pr-6 py-5 rounded-2xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg",
                    isRTL ? "pr-14 pl-6 text-right" : "pl-14 pr-6"
                  )}
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
                />
              </div>
            )}

            {currentQuestion.type === 'number' && (
              <div className="relative">
                <Hash className={cn("absolute top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-400 pointer-events-none", isRTL ? "right-5" : "left-5")} />
                <input 
                  type="number" 
                  className={cn(
                    "w-full pr-6 py-5 rounded-2xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg",
                    isRTL ? "pr-14 pl-6 text-right" : "pl-14 pr-6"
                  )}
                  placeholder="0"
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
                />
              </div>
            )}
          </div>
        </motion.div>

        <div className="mt-12 flex items-center justify-between">
          <button 
            onClick={handleBack}
            disabled={history.length === 0}
            className={cn(
              "flex items-center gap-2 text-zinc-500 font-bold hover:text-zinc-800 disabled:opacity-0 transition-all",
              isRTL && "flex-row-reverse"
            )}
          >
            {isRTL ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            {isRTL ? 'ފަހަތަށް' : 'Back'}
          </button>

          {!isLastQuestion ? (
            <button 
              onClick={handleNext}
              className={cn(
                "bg-indigo-600 text-white font-bold px-10 py-4 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-xl shadow-indigo-200 flex items-center gap-2",
                isRTL && "flex-row-reverse"
              )}
            >
              {isRTL ? 'ކުރިއަށް' : 'Next Question'}
              {isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          ) : (
            <button 
              onClick={handleSubmit}
              disabled={submitting}
              className={cn(
                "bg-emerald-600 text-white font-bold px-10 py-4 rounded-2xl hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-xl shadow-emerald-200 flex items-center gap-2",
                isRTL && "flex-row-reverse"
              )}
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              {submitting ? (isRTL ? 'ފޮނުވަނީ...' : 'Submitting...') : (isRTL ? 'ނިންމާލާ' : 'Complete Survey')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const PrivateRoute: React.FC<{ children: React.ReactNode, role?: string }> = ({ children, role }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/survey'} />;
  
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
          <Navbar />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/public/survey/:id" element={<PublicSurvey />} />
            <Route 
              path="/admin" 
              element={
                <PrivateRoute role="admin">
                  <AdminDashboard />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/survey" 
              element={
                <PrivateRoute role="respondent">
                  <RespondentDashboard />
                </PrivateRoute>
              } 
            />
            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
