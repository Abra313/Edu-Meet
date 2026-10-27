import { useState } from 'react';
import {
  ArrowDown, ArrowRight, Bell, BookOpen, CalendarDays, Check, ChevronDown,
  CircleDollarSign, ClipboardCheck, GraduationCap, Menu, MonitorSmartphone,
  ShieldCheck, Users, X,
} from 'lucide-react';

const features = [
  { icon: BookOpen, title: 'School administration', text: "Manage your school's profile, staff, classes, student records, and essential day-to-day activities." },
  { icon: Users, title: 'Student management', text: 'Register students, organize them into classes, and keep important information accessible to authorized staff.' },
  { icon: ClipboardCheck, title: 'Attendance tracking', text: 'Record daily attendance and stay on top of student participation throughout the school day.' },
  { icon: GraduationCap, title: 'Academic performance', text: 'Schedule assessments and organize academic information to support informed decisions.' },
  { icon: CalendarDays, title: 'Timetables & classes', text: 'Plan class periods, subjects, and teacher responsibilities in one organized workspace.' },
  { icon: CircleDollarSign, title: 'Fees & payments', text: 'Record fee activity and review payments entered by authorized school staff.' },
];

const audiences = [
  { title: 'School owners & administrators', text: 'Get a clearer view of school operations, staff, student records, and administrative activity.', icon: ShieldCheck },
  { title: 'Teachers', text: 'Organize class activities, record attendance, and keep assigned subjects on schedule.', icon: BookOpen },
  { title: 'Students', text: 'Access permitted academic information, learning schedules, and school updates.', icon: GraduationCap },
  { title: 'Parents & guardians', text: "Stay connected with your child's school life and follow available academic updates.", icon: Users },
];

const questions = [
  ['What is Edu-Meet?', 'Edu-Meet is a school management platform designed to help schools organize administration, student records, attendance, academic activities, and related operations.'],
  ['Who can use Edu-Meet?', 'School owners, administrators, teachers, students, and parents can use Edu-Meet where their roles and features are enabled.'],
  ['Can multiple schools register?', 'School registration is available in this web preview. Separate school environments and shared multi-device data are still being developed.'],
  ['Can teachers and parents have separate accounts?', 'Yes. The current preview supports role-based accounts for teachers and parents, with access to the information relevant to each role.'],
  ['Can I access Edu-Meet on my phone?', 'The project includes a mobile app built with React Native and Expo. Availability depends on the current release and supported features.'],
  ['How do I register my school?', 'Choose “Register Your School” and follow the school owner account setup. This browser preview stores records on this device.'],
];

