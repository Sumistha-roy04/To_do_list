import { useEffect, useState } from 'react';
import { Board } from './components/Board';
import { WelcomeView } from './components/WelcomeView';
import { LoginView } from './components/LoginView';
import { RegisterView } from './components/RegisterView';
import { MemberAccessView } from './components/MemberAccessView';
import { useKanbanStore } from './store/useKanbanStore';

function App() {
  const { theme, user } = useKanbanStore();
  const [authStep, setAuthStep] = useState<'welcome' | 'leader-login' | 'leader-register' | 'member-login'>('welcome');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  if (!user) {
    if (authStep === 'welcome') {
      return <WelcomeView onSelectRole={(role) => setAuthStep(role === 'leader' ? 'leader-login' : 'member-login')} />;
    }
    if (authStep === 'leader-login') {
      return (
        <LoginView 
          onToggleRegister={() => setAuthStep('leader-register')} 
          onBackToWelcome={() => setAuthStep('welcome')} 
        />
      );
    }
    if (authStep === 'leader-register') {
      return (
        <RegisterView 
          onToggleLogin={() => setAuthStep('leader-login')} 
          onBackToWelcome={() => setAuthStep('welcome')}
        />
      );
    }
    if (authStep === 'member-login') {
      return <MemberAccessView onBackToWelcome={() => setAuthStep('welcome')} />;
    }
  }

  return (
    <div className={`min-h-screen w-screen overflow-auto transition-colors duration-300 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100' 
        : 'bg-gradient-to-br from-slate-50 via-slate-100/50 to-slate-50 text-slate-900'
    }`}>
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        <Board />
      </div>
    </div>
  );
}

export default App;
