import { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowLeft, ArrowRight, Bell, BookOpen, CalendarDays, Check, ChevronDown,
  CircleHelp, ClipboardCheck, Coins, CreditCard, GraduationCap, LayoutDashboard, LogOut, Menu, Plus,
  Printer, School, Search, Settings, Shield, Users, X,
} from 'lucide-react';
import LandingPage from './LandingPage.jsx';

const KEYS = {
  accounts: '@edu-meet/accounts',
  roles: '@edu-meet/role-assignments',
  session: '@edu-meet/session',
  studentSession: '@edu-meet/student-session',
  students: '@edu-meet/students',
  workspace: '@edu-meet/admin-workspace',
  passwords: '@edu-meet/web-passwords',
};
const ROLES = ['admin', 'teacher', 'parent'];
const SUPER_ADMIN = { uid: 'edu-meet-system-super-admin', name: 'Edu-Meet Super Admin', email: 'superadmin@edu-meet.local' };
const CLASS_LEVELS = {
  Nursery: ['Nursery 1', 'Nursery 2', 'Nursery 3'],
  Primary: ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'],
  'Junior Secondary': ['Junior Secondary 1', 'Junior Secondary 2', 'Junior Secondary 3'],
  'Senior Secondary': ['Senior Secondary 1', 'Senior Secondary 2', 'Senior Secondary 3'],
};
const EMPTY_WORKSPACE = {
  profile: { schoolName: '', name: '', email: '', phone: '', address: '', session: '2026/2027', term: 'First term', currency: 'NGN' },
  students: [], staff: [], classes: [], attendance: [], classTimetable: [], scheduledAssessments: [],
  announcements: [], events: [], payments: [], feeCharges: [],
};
const NAVIGATION = [
  { id: 'home', label: 'Home', icon: LayoutDashboard },
  { id: 'people', label: 'People', icon: Users },
  { id: 'classes', label: 'Classes', icon: BookOpen },
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { id: 'schedule', label: 'Timetable', icon: CalendarDays },
  { id: 'updates', label: 'Announcements', icon: Bell },
  { id: 'finance', label: 'Finance', icon: Coins },
  { id: 'reports', label: 'Reports', icon: Activity },
  { id: 'settings', label: 'Settings', icon: Settings },
];
const todayKey = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const createId = () => `edu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const readJson = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};
const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const bytesToHex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
async function hashPassword(password, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, key, 256);
  return { salt: bytesToHex(salt), hash: bytesToHex(new Uint8Array(bits)) };
}
async function verifyPassword(password, saved) {
  if (!saved || typeof saved !== 'object' || !saved.salt || !saved.hash) return false;
  const salt = new Uint8Array(saved.salt.match(/.{2}/g).map((part) => Number.parseInt(part, 16)));
  const candidate = await hashPassword(password, salt);
  return candidate.hash === saved.hash;
}
const classLabel = (record) => [record.name, record.track, record.arm].filter(Boolean).join(' ');
const money = (amount, currency = 'NGN') => {
  try { return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(amount) || 0); }
  catch { return `${currency} ${(Number(amount) || 0).toLocaleString()}`; }
};
const formattedDate = (date) => date ? new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date set';

function loadAccounts() {
  const accounts = readJson(KEYS.accounts, []);
  const roleAssignments = readJson(KEYS.roles, {});
  if (!accounts.some((account) => account.uid === SUPER_ADMIN.uid)) accounts.push(SUPER_ADMIN);
  roleAssignments[SUPER_ADMIN.uid] = 'super-admin';
  writeJson(KEYS.accounts, accounts);
  writeJson(KEYS.roles, roleAssignments);
  return { accounts, roleAssignments };
}
function blankWorkspace(user) {
  return { ...EMPTY_WORKSPACE, profile: { ...EMPTY_WORKSPACE.profile, name: user.name || '', schoolName: user.schoolName || '', email: user.email || '' } };
}
function readWorkspace(user) {
  const saved = readJson(KEYS.workspace, null);
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return blankWorkspace(user);
  return Object.fromEntries(Object.entries(EMPTY_WORKSPACE).map(([key, fallback]) => [
    key,
    key === 'profile' ? { ...fallback, ...(saved.profile || {}) } : Array.isArray(saved[key]) ? saved[key] : [],
  ]));
}
function readableRole(role) { return role === 'super-admin' ? 'Super admin' : role[0].toUpperCase() + role.slice(1); }

function App() {
  const [accountsState, setAccountsState] = useState(() => loadAccounts());
  const [user, setUser] = useState(() => {
    const { accounts, roleAssignments } = loadAccounts();
    const savedUid = localStorage.getItem(KEYS.session);
    const savedStudentId = localStorage.getItem(KEYS.studentSession);
    if (savedUid) {
      const account = accounts.find((item) => item.uid === savedUid);
      if (account && roleAssignments[account.uid]) return { ...account, role: roleAssignments[account.uid] };
    }
    if (savedStudentId) {
      const student = readJson(KEYS.students, []).find((item) => item.admissionNumber === savedStudentId);
      if (student) return { ...student, uid: student.admissionNumber, role: 'student' };
    }
    return null;
  });
  const [workspace, setWorkspace] = useState(() => blankWorkspace({}));
  const [activePage, setActivePage] = useState('home');
  const [authMode, setAuthMode] = useState('signIn');
  const [showAuth, setShowAuth] = useState(false);
  const [loginType, setLoginType] = useState('staff');
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [modal, setModal] = useState('');
  const [generatedIdCard, setGeneratedIdCard] = useState(null);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (user) setWorkspace(readWorkspace(user));
  }, [user]);

  const persistWorkspace = (updated) => {
    writeJson(KEYS.workspace, updated);
    setWorkspace(updated);
  };
  const signOut = () => {
    localStorage.removeItem(KEYS.session);
    localStorage.removeItem(KEYS.studentSession);
    setUser(null);
    setActivePage('home');
    setAuthMode('signIn');
    setShowAuth(false);
    setAuthError('');
  };

  const handleAuth = async (event) => {
    event.preventDefault();
    setAuthError('');
    setAuthNotice('');
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') || '');
    if (password.length < 8) { setAuthError('Your password must be at least 8 characters.'); return; }
    setAuthBusy(true);
    try {
      const passwords = readJson(KEYS.passwords, {});
      if (authMode === 'signUp') {
        const name = String(form.get('name') || '').trim();
        const email = String(form.get('email') || '').trim().toLowerCase();
        const confirmPassword = String(form.get('confirmPassword') || '');
        if (!name) throw new Error('Enter your full name.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
        if (password !== confirmPassword) throw new Error('The passwords do not match.');
        const { accounts, roleAssignments } = loadAccounts();
        if (accounts.some((account) => account.email?.toLowerCase() === email)) throw new Error('An account with this email already exists on this device.');
        const account = { uid: createId(), name, email, schoolName: '', role: 'admin' };
        passwords[email] = await hashPassword(password);
        roleAssignments[account.uid] = 'admin';
        writeJson(KEYS.passwords, passwords);
        writeJson(KEYS.accounts, [...accounts, account]);
        writeJson(KEYS.roles, roleAssignments);
        writeJson(KEYS.workspace, blankWorkspace(account));
        localStorage.setItem(KEYS.session, account.uid);
        setAccountsState({ accounts: [...accounts, account], roleAssignments });
        setUser(account);
        return;
      }
      if (loginType === 'student') {
        const admissionNumber = String(form.get('admissionNumber') || '').trim().toUpperCase();
        if (!admissionNumber) throw new Error('Enter your admission number.');
        const students = readJson(KEYS.students, []);
        const student = students.find((item) => item.admissionNumber === admissionNumber);
        if (!student) throw new Error('No student with this admission number was found on this device. Ask your school administrator for access.');
        if (student.status === 'Inactive') throw new Error('This student account is inactive. Please contact your school administrator.');
        if (!await verifyPassword(password, passwords[`student:${admissionNumber}`])) throw new Error('The admission number or password is incorrect.');
        localStorage.setItem(KEYS.studentSession, admissionNumber);
        setUser({ ...student, uid: admissionNumber, role: 'student' });
        return;
      }
      const email = String(form.get('email') || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
      const { accounts, roleAssignments } = loadAccounts();
      const account = accounts.find((item) => item.email?.toLowerCase() === email);
      if (!account) throw new Error('No account with this email was found on this device. Create an account first.');
      const passwordMatches = account.uid === SUPER_ADMIN.uid
        ? password === 'edu-meet-demo-only'
        : await verifyPassword(password, passwords[email]);
      if (!passwordMatches) throw new Error('The email or password is incorrect.');
      const role = roleAssignments[account.uid];
      if (!role) throw new Error('Your account is waiting for a super-admin to assign a role.');
      localStorage.setItem(KEYS.session, account.uid);
      setAccountsState({ accounts, roleAssignments });
      setUser({ ...account, role });
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'We could not sign in. Please try again.');
    } finally { setAuthBusy(false); }
  };

  const visibleNav = useMemo(() => {
    if (!user || user.role === 'admin') return NAVIGATION;
    if (user.role === 'super-admin') return [
      NAVIGATION[0],
      { id: 'access', label: 'Account access', icon: Shield },
    ];
    if (user.role === 'teacher') return NAVIGATION.filter((item) => ['home', 'people', 'attendance', 'schedule', 'updates'].includes(item.id));
    if (user.role === 'student') return NAVIGATION.filter((item) => ['home', 'schedule', 'attendance', 'updates'].includes(item.id));
    return NAVIGATION.filter((item) => ['home', 'updates', 'attendance'].includes(item.id));
  }, [user]);

  const navigate = (page) => {
    setActivePage(page);
    setMobileNavOpen(false);
    setQuery('');
  };

  const addRecord = async (kind, values) => {
    const id = createId();
    const updated = { ...workspace };
    const now = todayKey();
    let idCard = null;
    if (kind === 'student') {
      const admissionNumber = values.admissionNumber.trim().toUpperCase();
      if (!values.name.trim()) throw new Error('Student full name is required.');
      if (!values.className.trim()) throw new Error('Assign the student to a class and arm.');
      if (workspace.students.some((student) => student.admissionNumber === admissionNumber)) throw new Error('That admission number is already in use.');
      if (values.password.length < 8) throw new Error('Set a student password with at least 8 characters.');
      const student = { id, name: values.name.trim(), admissionNumber, className: values.className.trim(), parentName: values.parentName.trim(), parentPhone: values.parentPhone.trim(), status: 'Active' };
      idCard = { type: 'Student', person: student, identifier: admissionNumber };
      updated.students = [...workspace.students, student];
      const students = readJson(KEYS.students, []);
      writeJson(KEYS.students, [...students, student]);
      const passwords = readJson(KEYS.passwords, {});
      passwords[`student:${admissionNumber}`] = await hashPassword(values.password);
      writeJson(KEYS.passwords, passwords);
    } else if (kind === 'teacher' || kind === 'parent') {
      const email = values.email.trim().toLowerCase();
      if (!values.name.trim()) throw new Error('Full name is required.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
      if (accountsState.accounts.some((account) => account.email?.toLowerCase() === email)) throw new Error('That email address already belongs to another account.');
      if (values.password.length < 8) throw new Error('Set a temporary password with at least 8 characters.');
      if (kind === 'teacher' && !values.classId) throw new Error('Assign the teacher to at least one class.');
      const studentAdmissionNumber = values.studentAdmissionNumber?.trim().toUpperCase() || '';
      if (kind === 'parent' && studentAdmissionNumber && !workspace.students.some((student) => student.admissionNumber === studentAdmissionNumber)) throw new Error('No student with this admission number was found in the school register.');
      const staffId = `TCH-${id.split('-').at(-1).toUpperCase()}`;
      const staffMember = { id, authUid: id, staffId, name: values.name.trim(), email, phone: values.phone.trim(), studentAdmissionNumber, role: kind, status: 'Active', classIds: values.classId ? [values.classId] : [], teacherType: 'class', subjects: [] };
      if (kind === 'teacher') idCard = { type: 'Teacher', person: staffMember, identifier: staffId };
      updated.staff = [...workspace.staff, staffMember];
      const account = { uid: id, name: staffMember.name, email };
      const accounts = [...accountsState.accounts, account];
      const roleAssignments = { ...accountsState.roleAssignments, [id]: kind };
      const passwords = readJson(KEYS.passwords, {});
      passwords[email] = await hashPassword(values.password);
      writeJson(KEYS.passwords, passwords);
      writeJson(KEYS.accounts, accounts);
      writeJson(KEYS.roles, roleAssignments);
      setAccountsState({ accounts, roleAssignments });
    } else if (kind === 'class') {
      if (!CLASS_LEVELS[values.stage]?.includes(values.name)) throw new Error('Choose a class name from the selected school section.');
      if (values.stage === 'Senior Secondary' && !['Science', 'Art', 'Commercial'].includes(values.track)) throw new Error('Choose a Science, Art, or Commercial stream for senior secondary.');
      const schoolClass = { id, name: values.name, stage: values.stage, track: values.track, arm: values.arm.trim(), capacity: Number(values.capacity) || 0, status: 'Active' };
      if (workspace.classes.some((item) => classLabel(item) === classLabel(schoolClass))) throw new Error('This class and stream already exist. Choose another arm or edit the existing class.');
      updated.classes = [...workspace.classes, schoolClass];
    } else if (kind === 'announcement') {
      if (!values.title.trim() || !values.message.trim()) throw new Error('Announcement title and message are required.');
      updated.announcements = [{ id, title: values.title.trim(), message: values.message.trim(), audience: values.audience || 'Whole school', date: now }, ...workspace.announcements];
    } else if (kind === 'payment') {
      if (!values.payerName.trim() || !values.category.trim() || Number(values.amount) <= 0) throw new Error('Enter a payer, fee category, and amount greater than zero.');
      updated.payments = [{ id, payerName: values.payerName.trim(), studentAdmissionNumber: values.studentAdmissionNumber.trim().toUpperCase(), category: values.category.trim(), amount: Number(values.amount), method: values.method || 'Transfer', date: now, status: 'Recorded' }, ...workspace.payments];
    } else if (kind === 'event') {
      if (!values.title.trim() || !values.date) throw new Error('Event or deadline and date are required.');
      updated.events = [{ id, title: values.title.trim(), date: values.date, type: values.type || 'Event' }, ...workspace.events];
    } else if (kind === 'period') {
      if (!values.classId || !values.subject.trim() || !values.startTime || !values.endTime) throw new Error('Choose a class, subject, and period time.');
      if (values.endTime <= values.startTime) throw new Error('The end time must be after the start time.');
      updated.classTimetable = [...workspace.classTimetable, { id, classId: values.classId, className: classLabel(workspace.classes.find((item) => item.id === values.classId) || {}), day: values.day, subject: values.subject.trim(), teacherName: values.teacherName.trim(), startTime: values.startTime, endTime: values.endTime }];
    } else if (kind === 'assessment') {
      if (!values.classId || !values.title.trim() || !values.date || !values.subject.trim()) throw new Error('Complete the assessment details.');
      updated.scheduledAssessments = [...workspace.scheduledAssessments, { id, classId: values.classId, title: values.title.trim(), kind: values.kind || 'Test', date: values.date, subject: values.subject.trim(), startTime: values.startTime || '', durationMinutes: Number(values.durationMinutes) || 0 }];
    }
    persistWorkspace(updated);
    setModal('');
    if (idCard) setGeneratedIdCard(idCard);
    setNotice(`${kind === 'period' ? 'Timetable period' : kind[0].toUpperCase() + kind.slice(1)} saved.`);
  };

  const markAttendance = (student, status) => {
    const date = todayKey();
    const record = { id: createId(), studentId: student.id, studentName: student.name, admissionNumber: student.admissionNumber, date, status, teacherId: user.uid };
    const attendance = workspace.attendance.filter((item) => !(item.studentId === student.id && item.date === date));
    persistWorkspace({ ...workspace, attendance: [...attendance, record] });
    setNotice(`${student.name}: ${status.toLowerCase()} attendance saved.`);
  };

  const saveSettings = (event, logoDataUri) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const profile = { ...workspace.profile, schoolName: String(form.get('schoolName') || '').trim(), phone: String(form.get('phone') || '').trim(), address: String(form.get('address') || '').trim(), session: String(form.get('session') || ''), term: String(form.get('term') || ''), currency: String(form.get('currency') || 'NGN'), logoDataUri };
    if (!profile.schoolName) { setNotice('School name is required.'); return; }
    persistWorkspace({ ...workspace, profile });
    setNotice('School profile saved.');
  };

  if (!user) {
    if (!showAuth) {
      return <LandingPage
        onRegister={() => { setAuthMode('signUp'); setLoginType('owner'); setAuthError(''); setShowAuth(true); }}
        onLogin={() => { setAuthMode('signIn'); setLoginType('staff'); setAuthError(''); setShowAuth(true); }}
      />;
    }
    return <AuthScreen mode={authMode} setMode={setAuthMode} loginType={loginType} setLoginType={setLoginType} onSubmit={handleAuth} error={authError} notice={authNotice} busy={authBusy} onHome={() => setShowAuth(false)} />;
  }

  const schoolName = workspace.profile.schoolName || user.schoolName || 'Your school';
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup"><span className="school-brand-logo">{workspace.profile.logoDataUri ? <img src={workspace.profile.logoDataUri} alt={`${schoolName} logo`} /> : <span>{schoolName.charAt(0).toUpperCase()}</span>}</span><span className="brand-caption">SCHOOL WORKSPACE</span></div>
        <div className="school-switcher"><span className="school-avatar">{workspace.profile.logoDataUri ? <img src={workspace.profile.logoDataUri} alt={`${schoolName} logo`} /> : <School size={17} />}</span><span className="switcher-text"><strong>{schoolName}</strong><small>{readableRole(user.role)} workspace</small></span><ChevronDown size={16} /></div>
        <nav className="main-nav" aria-label="Main navigation">
          <span className="nav-caption">WORKSPACE</span>
          {visibleNav.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-link ${activePage === id ? 'nav-active' : ''}`} onClick={() => navigate(id)}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{id === 'updates' && workspace.announcements.length > 0 && <span className="nav-count">{workspace.announcements.length}</span>}</button>)}
        </nav>
        <div className="sidebar-bottom"><button className="user-card" onClick={signOut}><span className="user-avatar">{user.name?.slice(0, 1) || 'E'}</span><span className="user-label"><strong>{user.name}</strong><small>{readableRole(user.role)}</small></span><LogOut size={17} /></button></div>
      </aside>
      {mobileNavOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <main className="main-area">
        <header className="topbar"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={20} /></button><div className="breadcrumb">{schoolName}<span>/</span><strong>{NAVIGATION.find((item) => item.id === activePage)?.label || 'Home'}</strong></div><div className="top-actions"><span className="today-label">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</span><button className="icon-button notification-button" aria-label="Announcements" onClick={() => navigate('updates')}><Bell size={18} />{workspace.announcements.length > 0 && <i />}</button><span className="top-avatar">{user.name?.slice(0, 1) || 'E'}</span></div></header>
        <div className="page-scroll"><div className="page-content">
          {notice && <div className="notice-banner"><Check size={16} />{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={15} /></button></div>}
          {activePage === 'home' && <HomePage user={user} workspace={workspace} onNavigate={navigate} onAdd={(kind) => setModal(kind)} />}
          {activePage === 'people' && <PeoplePage workspace={workspace} query={query} setQuery={setQuery} user={user} onAdd={(kind) => setModal(kind)} onMark={markAttendance} />}
          {activePage === 'classes' && <ClassesPage workspace={workspace} onAdd={() => setModal('class')} />}
          {activePage === 'attendance' && <AttendancePage workspace={workspace} user={user} onMark={markAttendance} />}
          {activePage === 'schedule' && <SchedulePage workspace={workspace} onAdd={(kind) => setModal(kind)} user={user} />}
          {activePage === 'updates' && <UpdatesPage workspace={workspace} onAdd={(kind) => setModal(kind)} />}
          {activePage === 'finance' && <FinancePage workspace={workspace} onAdd={(kind) => setModal(kind)} />}
          {activePage === 'reports' && <ReportsPage workspace={workspace} />}
          {activePage === 'settings' && <SettingsPage workspace={workspace} onSubmit={saveSettings} user={user} />}
          {activePage === 'access' && user.role === 'super-admin' && <><PageHeading eyebrow="SYSTEM ADMINISTRATION" title="Account access" description="Assign school account roles and review pending access." /><AccessPanel accountsState={accountsState} setAccountsState={setAccountsState} /></>}
        </div></div>
      </main>
      {modal && <RecordModal kind={modal} workspace={workspace} onClose={() => setModal('')} onSave={addRecord} />}
      {generatedIdCard && <IdCardDialog card={generatedIdCard} workspace={workspace} onClose={() => setGeneratedIdCard(null)} />}
    </div>
  );
}

