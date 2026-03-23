import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/',         icon: '💪', label: 'Today'    },
  { to: '/history',  icon: '📅', label: 'History'  },
  { to: '/settings', icon: '⚙️',  label: 'Settings' },
];

export default function NavBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto border-t border-border flex"
         style={{ backgroundColor: '#0D1220' }}>
      {tabs.map(t => (
        <NavLink
          key={t.to} to={t.to} end={t.to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-3 gap-0.5 text-xs transition-colors
             ${isActive ? 'text-accent' : 'text-zinc-500'}`
          }
        >
          <span className="text-xl">{t.icon}</span>
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
