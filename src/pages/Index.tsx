import { useState } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { Header } from '@/components/layout/Header';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { TechnicianDashboard } from '@/components/technician/TechnicianDashboard';

interface User {
  role: 'admin' | 'technicien';
  username: string;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (role: 'admin' | 'technicien', username: string) => {
    setUser({ role, username });
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} onLogout={handleLogout} />
      <main>
        {user.role === 'admin' ? (
          <AdminDashboard />
        ) : (
          <TechnicianDashboard username={user.username} />
        )}
      </main>
    </div>
  );
};

export default Index;
