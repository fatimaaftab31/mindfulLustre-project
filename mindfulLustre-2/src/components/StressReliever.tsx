
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/context/UserContext';
import { toast } from 'sonner';
import { Wind, Coffee, HeartHandshake, Flame } from 'lucide-react';
import BreathingExercise from '@/components/stress/BreathingExercise';
import Meditation from '@/components/stress/Meditation';
import GratitudeJournal from '@/components/stress/GratitudeJournal';

const StressReliever = () => {
  const [activeTab, setActiveTab] = useState('breathing');
  const { user, getStreaks } = useUser();
  const [streaks, setStreaks] = useState<{
    breathing: number;
    meditation: number;
    gratitude: number;
  }>({
    breathing: 0,
    meditation: 0,
    gratitude: 0
  });

  // Fetch streaks when component mounts
  useEffect(() => {
    const fetchStreaks = async () => {
      try {
        const userStreaks = await getStreaks();
        const updatedStreaks = {
          breathing: 0,
          meditation: 0,
          gratitude: 0
        };
        
        userStreaks.forEach(streak => {
          if (streak.exercise_type === 'breathing') {
            updatedStreaks.breathing = streak.current_streak;
          } else if (streak.exercise_type === 'meditation') {
            updatedStreaks.meditation = streak.current_streak;
          } else if (streak.exercise_type === 'gratitude') {
            updatedStreaks.gratitude = streak.current_streak;
          }
        });
        
        setStreaks(updatedStreaks);
      } catch (error) {
        console.error('Error fetching streaks:', error);
      }
    };

    fetchStreaks();
  }, [getStreaks]);
  
  // Helper function to render streak badge
  const renderStreakBadge = (count: number) => {
    if (count === 0) return null;
    
    return (
      <div className="ml-2 bg-wellness-purple/10 rounded-full px-2 py-0.5 inline-flex items-center">
        <Flame size={14} className="text-orange-500 mr-1" />
        <span className="text-xs font-medium text-wellness-purple">{count}</span>
      </div>
    );
  };

  return (
    <Card className="border-wellness-purple/20 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-wellness-purple">Stress Relief Exercises</CardTitle>
        <CardDescription>
          Tools to help you relax and reduce stress
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto bg-wellness-purple/10">
            <TabsTrigger 
              value="breathing" 
              className="data-[state=active]:bg-wellness-purple data-[state=active]:text-white flex items-center justify-center sm:justify-start"
            >
              <Wind size={16} className="sm:mr-2" />
              <span className="hidden data-[state=active]:inline sm:inline ml-2">Breathing</span>
              {renderStreakBadge(streaks.breathing)}
            </TabsTrigger>
            <TabsTrigger 
              value="meditation"
              className="data-[state=active]:bg-wellness-purple data-[state=active]:text-white flex items-center justify-center sm:justify-start"
            >
              <Coffee size={16} className="sm:mr-2" />
              <span className="hidden data-[state=active]:inline sm:inline ml-2">Meditation</span>
              {renderStreakBadge(streaks.meditation)}
            </TabsTrigger>
            <TabsTrigger 
              value="gratitude"
              className="data-[state=active]:bg-wellness-purple data-[state=active]:text-white flex items-center justify-center sm:justify-start"
            >
              <HeartHandshake size={16} className="sm:mr-2" />
              <span className="hidden data-[state=active]:inline sm:inline ml-2">Gratitude</span>
              {renderStreakBadge(streaks.gratitude)}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="breathing" className="mt-6">
            <BreathingExercise />
          </TabsContent>

          <TabsContent value="meditation" className="mt-6">
            <Meditation />
          </TabsContent>

          <TabsContent value="gratitude" className="mt-6">
            <GratitudeJournal />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default StressReliever;
