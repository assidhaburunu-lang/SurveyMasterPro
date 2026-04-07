import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Key,
  Upload, 
  LogOut, 
  ClipboardList, 
  BarChart3, 
  TrendingUp,
  User, 
  FileSpreadsheet, 
  CheckCircle2,
  CheckSquare,
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
  FileText,
  FolderPlus,
  Folder,
  X,
  Filter
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
import * as XLSX from 'xlsx';
import { GoogleGenAI } from "@google/genai";
import { QRCodeSVG } from 'qrcode.react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  GoogleAuthProvider,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
  collectionGroup
} from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';

// --- Error Handling for Firestore ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

// --- Auth Context ---
interface User {
  uid: string;
  email: string | null;
  username: string;
  role: 'admin' | 'respondent';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Check if user document exists in Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          setUser(userSnap.data() as User);
        } else {
          // Create new user document
          const isDefaultAdmin = firebaseUser.email === "rannamaari@gmail.com";
          const newUser: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            role: isDefaultAdmin ? 'admin' : 'respondent'
          };
          await setDoc(userRef, {
            ...newUser,
            createdAt: serverTimestamp()
          });
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
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
  const location = useLocation();

  // Hide navbar on public survey pages and respondent dashboard
  if (location.pathname.startsWith('/public/survey/') || location.pathname === '/survey') {
    return null;
  }

  return (
    <nav className="bg-white border-b border-zinc-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <div className="bg-indigo-600 p-2 rounded-lg cursor-pointer flex items-center gap-2" onClick={() => navigate('/')}>
          <div className="relative">
            <BarChart3 className="text-white w-5 h-5" />
            <TrendingUp className="text-white w-2.5 h-2.5 absolute -top-0.5 -right-0.5" />
          </div>
        </div>
        <span className="font-black text-xl tracking-tight text-zinc-900 uppercase">Survey Master Pro</span>
      </div>
      <div className="flex items-center gap-6">
        {user ? (
          <>
            <div className="flex items-center gap-2 text-zinc-600">
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">{user.username} ({user.role})</span>
            </div>
            <button 
              onClick={async () => { await logout(); navigate('/login'); }}
              className="flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </>
        ) : (
          <Link 
            to="/login" 
            className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
};

const LandingPage = () => {
  return (
    <div className="min-h-[calc(100vh-73px)] bg-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full text-sm font-bold mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Next-Generation Research Platform</span>
          </div>
          <h1 className="text-6xl font-black text-zinc-900 tracking-tight leading-[1.1] mb-6 uppercase">
            Survey <span className="text-indigo-600">Master</span> Pro
          </h1>
          <p className="text-xl text-zinc-600 leading-relaxed mb-10 max-w-xl">
            Empower your research with the most comprehensive survey platform. 
            Bulk-upload questions from Excel, manage complex branching logic, 
            and gather insights with professional-grade analytics.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link 
              to="/login" 
              className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-2xl shadow-indigo-200 flex items-center gap-2"
            >
              Get Started Now
              <ChevronRight className="w-5 h-5" />
            </Link>
            <Link 
              to="/enumerator-login" 
              className="bg-white text-zinc-700 border border-zinc-200 px-10 py-5 rounded-2xl font-bold text-lg hover:bg-zinc-50 transition-all flex items-center gap-2"
            >
              Enumerator Login
              <Users className="w-5 h-5" />
            </Link>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
        >
          <div className="absolute -inset-4 bg-indigo-600/5 rounded-[40px] blur-3xl" />
          <div className="relative bg-white rounded-[40px] border border-zinc-100 shadow-2xl overflow-hidden aspect-video lg:aspect-square">
            <img 
              src="/SMP-logo.png" 
              alt="Survey Master Pro Research Analytics" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute bottom-8 left-8 right-8 text-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 backdrop-blur-md p-2 rounded-lg">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <span className="font-black uppercase tracking-widest text-sm">Survey Master Pro</span>
              </div>
              <p className="text-white/80 font-medium">Professional Survey Software for Researchers</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Features Section */}
      <div id="features" className="bg-zinc-50 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl font-black text-zinc-900 mb-6 uppercase">Why Choose Survey Master Pro?</h2>
            <p className="text-zinc-600 text-lg">
              Designed for researchers who need more than just a simple form. 
              Our platform provides the tools necessary for deep data collection and analysis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <FileSpreadsheet className="w-8 h-8 text-indigo-600" />,
                title: "Excel Bulk Upload",
                desc: "Import hundreds of questions instantly from your existing spreadsheets. No more manual entry."
              },
              {
                icon: <Users className="w-8 h-8 text-indigo-600" />,
                title: "Advanced Role Management",
                desc: "Separate admins from respondents. Assign specific surveys to specific users with ease."
              },
              {
                icon: <PieChartIcon className="w-8 h-8 text-indigo-600" />,
                title: "Real-time Analytics",
                desc: "Visualize your data as it comes in. Export results to Excel for further deep-dive analysis."
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-10 rounded-[32px] border border-zinc-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <div className="bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-8">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 mb-4">{feature.title}</h3>
                <p className="text-zinc-600 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const EnumeratorLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [matchingSurveys, setMatchingSurveys] = useState<any[]>([]);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMatchingSurveys([]);

    try {
      const q = query(
        collectionGroup(db, 'enumerator_users'),
        where('username', '==', username),
        where('password', '==', password)
      );
      
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setError('Invalid username or password');
        setLoading(false);
        return;
      }

      const surveys = await Promise.all(snap.docs.map(async (userDoc) => {
        const surveyRef = userDoc.ref.parent.parent;
        if (!surveyRef) return null;
        const surveySnap = await getDoc(surveyRef);
        if (!surveySnap.exists()) return null;
        return { id: surveySnap.id, ...surveySnap.data() };
      }));

      const validSurveys = surveys.filter(s => s !== null);

      if (validSurveys.length === 0) {
        setError('No active surveys found for these credentials');
      } else if (validSurveys.length === 1) {
        // Auto-login and redirect
        const surveyId = validSurveys[0].id;
        sessionStorage.setItem(`enumerator_auth_${surveyId}`, JSON.stringify({ username, password }));
        navigate(`/public/survey/${surveyId}`);
      } else {
        // Multiple surveys found, let user choose
        // Sort by title alphabetically
        const sortedSurveys = validSurveys.sort((a: any, b: any) => {
          return a.title.localeCompare(b.title);
        });
        setMatchingSurveys(sortedSurveys);
      }
    } catch (e: any) {
      console.error('Enumerator login error:', e);
      if (e.message?.includes('index')) {
        setError('System configuration error: Missing database index. Please contact administrator.');
      } else {
        setError('An error occurred during login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const selectSurvey = (surveyId: string) => {
    sessionStorage.setItem(`enumerator_auth_${surveyId}`, JSON.stringify({ username, password }));
    navigate(`/public/survey/${surveyId}`);
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-zinc-200/50 p-10 border border-zinc-100"
      >
        <div className="text-center mb-8">
          <div className="inline-block bg-indigo-50 p-4 rounded-2xl mb-4">
            <Users className="text-indigo-600 w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900">Enumerator Login</h2>
          <p className="text-zinc-500 mt-2">Enter your assigned credentials</p>
        </div>

        {matchingSurveys.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm font-bold text-zinc-700 mb-2">Multiple surveys found. Please select one:</p>
            {matchingSurveys.map(survey => (
              <button
                key={survey.id}
                onClick={() => selectSurvey(survey.id)}
                className="w-full p-4 text-left rounded-xl border border-zinc-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
              >
                <p className="font-bold group-hover:opacity-80" style={{ color: survey.titleColor || '#18181b' }}>{survey.title}</p>
                <p className="text-xs text-zinc-500 line-clamp-1">{survey.description}</p>
              </button>
            ))}
            <button 
              onClick={() => setMatchingSurveys([])}
              className="w-full text-zinc-500 text-sm font-bold mt-4"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1">Username</label>
              <input 
                type="text" 
                required
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1">Password</label>
              <input 
                type="password" 
                required
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
              {loading ? 'Logging in...' : 'Login to Survey'}
            </button>
          </form>
        )}
        
        <div className="mt-8 pt-8 border-t border-zinc-100 text-center">
          <Link to="/" className="text-zinc-500 text-sm hover:text-indigo-600 font-medium transition-colors">
            Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

const LoginPage = () => {
  const [error, setError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const { loginWithGoogle, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' ? '/admin' : '/survey');
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    setLoggingIn(true);
    setError('');
    try {
      await loginWithGoogle();
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoggingIn(false);
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
          <div className="inline-block bg-gradient-to-br from-indigo-600 to-cyan-500 p-4 rounded-2xl mb-4 shadow-lg shadow-indigo-200">
            <div className="relative">
              <BarChart3 className="text-white w-10 h-10" />
              <TrendingUp className="text-white w-5 h-5 absolute -top-1 -right-1" />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 uppercase">Survey Master Pro</h1>
          <p className="text-zinc-500 mt-2 font-medium">Professional Survey Software for Researchers</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={loggingIn}
            className="w-full flex items-center justify-center gap-3 bg-white border border-zinc-200 text-zinc-700 font-bold py-4 px-6 rounded-2xl hover:bg-zinc-50 active:scale-[0.98] transition-all shadow-sm"
          >
            {loggingIn ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Sign in with Google
          </button>
          {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}
        </div>

        <p className="text-center mt-8 text-zinc-500 text-sm">
          New users will be automatically registered upon their first sign-in.
        </p>

        <div className="mt-8 pt-8 border-t border-zinc-100 text-center">
          <p className="text-sm text-zinc-500 mb-2">Have an enumerator survey code?</p>
          <Link to="/enumerator-login" className="text-indigo-600 font-bold hover:underline">
            Enumerator Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
};


const AdminDashboard = () => {
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<any | null>(null);
  const isRTL = selectedSurvey?.language === 'dv';
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState<any | null>(null);
  const [editingSurvey, setEditingSurvey] = useState<any | null>(null);
  const [newSurvey, setNewSurvey] = useState({ 
    title: '', 
    description: '', 
    is_public: false, 
    is_enumerator: false, 
    allow_multiple_submissions: false,
    language: 'en',
    titleColor: '#18181b',
    folderId: ''
  });
  const [enumeratorUsersFile, setEnumeratorUsersFile] = useState<File | null>(null);
  const [enumeratorUploading, setEnumeratorUploading] = useState(false);
  const [enumeratorMessage, setEnumeratorMessage] = useState('');
  const [enumeratorUsers, setEnumeratorUsers] = useState<any[]>([]);
  const [enumeratorSubmissions, setEnumeratorSubmissions] = useState<any[]>([]);

  const [file, setFile] = useState<File | null>(null);
  const [responsesFile, setResponsesFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [responsesUploading, setResponsesUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [responsesMessage, setResponsesMessage] = useState('');
  const [stats, setStats] = useState<any[]>([]);
  const [statsFilter, setStatsFilter] = useState<{ questionId: string, answer: string } | null>(null);
  const [submissionsList, setSubmissionsList] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [respondents, setRespondents] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [view, setView] = useState<'surveys' | 'users' | 'settings'>('surveys');
  const [assignedUserIds, setAssignedUserIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'preview' | 'assignments' | 'tracking' | 'settings' | 'analysis' | 'responses'>('stats');
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [editingSettings, setEditingSettings] = useState(false);
  const [vizPreferences, setVizPreferences] = useState<Record<number, string>>({});
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ text: '', type: 'text', options: [''], required: true });
  const [generatingReport, setGeneratingReport] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [reportLanguage, setReportLanguage] = useState<'en' | 'dv'>('en');
  const [analysisOptions, setAnalysisOptions] = useState({
    detailLevel: 'summary' as 'summary' | 'detailed',
    includePercentages: true,
    includeNumbers: true,
    compareQuestions: false,
    compareQ1: '',
    compareQ2: '',
    customPrompt: ''
  });
  const [confirmModal, setConfirmModal] = useState<{ show: boolean, title: string, message: string, onConfirm: () => void } | null>(null);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  const fetchSurveys = () => {
    const q = query(collection(db, 'surveys'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by title alphabetically
      const sorted = data.sort((a: any, b: any) => {
        return a.title.localeCompare(b.title);
      });
      setSurveys(sorted);
    });
    return unsubscribe;
  };

  const fetchFolders = () => {
    const q = query(collection(db, 'folders'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sorted = data.sort((a: any, b: any) => {
        return a.name.localeCompare(b.name);
      });
      setFolders(sorted);
    });
    return unsubscribe;
  };

  const fetchQuestions = () => {
    if (!selectedSurvey) return;
    const q = query(collection(db, 'questions'), where('surveyId', '==', selectedSurvey.id), orderBy('order', 'asc'));
    const optQ = query(collection(db, 'options'), where('surveyId', '==', selectedSurvey.id));

    let questionsData: any[] = [];
    let optionsData: any[] = [];

    const updateState = () => {
      const combined = questionsData.map(qDoc => ({
        ...qDoc,
        options: optionsData.filter(o => o.questionId === qDoc.id)
      }));
      setQuestions(combined);
    };

    const unsubQuestions = onSnapshot(q, (snapshot) => {
      questionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      updateState();
    });

    const unsubOptions = onSnapshot(optQ, (snapshot) => {
      optionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      updateState();
    });

    return () => {
      unsubQuestions();
      unsubOptions();
    };
  };

  const fetchRespondents = () => {
    const q = query(collection(db, 'users'), where('role', '==', 'respondent'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRespondents(data);
    });
    return unsubscribe;
  };

  const fetchAllUsers = () => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllUsers(data);
    });
    return unsubscribe;
  };

  const fetchAssignments = () => {
    if (!selectedSurvey) return;
    const q = query(collection(db, 'assignments'), where('surveyId', '==', selectedSurvey.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data().userId);
      setAssignedUserIds(data);
    });
    return unsubscribe;
  };

  const fetchEnumeratorUsers = () => {
    if (!selectedSurvey || !selectedSurvey.is_enumerator) return;
    const q = query(collection(db, 'surveys', selectedSurvey.id, 'enumerator_users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEnumeratorUsers(data);
    });
    return unsubscribe;
  };

  const fetchEnumeratorSubmissions = () => {
    if (!selectedSurvey || !selectedSurvey.is_enumerator) return;
    const q = query(collection(db, 'responses'), where('surveyId', '==', selectedSurvey.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rawResponses = snapshot.docs.map(doc => doc.data());
      // Group by submissionId to count submissions per enumerator
      const submissionsByEnumerator: Record<string, Set<string>> = {};
      const lastSubmissionAt: Record<string, any> = {};

      rawResponses.forEach(resp => {
        if (resp.enumeratorUsername && resp.submissionId) {
          if (!submissionsByEnumerator[resp.enumeratorUsername]) {
            submissionsByEnumerator[resp.enumeratorUsername] = new Set();
          }
          submissionsByEnumerator[resp.enumeratorUsername].add(resp.submissionId);
          
          if (!lastSubmissionAt[resp.enumeratorUsername] || resp.submittedAt?.toMillis() > lastSubmissionAt[resp.enumeratorUsername].toMillis()) {
            lastSubmissionAt[resp.enumeratorUsername] = resp.submittedAt;
          }
        }
      });

      const data = Object.keys(submissionsByEnumerator).map(username => ({
        username,
        submissionCount: submissionsByEnumerator[username].size,
        lastSubmittedAt: lastSubmissionAt[username]
      }));
      
      setEnumeratorSubmissions(data);
    });
    return unsubscribe;
  };

  const filteredStats = useMemo(() => {
    if (!statsFilter || !statsFilter.questionId || !statsFilter.answer) return stats;

    const validSubmissionIds = new Set(
      submissionsList
        .filter(sub => {
          const ans = sub.answers[statsFilter.questionId];
          if (!ans) return false;
          if (typeof ans === 'string' && ans.includes(',')) {
            return ans.split(',').map(s => s.trim()).includes(statsFilter.answer);
          }
          return ans === statsFilter.answer;
        })
        .map(sub => sub.submissionId)
    );

    const grouped: Record<string, any> = {};
    
    submissionsList.forEach(sub => {
      if (!validSubmissionIds.has(sub.submissionId)) return;
      
      Object.entries(sub.answers).forEach(([qId, ans]) => {
        const qData = questions.find(q => q.id === qId);
        const qType = qData?.type || 'text';
        const qText = qData?.text || 'Unknown Question';
        
        const processAnswer = (a: string) => {
          const key = `${qId}_${a}`;
          if (!grouped[key]) {
            grouped[key] = {
              question_id: qId,
              text: qText,
              type: qType,
              answer: a,
              count: 0
            };
          }
          grouped[key].count++;
        };

        if (qType === 'checkbox' && ans) {
          const options = (ans as string).split(',').map((s: string) => s.trim()).filter(Boolean);
          options.forEach(processAnswer);
        } else if (ans) {
          processAnswer(ans as string);
        }
      });
    });

    return Object.values(grouped);
  }, [stats, statsFilter, submissionsList, questions]);

  const fetchStats = () => {
    if (!selectedSurvey) return;
    const q = query(collection(db, 'responses'), where('surveyId', '==', selectedSurvey.id));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const rawResponses = snapshot.docs.map(doc => doc.data());
      
      // Get all questions for this survey once
      const qSnap = await getDocs(query(collection(db, 'questions'), where('surveyId', '==', selectedSurvey.id)));
      const questionsMap: Record<string, any> = {};
      qSnap.docs.forEach(doc => {
        questionsMap[doc.id] = doc.data();
      });

      // Group responses by questionId and answer to match the previous stats format
      const grouped: Record<string, any> = {};
      const submissionsMap: Record<string, any> = {};
      
      for (const resp of rawResponses) {
        // Build submissions list
        if (resp.submissionId) {
          if (!submissionsMap[resp.submissionId]) {
            submissionsMap[resp.submissionId] = {
              submissionId: resp.submissionId,
              submittedAt: resp.submittedAt,
              userId: resp.userId,
              enumeratorUsername: resp.enumeratorUsername,
              answers: {}
            };
          }
          submissionsMap[resp.submissionId].answers[resp.questionId] = resp.answer;
        }

        const qData = questionsMap[resp.questionId];
        const qType = qData?.type || 'text';
        const qText = qData?.text || 'Unknown Question';

        const processAnswer = (ans: string) => {
          const key = `${resp.questionId}_${ans}`;
          if (!grouped[key]) {
            grouped[key] = {
              question_id: resp.questionId,
              text: qText,
              type: qType,
              answer: ans,
              count: 0
            };
          }
          grouped[key].count++;
        };

        if (qType === 'checkbox' && resp.answer) {
          const options = resp.answer.split(',').map((s: string) => s.trim()).filter(Boolean);
          options.forEach(processAnswer);
        } else {
          processAnswer(resp.answer);
        }
      }
      
      setStats(Object.values(grouped));
      setSubmissionsList(Object.values(submissionsMap).sort((a, b) => {
        const timeA = a.submittedAt?.toMillis?.() || 0;
        const timeB = b.submittedAt?.toMillis?.() || 0;
        return timeB - timeA;
      }));
    });
    return unsubscribe;
  };

  const fetchSettings = () => {
    const q = query(collection(db, 'settings'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        const d = doc.data();
        data[d.key] = d.value;
      });
      setSettings(data);
    });
    return unsubscribe;
  };

  useEffect(() => {
    const unsubSurveys = fetchSurveys();
    const unsubFolders = fetchFolders();
    const unsubAllUsers = fetchAllUsers();
    const unsubSettings = fetchSettings();
    return () => {
      unsubSurveys();
      unsubFolders();
      unsubAllUsers();
      unsubSettings();
    };
  }, []);

  useEffect(() => {
    if (selectedSurvey) {
      setStatsFilter(null);
      const unsubQuestions = fetchQuestions();
      const unsubRespondents = fetchRespondents();
      const unsubAssignments = fetchAssignments();
      const unsubStats = fetchStats();
      const unsubEnumeratorUsers = fetchEnumeratorUsers();
      const unsubEnumeratorSubmissions = fetchEnumeratorSubmissions();
      return () => {
        unsubQuestions?.();
        unsubRespondents?.();
        unsubAssignments?.();
        unsubStats?.();
        unsubEnumeratorUsers?.();
        unsubEnumeratorSubmissions?.();
      };
    } else {
      setStatsFilter(null);
    }
  }, [selectedSurvey]);

  const handleAddQuestion = async () => {
    if (!selectedSurvey) return;
    try {
      const qRef = doc(collection(db, 'questions'));
      const batch = writeBatch(db);
      
      const questionData = {
        surveyId: selectedSurvey.id,
        text: newQuestion.text,
        type: newQuestion.type,
        order: questions.length + 1,
        required: newQuestion.required,
        updatedAt: serverTimestamp() // Add timestamp to trigger listeners
      };
      
      batch.set(qRef, questionData);

      if (newQuestion.type === 'mcq' || newQuestion.type === 'checkbox') {
        newQuestion.options.forEach(optText => {
          if (optText.trim()) {
            const optRef = doc(collection(db, 'options'));
            batch.set(optRef, {
              questionId: qRef.id,
              surveyId: selectedSurvey.id, // Add surveyId for easier fetching
              text: optText.trim(),
              nextQuestionOrder: null
            });
          }
        });
      }
      
      await batch.commit();
      setShowAddQuestionModal(false);
      setNewQuestion({ text: '', type: 'mcq', options: [''], required: true });
    } catch (e) {
      console.error('Failed to add question:', e);
    }
  };

  const handleToggleAssignment = async (userId: string, isAssigned: boolean) => {
    if (!selectedSurvey) return;
    try {
      if (isAssigned) {
        // Unassign: find the assignment doc and delete it
        const q = query(collection(db, 'assignments'), 
          where('surveyId', '==', selectedSurvey.id), 
          where('userId', '==', userId)
        );
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      } else {
        // Assign
        await addDoc(collection(db, 'assignments'), {
          surveyId: selectedSurvey.id,
          userId: userId,
          assignedAt: serverTimestamp()
        });
      }
    } catch (e) {
      console.error('Failed to toggle assignment:', e);
    }
  };

  const calculateNumberStats = (qStats: any[]) => {
    if (qStats.length === 0) return null;
    const values = qStats.flatMap(s => Array(s.count).fill(parseFloat(s.answer))).filter(v => !isNaN(v));
    if (values.length === 0) return null;
    
    values.sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = (sum / values.length).toFixed(2);
    const median = values[Math.floor(values.length / 2)];
    
    const counts: Record<number, number> = {};
    let maxCount = 0;
    let mode = values[0];
    values.forEach(v => {
      counts[v] = (counts[v] || 0) + 1;
      if (counts[v] > maxCount) {
        maxCount = counts[v];
        mode = v;
      }
    });
    
    return { mean, median, mode };
  };

  const toggleMultipleSubmissions = async () => {
    if (!selectedSurvey) return;
    const newValue = !selectedSurvey.allow_multiple_submissions;
    try {
      await updateDoc(doc(db, 'surveys', selectedSurvey.id), {
        allow_multiple_submissions: newValue
      });
      setSelectedSurvey({ ...selectedSurvey, allow_multiple_submissions: newValue });
    } catch (error) {
      console.error('Error updating multiple submissions:', error);
    }
  };

  const handleCreateFolder = async () => {
    if (!auth.currentUser || !newFolderName.trim()) return;
    try {
      await addDoc(collection(db, 'folders'), {
        name: newFolderName.trim(),
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });
      setNewFolderName('');
      setShowCreateFolderModal(false);
    } catch (error) {
      console.error('Failed to create folder:', error);
      alert('Failed to create folder.');
    }
  };

  const handleCreateSurvey = async () => {
    if (!auth.currentUser) return;
    try {
      const surveyRef = await addDoc(collection(db, 'surveys'), {
        ...newSurvey,
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        isActive: true,
        order: surveys.length,
        titleColor: newSurvey.titleColor || '#18181b'
      });

      if (newSurvey.is_enumerator && enumeratorUsersFile) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

          const batch = writeBatch(db);
          jsonData.forEach((row) => {
            if (row.username && row.password) {
              const userRef = doc(collection(db, 'surveys', surveyRef.id, 'enumerator_users'));
              batch.set(userRef, {
                username: String(row.username),
                password: String(row.password),
                createdAt: serverTimestamp()
              });
            }
          });
          await batch.commit();
        };
        reader.readAsArrayBuffer(enumeratorUsersFile);
      }

      setShowCreateModal(false);
      setNewSurvey({ 
        title: '', 
        description: '', 
        is_public: false, 
        is_enumerator: false, 
        allow_multiple_submissions: false,
        language: 'en',
        titleColor: '#18181b',
        folderId: ''
      });
      setEnumeratorUsersFile(null);
    } catch (e) {
      console.error('Failed to create survey:', e);
    }
  };

  const handleRenameFolder = async () => {
    if (!editingFolderId || !editingFolderName.trim()) return;
    try {
      await updateDoc(doc(db, 'folders', editingFolderId), {
        name: editingFolderName.trim()
      });
      setEditingFolderId(null);
      setEditingFolderName('');
    } catch (error) {
      console.error('Failed to rename folder:', error);
      alert('Failed to rename folder.');
    }
  };

  const handleDeleteFolder = async (id: string) => {
    setConfirmModal({
      show: true,
      title: 'Delete Folder',
      message: 'Are you sure you want to delete this folder? Surveys inside will be moved to Uncategorized.',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          // Update surveys in this folder to have no folder
          const surveysInFolder = surveys.filter(s => s.folderId === id);
          for (const survey of surveysInFolder) {
            await updateDoc(doc(db, 'surveys', survey.id), { folderId: null });
          }
          await deleteDoc(doc(db, 'folders', id));
        } catch (error) {
          console.error('Failed to delete folder:', error);
          alert('Failed to delete folder.');
        }
      }
    });
  };

  const handleDeleteSurvey = async (id: string) => {
    setConfirmModal({
      show: true,
      title: isRTL ? 'ސާވޭ ފޮހެލުން' : 'Delete Survey',
      message: isRTL ? 'މި ސާވޭ ފޮހެލަން ބޭނުންތަ؟' : 'Are you sure you want delete this survey?',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const deleteRefs: any[] = [];
          
          // Collect questions and options
          const qQ = query(collection(db, 'questions'), where('surveyId', '==', id));
          let qSnap;
          try {
            qSnap = await getDocs(qQ);
          } catch (e) {
            handleFirestoreError(e, OperationType.GET, 'questions');
            return;
          }

          for (const qDoc of qSnap.docs) {
            const optQ = query(collection(db, 'options'), where('questionId', '==', qDoc.id));
            let optSnap;
            try {
              optSnap = await getDocs(optQ);
            } catch (e) {
              handleFirestoreError(e, OperationType.GET, 'options');
              return;
            }
            optSnap.docs.forEach(oDoc => deleteRefs.push(oDoc.ref));
            deleteRefs.push(qDoc.ref);
          }
          
          // Collect assignments
          const assignQ = query(collection(db, 'assignments'), where('surveyId', '==', id));
          let assignSnap;
          try {
            assignSnap = await getDocs(assignQ);
          } catch (e) {
            handleFirestoreError(e, OperationType.GET, 'assignments');
            return;
          }
          assignSnap.docs.forEach(aDoc => deleteRefs.push(aDoc.ref));
          
          // Collect responses
          const respQ = query(collection(db, 'responses'), where('surveyId', '==', id));
          let respSnap;
          try {
            respSnap = await getDocs(respQ);
          } catch (e) {
            handleFirestoreError(e, OperationType.GET, 'responses');
            return;
          }
          respSnap.docs.forEach(rDoc => deleteRefs.push(rDoc.ref));
          
          // Collect subcollections
          const enumUsersQ = query(collection(db, 'surveys', id, 'enumerator_users'));
          let enumUsersSnap;
          try {
            enumUsersSnap = await getDocs(enumUsersQ);
          } catch (e) {
            handleFirestoreError(e, OperationType.GET, `surveys/${id}/enumerator_users`);
            return;
          }
          enumUsersSnap.docs.forEach(eDoc => deleteRefs.push(eDoc.ref));

          const groupUsersQ = query(collection(db, 'surveys', id, 'group_users'));
          let groupUsersSnap;
          try {
            groupUsersSnap = await getDocs(groupUsersQ);
          } catch (e) {
            handleFirestoreError(e, OperationType.GET, `surveys/${id}/group_users`);
            return;
          }
          groupUsersSnap.docs.forEach(gDoc => deleteRefs.push(gDoc.ref));

          // Add survey itself
          deleteRefs.push(doc(db, 'surveys', id));

          // Delete in batches of 500
          for (let i = 0; i < deleteRefs.length; i += 500) {
            const batch = writeBatch(db);
            const chunk = deleteRefs.slice(i, i + 500);
            chunk.forEach(ref => batch.delete(ref));
            try {
              await batch.commit();
            } catch (e) {
              handleFirestoreError(e, OperationType.DELETE, 'batch_delete');
              return;
            }
          }
          
          if (selectedSurvey?.id === id) setSelectedSurvey(null);
        } catch (e) {
          console.error('Failed to delete survey:', e);
        }
      }
    });
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      const q = query(collection(db, 'settings'), where('key', '==', key));
      const snap = await getDocs(q);
      if (snap.empty) {
        await addDoc(collection(db, 'settings'), {
          key,
          value,
          updatedAt: serverTimestamp()
        });
      } else {
        await updateDoc(snap.docs[0].ref, {
          value,
          updatedAt: serverTimestamp()
        });
      }
    } catch (e) {
      console.error('Failed to update setting:', e);
    }
  };
  const handleEditSurvey = (survey: any) => {
    setEditingSurvey(survey);
    setNewSurvey({ 
      title: survey.title, 
      description: survey.description, 
      is_public: survey.is_public,
      is_enumerator: survey.is_enumerator || false,
      allow_multiple_submissions: survey.allow_multiple_submissions || false,
      language: survey.language || 'en',
      titleColor: survey.titleColor || '#18181b',
      folderId: survey.folderId || ''
    });
    setShowCreateModal(true);
  };

  const handleUpdateSurvey = async () => {
    if (!editingSurvey) return;
    try {
      await updateDoc(doc(db, 'surveys', editingSurvey.id), {
        title: newSurvey.title,
        description: newSurvey.description,
        is_public: newSurvey.is_public,
        is_enumerator: newSurvey.is_enumerator,
        allow_multiple_submissions: newSurvey.allow_multiple_submissions,
        language: newSurvey.language,
        titleColor: newSurvey.titleColor,
        folderId: newSurvey.folderId || null
      });
      setEditingSurvey(null);
      setShowCreateModal(false);
      setNewSurvey({ 
        title: '', 
        description: '', 
        is_public: false, 
        is_enumerator: false, 
        allow_multiple_submissions: false,
        language: 'en',
        titleColor: '#18181b',
        folderId: ''
      });
    } catch (e) {
      console.error('Failed to update survey:', e);
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
          details = qStats.map(s => {
            let statText = s.answer;
            if (analysisOptions.includeNumbers && analysisOptions.includePercentages) {
              statText += `: ${s.count} (${((s.count / total) * 100).toFixed(1)}%)`;
            } else if (analysisOptions.includeNumbers) {
              statText += `: ${s.count}`;
            } else if (analysisOptions.includePercentages) {
              statText += `: ${((s.count / total) * 100).toFixed(1)}%`;
            }
            return statText;
          }).join('\n');
        }
        
        return {
          id: qId,
          text: qText,
          type: qType,
          details: details
        };
      });

      let statsSummary = questionBreakdown.map(q => `Question: ${q.text}\nType: ${q.type}\nData: ${q.details}`).join('\n\n');

      if (analysisOptions.compareQuestions && analysisOptions.compareQ1 && analysisOptions.compareQ2) {
        const q1 = questionBreakdown.find(q => q.id === analysisOptions.compareQ1);
        const q2 = questionBreakdown.find(q => q.id === analysisOptions.compareQ2);
        if (q1 && q2) {
          statsSummary += `\n\n--- COMPARISON REQUESTED ---\nPlease specifically compare the results of "${q1.text}" with "${q2.text}" and provide insights on their relationship.`;
        }
      }

      const languageInstruction = reportLanguage === 'dv' 
        ? "IMPORTANT: You MUST write the entire report in Dhivehi (Maldivian language). Use Dhivehi script."
        : "IMPORTANT: You MUST write the entire report in English.";

      let reportStructure = "";
      if (analysisOptions.detailLevel === 'summary') {
        reportStructure = `
      1. Executive Summary: A brief overview of the results.
      2. Key Insights: Use numbered bullets (1., 2., 3., etc.) for each insight.
      3. Recommendations: Use standard bullet points (• or -) for each recommendation.`;
      } else {
        reportStructure = `
      1. Executive Summary: A brief overview of the results.
      2. Detailed Question Analysis: Analyze each question separately, providing insights for each.
      3. Key Insights: Use numbered bullets (1., 2., 3., etc.) for each insight.
      4. Recommendations: Use standard bullet points (• or -) for each recommendation.`;
      }

      let customPromptSection = "";
      if (analysisOptions.customPrompt && analysisOptions.customPrompt.trim() !== "") {
        customPromptSection = `\n\nAdditional Instructions from Admin:\n${analysisOptions.customPrompt.trim()}`;
      }

      const prompt = `Analyze the following survey results for the survey titled "${selectedSurvey.title}". 
      Provide a professional report with the following sections:
      ${reportStructure}
      
      ${languageInstruction}
      ${customPromptSection}
      
      IMPORTANT: Do NOT use any Markdown formatting symbols like asterisks (*) or hashes (#) in your response. Use plain text only for the content, with clear section titles.
      
      Data:
      ${statsSummary}`;

      const apiKey = settings.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not defined in settings or environment variables.');
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      if (!response || !response.text) {
        throw new Error('Invalid response from AI model.');
      }

      let aiAnalysis = response.text;
      // Remove any remaining * or # symbols
      aiAnalysis = aiAnalysis.replace(/[*#]/g, '');
      
      setReport(aiAnalysis);

    } catch (error: any) {
      console.error('Failed to generate report:', error);
      alert(`Failed to generate AI report: ${error.message || 'Unknown error'}`);
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleDownloadWordReport = async () => {
    if (!report || !selectedSurvey) return;
    try {
      const isRTL = reportLanguage === 'dv';
      const alignment = isRTL ? AlignmentType.RIGHT : AlignmentType.LEFT;

      const sections: any[] = [
        new Paragraph({
          text: `${isRTL ? 'ސަރވޭ އެނަލިސިސް ރިޕޯޓް' : 'Survey Analysis Report'}: ${selectedSurvey.title}`,
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          text: `${isRTL ? 'ޖެނެރޭޓް ކުރި ތާރީޚް' : 'Generated on'} ${new Date().toLocaleDateString()}`,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ text: "", spacing: { after: 400 } }),
        new Paragraph({
          text: isRTL ? "އެގްޒެކެޓިވް ސަމަރީ އަދި އޭއައި އެނަލިސިސް" : "Executive Summary & AI Analysis",
          heading: HeadingLevel.HEADING_1,
          alignment,
        }),
      ];

      // Add AI Analysis text
      report.split('\n').forEach(line => {
        if (line.trim()) {
          sections.push(new Paragraph({
            children: [new TextRun(line)],
            spacing: { before: 200 },
            alignment,
          }));
        }
      });

      const doc = new Document({
        sections: [{
          properties: {},
          children: sections,
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${selectedSurvey.title.replace(/\s+/g, '_')}_Analysis_Report.docx`);

    } catch (error: any) {
      console.error('Failed to download Word document:', error);
      alert('Failed to download Word document.');
    }
  };


  const handleDownloadResults = async () => {
    if (!selectedSurvey) return;
    try {
      const q = query(collection(db, 'responses'), where('surveyId', '==', selectedSurvey.id));
      const snap = await getDocs(q);
      const responsesData = snap.docs.map(doc => doc.data());

      const questionsRef = query(collection(db, 'questions'), where('surveyId', '==', selectedSurvey.id), orderBy('order', 'asc'));
      const questionsSnap = await getDocs(questionsRef);
      const questionsData = questionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Group by submissionId
      const submissions: Record<string, any> = {};
      responsesData.forEach((r: any) => {
        if (!submissions[r.submissionId]) {
          submissions[r.submissionId] = {
            'Submission ID': r.submissionId,
            'Submitted At': r.submittedAt?.toDate?.()?.toLocaleString() || r.submittedAt,
            'User ID': r.userId || 'Anonymous'
          };
        }
        const question = questionsData.find((q: any) => q.id === r.questionId) as any;
        if (question) {
          submissions[r.submissionId][question.text] = r.answer;
        }
      });

      const data = Object.values(submissions);
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Results');

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `survey_results_${selectedSurvey.id}.xlsx`);
    } catch (e) {
      console.error(e);
      alert('An error occurred while downloading results');
    }
  };

  const handleUpdateJump = async (optionId: string, nextOrder: number | null) => {
    try {
      await updateDoc(doc(db, 'options', optionId), {
        nextQuestionOrder: nextOrder
      });
    } catch (e) {
      console.error('Failed to update jump:', e);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    setConfirmModal({
      show: true,
      title: isRTL ? 'ސުވާލު ފޮހެލުން' : 'Delete Question',
      message: isRTL ? 'މި ސުވާލު ފޮހެލަން ބޭނުންތަ؟' : 'Are you sure you want to delete this question?',
      onConfirm: async () => {
        if (!selectedSurvey) return;
        try {
          const batch = writeBatch(db);
          // Delete options first
          const optQ = query(collection(db, 'options'), where('questionId', '==', id));
          const optSnap = await getDocs(optQ);
          optSnap.docs.forEach(oDoc => batch.delete(oDoc.ref));
          // Delete question
          batch.delete(doc(db, 'questions', id));
          
          await batch.commit();
          setConfirmModal(null);
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
          const q = query(collection(db, 'questions'), where('surveyId', '==', selectedSurvey.id));
          const snap = await getDocs(q);
          const batch = writeBatch(db);
          
          for (const qDoc of snap.docs) {
            const optQ = query(collection(db, 'options'), where('questionId', '==', qDoc.id));
            const optSnap = await getDocs(optQ);
            optSnap.docs.forEach(oDoc => batch.delete(oDoc.ref));
            batch.delete(qDoc.ref);
          }
          
          await batch.commit();
          setConfirmModal(null);
        } catch (e) {
          console.error('Failed to clear questions:', e);
        }
      }
    });
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    setConfirmModal({
      show: true,
      title: 'Delete Response',
      message: 'Are you sure you want to delete this individual response? This cannot be undone.',
      onConfirm: async () => {
        if (!selectedSurvey) return;
        try {
          const respQ = query(collection(db, 'responses'), where('submissionId', '==', submissionId));
          const snap = await getDocs(respQ);
          
          const batch = writeBatch(db);
          snap.docs.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
          
          setConfirmModal(null);
        } catch (e) {
          console.error('Failed to delete submission:', e);
        }
      }
    });
  };

  const handleClearResponses = async () => {
    setConfirmModal({
      show: true,
      title: isRTL ? 'ހުރިހާ ޖަވާބުތައް ފޮހެލުން' : 'Clear All Responses',
      message: isRTL ? 'މި ސަރވޭގެ ހުރިހާ ޖަވާބުތައް ފޮހެލަން ބޭނުންތަ؟' : 'Are you sure you want to delete ALL responses for this survey? This cannot be undone.',
      onConfirm: async () => {
        if (!selectedSurvey) return;
        try {
          const respQ = query(collection(db, 'responses'), where('surveyId', '==', selectedSurvey.id));
          const snap = await getDocs(respQ);
          
          // Delete in chunks of 500
          const chunks = [];
          for (let i = 0; i < snap.docs.length; i += 500) {
            chunks.push(snap.docs.slice(i, i + 500));
          }
          
          for (const chunk of chunks) {
            const batch = writeBatch(db);
            chunk.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
          }
          
          setStats([]);
          setConfirmModal(null);
        } catch (e) {
          console.error('Failed to clear responses:', e);
        }
      }
    });
  };

  const handleReorderQuestion = async (id: string, direction: 'up' | 'down') => {
    if (!selectedSurvey) return;
    try {
      const currentIdx = questions.findIndex(q => q.id === id);
      if (currentIdx === -1) return;
      
      const targetIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1;
      if (targetIdx < 0 || targetIdx >= questions.length) return;
      
      const currentQ = questions[currentIdx];
      const targetQ = questions[targetIdx];
      
      const batch = writeBatch(db);
      batch.update(doc(db, 'questions', currentQ.id), { 
        order: targetQ.order,
        updatedAt: serverTimestamp()
      });
      batch.update(doc(db, 'questions', targetQ.id), { 
        order: currentQ.order,
        updatedAt: serverTimestamp()
      });
      
      await batch.commit();
    } catch (e) {
      console.error('Failed to reorder question:', e);
    }
  };

  const handleUpdateQuestionType = async (id: string, newType: string) => {
    if (!selectedSurvey) return;
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'questions', id), { 
        type: newType,
        updatedAt: serverTimestamp()
      });
      
      if (newType !== 'mcq' && newType !== 'checkbox') {
        // Delete options if not MCQ or Checkbox
        const optQ = query(collection(db, 'options'), where('questionId', '==', id));
        const optSnap = await getDocs(optQ);
        optSnap.docs.forEach(oDoc => batch.delete(oDoc.ref));
      } else {
        // If changed to MCQ/Checkbox and no options, add a default
        const optQ = query(collection(db, 'options'), where('questionId', '==', id));
        const optSnap = await getDocs(optQ);
        if (optSnap.empty) {
          const optRef = doc(collection(db, 'options'));
          batch.set(optRef, {
            questionId: id,
            surveyId: selectedSurvey.id,
            text: 'Option 1',
            nextQuestionOrder: null
          });
        }
      }
      
      await batch.commit();
    } catch (e) {
      console.error('Failed to update question type:', e);
    }
  };

  const handleToggleRequired = async (id: string, currentRequired: boolean) => {
    try {
      await updateDoc(doc(db, 'questions', id), { 
        required: !currentRequired,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error('Failed to toggle required status:', e);
    }
  };


  const handleUploadResponses = async () => {
    if (!responsesFile || !selectedSurvey) return;
    setResponsesUploading(true);
    setResponsesMessage('');
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);
          
          if (rawData.length === 0) {
            setResponsesMessage('Excel file must have at least one data row');
            setResponsesUploading(false);
            return;
          }

          // Get questions for this survey to map headers to questionIds
          const qSnap = await getDocs(query(collection(db, 'questions'), where('surveyId', '==', selectedSurvey.id)));
          let surveyQuestions = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          const batch = writeBatch(db);
          let count = 0;
          let newQuestionsCreated = false;

          if (surveyQuestions.length === 0) {
            const headers = Object.keys(rawData[0] || {});
            if (headers.length === 0) {
              setResponsesMessage('Excel file is empty or has no headers.');
              setResponsesUploading(false);
              return;
            }
            
            let order = 1;
            for (const header of headers) {
              const values = rawData.map(r => r[header]).filter(v => v !== undefined && v !== null && v !== '');
              const uniqueValues = new Set(values);
              let inferredType = 'text';
              
              if (values.length > 0 && Array.from(uniqueValues).every(v => !isNaN(Number(v)))) {
                inferredType = 'number';
              } else if (uniqueValues.size > 0 && uniqueValues.size <= 15) {
                inferredType = 'mcq';
              }

              const qRef = doc(collection(db, 'questions'));
              const newQ = {
                surveyId: selectedSurvey.id,
                text: header,
                type: inferredType,
                order: order++,
                required: false,
                updatedAt: serverTimestamp()
              };
              batch.set(qRef, newQ);
              surveyQuestions.push({ id: qRef.id, ...newQ });
            }
            newQuestionsCreated = true;
          }

          for (const row of rawData) {
            const submissionId = `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const submittedAt = serverTimestamp();

            // Map each column to a question
            for (const q of surveyQuestions as any[]) {
              // Try to find a column that matches the question text (case-insensitive)
              const columnKey = Object.keys(row).find(key => 
                key.toLowerCase().trim() === q.text.toLowerCase().trim()
              );

              if (columnKey !== undefined) {
                const answer = String(row[columnKey] || '');
                const responseRef = doc(collection(db, 'responses'));
                batch.set(responseRef, {
                  surveyId: selectedSurvey.id,
                  questionId: q.id,
                  submissionId,
                  answer,
                  submittedAt,
                  imported: true
                });
                count++;
              }
            }
          }

          await batch.commit();
          setResponsesMessage(`Successfully imported ${rawData.length} submissions (${count} individual responses)${newQuestionsCreated ? ' and auto-created questions' : ''}.`);
          setResponsesFile(null);
        } catch (err: any) {
          console.error("Error processing file:", err);
          setResponsesMessage(`Error: ${err.message}`);
        } finally {
          setResponsesUploading(false);
        }
      };
      reader.readAsArrayBuffer(responsesFile);
    } catch (err: any) {
      setResponsesMessage(`Error: ${err.message}`);
      setResponsesUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedSurvey) return;
    setUploading(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (rawData.length < 2) {
          setMessage('Excel file must have a header row and at least one data row');
          setUploading(false);
          return;
        }

        const headers = rawData[0].map(h => String(h).toLowerCase().trim());
        const dataRows = rawData.slice(1);

        const textIdx = headers.indexOf('text');
        const typeIdx = headers.indexOf('type');
        const optionsIdx = headers.indexOf('options');
        const requiredIdx = headers.indexOf('required');

        if (textIdx === -1 || typeIdx === -1) {
          setMessage('Excel file must contain "text" and "type" columns');
          setUploading(false);
          return;
        }

        const validTypes = ['mcq', 'text', 'date', 'time', 'number'];
        const processedData = dataRows.map(row => {
          const rawRequired = requiredIdx !== -1 ? String(row[requiredIdx]).toLowerCase().trim() : 'true';
          const isRequired = rawRequired !== 'false' && rawRequired !== '0' && rawRequired !== 'no';
          
          return {
            text: row[textIdx],
            type: String(row[typeIdx] || '').toLowerCase().trim(),
            options: optionsIdx !== -1 ? row[optionsIdx] : null,
            required: isRequired
          };
        }).filter(row => row.text && validTypes.includes(row.type));

        if (processedData.length === 0) {
          setMessage('No valid questions found.');
          setUploading(false);
          return;
        }

        // Delete existing questions for this survey
        const existingQ = query(collection(db, 'questions'), where('surveyId', '==', selectedSurvey.id));
        const existingSnap = await getDocs(existingQ);
        const batch = writeBatch(db);
        
        // Also need to delete options for these questions
        for (const qDoc of existingSnap.docs) {
          const optQ = query(collection(db, 'options'), where('questionId', '==', qDoc.id));
          const optSnap = await getDocs(optQ);
          optSnap.docs.forEach(oDoc => batch.delete(oDoc.ref));
          batch.delete(qDoc.ref);
        }

        // Add new questions
        for (let i = 0; i < processedData.length; i++) {
          const q = processedData[i];
          const qRef = doc(collection(db, 'questions'));
          batch.set(qRef, {
            surveyId: selectedSurvey.id,
            text: q.text,
            type: q.type,
            order: i + 1,
            required: q.required,
            updatedAt: serverTimestamp()
          });

          if (q.type === 'mcq' && q.options) {
            const opts = q.options.toString().split(/[,،]/).map((o: string) => o.trim()).filter((o: string) => o);
            opts.forEach((optStr: string) => {
              let text = optStr;
              let nextOrder = null;
              const jumpMatch = optStr.match(/\[Jump:(\d+)\]/);
              if (jumpMatch) {
                text = optStr.replace(jumpMatch[0], '').trim();
                nextOrder = parseInt(jumpMatch[1]);
              }
              const optRef = doc(collection(db, 'options'));
              batch.set(optRef, {
                questionId: qRef.id,
                surveyId: selectedSurvey.id,
                text: text,
                nextQuestionOrder: nextOrder
              });
            });
          }
        }

        await batch.commit();
        setMessage(`Success! Uploaded ${processedData.length} questions.`);
        setFile(null);
        setUploading(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (e) {
      console.error(e);
      setMessage('Upload failed');
      setUploading(false);
    }
  };

  const handleUploadEnumerators = async () => {
    if (!enumeratorUsersFile || !selectedSurvey) return;
    setEnumeratorUploading(true);
    setEnumeratorMessage('');
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          setEnumeratorMessage('No valid enumerators found.');
          setEnumeratorUploading(false);
          return;
        }

        const batch = writeBatch(db);
        
        // Delete existing enumerators for this survey
        const existingQ = query(collection(db, 'surveys', selectedSurvey.id, 'enumerator_users'));
        const existingSnap = await getDocs(existingQ);
        existingSnap.docs.forEach(doc => batch.delete(doc.ref));

        let count = 0;
        jsonData.forEach((row) => {
          if (row.username && row.password) {
            const userRef = doc(collection(db, 'surveys', selectedSurvey.id, 'enumerator_users'));
            batch.set(userRef, {
              username: String(row.username),
              password: String(row.password),
              createdAt: serverTimestamp()
            });
            count++;
          }
        });

        if (count === 0) {
          setEnumeratorMessage('No valid enumerators (username/password) found in file.');
          setEnumeratorUploading(false);
          return;
        }

        await batch.commit();
        setEnumeratorMessage(`Success! Uploaded ${count} enumerators.`);
        setEnumeratorUsersFile(null);
        setEnumeratorUploading(false);
      };
      reader.readAsArrayBuffer(enumeratorUsersFile);
    } catch (e) {
      console.error(e);
      setEnumeratorMessage('Upload failed');
      setEnumeratorUploading(false);
    }
  };

  const handleToggleUserRole = async (userId: string, currentRole: string) => {
    try {
      const newRole = currentRole === 'admin' ? 'respondent' : 'admin';
      await updateDoc(doc(db, 'users', userId), {
        role: newRole
      });
    } catch (e) {
      console.error('Failed to update user role:', e);
    }
  };

  if (!selectedSurvey) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <BarChart3 className="text-white w-6 h-6" />
              </div>
              <h1 className="text-2xl font-black text-zinc-900 tracking-tight uppercase">Survey Master Pro</h1>
            </div>
            <div className="flex bg-zinc-100 p-1 rounded-xl">
              <button 
                onClick={() => setView('surveys')}
                className={cn(
                  "px-4 py-2 rounded-lg font-bold text-sm transition-all",
                  view === 'surveys' ? "bg-white text-indigo-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                )}
              >
                Surveys
              </button>
              <button 
                onClick={() => setView('users')}
                className={cn(
                  "px-4 py-2 rounded-lg font-bold text-sm transition-all",
                  view === 'users' ? "bg-white text-indigo-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                )}
              >
                Users
              </button>
              <button 
                onClick={() => setView('settings')}
                className={cn(
                  "px-4 py-2 rounded-lg font-bold text-sm transition-all",
                  view === 'settings' ? "bg-white text-indigo-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                )}
              >
                Settings
              </button>
            </div>
          </div>
          {view === 'surveys' && (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowCreateFolderModal(true)}
                className="bg-zinc-100 text-zinc-700 px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-zinc-200 transition-all"
              >
                <FolderPlus className="w-5 h-5" />
                Create Folder
              </button>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all"
              >
                <Plus className="w-5 h-5" />
                Create Survey
              </button>
            </div>
          )}
        </div>

        {view === 'settings' ? (
          <div className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-zinc-900">Application Settings</h2>
                <p className="text-sm text-zinc-500">Configure global application parameters</p>
              </div>
              <button 
                onClick={() => setEditingSettings(!editingSettings)}
                className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl font-bold hover:bg-indigo-100 transition-all"
              >
                {editingSettings ? 'Cancel' : 'Edit Settings'}
              </button>
            </div>

            <div className="space-y-6 max-w-2xl">
              <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-2 rounded-lg">
                      <Key className="text-indigo-600 w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-900">Gemini API Key</h3>
                      <p className="text-xs text-zinc-500">Used for AI report generation</p>
                    </div>
                  </div>
                </div>
                
                {editingSettings ? (
                  <div className="flex gap-3">
                    <input 
                      type="password" 
                      className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Enter Gemini API Key"
                      value={settings.GEMINI_API_KEY || ''}
                      onChange={(e) => setSettings({ ...settings, GEMINI_API_KEY: e.target.value })}
                    />
                    <button 
                      onClick={() => {
                        handleUpdateSetting('GEMINI_API_KEY', settings.GEMINI_API_KEY);
                        setEditingSettings(false);
                      }}
                      className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-zinc-200">
                    <span className="font-mono text-sm text-zinc-400">
                      {settings.GEMINI_API_KEY ? '••••••••••••••••' : 'Not configured'}
                    </span>
                    {settings.GEMINI_API_KEY && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase">
                        Configured
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : view === 'surveys' ? (
          <div className="space-y-8">
            {folders.map(folder => {
              const folderSurveys = surveys.filter(s => s.folderId === folder.id);
              return (
                <div key={folder.id} className="bg-zinc-50/50 p-6 rounded-[32px] border border-zinc-100">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-xl shadow-sm">
                        <Folder className="w-6 h-6 text-indigo-600" />
                      </div>
                      {editingFolderId === folder.id ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="text" 
                            value={editingFolderName}
                            onChange={(e) => setEditingFolderName(e.target.value)}
                            className="px-3 py-1.5 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameFolder();
                              if (e.key === 'Escape') {
                                setEditingFolderId(null);
                                setEditingFolderName('');
                              }
                            }}
                          />
                          <button 
                            onClick={handleRenameFolder}
                            className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-indigo-700"
                          >
                            Save
                          </button>
                          <button 
                            onClick={() => {
                              setEditingFolderId(null);
                              setEditingFolderName('');
                            }}
                            className="bg-zinc-200 text-zinc-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-zinc-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <h2 className="text-xl font-bold text-zinc-900">{folder.name}</h2>
                          <span className="text-sm font-medium text-zinc-500 bg-zinc-200/50 px-2.5 py-0.5 rounded-full">
                            {folderSurveys.length}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {editingFolderId !== folder.id && (
                        <button 
                          onClick={() => {
                            setEditingFolderId(folder.id);
                            setEditingFolderName(folder.name);
                          }}
                          className="text-zinc-400 hover:text-indigo-600 transition-colors p-2 hover:bg-indigo-50 rounded-lg"
                          title="Rename Folder"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeleteFolder(folder.id)}
                        className="text-zinc-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg"
                        title="Delete Folder"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {folderSurveys.map((survey) => (
                      <div key={survey.id} className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold" style={{ color: survey.titleColor || '#18181b' }}>{survey.title}</h3>
                            {survey.is_public && (
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
                            {survey.is_public && (
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
                    {folderSurveys.length === 0 && (
                      <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-dashed border-zinc-200">
                        <p className="text-zinc-400 font-medium text-sm">No surveys in this folder.</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {surveys.filter(s => !s.folderId).length > 0 && (
              <div className="bg-zinc-50/50 p-6 rounded-[32px] border border-zinc-100">
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-xl font-bold text-zinc-900">Uncategorized</h2>
                  <span className="text-sm font-medium text-zinc-500 bg-zinc-200/50 px-2.5 py-0.5 rounded-full">
                    {surveys.filter(s => !s.folderId).length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {surveys.filter(s => !s.folderId).map((survey) => (
                    <div key={survey.id} className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold" style={{ color: survey.titleColor || '#18181b' }}>{survey.title}</h3>
                          {survey.is_public && (
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
                          {survey.is_public && (
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
              </div>
            )}
            
            {surveys.length === 0 && folders.length === 0 && (
              <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-dashed border-zinc-200">
                <ClipboardList className="w-16 h-16 text-zinc-200 mx-auto mb-4" />
                <p className="text-zinc-400 font-medium">No surveys or folders yet. Create one to get started.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-bottom border-zinc-200">
                    <th className="px-6 py-4 text-sm font-bold text-zinc-700">User</th>
                    <th className="px-6 py-4 text-sm font-bold text-zinc-700">Email</th>
                    <th className="px-6 py-4 text-sm font-bold text-zinc-700">Role</th>
                    <th className="px-6 py-4 text-sm font-bold text-zinc-700">Joined</th>
                    <th className="px-6 py-4 text-sm font-bold text-zinc-700 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {allUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                            {u.username?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <span className="font-bold text-zinc-900">{u.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-500">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          u.role === 'admin' ? "bg-indigo-50 text-indigo-600" : "bg-zinc-50 text-zinc-600"
                        )}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-500">
                        {u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {u.email !== "rannamaari@gmail.com" && (
                          <button 
                            onClick={() => handleToggleUserRole(u.id, u.role)}
                            className={cn(
                              "text-xs font-bold px-3 py-1.5 rounded-lg transition-all",
                              u.role === 'admin' 
                                ? "text-red-600 hover:bg-red-50" 
                                : "text-indigo-600 hover:bg-indigo-50"
                            )}
                          >
                            {u.role === 'admin' ? 'Demote to Respondent' : 'Promote to Admin'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showCreateFolderModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-zinc-900">Create Folder</h2>
                <button onClick={() => setShowCreateFolderModal(false)} className="text-zinc-400 hover:text-zinc-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">Folder Name</label>
                  <input 
                    type="text" 
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="e.g., Q1 2026 Surveys"
                  />
                </div>
                <button 
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                  className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Folder
                </button>
              </div>
            </motion.div>
          </div>
        )}

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
                    onChange={(e) => setNewSurvey({ ...newSurvey, is_public: e.target.checked, is_group: e.target.checked ? false : newSurvey.is_group })}
                  />
                  <label htmlFor="is_public" className="text-sm font-bold text-zinc-700 cursor-pointer">
                    Public Access
                    <span className="block text-xs font-normal text-zinc-500">Anyone with the link can fill this survey</span>
                  </label>
                </div>
                <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <input 
                    type="checkbox" 
                    id="is_enumerator"
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    checked={newSurvey.is_enumerator}
                    onChange={(e) => setNewSurvey({ ...newSurvey, is_enumerator: e.target.checked, is_public: e.target.checked ? false : newSurvey.is_enumerator })}
                  />
                  <label htmlFor="is_enumerator" className="text-sm font-bold text-zinc-700 cursor-pointer">
                    Enumerator Survey
                    <span className="block text-xs font-normal text-zinc-500">Requires specific username and password</span>
                  </label>
                </div>
                {newSurvey.is_enumerator && (
                  <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <input 
                      type="checkbox" 
                      id="allow_multiple_submissions"
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                      checked={newSurvey.allow_multiple_submissions}
                      onChange={(e) => setNewSurvey({ ...newSurvey, allow_multiple_submissions: e.target.checked })}
                    />
                    <label htmlFor="allow_multiple_submissions" className="text-sm font-bold text-zinc-700 cursor-pointer">
                      Allow Multiple Submissions
                      <span className="block text-xs font-normal text-zinc-500">Enumerator can submit more than once</span>
                    </label>
                  </div>
                )}
                {newSurvey.is_enumerator && (
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-1">Upload User List (Excel)</label>
                    <div className="border-2 border-dashed border-zinc-200 rounded-xl p-4 text-center hover:border-indigo-400 transition-colors cursor-pointer relative">
                      <input 
                        type="file" 
                        accept=".xlsx, .xls" 
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => setEnumeratorUsersFile(e.target.files?.[0] || null)}
                      />
                      <FileSpreadsheet className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                      <span className="text-xs text-zinc-500 block">
                        {enumeratorUsersFile ? enumeratorUsersFile.name : 'Select Excel file with username & password columns'}
                      </span>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">Folder</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newSurvey.folderId || ''}
                    onChange={(e) => setNewSurvey({ ...newSurvey, folderId: e.target.value })}
                  >
                    <option value="">Uncategorized</option>
                    {folders.map(folder => (
                      <option key={folder.id} value={folder.id}>{folder.name}</option>
                    ))}
                  </select>
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
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-2">Title Color</label>
                  <div className="flex flex-wrap gap-2">
                    {['#18181b', '#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777'].map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewSurvey({ ...newSurvey, titleColor: color })}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-all",
                          newSurvey.titleColor === color ? "border-indigo-600 scale-110" : "border-transparent hover:scale-105"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <input 
                      type="color"
                      value={newSurvey.titleColor}
                      onChange={(e) => setNewSurvey({ ...newSurvey, titleColor: e.target.value })}
                      className="w-8 h-8 rounded-full border-none p-0 overflow-hidden cursor-pointer"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingSurvey(null);
                      setNewSurvey({ 
                        title: '', 
                        description: '', 
                        is_public: false, 
                        is_enumerator: false, 
                        allow_multiple_submissions: false,
                        language: 'en',
                        titleColor: '#18181b',
                        folderId: ''
                      });
                    }}
                    className="flex-1 px-4 py-3 rounded-xl font-bold text-zinc-500 hover:bg-zinc-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={editingSurvey ? handleUpdateSurvey : handleCreateSurvey}
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
      <div className="flex items-center gap-3 mb-10">
        <div className="bg-indigo-600 p-1.5 rounded-lg">
          <BarChart3 className="text-white w-5 h-5" />
        </div>
        <span className="text-sm font-black text-zinc-900 tracking-tight uppercase">Survey Master Pro</span>
      </div>
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
            <div className="flex items-center gap-2">
              <p className="text-sm text-zinc-500">Managing survey content and results</p>
            </div>
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
            onClick={() => setActiveTab('responses')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === 'responses' ? "bg-white text-indigo-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            Responses
          </button>
          <button 
            onClick={() => setActiveTab('analysis')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === 'analysis' ? "bg-white text-indigo-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            Analysis Report
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
          {selectedSurvey.is_enumerator && (
            <button 
              onClick={() => setActiveTab('tracking')}
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-bold transition-all",
                activeTab === 'tracking' ? "bg-white text-indigo-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              Tracking
            </button>
          )}
        </div>
      </div>

      {activeTab === 'tracking' && selectedSurvey.is_enumerator && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm mb-8"
        >
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Enumerator Respondent Tracking
            </h2>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 bg-zinc-50 px-4 py-2 rounded-xl border border-zinc-100">
                <span className="text-sm font-bold text-zinc-700">Allow Multiple Submissions</span>
                <button
                  onClick={toggleMultipleSubmissions}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative",
                    selectedSurvey.allow_multiple_submissions ? "bg-indigo-600" : "bg-zinc-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    selectedSurvey.allow_multiple_submissions ? "left-7" : "left-1"
                  )} />
                </button>
              </div>
              <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-bold text-zinc-900">
                  {enumeratorSubmissions.reduce((acc, s) => acc + s.submissionCount, 0)}
                </p>
                <p className="text-xs text-zinc-500">Total Submissions</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-zinc-900">{enumeratorSubmissions.length} / {enumeratorUsers.length}</p>
                <p className="text-xs text-zinc-500">Active Enumerators</p>
              </div>
            </div>
          </div>
        </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left py-4 px-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Username</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Status</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Submissions</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Last Submission</th>
                </tr>
              </thead>
              <tbody>
                {enumeratorUsers.map((user) => {
                  const submission = enumeratorSubmissions.find(s => s.username === user.username);
                  return (
                    <tr key={user.id} className="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                      <td className="py-4 px-4 font-bold text-zinc-900">{user.username}</td>
                      <td className="py-4 px-4">
                        {submission ? (
                          <span className="bg-emerald-50 text-emerald-600 text-xs font-bold px-3 py-1 rounded-full">Completed</span>
                        ) : (
                          <span className="bg-amber-50 text-amber-600 text-xs font-bold px-3 py-1 rounded-full">Pending</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm font-bold text-zinc-900">{submission?.submissionCount || 0}</span>
                      </td>
                      <td className="py-4 px-4 text-sm text-zinc-500">
                        {submission?.lastSubmittedAt ? (
                          new Date(submission.lastSubmittedAt.toDate()).toLocaleString()
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

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

      {activeTab === 'responses' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm"
        >
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Individual Responses
            </h2>
            <p className="text-sm text-zinc-500">View and manage individual survey submissions</p>
          </div>

          <div className="space-y-6">
            {submissionsList.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">
                No responses found for this survey.
              </div>
            ) : (
              submissionsList.map((submission, index) => (
                <div key={submission.submissionId} className="bg-zinc-50 rounded-2xl border border-zinc-100 p-6">
                  <div className="flex justify-between items-start mb-6 pb-6 border-b border-zinc-200">
                    <div>
                      <h3 className="font-bold text-zinc-900">Response #{submissionsList.length - index}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500">
                        <span>Submitted: {submission.submittedAt?.toDate?.()?.toLocaleString() || 'Unknown'}</span>
                        {submission.enumeratorUsername && (
                          <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md text-xs font-bold">
                            Enumerator: {submission.enumeratorUsername}
                          </span>
                        )}
                        {submission.userId && !submission.enumeratorUsername && (
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md text-xs font-bold">
                            User ID: {submission.userId}
                          </span>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteSubmission(submission.submissionId)}
                      className="text-zinc-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Response"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    {questions.map((q, qIndex) => {
                      const answer = submission.answers[q.id];
                      if (!answer) return null;
                      
                      return (
                        <div key={q.id}>
                          <p className="text-sm font-bold text-zinc-700 mb-2">
                            {qIndex + 1}. {q.text}
                          </p>
                          <div className="bg-white p-4 rounded-xl border border-zinc-200 text-zinc-900">
                            {answer}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {activeTab === 'stats' && (
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
                Upload Responses
              </h2>
              <p className="text-sm text-zinc-500 mb-6">
                Import existing survey responses from an Excel file. Column headers must match question text.
              </p>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <label className="flex-1">
                    <div className="border-2 border-dashed border-zinc-200 rounded-2xl p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer group">
                      <FileSpreadsheet className="w-10 h-10 text-zinc-300 group-hover:text-indigo-400 mx-auto mb-3 transition-colors" />
                      <span className="text-sm font-medium text-zinc-600 block">
                        {responsesFile ? responsesFile.name : 'Select Excel File'}
                      </span>
                      <input 
                        type="file" 
                        accept=".xlsx, .xls" 
                        className="hidden" 
                        onChange={(e) => setResponsesFile(e.target.files?.[0] || null)}
                      />
                    </div>
                  </label>
                  <button 
                    onClick={() => {
                      if (!questions || questions.length === 0) {
                        setResponsesMessage('No questions found. You can upload any Excel file and we will automatically create questions from the column headers.');
                        return;
                      }
                      const wb = XLSX.utils.book_new();
                      const templateRow: Record<string, string> = {};
                      questions.forEach(q => {
                        templateRow[q.text] = q.type === 'mcq' ? (q.options[0]?.text || 'Option 1') : 'Sample Answer';
                      });
                      const ws = XLSX.utils.json_to_sheet([templateRow]);
                      XLSX.utils.book_append_sheet(wb, ws, 'Responses');
                      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                      saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'responses_template.xlsx');
                    }}
                    className="p-4 bg-zinc-50 text-zinc-500 rounded-2xl border border-zinc-100 hover:bg-zinc-100 transition-all flex flex-col items-center justify-center gap-2 group"
                    title="Download Template"
                  >
                    <Download className="w-6 h-6 group-hover:text-indigo-600" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Template</span>
                  </button>
                </div>

                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-xs text-amber-800 space-y-2">
                  <p className="font-bold">Important for Import:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Column headers must match question text exactly.</li>
                    <li>For MCQ, use the exact option text.</li>
                    <li>For Checkboxes, use comma-separated values.</li>
                    <li>Date format should be YYYY-MM-DD.</li>
                  </ul>
                </div>

                <button 
                  onClick={handleUploadResponses}
                  disabled={!responsesFile || responsesUploading}
                  className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {responsesUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  {responsesUploading ? 'Importing...' : 'Import Now'}
                </button>

                {responsesMessage && (
                  <p className={cn(
                    "text-sm font-medium p-3 rounded-lg text-center",
                    responsesMessage.includes('Successfully') ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                  )}>
                    {responsesMessage}
                  </p>
                )}
              </div>
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
                <div className="flex gap-3">
                  <label className="flex-1">
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
                    onClick={() => {
                      const wb = XLSX.utils.book_new();
                      const ws = XLSX.utils.json_to_sheet([
                        { text: 'Do you like cats?', type: 'mcq', options: 'Yes[Jump:3], No[Jump:4]', required: 'true' },
                        { text: "What's your cat's name?", type: 'text', options: '', required: 'true' },
                        { text: 'Why not?', type: 'text', options: '', required: 'false' }
                      ]);
                      XLSX.utils.book_append_sheet(wb, ws, 'Questions');
                      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                      saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'questions_template.xlsx');
                    }}
                    className="p-4 bg-zinc-50 text-zinc-500 rounded-2xl border border-zinc-100 hover:bg-zinc-100 transition-all flex flex-col items-center justify-center gap-2 group"
                    title="Download Template"
                  >
                    <Download className="w-6 h-6 group-hover:text-indigo-600" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Template</span>
                  </button>
                </div>

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

            {selectedSurvey.is_enumerator && (
              <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                <h2 className="text-xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Upload Enumerators
                </h2>
                <p className="text-sm text-zinc-500 mb-6">
                  Upload an Excel file with columns: <code className="bg-zinc-100 px-1 rounded">username</code> and <code className="bg-zinc-100 px-1 rounded">password</code>.
                </p>
                
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <label className="flex-1">
                      <div className="border-2 border-dashed border-zinc-200 rounded-2xl p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer group">
                        <FileSpreadsheet className="w-10 h-10 text-zinc-300 group-hover:text-indigo-400 mx-auto mb-3 transition-colors" />
                        <span className="text-sm font-medium text-zinc-600 block">
                          {enumeratorUsersFile ? enumeratorUsersFile.name : 'Select Excel File'}
                        </span>
                        <input 
                          type="file" 
                          accept=".xlsx, .xls" 
                          className="hidden" 
                          onChange={(e) => setEnumeratorUsersFile(e.target.files?.[0] || null)}
                        />
                      </div>
                    </label>
                    <button 
                      onClick={() => {
                        const wb = XLSX.utils.book_new();
                        const ws = XLSX.utils.json_to_sheet([{ username: 'enum01', password: 'password123' }]);
                        XLSX.utils.book_append_sheet(wb, ws, 'Enumerators');
                        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                        saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'enumerator_template.xlsx');
                      }}
                      className="p-4 bg-zinc-50 text-zinc-500 rounded-2xl border border-zinc-100 hover:bg-zinc-100 transition-all flex flex-col items-center justify-center gap-2 group"
                      title="Download Template"
                    >
                      <Download className="w-6 h-6 group-hover:text-indigo-600" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Template</span>
                    </button>
                  </div>

                  <button 
                    onClick={handleUploadEnumerators}
                    disabled={!enumeratorUsersFile || enumeratorUploading}
                    className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {enumeratorUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                    {enumeratorUploading ? 'Uploading...' : 'Upload Enumerators'}
                  </button>

                  {enumeratorMessage && (
                    <p className={cn(
                      "text-sm font-medium p-3 rounded-lg text-center",
                      enumeratorMessage.includes('Success') ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                    )}>
                      {enumeratorMessage}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="bg-indigo-600 p-8 rounded-3xl text-white shadow-lg shadow-indigo-200">
              <h3 className="font-bold text-lg mb-4">Required Format</h3>
              <div className="space-y-4 text-sm text-indigo-100">
                <p>Your Excel file must have these headers:</p>
                <div className="space-y-4">
                  <div className="bg-indigo-700/50 p-4 rounded-2xl border border-indigo-400/30">
                    <p className="font-bold text-white mb-2 underline">For Questions:</p>
                    <ul className="list-disc list-inside space-y-1 mb-3">
                      <li><span className="font-bold text-white">text</span>: The question</li>
                      <li><span className="font-bold text-white">type</span>: mcq, text, date, time, number</li>
                      <li><span className="font-bold text-white">options</span>: Comma-separated. For branching, use <code className="bg-indigo-800 px-1 rounded">Option [Jump:Order]</code></li>
                    </ul>
                    <p className="font-mono text-[10px] leading-tight opacity-70">
                      text | type | options<br/>
                      Do you like cats? | mcq | Yes[Jump:3], No[Jump:4]
                    </p>
                  </div>

                  {selectedSurvey.is_enumerator && (
                    <div className="bg-indigo-700/50 p-4 rounded-2xl border border-indigo-400/30">
                      <p className="font-bold text-white mb-2 underline">For Enumerators:</p>
                      <ul className="list-disc list-inside space-y-1 mb-3">
                        <li><span className="font-bold text-white">username</span>: Enumerator's login name</li>
                        <li><span className="font-bold text-white">password</span>: Enumerator's login password</li>
                      </ul>
                      <p className="font-mono text-[10px] leading-tight opacity-70">
                        username | password<br/>
                        enum01 | pass123
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-red-50 p-8 rounded-3xl border border-red-100 shadow-sm">
              <h2 className="text-xl font-bold text-red-900 mb-6 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                Danger Zone
              </h2>
              <p className="text-sm text-red-700 mb-6">Permanently delete all responses for this survey. This action cannot be undone.</p>
              <button 
                onClick={handleClearResponses}
                disabled={stats.length === 0}
                className="w-full bg-red-600 text-white font-bold py-4 rounded-2xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-100 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                Clear All Responses
              </button>
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
                  <div className="flex bg-zinc-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setReportLanguage('en')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                        reportLanguage === 'en' ? "bg-white text-indigo-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                      )}
                    >
                      EN
                    </button>
                    <button 
                      onClick={() => setReportLanguage('dv')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                        reportLanguage === 'dv' ? "bg-white text-indigo-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                      )}
                    >
                      DV
                    </button>
                  </div>
                  <button 
                    onClick={() => setActiveTab('analysis')}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    Go to Analysis Report
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
                  {/* Filter UI */}
                  <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 mb-6 flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex items-center gap-2 text-zinc-500 font-medium whitespace-nowrap">
                      <Filter className="w-4 h-4" />
                      <span>Filter by:</span>
                    </div>
                    <div className="flex-1 flex flex-col sm:flex-row items-center gap-4 w-full">
                      <select
                        className="flex-1 bg-white border border-zinc-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full"
                        value={statsFilter?.questionId || ''}
                        onChange={(e) => setStatsFilter(e.target.value ? { questionId: e.target.value, answer: '' } : null)}
                      >
                        <option value="">All Responses (No Filter)</option>
                        {questions.filter(q => q.type === 'mcq' || q.type === 'checkbox').map(q => (
                          <option key={q.id} value={q.id}>{q.text}</option>
                        ))}
                      </select>
                      
                      {statsFilter?.questionId && (
                        <select
                          className="flex-1 bg-white border border-zinc-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full"
                          value={statsFilter.answer}
                          onChange={(e) => setStatsFilter({ ...statsFilter, answer: e.target.value })}
                        >
                          <option value="">Select Answer...</option>
                          {questions.find(q => q.id === statsFilter.questionId)?.options.map((opt: any) => (
                            <option key={opt.text} value={opt.text}>{opt.text}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {filteredStats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[300px] text-zinc-400">
                      <Filter className="w-12 h-12 mb-4 opacity-20" />
                      <p>No responses match the selected filter.</p>
                    </div>
                  ) : (
                    <>
                      {/* Group stats by question */}
                      {Array.from(new Set(filteredStats.map(s => s.question_id))).map((qId: number) => {
                        const qStats = filteredStats.filter(s => s.question_id === qId);
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
                  </>
                )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analysis' && (
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm min-h-[600px]">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              AI Analysis Report
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Options Panel */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100 space-y-6">
                <h3 className="font-bold text-zinc-900">Report Options</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-2">Detail Level</label>
                    <select 
                      value={analysisOptions.detailLevel}
                      onChange={(e) => setAnalysisOptions({...analysisOptions, detailLevel: e.target.value as 'summary' | 'detailed'})}
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                    >
                      <option value="summary">Summary Only</option>
                      <option value="detailed">Analyze Each Question Separately</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-zinc-700">Include Data</label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={analysisOptions.includePercentages}
                        onChange={(e) => setAnalysisOptions({...analysisOptions, includePercentages: e.target.checked})}
                        className="w-4 h-4 text-indigo-600 rounded border-zinc-300 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-zinc-600">Include Percentages</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={analysisOptions.includeNumbers}
                        onChange={(e) => setAnalysisOptions({...analysisOptions, includeNumbers: e.target.checked})}
                        className="w-4 h-4 text-indigo-600 rounded border-zinc-300 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-zinc-600">Include Numbers (Counts)</span>
                    </label>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-zinc-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={analysisOptions.compareQuestions}
                        onChange={(e) => setAnalysisOptions({...analysisOptions, compareQuestions: e.target.checked})}
                        className="w-4 h-4 text-indigo-600 rounded border-zinc-300 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-semibold text-zinc-700">Compare Questions</span>
                    </label>
                    
                    {analysisOptions.compareQuestions && (
                      <div className="space-y-3 pt-2 pl-6">
                        <select 
                          value={analysisOptions.compareQ1}
                          onChange={(e) => setAnalysisOptions({...analysisOptions, compareQ1: e.target.value})}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        >
                          <option value="">Select Question 1...</option>
                          {Array.from(new Set(stats.map(s => s.question_id))).map(qId => {
                            const q = stats.find(s => s.question_id === qId);
                            return <option key={qId} value={qId}>{q?.text}</option>;
                          })}
                        </select>
                        <div className="text-center text-xs text-zinc-400 font-bold">VS</div>
                        <select 
                          value={analysisOptions.compareQ2}
                          onChange={(e) => setAnalysisOptions({...analysisOptions, compareQ2: e.target.value})}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        >
                          <option value="">Select Question 2...</option>
                          {Array.from(new Set(stats.map(s => s.question_id))).map(qId => {
                            const q = stats.find(s => s.question_id === qId);
                            return <option key={qId} value={qId}>{q?.text}</option>;
                          })}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-4 border-t border-zinc-200">
                    <label className="block text-sm font-semibold text-zinc-700 mb-2">Additional Instructions (Optional)</label>
                    <textarea
                      value={analysisOptions.customPrompt}
                      onChange={(e) => setAnalysisOptions({...analysisOptions, customPrompt: e.target.value})}
                      placeholder="E.g., Focus on the sentiment of text responses, or suggest action items based on question 3..."
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white resize-none h-24 text-sm"
                    />
                  </div>
                </div>

                <button 
                  onClick={generateAIReport}
                  disabled={generatingReport || stats.length === 0}
                  className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-6"
                >
                  {generatingReport ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {generatingReport ? 'Generating Report...' : 'Generate Report'}
                </button>
              </div>
            </div>

            {/* Report Display */}
            <div className="lg:col-span-2">
              <div className="bg-zinc-50 p-8 rounded-3xl border border-zinc-100 min-h-[400px]">
                {report ? (
                  <div className={cn("prose prose-indigo max-w-none", isRTL && "font-dhivehi text-right")} dir={isRTL ? 'rtl' : 'ltr'}>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-2xl font-bold text-zinc-900 m-0">Analysis Report</h3>
                      <button 
                        onClick={handleDownloadWordReport}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-zinc-200 text-zinc-600 rounded-lg text-sm font-bold hover:bg-zinc-50 transition-all"
                      >
                        <Download className="w-4 h-4" />
                        Export as Word
                      </button>
                    </div>
                    <div className="whitespace-pre-wrap text-zinc-700 leading-relaxed">
                      {report}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-400 py-20">
                    <Sparkles className="w-16 h-16 mb-4 opacity-20" />
                    <p>Select options and click Generate Report to see AI analysis.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'preview' && (
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
              <button 
                onClick={() => window.open(`/public/survey/${selectedSurvey.id}?preview=true`, '_blank')}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5"
              >
                <Globe className="w-4 h-4" />
                Preview Survey
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
                        <option value="checkbox">Checkbox</option>
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="time">Time</option>
                      </select>
                      <span className="text-xs text-zinc-400 font-mono">#{q.order}</span>
                      <button 
                        onClick={() => handleToggleRequired(q.id, q.required !== false)}
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider transition-all",
                          q.required !== false 
                            ? "bg-indigo-100 text-indigo-600 hover:bg-indigo-200" 
                            : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                        )}
                      >
                        {q.required !== false 
                          ? (isRTL ? 'މަޖުބޫރު' : 'Required') 
                          : (isRTL ? 'އިޚްތިޔާރީ' : 'Optional')}
                      </button>
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
                  {(q.type === 'mcq' || q.type === 'checkbox') && q.options && (
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
                              value={(opt.nextQuestionOrder === null || isNaN(opt.nextQuestionOrder)) ? 'none' : opt.nextQuestionOrder}
                              onChange={(e) => {
                                const val = e.target.value === 'none' ? null : parseInt(e.target.value);
                                handleUpdateJump(opt.id, isNaN(val as number) ? null : val);
                              }}
                              className="text-[10px] bg-zinc-50 border border-zinc-200 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="none">{isRTL ? 'ޖެހިގެން އިން ސުވާލު' : 'Next Question'}</option>
                              {questions.map((targetQ) => (
                                <option key={targetQ.id} value={targetQ.order || 0}>
                                  #{targetQ.order || 0}: {targetQ.text.substring(0, 20)}...
                                </option>
                              ))}
                              <option value={questions.length + 1}>End Survey</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {(q.type !== 'mcq' && q.type !== 'checkbox') && (
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
                    { id: 'checkbox', label: isRTL ? 'މަލްޓިޕަލް ސެލެކްޝަން' : 'Multiple Selection', icon: CheckSquare },
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

              <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                <div className="flex-1">
                  <p className="text-sm font-bold text-zinc-900">{isRTL ? 'މަޖުބޫރު ސުވާލެއް' : 'Required Question'}</p>
                  <p className="text-xs text-zinc-500">{isRTL ? 'މި ސުވާލަށް ޖަވާބު ނުދީ ކުރިއަކަށް ނުދެވޭނެ' : 'User must answer this question to proceed'}</p>
                </div>
                <button 
                  onClick={() => setNewQuestion({ ...newQuestion, required: !newQuestion.required })}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative",
                    newQuestion.required ? "bg-indigo-600" : "bg-zinc-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    newQuestion.required ? (isRTL ? "left-1" : "right-1") : (isRTL ? "right-1" : "left-1")
                  )} />
                </button>
              </div>

              {(newQuestion.type === 'mcq' || newQuestion.type === 'checkbox') && (
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<any[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<number[]>([]);

  useEffect(() => {
    if (user) {
      fetchSurveys();
    }
  }, [user]);

  const fetchSurveys = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get assignments for this user
      const q = query(collection(db, 'assignments'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const surveyIds = snap.docs.map(doc => doc.data().surveyId);
      
      if (surveyIds.length > 0) {
        const surveysQ = query(collection(db, 'surveys'), where('__name__', 'in', surveyIds));
        const surveysSnap = await getDocs(surveysQ);
        const data = surveysSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort by title alphabetically
        const sorted = data.sort((a: any, b: any) => {
          return a.title.localeCompare(b.title);
        });
        setSurveys(sorted);
      } else {
        setSurveys([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async (surveyId: string) => {
    setLoading(true);
    try {
      const q = query(collection(db, 'questions'), where('surveyId', '==', surveyId), orderBy('order', 'asc'));
      const snap = await getDocs(q);
      
      const optQ = query(collection(db, 'options'), where('surveyId', '==', surveyId));
      const optSnap = await getDocs(optQ);
      const allOptions = optSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const questionsData = snap.docs.map(qDoc => {
        const qData = qDoc.data();
        return {
          id: qDoc.id,
          ...qData,
          options: allOptions.filter((o: any) => o.questionId === qDoc.id)
        };
      });
      setQuestions(questionsData);
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
    if (currentQuestion.required !== false && !answers[currentQuestion.id]) {
      alert('Please answer the question before proceeding.');
      return;
    }

    let nextIndex = currentIndex + 1;

    if (currentQuestion.type === 'mcq') {
      const selectedOpt = currentQuestion.options.find((o: any) => o.text === answers[currentQuestion.id]);
      if (selectedOpt && selectedOpt.nextQuestionOrder !== null) {
        // Find index of question with that order
        const targetIdx = questions.findIndex(q => q.order === selectedOpt.nextQuestionOrder);
        if (targetIdx !== -1) nextIndex = targetIdx;
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
    if (currentQuestion.required !== false && !answers[currentQuestion.id]) {
      alert('Please answer the final question before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const submissionId = crypto.randomUUID();
      const reachedQuestionIds = [...history, currentIndex].map(idx => questions[idx].id);
      const batch = writeBatch(db);
      
      reachedQuestionIds.forEach(qId => {
        const respRef = doc(collection(db, 'responses'));
        batch.set(respRef, {
          userId: user?.uid || null,
          submissionId,
          surveyId: selectedSurvey.id,
          questionId: qId,
          answer: answers[qId] || '',
          submittedAt: serverTimestamp()
        });
      });

      await batch.commit();
      setSubmitted(true);
    } catch (e) {
      console.error('Submission failed:', e);
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <BarChart3 className="text-white w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black text-zinc-900 tracking-tight uppercase">Survey Master Pro</h1>
          </div>
          <button 
            onClick={async () => { await logout(); navigate('/login'); }}
            className="flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
        <h2 className="text-xl font-bold text-zinc-600 mb-6">Available Surveys</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {surveys.map((survey) => (
            <div key={survey.id} className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-md transition-all">
              <h3 className="text-2xl font-bold mb-2" style={{ color: survey.titleColor || '#18181b' }}>{survey.title}</h3>
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
     currentQuestion.options.find((o: any) => o.text === answers[currentQuestion.id])?.nextQuestionOrder > questions.length);

  const isRTL = selectedSurvey?.language === 'dv';

  return (
    <div className={cn("max-w-3xl mx-auto p-8 pb-24", isRTL && "font-dhivehi")} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <BarChart3 className="text-white w-5 h-5" />
          </div>
          <span className="text-sm font-black text-zinc-900 tracking-tight uppercase">Survey Master Pro</span>
        </div>
        <button 
          onClick={async () => { await logout(); navigate('/login'); }}
          className="flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
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

          {currentQuestion.type === 'checkbox' && (
            <div className="grid grid-cols-1 gap-3">
              {currentQuestion.options.map((opt: any) => {
                const currentAnswers = (answers[currentQuestion.id] || '').split(',').filter(Boolean);
                const isChecked = currentAnswers.includes(opt.text);
                return (
                  <label key={opt.text} className={cn(
                    "flex items-center gap-4 p-5 rounded-2xl border transition-all cursor-pointer group",
                    isChecked 
                      ? "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600" 
                      : "border-zinc-100 hover:border-indigo-200 hover:bg-zinc-50",
                    isRTL && "flex-row-reverse"
                  )}>
                    <input 
                      type="checkbox" 
                      name={`q-${currentQuestion.id}`} 
                      value={opt.text}
                      checked={isChecked}
                      onChange={(e) => {
                        let newAnswers;
                        if (e.target.checked) {
                          newAnswers = [...currentAnswers, opt.text];
                        } else {
                          newAnswers = currentAnswers.filter(a => a !== opt.text);
                        }
                        setAnswers({ ...answers, [currentQuestion.id]: newAnswers.join(',') });
                      }}
                      className="w-5 h-5 text-indigo-600 border-zinc-300 rounded focus:ring-indigo-500"
                    />
                    <span className={cn(
                      "font-bold transition-colors flex-1",
                      isChecked ? "text-indigo-900" : "text-zinc-700",
                      isRTL && "text-right"
                    )}>{opt.text}</span>
                  </label>
                );
              })}
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
            {currentQuestion.required === false && !answers[currentQuestion.id] 
              ? (isRTL ? 'ދޫކޮށްލާ' : 'Skip Question') 
              : (isRTL ? 'ކުރިއަށް' : 'Next Question')}
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
            {submitting 
              ? (isRTL ? 'ފޮނުވަނީ...' : 'Submitting...') 
              : (currentQuestion.required === false && !answers[currentQuestion.id]
                ? (isRTL ? 'ދޫކޮށްލާފައި ނިންމާ' : 'Skip & Complete')
                : (isRTL ? 'ނިންމާލާ' : 'Complete Survey'))}
          </button>
        )}
      </div>
    </div>
  );
};

// --- Main App ---

const PublicSurvey = () => {
  const { id } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isPreview = searchParams.get('preview') === 'true';
  const [survey, setSurvey] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Enumerator login states
  const [isEnumeratorLoggedIn, setIsEnumeratorLoggedIn] = useState(false);
  const [enumeratorUsername, setEnumeratorUsername] = useState('');
  const [enumeratorPassword, setEnumeratorPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (id && !authLoading) {
      // Check for session-based enumerator login
      const sessionAuth = sessionStorage.getItem(`enumerator_auth_${id}`);
      if (sessionAuth) {
        try {
          const { username, password } = JSON.parse(sessionAuth);
          setEnumeratorUsername(username);
          setEnumeratorPassword(password);
          // We'll trigger the login check in fetchSurvey or a separate effect
        } catch (e) {
          console.error('Failed to parse session auth:', e);
        }
      }
      fetchSurvey();
    }
  }, [id, authLoading]);

  useEffect(() => {
    if (survey?.is_enumerator && enumeratorUsername && enumeratorPassword && !isEnumeratorLoggedIn && !loggingIn) {
      // Auto-login if credentials are provided via session
      handleEnumeratorLogin(new Event('submit') as any);
    }
  }, [survey, enumeratorUsername, enumeratorPassword, isEnumeratorLoggedIn]);

  const fetchSurvey = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const surveyRef = doc(db, 'surveys', id);
      let surveySnap;
      try {
        surveySnap = await getDoc(surveyRef);
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, `surveys/${id}`);
        return;
      }
      
      if (!surveySnap.exists() || (!surveySnap.data().is_public && !surveySnap.data().is_enumerator && !surveySnap.data().is_group && !isPreview)) {
        throw new Error('Survey not found or not accessible');
      }
      
      setSurvey({ id: surveySnap.id, ...surveySnap.data() });
      
      const q = query(collection(db, 'questions'), where('surveyId', '==', id), orderBy('order', 'asc'));
      let qSnap;
      try {
        qSnap = await getDocs(q);
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, 'questions');
        return;
      }

      const optQ = query(collection(db, 'options'), where('surveyId', '==', id));
      let optSnap;
      try {
        optSnap = await getDocs(optQ);
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, 'options');
        return;
      }
      const allOptions = optSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const questionsData = qSnap.docs.map(qDoc => {
        const qData = qDoc.data();
        return {
          id: qDoc.id,
          ...qData,
          options: allOptions.filter((o: any) => o.questionId === qDoc.id)
        };
      });
      setQuestions(questionsData);
    } catch (e: any) {
      if (e.message.startsWith('{')) {
        const info = JSON.parse(e.message);
        setError(`Permission Denied: ${info.operationType} on ${info.path || 'collection'}. Please check security rules.`);
      } else {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questions[currentIndex];
  const isRTL = survey?.language === 'dv';

  const handleNext = () => {
    if (currentQuestion.required !== false && !answers[currentQuestion.id]) {
      alert(isRTL ? 'މި ސުވާލަށް ޖަވާބު ދެއްވާ!' : 'Please answer the question before proceeding.');
      return;
    }

    let nextIndex = currentIndex + 1;
    if (currentQuestion.type === 'mcq') {
      const selectedOpt = currentQuestion.options.find((o: any) => o.text === answers[currentQuestion.id]);
      if (selectedOpt && selectedOpt.nextQuestionOrder !== null) {
        const targetIdx = questions.findIndex(q => q.order === selectedOpt.nextQuestionOrder);
        if (targetIdx !== -1) nextIndex = targetIdx;
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

  const handleEnumeratorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setLoggingIn(true);
    setLoginError('');
    try {
      const q = query(
        collection(db, 'surveys', id, 'enumerator_users'),
        where('username', '==', enumeratorUsername),
        where('password', '==', enumeratorPassword)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setIsEnumeratorLoggedIn(true);
      } else {
        setLoginError('Invalid username or password');
      }
    } catch (e) {
      console.error('Login failed:', e);
      setLoginError('An error occurred during login');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleSubmit = async () => {
    if (currentQuestion.required !== false && !answers[currentQuestion.id]) {
      alert(isRTL ? 'މި ސުވާލަށް ޖަވާބު ދެއްވާ!' : 'Please answer the final question before submitting.');
      return;
    }

    if (isPreview) {
      setSubmitting(true);
      setTimeout(() => {
        setSubmitted(true);
        setSubmitting(false);
      }, 500);
      return;
    }

    setSubmitting(true);
    try {
      if (survey.is_enumerator && !survey.allow_multiple_submissions) {
        const q = query(
          collection(db, 'responses'),
          where('surveyId', '==', id),
          where('enumeratorUsername', '==', enumeratorUsername),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          alert(isRTL ? 'މި ސާވޭއަށް ކުރިން ޖަވާބު ދެއްވާފައިވެއެވެ.' : 'You have already submitted a response for this survey.');
          setSubmitting(false);
          return;
        }
      }

      const submissionId = crypto.randomUUID();
      const reachedQuestionIds = [...history, currentIndex].map(idx => questions[idx].id);
      const batch = writeBatch(db);
      
      reachedQuestionIds.forEach(qId => {
        const respRef = doc(collection(db, 'responses'));
        batch.set(respRef, {
          userId: null, // Public or Enumerator submission
          enumeratorUsername: survey.is_enumerator ? enumeratorUsername : null,
          groupUsername: survey.is_group ? (sessionStorage.getItem(`group_username_${id}`) || null) : null,
          submissionId,
          surveyId: id,
          questionId: qId,
          answer: answers[qId] || '',
          submittedAt: serverTimestamp()
        });
      });

      try {
        await batch.commit();
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, 'responses');
        return;
      }
      setSubmitted(true);
    } catch (e: any) {
      console.error('Submission failed:', e);
      if (e.message.startsWith('{')) {
        const info = JSON.parse(e.message);
        setError(`Submission failed: Permission Denied on ${info.path || 'collection'}.`);
      } else {
        setError(`Submission failed: ${e.message}`);
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

  const isLastQuestion = currentIndex >= questions.length - 1 || 
    (currentQuestion.type === 'mcq' && 
     currentQuestion.options.find((o: any) => o.text === answers[currentQuestion.id])?.nextQuestionOrder > questions.length);

  if (survey?.is_enumerator && !isEnumeratorLoggedIn && !isPreview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl border border-zinc-200"
        >
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <BarChart3 className="text-white w-6 h-6" />
            </div>
            <span className="text-lg font-black text-zinc-900 tracking-tight uppercase">Survey Master Pro</span>
          </div>
          
          <h2 className="text-2xl font-bold text-zinc-900 mb-2 text-center">{survey.title}</h2>
          <p className="text-zinc-500 text-center mb-8">Please enter your credentials to access this survey.</p>
          
          <form onSubmit={handleEnumeratorLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1">Username</label>
              <input 
                type="text" 
                required
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={enumeratorUsername}
                onChange={(e) => setEnumeratorUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1">Password</label>
              <input 
                type="password" 
                required
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={enumeratorPassword}
                onChange={(e) => setEnumeratorPassword(e.target.value)}
              />
            </div>
            {loginError && <p className="text-red-500 text-sm font-medium">{loginError}</p>}
            <button 
              type="submit"
              disabled={loggingIn}
              className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
            >
              {loggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <Globe className="w-5 h-5" />}
              Access Survey
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-zinc-50 py-12 px-4", isRTL && "font-dhivehi")} dir={isRTL ? 'rtl' : 'ltr'}>
      {isPreview && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white text-center py-2 font-bold z-50 shadow-md">
          Preview Mode - Data will not be saved
        </div>
      )}
      <div className={cn("max-w-3xl mx-auto", isPreview && "mt-8")}>
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <BarChart3 className="text-white w-5 h-5" />
          </div>
          <span className="text-sm font-black text-zinc-900 tracking-tight uppercase">Survey Master Pro</span>
        </div>
        <div className="mb-10 flex items-center justify-between">
          <div className={cn(isRTL && "text-right")}>
            <h1 className="text-3xl font-bold mb-2" style={{ color: survey.titleColor || '#18181b' }}>{survey.title}</h1>
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

            {currentQuestion.type === 'checkbox' && (
              <div className="grid grid-cols-1 gap-3">
                {currentQuestion.options.map((opt: any) => {
                  const currentAnswers = (answers[currentQuestion.id] || '').split(',').filter(Boolean);
                  const isChecked = currentAnswers.includes(opt.text);
                  return (
                    <label key={opt.text} className={cn(
                      "flex items-center gap-4 p-5 rounded-2xl border transition-all cursor-pointer group",
                      isChecked 
                        ? "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600" 
                        : "border-zinc-100 hover:border-indigo-200 hover:bg-zinc-50",
                      isRTL && "flex-row-reverse"
                    )}>
                      <input 
                        type="checkbox" 
                        name={`q-${currentQuestion.id}`} 
                        value={opt.text}
                        checked={isChecked}
                        onChange={(e) => {
                          let newAnswers;
                          if (e.target.checked) {
                            newAnswers = [...currentAnswers, opt.text];
                          } else {
                            newAnswers = currentAnswers.filter(a => a !== opt.text);
                          }
                          setAnswers({ ...answers, [currentQuestion.id]: newAnswers.join(',') });
                        }}
                        className="w-5 h-5 text-indigo-600 border-zinc-300 rounded focus:ring-indigo-500"
                      />
                      <span className={cn(
                        "font-bold transition-colors flex-1",
                        isChecked ? "text-indigo-900" : "text-zinc-700",
                        isRTL && "text-right"
                      )}>{opt.text}</span>
                    </label>
                  );
                })}
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
              {currentQuestion.required === false && !answers[currentQuestion.id] 
                ? (isRTL ? 'ދޫކޮށްލާ' : 'Skip Question') 
                : (isRTL ? 'ކުރިއަށް' : 'Next Question')}
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
              {submitting 
                ? (isRTL ? 'ފޮނުވަނީ...' : 'Submitting...') 
                : (currentQuestion.required === false && !answers[currentQuestion.id]
                  ? (isRTL ? 'ދޫކޮށްލާފައި ނިންމާ' : 'Skip & Complete')
                  : (isRTL ? 'ނިންމާލާ' : 'Complete Survey'))}
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
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/enumerator-login" element={<EnumeratorLogin />} />
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
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
