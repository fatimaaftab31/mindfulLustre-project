
import React from 'react';
import { useUser } from '@/context/UserContext';
import Login from '@/components/Login';
import AppLayout from '@/components/AppLayout';

const Index = () => {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-wellness-purple/10 to-wellness-blue/10">
        <div className="animate-pulse text-wellness-purple">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <AppLayout />;
};

export default Index;