function AuthScreen({ mode, setMode, loginType, setLoginType, onSubmit, error, notice, busy, onHome }) {
  const isSignUp = mode === 'signUp';
  const student = loginType === 'student';
  return <main className="auth-layout"><section className="auth-story"><div className="auth-brand"><img src="/edu-meet-logo.png" alt="Edu-Meet" /></div><div className="story-copy"><span className="story-kicker"><i /> YOUR SCHOOL, CONNECTED</span><h1>Every part of school,<br /><em>in sync.</em></h1><p>One calm place for school operations, teaching, and the people who make learning matter.</p><div className="story-points"><span><Users size={17} /> People & classes</span><span><CalendarDays size={17} /> Timetables & attendance</span><span><Bell size={17} /> School updates</span></div></div><div className="story-footer">A simpler school day starts here.</div></section><section className="auth-main"><div className="auth-mobile-brand"><img src="/edu-meet-logo.png" alt="Edu-Meet" /></div><button className="auth-back" onClick={onHome}><ArrowLeft size={15} /> Home</button><div className="auth-card"><div className="auth-topline"><div><span className="eyebrow">{isSignUp ? 'SET UP YOUR SCHOOL' : 'WELCOME BACK'}</span><h2>{isSignUp ? 'Create your school account' : student ? 'Student sign in' : 'Sign in'}</h2><p>{isSignUp ? 'Create an owner account to set up your school workspace and manage its day-to-day operations.' : student ? 'Use the admission number and password provided by your school to continue to your learning workspace.' : 'Sign in to continue to your school workspace.'}</p></div><div className="auth-mark"><GraduationCap size={22} /></div></div>{!isSignUp && <div className="login-tabs" role="tablist" aria-label="Account type"><button className={loginType === 'staff' ? 'selected' : ''} onClick={() => setLoginType('staff')}>Staff & parents</button><button className={student ? 'selected' : ''} onClick={() => setLoginType('student')}>Students</button><button className={loginType === 'owner' ? 'selected' : ''} onClick={() => { setLoginType('owner'); setMode('signUp'); }}>Admin / Owner</button></div>}
    <form className="auth-form" onSubmit={onSubmit}>
      {isSignUp && <label>Fullname<input name="name" autoComplete="name" placeholder="Enter your full name" required /></label>}
      {student ? <label>Admission number<input name="admissionNumber" autoCapitalize="characters" placeholder="Enter your admission number" required /></label> : <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label>}
      <label>Password<input name="password" type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'} placeholder="At least 8 characters" minLength="8" required /></label>
      {isSignUp && <label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" placeholder="Re-enter your password" required /></label>}
      {error && <div className="form-alert" role="alert">{error}</div>}{notice && <div className="form-notice">{notice}</div>}
      <button className="button-primary auth-submit" disabled={busy}>{busy ? <><span className="spinner" /> Please wait</> : isSignUp ? 'Create account' : 'Sign in'}<ArrowRight size={17} /></button>
    </form>
    {isSignUp ? <p className="auth-switch">Already have an account? <button onClick={() => { setMode('signIn'); setLoginType('staff'); }}>Back to sign in</button></p> : <p className="auth-switch">New to Edu-Meet? <button onClick={() => { setMode('signUp'); setLoginType('owner'); }}>Set up your school</button></p>}
    <div className="local-note"><Shield size={15} /><span>Web preview · Data stays in this browser on this device.</span></div>
  </div><footer className="auth-footer">© {new Date().getFullYear()} Edu-Meet <span>·</span> School operations, made simpler</footer></section></main>;
}

function PageHeading({ eyebrow, title, description, actions }) {
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="heading-actions">{actions}</div>}</div>;
}
function PrimaryButton({ children, onClick, icon: Icon = Plus, secondary = false }) {
  return <button className={secondary ? 'button-secondary' : 'button-primary'} onClick={onClick}>{Icon && <Icon size={16} />}{children}</button>;
}
function EmptyState({ title, text, action, onClick }) {
  return <div className="empty-state"><span className="empty-icon"><BookOpen size={22} /></span><strong>{title}</strong><p>{text}</p>{action && <PrimaryButton onClick={onClick}>{action}</PrimaryButton>}</div>;
}
function MetricCard({ label, value, note, icon: Icon, tone = 'navy' }) {
  return <article className="metric-card"><span className={`metric-icon ${tone}`}><Icon size={18} /></span><span className="metric-label">{label}</span><strong>{value}</strong><small>{note}</small></article>;
}
function Panel({ title, link, onClick, children, className = '' }) {
  return <section className={`panel ${className}`}><div className="panel-heading"><h2>{title}</h2>{link && <button className="text-link" onClick={onClick}>{link}<ArrowRight size={14} /></button>}</div>{children}</section>;
}
function HomePage({ user, workspace, onNavigate, onAdd }) {
  const { students, staff, classes, attendance, payments, announcements, events } = workspace;
  const todayAttendance = attendance.filter((item) => item.date === todayKey());
  const present = todayAttendance.filter((item) => ['Present', 'Late'].includes(item.status)).length;
  const collection = payments.filter((item) => item.date?.startsWith(todayKey().slice(0, 7))).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const isStudent = user.role === 'student';
  const greetingName = user.name?.split(' ')[0] || 'there';
  return <>
    <PageHeading eyebrow="SCHOOL OVERVIEW" title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${greetingName}`} description={`${workspace.profile.term || 'First term'} · ${workspace.profile.session || '2026/2027'} session`} actions={<span className="live-pill"><i /> SCHOOL WORKSPACE</span>} />
    {isStudent ? <StudentOverview user={user} workspace={workspace} onNavigate={onNavigate} /> : user.role === 'parent' ? <ParentOverview user={user} workspace={workspace} onNavigate={onNavigate} /> : <>
      <div className="metric-grid"><MetricCard label="Total students" value={students.length.toLocaleString()} note="Enrolled this session" icon={GraduationCap} tone="green" /><MetricCard label="Active staff" value={staff.filter((item) => item.status !== 'Inactive').length.toLocaleString()} note={`${staff.filter((item) => item.role === 'teacher').length} teachers`} icon={Users} tone="blue" /><MetricCard label="Present today" value={todayAttendance.length ? `${present} / ${todayAttendance.length}` : '—'} note={todayAttendance.length ? `${todayAttendance.filter((item) => item.status === 'Absent').length} absent` : 'Attendance not recorded yet'} icon={ClipboardCheck} tone="amber" /><MetricCard label="Fees collected" value={money(collection, workspace.profile.currency)} note="This month" icon={Coins} tone="coral" /></div>
      <div className="dashboard-grid"><Panel title="School activity" className="activity-panel"><div className="activity-summary"><div><span className="chart-kicker">STUDENT ATTENDANCE</span><strong>{todayAttendance.length ? `${Math.round((present / todayAttendance.length) * 100)}%` : '—'}</strong><small>{todayAttendance.length ? `${present} students present today` : 'Mark today’s attendance to see a summary'}</small></div><div className="donut" style={{ '--percent': todayAttendance.length ? `${(present / todayAttendance.length) * 100}%` : '0%' }}><span>{todayAttendance.length ? `${Math.round((present / todayAttendance.length) * 100)}%` : '0%'}</span></div></div><div className="chart-baseline"><span>Attendance updates appear here as your school records them.</span></div></Panel><Panel title="Quick actions" className="quick-panel"><div className="quick-actions"><button onClick={() => onAdd('student')}><span className="quick-icon green"><Users size={18} /></span><span><strong>Add a student</strong><small>Register a learner</small></span><ArrowRight size={15} /></button><button onClick={() => onAdd('period')}><span className="quick-icon blue"><CalendarDays size={18} /></span><span><strong>Plan a timetable</strong><small>Schedule class periods</small></span><ArrowRight size={15} /></button><button onClick={() => onAdd('announcement')}><span className="quick-icon amber"><Bell size={18} /></span><span><strong>Share an update</strong><small>Post a school announcement</small></span><ArrowRight size={15} /></button></div></Panel><Panel title="Recent announcements" link="View all" onClick={() => onNavigate('updates')} className="announcements-panel">{announcements.length ? <div className="announcement-list">{announcements.slice(0, 4).map((item) => <AnnouncementRow key={item.id} item={item} />)}</div> : <div className="compact-empty"><Bell size={19} /><span><strong>No announcements yet</strong><small>School updates will appear here.</small></span><button onClick={() => onAdd('announcement')} aria-label="Create announcement"><Plus size={17} /></button></div>}</Panel><Panel title="Upcoming events" link="View calendar" onClick={() => onNavigate('schedule')} className="events-panel">{events.filter((item) => item.date >= todayKey()).length ? events.filter((item) => item.date >= todayKey()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3).map((event) => <div className="event-row" key={event.id}><span className="event-date"><strong>{new Date(`${event.date}T00:00:00`).getDate()}</strong><small>{new Date(`${event.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short' })}</small></span><span><strong>{event.title}</strong><small>{event.type || 'School event'}</small></span></div>) : <div className="compact-empty"><CalendarDays size={19} /><span><strong>No upcoming events</strong><small>Add school events and deadlines.</small></span><button onClick={() => onAdd('event')} aria-label="Add event"><Plus size={17} /></button></div>}</Panel></div>
      {user.role === 'super-admin' && <div className="super-admin-note"><Shield size={16} /><span><strong>Account access</strong> Assign school account roles from the access panel below.</span></div>}
    </>}
  </>;
}
function StudentOverview({ user, workspace, onNavigate }) {
  const student = workspace.students.find((item) => item.admissionNumber === user.admissionNumber) || user;
  const studentClass = workspace.classes.find((item) => classLabel(item).toLowerCase() === String(student.className || '').toLowerCase());
  const periods = workspace.classTimetable.filter((item) => item.classId === studentClass?.id).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const assessments = workspace.scheduledAssessments.filter((item) => item.classId === studentClass?.id && item.date >= todayKey()).sort((a, b) => a.date.localeCompare(b.date));
  return <><div className="student-welcome"><div><span className="eyebrow">STUDENT WORKSPACE</span><h2>Hello, {user.name}</h2><p>{student.className || 'Class not assigned'} · {student.admissionNumber}</p></div><span className="welcome-mark"><GraduationCap size={26} /></span></div><div className="student-grid"><Panel title="Class timetable" link="Open timetable" onClick={() => onNavigate('schedule')} className="student-panel"><SimplePeriods periods={periods.slice(0, 5)} empty="No timetable periods are scheduled for your class yet." /></Panel><Panel title="Upcoming tests & examinations" link="View schedule" onClick={() => onNavigate('schedule')} className="student-panel"><div className="announcement-list">{assessments.length ? assessments.slice(0, 4).map((item) => <div className="list-row" key={item.id}><span className="list-icon blue"><CalendarDays size={16} /></span><span className="list-main"><strong>{item.kind}: {item.title}</strong><small>{item.subject} · {formattedDate(item.date)}</small></span><span className="status-tag status-info">Upcoming</span></div>) : <p className="quiet-empty">No upcoming tests or examinations are scheduled.</p>}</div></Panel></div><Panel title="School updates" link="All updates" onClick={() => onNavigate('updates')}><div className="announcement-list">{workspace.announcements.length ? workspace.announcements.slice(0, 3).map((item) => <AnnouncementRow key={item.id} item={item} />) : <p className="quiet-empty">School announcements will appear here.</p>}</div></Panel></>;
}
function ParentOverview({ user, workspace, onNavigate }) {
  const profile = workspace.staff.find((item) => item.authUid === user.uid || item.email === user.email);
  const student = workspace.students.find((item) => item.admissionNumber === profile?.studentAdmissionNumber);
  const studentClass = workspace.classes.find((item) => classLabel(item).toLowerCase() === String(student?.className || '').toLowerCase());
  const assessments = workspace.scheduledAssessments.filter((item) => item.classId === studentClass?.id && item.date >= todayKey()).sort((a, b) => a.date.localeCompare(b.date));
  const updates = workspace.announcements.filter((item) => ['Whole school', 'Parents', 'parent'].includes(item.audience));
  return <><div className="student-welcome"><div><span className="eyebrow">FAMILY & SCHOOL UPDATES</span><h2>Welcome, {user.name}</h2><p>{student ? `${student.name} · ${student.className || 'Class not assigned'}` : 'Your family and school updates workspace'}</p></div><span className="welcome-mark"><Users size={24} /></span></div>{student ? <div className="metric-grid compact-metrics"><MetricCard label="Linked student" value={student.name} note={student.admissionNumber} icon={GraduationCap} tone="green" /><MetricCard label="Class" value={student.className || 'Not assigned'} note="Current class" icon={BookOpen} tone="blue" /><MetricCard label="Attendance this month" value={workspace.attendance.filter((item) => item.studentId === student.id && item.date.startsWith(todayKey().slice(0, 7))).length} note="Recorded school days" icon={ClipboardCheck} tone="amber" /></div> : <div className="notice-banner"><CircleHelp size={16} />No student is linked to this parent account yet. Ask your school administrator to update the parent profile.</div>}<div className="student-grid"><Panel title="School updates" link="All updates" onClick={() => onNavigate('updates')}><div className="announcement-list">{updates.length ? updates.slice(0, 4).map((item) => <AnnouncementRow key={item.id} item={item} />) : <p className="quiet-empty">School announcements will appear here.</p>}</div></Panel><Panel title="Upcoming tests & examinations" link="View schedule" onClick={() => onNavigate('schedule')}><div className="announcement-list">{assessments.length ? assessments.slice(0, 4).map((item) => <div className="list-row" key={item.id}><span className="list-icon blue"><CalendarDays size={16} /></span><span className="list-main"><strong>{item.kind}: {item.title}</strong><small>{item.subject} · {formattedDate(item.date)}</small></span></div>) : <p className="quiet-empty">No upcoming tests or examinations are scheduled.</p>}</div></Panel></div></>;
}
function PeoplePage({ workspace, query, setQuery, user, onAdd, onMark }) {
  const [tab, setTab] = useState('students');
  const search = query.trim().toLowerCase();
  const teacherProfile = user.role === 'teacher' && workspace.staff.find((item) => item.authUid === user.uid || item.email === user.email);
  const teacherClasses = new Set(workspace.classes.filter((item) => teacherProfile?.classIds?.includes(item.id)).map((item) => classLabel(item).trim().toLowerCase()));
  const directoryStudents = user.role === 'teacher' ? workspace.students.filter((item) => teacherClasses.has((item.className || '').trim().toLowerCase())) : workspace.students;
  const students = directoryStudents.filter((item) => `${item.name} ${item.admissionNumber} ${item.className}`.toLowerCase().includes(search));
  const staff = workspace.staff.filter((item) => `${item.name} ${item.email} ${item.role}`.toLowerCase().includes(search));
  const canEdit = ['admin', 'super-admin'].includes(user.role);
  return <><PageHeading eyebrow="SCHOOL DIRECTORY" title="People" description="Manage students, teachers, and parents in your school." actions={canEdit && <PrimaryButton onClick={() => onAdd(tab === 'students' ? 'student' : tab === 'teachers' ? 'teacher' : 'parent')}>Add {tab === 'students' ? 'student' : tab === 'teachers' ? 'teacher' : 'parent'}</PrimaryButton>} /><div className="toolbar"><div className="segmented-tabs">{[['students', `Students · ${students.length}`], ['teachers', `Teachers · ${staff.filter((item) => item.role === 'teacher').length}`], ['parents', `Parents · ${staff.filter((item) => item.role === 'parent').length}`]].map(([key, label]) => <button key={key} className={tab === key ? 'selected' : ''} onClick={() => setTab(key)}>{label}</button>)}</div><label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people" /></label></div><Panel title={tab === 'students' ? 'Students' : tab === 'teachers' ? 'Teachers' : 'Parents'} className="table-panel">{tab === 'students' ? students.length ? <PeopleTable headings={['Student', 'Admission number', 'Class', 'Parent / guardian', 'Status']} rows={students.map((item) => [<span className="person-cell"><i className="table-avatar avatar-green">{item.name.slice(0, 1)}</i><strong>{item.name}</strong></span>, item.admissionNumber, item.className, item.parentName || '—', <span className="status-tag status-active">{item.status || 'Active'}</span>])} /> : <EmptyState title="No students added" text="Add a student to start building your school register." action={canEdit ? 'Add a student' : ''} onClick={() => onAdd('student')} /> : staff.filter((item) => item.role === (tab === 'teachers' ? 'teacher' : 'parent')).length ? <PeopleTable headings={[tab === 'teachers' ? 'Teacher' : 'Parent / guardian', 'Email address', 'Phone', 'Status']} rows={staff.filter((item) => item.role === (tab === 'teachers' ? 'teacher' : 'parent')).map((item) => [<span className="person-cell"><i className="table-avatar avatar-blue">{item.name.slice(0, 1)}</i><strong>{item.name}</strong></span>, item.email, item.phone || '—', <span className="status-tag status-active">{item.status || 'Active'}</span>])} /> : <EmptyState title={`No ${tab} added`} text={`School ${tab} will appear here once they have been added.`} action={canEdit ? `Add a ${tab === 'teachers' ? 'teacher' : 'parent'}` : ''} onClick={() => onAdd(tab === 'teachers' ? 'teacher' : 'parent')} />}</Panel></>;
}
function PeopleTable({ headings, rows }) { return <div className="table-scroll"><table><thead><tr>{headings.map((item) => <th key={item}>{item}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>; }
function ClassesPage({ workspace, onAdd }) {
  return <><PageHeading eyebrow="ACADEMICS" title="Classes" description="Organize class groups and keep student assignments up to date." actions={<PrimaryButton onClick={onAdd}>Add a class</PrimaryButton>} /><div className="metric-grid compact-metrics"><MetricCard label="Classes" value={workspace.classes.length} note="Across all school sections" icon={BookOpen} tone="blue" /><MetricCard label="Assigned students" value={workspace.students.filter((item) => item.className).length} note="Students with a class" icon={GraduationCap} tone="green" /><MetricCard label="Teachers" value={workspace.staff.filter((item) => item.role === 'teacher').length} note="School teaching staff" icon={Users} tone="amber" /></div><Panel title="Class register" className="table-panel">{workspace.classes.length ? <PeopleTable headings={['Class', 'School section', 'Students', 'Capacity', 'Status']} rows={workspace.classes.map((schoolClass) => [<span className="person-cell"><i className="table-avatar avatar-blue"><BookOpen size={15} /></i><strong>{classLabel(schoolClass)}</strong></span>, schoolClass.stage || '—', workspace.students.filter((student) => student.className?.toLowerCase() === classLabel(schoolClass).toLowerCase()).length, schoolClass.capacity || '—', <span className="status-tag status-active">{schoolClass.status || 'Active'}</span>])} /> : <EmptyState title="No classes set up" text="Create class groups before registering students and planning timetables." action="Add a class" onClick={onAdd} />}</Panel></>;
}
function AttendancePage({ workspace, user, onMark }) {
  const canMark = ['admin', 'super-admin', 'teacher'].includes(user.role);
  const teacherProfile = user.role === 'teacher' && workspace.staff.find((item) => item.authUid === user.uid || item.email === user.email);
  const teacherClasses = new Set(workspace.classes.filter((item) => teacherProfile?.classIds?.includes(item.id)).map((item) => classLabel(item).trim().toLowerCase()));
  const parentProfile = user.role === 'parent' && workspace.staff.find((item) => item.authUid === user.uid || item.email === user.email);
  const linkedAdmissionNumber = user.role === 'student' ? user.admissionNumber : parentProfile?.studentAdmissionNumber;
  const visibleStudents = user.role === 'teacher'
    ? workspace.students.filter((item) => teacherClasses.has((item.className || '').trim().toLowerCase()))
    : linkedAdmissionNumber
      ? workspace.students.filter((item) => item.admissionNumber === linkedAdmissionNumber)
      : ['admin', 'super-admin'].includes(user.role) ? workspace.students : [];
  const visibleStudentIds = new Set(visibleStudents.map((item) => item.id));
  const todayRecords = workspace.attendance.filter((item) => item.date === todayKey() && visibleStudentIds.has(item.studentId));
  workspace = { ...workspace, students: visibleStudents };
  return <><PageHeading eyebrow="DAILY REGISTER" title="Attendance" description={`School attendance · ${formattedDate(todayKey())}`} actions={<span className="live-pill"><i /> TODAY</span>} /><div className="metric-grid compact-metrics"><MetricCard label="Present" value={todayRecords.filter((item) => item.status === 'Present').length} note="Marked present today" icon={Check} tone="green" /><MetricCard label="Absent" value={todayRecords.filter((item) => item.status === 'Absent').length} note="Marked absent today" icon={X} tone="coral" /><MetricCard label="Not marked" value={Math.max(0, workspace.students.length - todayRecords.length)} note="Awaiting attendance" icon={ClipboardCheck} tone="amber" /></div><Panel title="Student attendance" className="table-panel">{workspace.students.length ? <div className="table-scroll"><table><thead><tr><th>Student</th><th>Admission number</th><th>Class</th><th>Today</th>{canMark && <th>Update status</th>}</tr></thead><tbody>{workspace.students.map((student) => { const record = todayRecords.find((item) => item.studentId === student.id); return <tr key={student.id}><td><span className="person-cell"><i className="table-avatar avatar-green">{student.name.slice(0, 1)}</i><strong>{student.name}</strong></span></td><td>{student.admissionNumber}</td><td>{student.className || '—'}</td><td>{record ? <span className={`status-tag ${record.status === 'Present' ? 'status-active' : record.status === 'Absent' ? 'status-danger' : 'status-info'}`}>{record.status}</span> : <span className="status-tag status-pending">Not marked</span>}</td>{canMark && <td><div className="attendance-actions">{['Present', 'Absent', 'Late', 'Excused'].map((status) => <button key={status} className={`attendance-chip ${record?.status === status ? 'chosen' : ''}`} onClick={() => onMark(student, status)}>{status}</button>)}</div></td>}</tr>; })}</tbody></table></div> : <EmptyState title="Your register is ready" text="Add students to this school workspace to start recording daily attendance." />}</Panel><div className="attendance-legend"><span><i className="legend-dot dot-green" /> Present</span><span><i className="legend-dot dot-red" /> Absent</span><span><i className="legend-dot dot-amber" /> Late</span><span><i className="legend-dot dot-blue" /> Excused</span></div></>;
}
function SchedulePage({ workspace, onAdd, user }) {
  const [tab, setTab] = useState('timetable');
  const isStudent = user.role === 'student';
  const student = workspace.students.find((item) => item.admissionNumber === user.admissionNumber) || user;
  const studentClass = workspace.classes.find((item) => classLabel(item).toLowerCase() === String(student.className || '').toLowerCase());
  const timetable = workspace.classTimetable.filter((item) => !isStudent || item.classId === studentClass?.id).slice().sort((a, b) => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(a.day) - ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(b.day) || a.startTime.localeCompare(b.startTime));
  const assessments = workspace.scheduledAssessments.filter((item) => !isStudent || item.classId === studentClass?.id).slice().sort((a, b) => a.date.localeCompare(b.date));
  return <><PageHeading eyebrow="ACADEMIC PLANNING" title="Timetable & assessments" description="Keep class periods, tests, and school deadlines in one place." actions={!isStudent && <PrimaryButton onClick={() => onAdd(tab === 'timetable' ? 'period' : 'assessment')}>Add {tab === 'timetable' ? 'period' : 'assessment'}</PrimaryButton>} /><div className="segmented-tabs section-tabs"><button className={tab === 'timetable' ? 'selected' : ''} onClick={() => setTab('timetable')}>Class timetable</button><button className={tab === 'assessments' ? 'selected' : ''} onClick={() => setTab('assessments')}>Tests & examinations</button></div>{tab === 'timetable' ? <Panel title="Weekly periods" className="table-panel">{timetable.length ? <PeopleTable headings={['Day', 'Time', 'Class', 'Subject', 'Teacher']} rows={timetable.map((item) => [item.day, `${item.startTime} – ${item.endTime}`, item.className || classLabel(workspace.classes.find((schoolClass) => schoolClass.id === item.classId) || {}), item.subject, item.teacherName || '—'])} /> : <EmptyState title="No timetable periods yet" text="Plan your class timetable by adding a subject, class, teacher, and time." action={isStudent ? '' : 'Add a period'} onClick={() => onAdd('period')} />}</Panel> : <Panel title="Scheduled tests & examinations" className="table-panel">{assessments.length ? <PeopleTable headings={['Assessment', 'Class', 'Subject', 'Date', 'Time']} rows={assessments.map((item) => [`${item.kind}: ${item.title}`, classLabel(workspace.classes.find((schoolClass) => schoolClass.id === item.classId) || {}), item.subject, formattedDate(item.date), item.startTime || '—'])} /> : <EmptyState title="No upcoming assessments" text="Add tests and examinations for your classes." action={isStudent ? '' : 'Add an assessment'} onClick={() => onAdd('assessment')} />}</Panel>}</>;
}
function SimplePeriods({ periods, empty }) { return periods.length ? <div className="period-list">{periods.map((item) => <div className="period-row" key={item.id}><span className="period-time">{item.startTime}<small>{item.endTime}</small></span><i /><span><strong>{item.subject}</strong><small>{item.teacherName || item.className}</small></span></div>)}</div> : <p className="quiet-empty">{empty}</p>; }
function AnnouncementRow({ item }) { return <div className="list-row"><span className="list-icon green"><Bell size={16} /></span><span className="list-main"><strong>{item.title}</strong><small>{item.audience || 'Whole school'} · {formattedDate(item.date)}</small></span><ArrowRight size={15} className="row-arrow" /></div>; }
function UpdatesPage({ workspace, onAdd }) { return <><PageHeading eyebrow="SCHOOL COMMUNICATION" title="Announcements" description="Share timely updates with students, parents, and staff." actions={<PrimaryButton onClick={() => onAdd('announcement')}>New announcement</PrimaryButton>} /><Panel title="Recent announcements">{workspace.announcements.length ? <div className="announcement-feed">{workspace.announcements.map((item) => <article key={item.id} className="feed-item"><span className="feed-icon"><Bell size={18} /></span><div><div className="feed-meta"><span>{item.audience || 'Whole school'}</span><i />{formattedDate(item.date)}</div><h3>{item.title}</h3><p>{item.message}</p></div></article>)}</div> : <EmptyState title="No announcements yet" text="Post a school update to keep your community informed." action="Create announcement" onClick={() => onAdd('announcement')} />}</Panel></>; }
function FinancePage({ workspace, onAdd }) { const month = todayKey().slice(0, 7); const payments = workspace.payments.filter((item) => item.date?.startsWith(month)); const total = payments.reduce((sum, item) => sum + Number(item.amount || 0), 0); return <><PageHeading eyebrow="SCHOOL OPERATIONS" title="Finance" description="Review recorded payments and keep fee activity organized." actions={<PrimaryButton onClick={() => onAdd('payment')}>Record payment</PrimaryButton>} /><div className="metric-grid compact-metrics"><MetricCard label="Collected this month" value={money(total, workspace.profile.currency)} note={`${payments.length} recorded payments`} icon={Coins} tone="green" /><MetricCard label="Fee records" value={workspace.feeCharges.length} note="Assigned to students" icon={ClipboardCheck} tone="blue" /><MetricCard label="Students" value={workspace.students.length} note="In your school register" icon={Users} tone="amber" /></div><Panel title="Recent payments" className="table-panel">{workspace.payments.length ? <PeopleTable headings={['Payer', 'Admission number', 'Fee category', 'Date', 'Amount', 'Status']} rows={workspace.payments.slice().sort((a, b) => b.date.localeCompare(a.date)).map((item) => [item.payerName, item.studentAdmissionNumber || '—', item.category, formattedDate(item.date), money(item.amount, workspace.profile.currency), <span className="status-tag status-active">Recorded</span>])} /> : <EmptyState title="No payments recorded" text="Record a payment to start tracking fees collected by your school." action="Record a payment" onClick={() => onAdd('payment')} />}</Panel></>; }
function ReportsPage({ workspace }) { const records = workspace.attendance.filter((item) => item.date.startsWith(todayKey().slice(0, 7))); const present = records.filter((item) => ['Present', 'Late'].includes(item.status)).length; const percent = records.length ? Math.round((present / records.length) * 100) : 0; const paid = workspace.payments.reduce((sum, item) => sum + Number(item.amount || 0), 0); return <><PageHeading eyebrow="SCHOOL INSIGHTS" title="Reports" description="A clear view of school activity recorded in this workspace." actions={<span className="live-pill"><i /> LIVE SUMMARY</span>} /><div className="report-grid"><Panel title="Attendance summary" className="report-panel"><div className="report-highlight"><span className="chart-kicker">THIS MONTH</span><strong>{records.length ? `${percent}%` : '—'}</strong><small>{records.length ? `${present} present or late records out of ${records.length}` : 'Attendance data will appear once recorded.'}</small></div><div className="bar-list"><div><span>Present / late</span><div><i style={{ width: `${percent}%` }} /></div><strong>{present}</strong></div><div><span>Absent</span><div><i className="bar-red" style={{ width: `${records.length ? 100 - percent : 0}%` }} /></div><strong>{records.filter((item) => item.status === 'Absent').length}</strong></div></div></Panel><Panel title="School register" className="report-panel"><div className="report-stat-list"><div><span><GraduationCap size={17} /> Students</span><strong>{workspace.students.length}</strong></div><div><span><Users size={17} /> Staff</span><strong>{workspace.staff.length}</strong></div><div><span><BookOpen size={17} /> Classes</span><strong>{workspace.classes.length}</strong></div><div><span><Coins size={17} /> Fees collected</span><strong>{money(paid, workspace.profile.currency)}</strong></div></div></Panel></div></>; }
function SettingsPage({ workspace, onSubmit, user }) {
  const [logoDataUri, setLogoDataUri] = useState(workspace.profile.logoDataUri || '');
  const [logoError, setLogoError] = useState('');
  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setLogoError('Choose an image file for your school logo.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setLogoError('Choose an image smaller than 10 MB.');
      return;
    }
    setLogoError('');
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      setLogoDataUri(canvas.toDataURL('image/jpeg', 0.82));
      URL.revokeObjectURL(objectUrl);
    };
    image.onerror = () => {
      setLogoError('This image could not be opened. Choose another file.');
      URL.revokeObjectURL(objectUrl);
    };
    image.src = objectUrl;
  };
  return <><PageHeading eyebrow="SCHOOL WORKSPACE" title="Settings" description="Manage your school profile and academic session." /><div className="settings-layout"><Panel title="School profile" className="settings-panel"><form className="settings-form" onSubmit={(event) => onSubmit(event, logoDataUri)}><div className="logo-upload-row"><span className="logo-preview">{logoDataUri ? <img src={logoDataUri} alt="School logo preview" /> : <span>{workspace.profile.schoolName?.charAt(0).toUpperCase() || 'S'}</span>}</span><div className="logo-upload-controls"><strong>School logo</strong><small>Upload a square image, up to 10 MB.</small><label className="logo-upload-button">Choose image<input type="file" accept="image/*" onChange={handleLogoChange} /></label>{logoDataUri && <button className="logo-remove-button" type="button" onClick={() => { setLogoDataUri(''); setLogoError(''); }}>Remove logo</button>}</div></div>{logoError && <p className="logo-upload-error" role="alert">{logoError}</p>}<label>School name<input name="schoolName" defaultValue={workspace.profile.schoolName} placeholder="Enter your school name" required /></label><div className="form-two"><label>Phone number<input name="phone" defaultValue={workspace.profile.phone} placeholder="School phone number" /></label><label>Currency<select name="currency" defaultValue={workspace.profile.currency || 'NGN'}><option value="NGN">NGN · Nigerian naira</option><option value="USD">USD · US dollar</option><option value="GBP">GBP · British pound</option><option value="GHS">GHS · Ghanaian cedi</option><option value="KES">KES · Kenyan shilling</option></select></label></div><label>School address<input name="address" defaultValue={workspace.profile.address} placeholder="School address" /></label><div className="form-two"><label>Academic session<input name="session" defaultValue={workspace.profile.session} placeholder="2026/2027" /></label><label>Current term<select name="term" defaultValue={workspace.profile.term || 'First term'}><option>First term</option><option>Second term</option><option>Third term</option></select></label></div><div className="settings-footer"><span>Signed in as {user.email || user.admissionNumber}</span><button className="button-primary" type="submit">Save school profile</button></div></form></Panel><aside className="settings-aside"><span className="aside-shield"><Shield size={19} /></span><strong>Workspace data</strong><p>This web preview stores records in this browser on this device. It is separate from the Edu-Meet mobile app.</p></aside></div></>;
}
function AccessPanel({ accountsState, setAccountsState }) { const { accounts, roleAssignments } = accountsState; const [savingUid, setSavingUid] = useState(''); const assign = (uid, role) => { if (!ROLES.includes(role) || uid === SUPER_ADMIN.uid) return; setSavingUid(uid); const updated = { ...roleAssignments, [uid]: role }; writeJson(KEYS.roles, updated); setAccountsState({ accounts, roleAssignments: updated }); setSavingUid(''); }; return <Panel title="Account access" className="access-panel"><p className="panel-description">Assign admin, teacher, or parent access. The code-provisioned super-admin role cannot be assigned.</p>{accounts.filter((account) => account.uid !== SUPER_ADMIN.uid).length ? <div className="access-list">{accounts.filter((account) => account.uid !== SUPER_ADMIN.uid).map((account) => <div className="access-row" key={account.uid}><span className="table-avatar avatar-blue">{account.name.slice(0, 1)}</span><span className="access-person"><strong>{account.name}</strong><small>{account.email}</small></span><span className="access-current">{readableRole(roleAssignments[account.uid] || 'parent')}</span><select aria-label={`Assign role to ${account.name}`} value={roleAssignments[account.uid] || 'parent'} disabled={savingUid === account.uid} onChange={(event) => assign(account.uid, event.target.value)}><option value="admin">Admin</option><option value="teacher">Teacher</option><option value="parent">Parent</option></select></div>)}</div> : <p className="quiet-empty">No school accounts are waiting for role assignment.</p>}</Panel>; }

