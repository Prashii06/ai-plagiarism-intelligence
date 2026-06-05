import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, FileText, Shield, Lock, Zap, BookOpen, CheckCircle, AlertCircle } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

type AnalysisReport = {
  plagiarism_score: string
  style_inconsistencies: string[]
  contextual_reasoning: string
  verdict: string
  raw_output: string
}

type UploadResponse = {
  success: boolean
  filename: string
  student_id: string | null
  assignment_title: string | null
  extracted_text: string
  analysis_report: AnalysisReport
  historical_submissions: string[]
}

type Submission = {
  id: string
  student_id: string
  assignment_title: string
  text: string
  teacher: string
  status: string
  review_note: string
  metadata: Record<string, unknown>
  uploaded_at: string
}

type AuthMode = 'login' | 'signup'

function App() {
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string>('')
  const [authError, setAuthError] = useState<string>('')
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [studentId, setStudentId] = useState<string>('')
  const [assignmentTitle, setAssignmentTitle] = useState<string>('')
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null)
  const [extractedText, setExtractedText] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [reviewNote, setReviewNote] = useState<string>('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const activePath = useMemo(() => location.pathname, [location.pathname])

  useEffect(() => {
    const savedToken = localStorage.getItem('plagiarism_token')
    if (savedToken) {
      setToken(savedToken)
      fetchSubmissions(savedToken)
    }
  }, [])

  const apiFetch = async (path: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers as HeadersInit)
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    const response = await fetch(`${API_URL}${path}`, { ...options, headers })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || `API error ${response.status}`)
    }
    return response.json()
  }

  const setSessionToken = (newToken: string) => {
    localStorage.setItem('plagiarism_token', newToken)
    setToken(newToken)
  }

  const clearSession = () => {
    localStorage.removeItem('plagiarism_token')
    setToken(null)
    setSubmissions([])
    setExtractedText('')
    setAnalysisReport(null)
    setError('')
    setAuthError('')
    setUsername('')
    setPassword('')
    navigate('/login')
  }

  const fetchSubmissions = async (authToken: string) => {
    try {
      const response = await fetch(`${API_URL}/api/submissions`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      if (!response.ok) {
        throw new Error(await response.text())
      }
      const data = await response.json()
      setSubmissions(data.submissions ?? [])
    } catch (err) {
      console.error(err)
      setError('Failed to load submissions. Please sign in again.')
      clearSession()
    }
  }

  const handleAuth = async (mode: AuthMode) => {
    setAuthError('')
    if (!username.trim() || !password.trim()) {
      setAuthError('Please enter both username and password.')
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || `Unable to ${mode}`)
      }

      const data = await response.json()
      if (data?.token) {
        setSessionToken(data.token)
        setAuthError('')
        setError('')
        setUsername('')
        setPassword('')
        fetchSubmissions(data.token)
        navigate('/dashboard')
      } else {
        throw new Error('Authentication response missing token.')
      }
    } catch (err) {
      setAuthError(typeof err === 'string' ? err : (err as Error).message)
    }
  }

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore logout errors
    }
    clearSession()
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setSelectedFile(file)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!token) {
      setError('You must be logged in to submit assignments.')
      return
    }

    if (!selectedFile) {
      setError('Please attach an assignment image before submitting.')
      return
    }

    setLoading(true)
    setExtractedText('')
    setAnalysisReport(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      if (studentId.trim()) {
        formData.append('student_id', studentId.trim())
      }
      if (assignmentTitle.trim()) {
        formData.append('assignment_title', assignmentTitle.trim())
      }

      const response = await fetch(`${API_URL}/api/upload-assignment`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || `Server returned ${response.status}`)
      }

      const data = (await response.json()) as UploadResponse
      if (!data.success) {
        throw new Error('The backend failed to process the request.')
      }

      setExtractedText(data.extracted_text)
      setAnalysisReport(data.analysis_report)
      setError('')
      setLoading(false)
      navigate('/analysis')
      fetchSubmissions(token)
    } catch (err) {
      console.error(err)
      setError(typeof err === 'string' ? err : (err as Error).message)
      setLoading(false)
    }
  }

  const handleReview = async (submissionId: string, status: string) => {
    if (!token) {
      setError('You must be logged in to review submissions.')
      return
    }

    try {
      await apiFetch(`/api/submissions/${submissionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, review_note: reviewNote.trim() || 'Reviewed.' }),
      })
      fetchSubmissions(token)
      setReviewNote('')
      setError('')
    } catch (err) {
      setError(typeof err === 'string' ? err : (err as Error).message)
    }
  }

  const isAuthenticated = Boolean(token)

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <Navbar isAuthenticated={isAuthenticated} activePath={activePath} onLogout={handleLogout} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <AuthPage mode="login" username={username} password={password} setUsername={setUsername} setPassword={setPassword} authError={authError} onSubmit={() => handleAuth('login')} />}
          />
          <Route
            path="/signup"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <AuthPage mode="signup" username={username} password={password} setUsername={setUsername} setPassword={setPassword} authError={authError} onSubmit={() => handleAuth('signup')} />}
          />
          <Route path="/dashboard" element={isAuthenticated ? <DashboardPage submissions={submissions} onReview={handleReview} reviewNote={reviewNote} setReviewNote={setReviewNote} error={error} /> : <Navigate to="/login" replace />} />
          <Route
            path="/upload"
            element={isAuthenticated ? <UploadPage selectedFile={selectedFile} onFileChange={handleFileChange} studentId={studentId} assignmentTitle={assignmentTitle} setStudentId={setStudentId} setAssignmentTitle={setAssignmentTitle} onSubmit={handleSubmit} loading={loading} error={error} /> : <Navigate to="/login" replace />}
          />
          <Route path="/analysis" element={isAuthenticated ? <AnalysisPage extractedText={extractedText} analysisReport={analysisReport} /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/'} replace />} />
        </Routes>
      </main>

      <Footer />
    </div>
  )
}

function Navbar({ isAuthenticated, activePath, onLogout, mobileMenuOpen, setMobileMenuOpen }: { isAuthenticated: boolean; activePath: string; onLogout: () => void; mobileMenuOpen: boolean; setMobileMenuOpen: (open: boolean) => void }) {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex items-center">
              <img
                src="/logo%20(2).png"
                alt="AI Plagiarism Intelligence"
                className="h-9 w-auto"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                AI Plagiarism Checker
              </h1>
              <p className="text-xs text-slate-500">Check for Plagiarism anytime, anywhere!</p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {isAuthenticated ? (
              <>
                <NavLink to="/dashboard" active={activePath === '/dashboard'} label="Dashboard" />
                <NavLink to="/upload" active={activePath === '/upload'} label="Upload" />
                <NavLink to="/analysis" active={activePath === '/analysis'} label="Analysis" />
                <button onClick={onLogout} className="btn-secondary">
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink to="/" active={activePath === '/'} label="Home" />
                <NavLink to="/login" active={activePath === '/login'} label="Login" />
                <NavLink to="/signup" active={activePath === '/signup'} label="Sign Up" />
              </>
            )}
          </div>

          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-slate-600" />
            ) : (
              <Menu className="w-6 h-6 text-slate-600" />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {isAuthenticated ? (
              <>
                <MobileNavLink to="/dashboard" active={activePath === '/dashboard'} label="Dashboard" />
                <MobileNavLink to="/upload" active={activePath === '/upload'} label="Upload" />
                <MobileNavLink to="/analysis" active={activePath === '/analysis'} label="Analysis" />
                <button onClick={onLogout} className="w-full btn-secondary text-left">
                  Logout
                </button>
              </>
            ) : (
              <>
                <MobileNavLink to="/" active={activePath === '/'} label="Home" />
                <MobileNavLink to="/login" active={activePath === '/login'} label="Login" />
                <MobileNavLink to="/signup" active={activePath === '/signup'} label="Sign Up" />
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

function NavLink({ to, active, label }: { to: string; active: boolean; label: string }) {
  return (
    <Link to={to} className={`nav-link ${active ? 'text-blue-600' : ''}`}>
      {label}
    </Link>
  )
}

function MobileNavLink({ to, active, label }: { to: string; active: boolean; label: string }) {
  return (
    <Link to={to} className={`block px-4 py-2 rounded-lg ${active ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>
      {label}
    </Link>
  )
}

type AuthPageProps = {
  mode: AuthMode
  username: string
  password: string
  setUsername: (value: string) => void
  setPassword: (value: string) => void
  authError: string
  onSubmit: () => void
}

function AuthPage({ mode, username, password, setUsername, setPassword, authError, onSubmit }: AuthPageProps) {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="card">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </h2>
        
        <p className="text-slate-600 mb-6">
          {mode === 'login' ? 'Access your verification workspace' : 'Join our community of content verifiers'}
        </p>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit() }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="form-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="form-input"
            />
          </div>

          {authError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{authError}</p>
            </div>
          )}

          <button type="submit" className="btn-primary w-full">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 className="text-xl font-bold text-slate-900 mb-4">
          {mode === 'login' ? 'New to our platform?' : 'What you get'}
        </h3>
        <ul className="space-y-3">
          <li className="flex gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="text-slate-700">Secure authentication and session management</span>
          </li>
          <li className="flex gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="text-slate-700">Advanced OCR text extraction and normalization</span>
          </li>
          <li className="flex gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="text-slate-700">AI-powered plagiarism and style analysis</span>
          </li>
          <li className="flex gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="text-slate-700">Historical context retrieval and comparison</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

function LandingPage() {
  return (
    <div className="space-y-12">
      <section className="card">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-blue-600 font-semibold text-sm uppercase tracking-wide">Content Verification</p>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mt-2 mb-4">
              Advanced plagiarism detection for enterprises and individuals.
            </h1>
            <p className="text-lg text-slate-600 mb-6">
              Upload documents, extract text with OCR,\ and receive AI-powered analysis. Built for organizations that demand transparency and accuracy.
            </p>
            <div className="flex gap-4">
              <Link to="/login" className="btn-primary">
                Get Started
              </Link>
              <Link to="/signup" className="btn-secondary">
                Create Account
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FeatureCard icon={Shield} title="Security First" description="Enterprise-grade authentication and data protection" />
            <FeatureCard icon={FileText} title="OCR Extraction" description="Accurate text extraction from document images" />
            <FeatureCard icon={Zap} title="AI Analysis" description="Real-time plagiarism and style analysis" />
            <FeatureCard icon={Lock} title="Verified Results" description="Transparent verdicts backed by AI reasoning" />
          </div>
        </div>
      </section>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="card !p-4">
      <Icon className="w-6 h-6 text-blue-600 mb-2" />
      <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
      <p className="text-xs text-slate-600 mt-1">{description}</p>
    </div>
  )
}

type UploadPageProps = {
  selectedFile: File | null
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  studentId: string
  assignmentTitle: string
  setStudentId: (value: string) => void
  setAssignmentTitle: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  loading: boolean
  error: string
}

function UploadPage({ selectedFile, onFileChange, studentId, assignmentTitle, setStudentId, setAssignmentTitle, onSubmit, loading, error }: UploadPageProps) {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="card">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Upload Content</h2>
        <p className="text-slate-600 mb-6">Submit an image for OCR extraction and analysis</p>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Individual ID</label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="e.g. STU-2026-001"
              className="form-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
            <input
              type="text"
              value={assignmentTitle}
              onChange={(e) => setAssignmentTitle(e.target.value)}
              placeholder="e.g. Research Report"
              className="form-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Image File</label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={onFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                <p className="text-sm font-medium text-slate-700">
                  {selectedFile ? selectedFile.name : 'Click to upload image'}
                </p>
                <p className="text-xs text-slate-500">PNG, JPG, or GIF</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Tips</h3>
        <div className="space-y-4">
          <div className="flex gap-3">
            <BookOpen className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <p className="font-medium text-slate-900">Use consistent IDs</p>
              <p className="text-sm text-slate-600">Keep the content ID consistent across uploads for better historical comparison</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <p className="font-medium text-slate-900">Verify OCR results</p>
              <p className="text-sm text-slate-600">Review the extracted text before trusting the final analysis verdict</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <p className="font-medium text-slate-900">Check analysis page</p>
              <p className="text-sm text-slate-600">View comprehensive results on the dedicated analysis page</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

type DashboardPageProps = {
  submissions: Submission[]
  onReview: (submissionId: string, status: string) => void
  reviewNote: string
  setReviewNote: (value: string) => void
  error: string
}

function DashboardPage({ submissions, onReview, reviewNote, setReviewNote, error }: DashboardPageProps) {
  return (
    <div className="grid md:grid-cols-3 gap-8">
      <div className="md:col-span-1 space-y-6">
        <div className="card">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Dashboard</h2>
          <p className="text-slate-600 mb-6">Monitor and manage all submissions</p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/60 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-700 mb-1">Total</p>
              <p className="text-2xl font-bold text-blue-900">{submissions.length}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/60 rounded-lg p-3">
              <p className="text-xs font-medium text-amber-700 mb-1">Pending</p>
              <p className="text-2xl font-bold text-amber-900">
                {submissions.filter((s) => s.status === 'pending').length}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Review Note</label>
            <input
              type="text"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Add a note..."
              className="form-input"
            />
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>
      </div>

      <div className="md:col-span-2 card">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Submissions</h3>

        {submissions.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No submissions yet.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {submissions.slice().reverse().map((submission) => (
              <div key={submission.id} className="p-4 border border-slate-200/60 rounded-xl hover:border-slate-300/80 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900">{submission.assignment_title}</h4>
                    <p className="text-xs text-slate-500">ID: {submission.student_id}</p>
                  </div>
                  <span
                    className={`badge-${submission.status === 'approved' ? 'success' : submission.status === 'suspicious' ? 'error' : 'warning'}`}
                  >
                    {submission.status}
                  </span>
                </div>

                <p className="text-sm text-slate-600 mb-3 line-clamp-2">{submission.text.slice(0, 100)}...</p>

                <p className="text-xs text-slate-500 mb-3">
                  Uploaded: {new Date(submission.uploaded_at).toLocaleDateString()} at{' '}
                  {new Date(submission.uploaded_at).toLocaleTimeString()}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => onReview(submission.id, 'approved')}
                    className="flex-1 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 font-medium text-sm transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => onReview(submission.id, 'suspicious')}
                    className="flex-1 px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 font-medium text-sm transition-colors"
                  >
                    Flag
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

type AnalysisPageProps = {
  extractedText: string
  analysisReport: AnalysisReport | null
}

function AnalysisPage({ extractedText, analysisReport }: AnalysisPageProps) {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="card">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Analysis Results</h2>
        <p className="text-slate-600 mb-6">Complete plagiarism and style assessment</p>

        {!analysisReport ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">No analysis yet. Upload content to get started.</p>
            <Link to="/upload" className="btn-secondary">
              Upload Now
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/60 rounded-xl p-4">
                <p className="text-sm text-blue-700 font-medium mb-1">Risk Score</p>
                <p className="text-3xl font-bold text-blue-900">{analysisReport.plagiarism_score}</p>
              </div>
              <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/60 rounded-xl p-4">
                <p className="text-sm text-slate-700 font-medium mb-1">Verdict</p>
                <p className="text-lg font-bold text-slate-900">{analysisReport.verdict}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Style Inconsistencies</h3>
              <ul className="space-y-2">
                {analysisReport.style_inconsistencies.length > 0 ? (
                  analysisReport.style_inconsistencies.map((item, idx) => (
                    <li key={idx} className="flex gap-2 text-sm text-slate-700">
                      <span className="text-blue-600">•</span>
                      {item}
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-slate-500">No inconsistencies detected.</li>
                )}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Contextual Analysis</h3>
              <p className="text-sm text-slate-700 leading-relaxed">{analysisReport.contextual_reasoning}</p>
            </div>

            <details className="border border-slate-200 rounded-lg overflow-hidden">
              <summary className="px-4 py-3 bg-slate-50 hover:bg-slate-100 cursor-pointer font-medium text-slate-900 transition-colors">
                Raw AI Output
              </summary>
              <pre className="p-4 bg-slate-900 text-slate-100 text-xs overflow-x-auto font-mono">
                {analysisReport.raw_output}
              </pre>
            </details>
          </div>
        )}
      </div>

      {analysisReport && (
        <div className="card">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Extracted Content</h3>
          <div className="bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-xs overflow-y-auto max-h-96 whitespace-pre-wrap break-words">
            {extractedText || 'No text extracted.'}
          </div>
        </div>
      )}
    </div>
  )
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200/50 bg-white/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">AI Plagiarism Intelligence</h3>
            <p className="text-sm text-slate-600">
              Enterprise-grade content verification for organizations and individuals.
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600">
              Advanced OCR extraction. AI-powered analysis. Transparent verdicts.
            </p>
          </div>
          <div className="text-sm text-slate-500">
            <p>© 2026 AI Plagiarism Intelligence</p>
            <p>All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default App
