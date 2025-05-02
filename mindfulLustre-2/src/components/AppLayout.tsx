
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/UserContext';
import { toast } from 'sonner';
import { LogOut, LineChart, MessageSquare, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MoodTracker from '@/components/MoodTracker';
import ChatBot from '@/components/ChatBot';
import StressReliever from '@/components/StressReliever';

const AppLayout = () => {
  const { user, logout } = useUser();
  const [activeTab, setActiveTab] = useState('mood');
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/auth');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-wellness-purple/5 to-wellness-blue/5">
      <header className="border-b border-wellness-purple/20 bg-white py-4 px-6 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-wellness-purple">MindfulLustre</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Hello, {user?.user_metadata?.username || 'User'}</span>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleLogout}
            className="text-muted-foreground hover:text-wellness-purple"
          >
            <LogOut size={20} />
          </Button>
        </div>
      </header>

      <main className="container mx-auto py-6 px-4 max-w-6xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto bg-wellness-purple/10">
            <TabsTrigger 
              value="mood" 
              className="data-[state=active]:bg-wellness-purple data-[state=active]:text-white flex items-center justify-center sm:justify-start"
            >
              <LineChart size={18} className="sm:mr-2" />
              <span className="hidden data-[state=active]:inline sm:inline ml-2">Mood Tracker</span>
            </TabsTrigger>
            <TabsTrigger 
              value="chat"
              className="data-[state=active]:bg-wellness-purple data-[state=active]:text-white flex items-center justify-center sm:justify-start"
            >
              <MessageSquare size={18} className="sm:mr-2" />
              <span className="hidden data-[state=active]:inline sm:inline ml-2">ChatBot</span>
            </TabsTrigger>
            <TabsTrigger 
              value="stress"
              className="data-[state=active]:bg-wellness-purple data-[state=active]:text-white flex items-center justify-center sm:justify-start"
            >
              <Sparkles size={18} className="sm:mr-2" />
              <span className="hidden data-[state=active]:inline sm:inline ml-2">Stress Relief</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mood" className="mt-6">
            <MoodTracker />
          </TabsContent>

          <TabsContent value="chat" className="mt-6">
            <ChatBot />
          </TabsContent>

          <TabsContent value="stress" className="mt-6">
            <StressReliever />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AppLayout;