const FORM_CONFIG = {
  student: { title: 'Add a student', submit: 'Add student', fields: [['name', 'Student full name', 'e.g. Ada Okafor'], ['admissionNumber', 'Admission number', 'e.g. EDU-2026-001'], ['className', 'Class and arm', 'e.g. Primary 3 A'], ['parentName', 'Parent / guardian name', 'Optional'], ['parentPhone', 'Parent phone', 'Optional'], ['password', 'Student password', 'At least 8 characters', 'password']] },
  teacher: { title: 'Add a teacher', submit: 'Add teacher', fields: [['name', 'Teacher full name', 'Full name'], ['email', 'Teacher email address', 'name@example.com', 'email'], ['classId', 'Assigned class', 'Select a class', 'class'], ['phone', 'Phone number', 'Optional'], ['password', 'Temporary password', 'At least 8 characters', 'password']] },
  parent: { title: 'Add a parent / guardian', submit: 'Add parent', fields: [['name', 'Parent / guardian name', 'Full name'], ['email', 'Email address', 'name@example.com', 'email'], ['phone', 'Phone number', 'Optional'], ['studentAdmissionNumber', 'Linked student admission number', 'Optional'], ['password', 'Temporary password', 'At least 8 characters', 'password']] },
  class: { title: 'Add a class', submit: 'Create class', fields: [['stage', 'School section', 'Select a section', 'select', ['Nursery', 'Primary', 'Junior Secondary', 'Senior Secondary']], ['name', 'Class name', 'Select a class', 'classLevel'], ['track', 'Senior secondary stream', 'Select a stream', 'select', ['Science', 'Art', 'Commercial']], ['arm', 'Arm', 'e.g. A'], ['capacity', 'Class capacity', 'e.g. 30', 'number']] },
  announcement: { title: 'New announcement', submit: 'Post announcement', fields: [['title', 'Announcement title', 'Required'], ['message', 'Message', 'Write the school notice', 'textarea'], ['audience', 'Audience', 'Whole school, parents, class']] },
  payment: { title: 'Record payment', submit: 'Save payment', fields: [['studentAdmissionNumber', 'Student admission number', 'Optional'], ['payerName', 'Payer name', 'Required'], ['amount', 'Amount', 'Numbers only', 'number'], ['category', 'Fee category', 'Tuition, transport, etc.'], ['method', 'Payment method', 'Cash, transfer, POS']] },
  event: { title: 'Add event or deadline', submit: 'Save event', fields: [['title', 'Event or deadline', 'Required'], ['date', 'Date', '', 'date'], ['type', 'Type', 'Exam, event, holiday, deadline']] },
  period: { title: 'Add timetable period', submit: 'Add period', fields: [['classId', 'Class', 'Select a class', 'class'], ['day', 'Day', 'Monday', 'select', ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']], ['subject', 'Subject', 'e.g. English Language'], ['teacherName', 'Teacher name', 'Optional'], ['startTime', 'Start time', '', 'time'], ['endTime', 'End time', '', 'time']] },
  assessment: { title: 'Schedule a test or examination', submit: 'Schedule assessment', fields: [['classId', 'Class', 'Select a class', 'class'], ['kind', 'Assessment type', 'Test', 'select', ['Test', 'Examination', 'Quiz']], ['title', 'Assessment title', 'e.g. Mid-term assessment'], ['subject', 'Subject', 'e.g. Mathematics'], ['date', 'Date', '', 'date'], ['startTime', 'Start time', '', 'time'], ['durationMinutes', 'Duration (minutes)', 'e.g. 60', 'number']] },
};
function RecordModal({ kind, workspace, onClose, onSave }) { const config = FORM_CONFIG[kind]; const [error, setError] = useState(''); const [saving, setSaving] = useState(false); const [stage, setStage] = useState(''); if (!config) return null; const submit = async (event) => { event.preventDefault(); setError(''); setSaving(true); try { const values = Object.fromEntries(new FormData(event.currentTarget).entries()); await onSave(kind, values); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Could not save this record.'); } finally { setSaving(false); } }; return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header className="modal-header"><div><span className="eyebrow">SCHOOL WORKSPACE</span><h2 id="modal-title">{config.title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={19} /></button></header><form className="modal-form" onSubmit={submit}><div className="modal-fields">{config.fields.map(([name, label, placeholder, type = 'text', options]) => <label key={name}>{label}{type === 'textarea' ? <textarea name={name} placeholder={placeholder} rows="4" required={['title', 'message'].includes(name)} /> : type === 'select' ? <select name={name} defaultValue={name === 'day' ? 'Monday' : ''} required={name === 'stage'} onChange={name === 'stage' ? (event) => setStage(event.target.value) : undefined}><option value="" disabled>{placeholder}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : type === 'classLevel' ? <select name={name} defaultValue="" required disabled={!stage}><option value="" disabled>{stage ? placeholder : 'Select a school section first'}</option>{(CLASS_LEVELS[stage] || []).map((option) => <option key={option} value={option}>{option}</option>)}</select> : type === 'class' ? <select name={name} defaultValue="" required><option value="" disabled>{placeholder}</option>{workspace.classes.map((item) => <option key={item.id} value={item.id}>{classLabel(item)}</option>)}</select> : <input name={name} type={type} placeholder={placeholder} min={type === 'number' ? '0' : undefined} required={['name', 'admissionNumber', 'className', 'email', 'password', 'stage', 'amount', 'category', 'payerName', 'date', 'classId', 'subject', 'title', 'startTime', 'endTime'].includes(name)} />}</label>)}</div>{error && <div className="form-alert" role="alert">{error}</div>}<div className="modal-actions"><button type="button" className="button-secondary" onClick={onClose}>Cancel</button><button className="button-primary" disabled={saving}>{saving ? 'Saving…' : config.submit}<ArrowRight size={16} /></button></div></form></section></div>; }

function IdCardDialog({ card, workspace, onClose }) {
  const { person, type, identifier } = card;
  const schoolName = workspace.profile.schoolName || 'Your school';
  const assignedClasses = (person.classIds || [])
    .map((classId) => workspace.classes.find((schoolClass) => schoolClass.id === classId))
    .filter(Boolean)
    .map(classLabel);
  const detail = type === 'Student'
    ? person.className || 'Class not assigned'
    : assignedClasses.join(', ') || 'Teacher';
  return <div className="modal-backdrop id-card-backdrop"><section className="id-card-dialog" role="dialog" aria-modal="true" aria-labelledby="id-card-dialog-title"><header className="id-card-dialog-header"><div><span className="eyebrow">ID CARD GENERATED</span><h2 id="id-card-dialog-title">{type} ID card</h2></div><button className="icon-button" onClick={onClose} aria-label="Close ID card"><X size={19} /></button></header><article className="print-id-card"><div className="print-id-card-top"><span className="print-id-logo">{workspace.profile.logoDataUri ? <img src={workspace.profile.logoDataUri} alt="" /> : <School size={23} />}</span><span className="print-id-school"><strong>{schoolName}</strong><small>OFFICIAL {type.toUpperCase()} IDENTIFICATION</small></span></div><div className="print-id-content"><div className="print-id-photo"><span>{person.name?.trim().charAt(0).toUpperCase() || '?'}</span></div><div className="print-id-details"><small>{type.toUpperCase()}</small><h3>{person.name}</h3><span>{detail}</span><div className="print-id-number"><small>{type === 'Student' ? 'ADMISSION NUMBER' : 'STAFF ID'}</small><strong>{identifier}</strong></div></div></div><footer className="print-id-footer"><span>EDU-MEET SCHOOL WORKSPACE</span><span>{workspace.profile.session || '2026/2027'}</span></footer></article><p className="id-card-hint">Print this card or choose “Save as PDF” in the print dialog.</p><div className="id-card-dialog-actions"><button className="button-secondary" onClick={onClose}>Close</button><button className="button-primary" onClick={() => window.print()}><Printer size={16} /> Print ID card</button></div></section></div>;
}

export default App;