export default function LandingPage({ onLogin, onRegister }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const register = () => { closeMenu(); onRegister(); };
  const login = () => { closeMenu(); onLogin(); };

  return <div className="landing-page">
    <header className="landing-header">
      <a className="landing-brand" href="#home" aria-label="Edu-Meet home"><img src="/edu-meet-logo.png" alt="" /><span>Edu-Meet</span></a>
      <button className="landing-menu-toggle" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
      <nav className={`landing-nav ${menuOpen ? 'landing-nav-open' : ''}`} aria-label="Main navigation">
        <a href="#home" onClick={closeMenu}>Home</a><a href="#features" onClick={closeMenu}>Features</a><a href="#how-it-works" onClick={closeMenu}>How It Works</a><a href="#about" onClick={closeMenu}>About Us</a><a href="#contact" onClick={closeMenu}>Contact</a>
        <div className="landing-nav-actions"><button className="landing-login" onClick={login}>Log In</button><button className="landing-register" onClick={register}>Register Your School<ArrowRight size={15} /></button></div>
      </nav>
    </header>

    <main>
      <section className="landing-hero" id="home">
        <div className="hero-copy">
          <span className="landing-kicker"><i /> THE SMARTER WAY TO MANAGE YOUR SCHOOL</span>
          <h1>Manage Your School.<br /><span>Simplify Everything.</span></h1>
          <p className="hero-lede">Edu-Meet is an all-in-one school management platform that helps schools manage students, teachers, attendance, academic performance, and school operations from one convenient place.</p>
          <p className="hero-support">Spend less time on paperwork and more time building a better learning experience.</p>
          <div className="hero-actions"><button className="landing-cta" onClick={register}>Register Your School<ArrowRight size={17} /></button><a className="landing-secondary" href="#features">Explore Features<ArrowDown size={16} /></a></div>
          <div className="hero-benefits"><span><Check size={15} /> One platform for your entire school</span><span><Check size={15} /> Organized academic records and activities</span><span><Check size={15} /> Role-based access for your community</span></div>
          <small className="availability-note">Available features and device support depend on the current product release.</small>
        </div>
        <div className="hero-visual" aria-label="Edu-Meet dashboard preview">
          <div className="hero-visual-top"><span><i /> EDU-MEET WORKSPACE</span><span>WEB PREVIEW · SAMPLE DATA</span></div>
          <div className="dashboard-preview">
            <aside className="preview-sidebar"><img src="/edu-meet-logo.png" alt="" /><span className="preview-nav active"><span /> Dashboard</span><span className="preview-nav"><span /> Students</span><span className="preview-nav"><span /> Classes</span><span className="preview-nav"><span /> Attendance</span><span className="preview-nav"><span /> Timetable</span><span className="preview-nav"><span /> Announcements</span></aside>
            <div className="preview-main"><div className="preview-heading"><div><small>SCHOOL OVERVIEW</small><strong>Good morning, Ada</strong></div><span className="preview-avatar">A</span></div><div className="preview-metrics"><div><small>Total students</small><b>1,250</b><span>↑ Enrolled this session</span></div><div><small>Active staff</small><b>48</b><span>Across 12 classes</span></div><div><small>Present today</small><b>92%</b><span>Attendance summary</span></div></div><div className="preview-columns"><div className="preview-panel preview-chart"><div><b>School activity</b><small>Attendance · This week</small></div><div className="chart-lines"><span /><span /><span /><span /><svg viewBox="0 0 300 94" role="img" aria-label="Illustrative attendance chart"><path d="M4 78 C28 64 34 71 52 54 S78 68 98 43 S122 52 143 37 S171 48 193 28 S220 39 243 20 S275 25 296 7" /></svg></div><div className="chart-labels"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span></div></div><div className="preview-panel preview-updates"><b>Recent updates</b><span><i className="preview-dot green-dot" /><span><strong>Parent meeting</strong><small>Whole school · Today</small></span></span><span><i className="preview-dot blue-dot" /><span><strong>Assessment week</strong><small>Primary · 2 days</small></span></span><span><i className="preview-dot amber-dot" /><span><strong>Term schedule</strong><small>Staff · This week</small></span></span></div></div><div className="preview-foot"><span><CalendarDays size={13} /> 2026/2027 · First term</span><span><ShieldCheck size={13} /> ROLE-BASED ACCESS</span></div></div>
          </div>
          <div className="hero-visual-caption"><span><MonitorSmartphone size={15} /> A connected school workspace</span><span>Dashboard preview</span></div>
        </div>
        <div className="hero-ornament" aria-hidden="true"><span /><span /><span /></div>
      </section>

      <section className="landing-problem section-shell" id="about">
        <div className="problem-heading"><span className="section-index">01 / THE CHALLENGE</span><h2>School management<br />shouldn't be complicated.</h2></div>
        <div className="problem-copy"><p>Paper records, scattered spreadsheets, and disconnected communication can waste time and make it difficult to keep information organized.</p><p>Edu-Meet helps schools bring essential operations together in one system.</p><div className="problem-points"><span><b>01</b><strong>Reduce paperwork</strong><small>Keep student and academic records organized digitally.</small></span><span><b>02</b><strong>Improve efficiency</strong><small>Make everyday administrative tasks easier to manage.</small></span><span><b>03</b><strong>Stay informed</strong><small>Give authorized users access to relevant school information.</small></span><span><b>04</b><strong>Support better decisions</strong><small>Use organized records to understand attendance and progress.</small></span></div></div>
      </section>

      <section className="landing-features" id="features"><div className="section-shell"><div className="section-heading"><span className="section-index">02 / THE PLATFORM</span><h2>Everything your school needs,<br /><span>in one place.</span></h2><p>Bring the everyday work of running a school into one organized workspace.</p></div><div className="feature-grid">{features.map(({ icon: Icon, title, text }, index) => <article className="feature-item" key={title}><span className={`feature-icon feature-tone-${index % 4}`}><Icon size={20} /></span><span className="feature-number">0{index + 1}</span><h3>{title}</h3><p>{text}</p></article>)}<article className="feature-item"><span className="feature-icon feature-tone-1"><Users size={20} /></span><span className="feature-number">07</span><h3>Parent & student access</h3><p>Give families and students a dedicated view of permitted academic information and school updates.</p></article></div><div className="feature-footnote"><ShieldCheck size={17} /><span><strong>School data privacy</strong> Access controls are designed to keep school information available to authorized users. Multi-school data separation is under development in this preview.</span></div></div></section>

      <section className="landing-steps section-shell" id="how-it-works"><div className="section-heading"><span className="section-index">03 / GETTING STARTED</span><h2>Get your school started<br />in three simple steps.</h2></div><div className="steps-grid"><article><span>01</span><div><h3>Register your school</h3><p>Create your school's account and provide the required school information.</p></div><ArrowRight size={19} /></article><article><span>02</span><div><h3>Set up your school environment</h3><p>Configure classes, invite authorized staff, add students, and organize your school's records.</p></div><ArrowRight size={19} /></article><article><span>03</span><div><h3>Manage your school with ease</h3><p>Access the tools available to your role and manage daily school activities in one place.</p></div><ArrowRight size={19} /></article></div></section>

      <section className="landing-community" id="community"><div className="community-image"><img src="/onboarding-classroom.png" alt="A teacher supporting students as they work together in class" /><span>LEARNING IS A TEAM EFFORT</span></div><div className="community-content"><span className="section-index">04 / ONE SCHOOL COMMUNITY</span><h2>Built for every member<br />of the school community.</h2><p>Give every person a clearer view of the information that matters to them.</p><div className="audience-list">{audiences.map(({ icon: Icon, title, text }) => <article key={title}><span><Icon size={17} /></span><div><h3>{title}</h3><p>{text}</p></div><ChevronDown size={15} /></article>)}</div></div></section>

      <section className="landing-access section-shell"><div className="access-copy"><span className="section-index">05 / ACCESS WHEN YOU NEED IT</span><h2>Your school,<br /><span>more accessible.</span></h2><p>Edu-Meet is designed around convenient access to school information through a modern digital experience.</p><div className="access-platforms"><span><MonitorSmartphone size={18} /><b>Mobile experience</b><small>Access school tools on supported mobile devices.</small></span><span><BookOpen size={18} /><b>Web & desktop</b><small>Manage school work from a larger screen.</small></span></div><small className="store-note">Store links search for Edu-Meet. Availability depends on your region and the current release.</small></div><div className="access-photo"><img src="/onboarding-welcome.png" alt="Students walking together on their way to school" /><div className="store-buttons"><a href="https://play.google.com/store/search?q=Edu-Meet&c=apps" target="_blank" rel="noreferrer" aria-label="Find Edu-Meet on Google Play"><img src="/google-play-badge.png" alt="Get it on Google Play" /></a><a href="https://apps.apple.com/us/search?term=Edu-Meet" target="_blank" rel="noreferrer" aria-label="Find Edu-Meet on the App Store"><img src="/app-store-badge.svg" alt="Download on the App Store" /></a></div></div></section>

      <section className="landing-why"><div className="section-shell why-inner"><div><span className="section-index">06 / WHY EDU-MEET</span><h2>A better way<br />to run a school.</h2></div><div className="why-list"><p><Check size={16} /><span><strong>One connected platform</strong> Bring essential school management activities together.</span></p><p><Check size={16} /><span><strong>Role-based access</strong> Give users access appropriate to their school role.</span></p><p><Check size={16} /><span><strong>Convenient access</strong> A connected experience across supported devices.</span></p><p><Check size={16} /><span><strong>Room to grow</strong> Support your school's evolving academic and administrative needs.</span></p></div></div></section>

      <section className="landing-faq section-shell" id="contact"><div className="section-heading"><span className="section-index">07 / GOOD TO KNOW</span><h2>Questions, answered.</h2></div><div className="faq-list">{questions.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={17} /></summary><p>{answer}</p></details>)}</div></section>

      <section className="landing-final"><div><span className="section-index">A MORE ORGANIZED SCHOOL DAY STARTS HERE</span><h2>Ready to make school<br />management easier?</h2><p>Bring your school's essential activities together with Edu-Meet. Start building a more organized digital school environment today.</p><button className="landing-cta" onClick={register}>Register Your School<ArrowRight size={17} /></button></div><span className="final-mark"><GraduationCap size={43} /></span></section>
    </main>

    <footer className="landing-footer" id="footer"><div className="footer-main"><div className="footer-brand"><a href="#home"><img src="/edu-meet-logo.png" alt="Edu-Meet" /></a><p>Manage Your School.<br />Simplify Everything.</p></div><div className="footer-links"><strong>Explore</strong><a href="#about">About Us</a><a href="#features">Features</a><a href="#contact">Contact</a></div><div className="footer-links"><strong>Get started</strong><button onClick={register}>Register Your School</button><button onClick={login}>Log In</button><a href="#contact">Help Center</a></div><div className="footer-contact"><strong>Contact</strong><span>Contact details coming soon</span><span>Follow Edu-Meet for updates</span></div></div><div className="footer-bottom"><span>© 2026 Edu-Meet. All rights reserved.</span><span>School operations, made simpler.</span><a href="#home">Back to top ↑</a></div></footer>
  </div>;
}
