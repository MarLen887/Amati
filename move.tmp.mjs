import fs from 'fs';
import path from 'path';
const root = 'C:/laragon/www/amati/src';
const map = {
  // app
  'main.jsx': 'main.jsx', 'App.jsx': 'app/App.jsx',
  // estilos
  'styles.css':'styles/base.css','animations.css':'styles/animations.css','ui.css':'styles/ui.css','pomodoro.css':'styles/pomodoro.css','features.css':'styles/features.css','techniques.css':'styles/techniques.css',
  // núcleo compartido
  'firebase.js':'core/firebase.js',
  'context/AuthContext.jsx':'core/context/AuthContext.jsx','context/ThemeContext.jsx':'core/context/ThemeContext.jsx','context/DataContext.jsx':'core/context/DataContext.jsx',
  'lib/db.js':'core/data/db.js',
  'lib/dates.js':'core/lib/dates.js','lib/csv.js':'core/lib/csv.js','lib/images.js':'core/lib/images.js','lib/ripple.js':'core/lib/ripple.js','lib/chime.js':'core/lib/chime.js',
  'components/Layout.jsx':'core/components/Layout.jsx','components/Logo.jsx':'core/components/Logo.jsx','components/Ambient.jsx':'core/components/Ambient.jsx','components/Hummingbird.jsx':'core/components/Hummingbird.jsx',
  'components/EmptyState.jsx':'core/components/EmptyState.jsx','components/ColorPicker.jsx':'core/components/ColorPicker.jsx','components/ImageField.jsx':'core/components/ImageField.jsx','components/Celebrate.jsx':'core/components/Celebrate.jsx','components/CreateMenu.jsx':'core/components/CreateMenu.jsx',
  // auth
  'pages/AuthPages.jsx':'features/auth/AuthPages.jsx','components/ChangePassword.jsx':'features/auth/ChangePassword.jsx',
  // inicio
  'pages/Home.jsx':'features/home/Home.jsx','pages/HowItWorks.jsx':'features/home/HowItWorks.jsx','components/WeeklySummary.jsx':'features/home/WeeklySummary.jsx','lib/quotes.js':'features/home/quotes.js','components/Hummingbird.jsx_':'',
  // materias
  'pages/Subjects.jsx':'features/subjects/Subjects.jsx','pages/SubjectDetail.jsx':'features/subjects/SubjectDetail.jsx','components/CardForm.jsx':'features/subjects/CardForm.jsx','components/ImportCards.jsx':'features/subjects/ImportCards.jsx','lib/importCards.js':'features/subjects/importCards.js','components/ExamCountdown.jsx':'features/subjects/ExamCountdown.jsx',
  // técnicas (catálogo + sesiones de estudio)
  'pages/Techniques.jsx':'features/techniques/Techniques.jsx','lib/techniques.js':'features/techniques/techniques.js','components/TechniqueIcon.jsx':'features/techniques/TechniqueIcon.jsx',
  'lib/srs.js':'features/techniques/cards/srs.js','lib/schedulers.js':'features/techniques/cards/schedulers.js','lib/studyFilter.js':'features/techniques/cards/studyFilter.js',
  'pages/Study.jsx':'features/techniques/cards/Study.jsx','components/FlashcardView.jsx':'features/techniques/cards/FlashcardView.jsx','components/RecallCardView.jsx':'features/techniques/cards/RecallCardView.jsx','components/LeitnerBoxes.jsx':'features/techniques/cards/LeitnerBoxes.jsx',
  'components/StudyLauncher.jsx':'features/home/StudyLauncher.jsx',
  // apuntes
  'pages/Notes.jsx':'features/notes/Notes.jsx','pages/NoteEditor.jsx':'features/notes/NoteEditor.jsx','lib/guides.js':'features/notes/guides.js',
  'components/notes/GuidedEditor.jsx':'features/notes/GuidedEditor.jsx','components/notes/OutlineEditor.jsx':'features/notes/OutlineEditor.jsx','components/notes/CornellEditor.jsx':'features/notes/CornellEditor.jsx',
  // bienestar y pomodoro
  'components/Breathing.jsx':'features/wellbeing/Breathing.jsx','components/MoodPicker.jsx':'features/wellbeing/MoodPicker.jsx',
  'pages/PomodoroStudy.jsx':'features/pomodoro/PomodoroStudy.jsx','context/PomodoroContext.jsx':'features/pomodoro/PomodoroContext.jsx','components/PomodoroBreak.jsx':'features/pomodoro/PomodoroBreak.jsx','components/PomodoroPill.jsx':'features/pomodoro/PomodoroPill.jsx','components/PomodoroRing.jsx':'features/pomodoro/PomodoroRing.jsx','components/PomodoroSettings.jsx':'features/settings/PomodoroSettings.jsx',
  // progreso / admin / ajustes
  'pages/Progress.jsx':'features/progress/Progress.jsx','pages/Admin.jsx':'features/admin/Admin.jsx','components/AdminCharts.jsx':'features/admin/AdminCharts.jsx',
  'pages/Settings.jsx':'features/settings/Settings.jsx','components/MyData.jsx':'features/settings/MyData.jsx',
};
delete map['components/Hummingbird.jsx_'];
const all = [];
(function walk(d){ for (const f of fs.readdirSync(d,{withFileTypes:true})) { const p=path.join(d,f.name); f.isDirectory()?walk(p):all.push(path.relative(root,p).split(path.sep).join('/')); } })(root);
const missing = all.filter(f=>!(f in map)); if (missing.length) { console.log('SIN MAPA', missing); process.exit(1); }
const exts=['','.js','.jsx','.css'];
const resolveOld = (from, spec) => { const base=path.posix.normalize(path.posix.join(path.posix.dirname(from),spec)); for(const e of exts){ if(all.includes(base+e)) return base+e; } return null; };
const out = {};
for (const f of all) {
  let src = fs.readFileSync(path.join(root,f),'utf8');
  const nf = map[f];
  src = src.replace(/((?:from|import)\s*\(?\s*)(['"])(\.{1,2}\/[^'"]+)\2/g, (m,pre,q,spec)=>{
    const target = resolveOld(f, spec);
    if(!target){ console.log('NO RESUELTO',f,spec); return m; }
    let rel = path.posix.relative(path.posix.dirname(nf), map[target]);
    if(!rel.startsWith('.')) rel='./'+rel;
    return `${pre}${q}${rel}${q}`;
  });
  out[nf]=src;
}
const tmp = root+'_new';
for (const [nf,src] of Object.entries(out)) { const p=path.join(tmp,nf); fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p,src); }
fs.renameSync(root, root+'_old'); fs.renameSync(tmp, root);
console.log('movidos', Object.keys(out).length);
