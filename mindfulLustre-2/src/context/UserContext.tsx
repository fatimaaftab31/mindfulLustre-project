import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Define types
export type MoodEntry = {
  id: string;
  rating: number;
  note?: string;
  created_at: string;
  user_id: string;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  user_id: string;
};

export type ExerciseLog = {
  id: string;
  type: 'breathing' | 'meditation' | 'gratitude';
  duration?: number;
  note?: string;
  prompt?: string;
  created_at: string;
  user_id: string;
};

export type Streak = {
  exercise_type: 'breathing' | 'meditation' | 'gratitude';
  current_streak: number;
  longest_streak: number;
  last_completed_at?: string;
};

// Extended User type with our app-specific properties
export interface AppUser extends SupabaseUser {
  streaks?: {
    gratitude?: number;
    breathing?: number;
    meditation?: number;
  };
  exercise_logs?: ExerciseLog[];
}

// Context type
type UserContextType = {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  addMoodEntry: (rating: number, note?: string) => Promise<void>;
  addChatMessage: (role: 'user' | 'assistant', content: string) => Promise<void>;
  addExerciseLog: (type: 'breathing' | 'meditation' | 'gratitude', duration?: number, note?: string, prompt?: string) => Promise<void>;
  getTodaysMoodEntry: () => Promise<MoodEntry | null>;
  getStreaks: () => Promise<Streak[]>;
  updateStreak: (type: 'breathing' | 'meditation' | 'gratitude') => Promise<void>;
  getChatHistory: () => Promise<ChatMessage[]>;
  getMoodEntries: () => Promise<MoodEntry[]>;
  getGratitudeEntries: () => Promise<ExerciseLog[]>;
  hasMoodEntryToday: boolean;
};

// Create context
const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMoodEntryToday, setHasMoodEntryToday] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      checkTodaysMoodEntry();
    }
  }, [user]);

  const checkTodaysMoodEntry = async () => {
    if (!user) return;
    
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('mood_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`);
    
    if (error) {
      console.error('Error checking today\'s mood entry:', error);
      return;
    }
    
    setHasMoodEntryToday(data.length > 0);
  };

  const getTodaysMoodEntry = async () => {
    if (!user) return null;
    
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('mood_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No entry found for today
      }
      console.error('Error fetching today\'s mood entry:', error);
      return null;
    }
    
    return data as MoodEntry;
  };

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signup = async (email: string, password: string, username: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });

    if (error) throw error;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const addMoodEntry = async (rating: number, note?: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('mood_entries')
      .insert([
        { 
          user_id: user.id, 
          rating, 
          note 
        }
      ]);

    if (error) {
      console.error('Error adding mood entry:', error);
      throw error;
    }

    setHasMoodEntryToday(true);
  };

  const getMoodEntries = async () => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('mood_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching mood entries:', error);
      return [];
    }

    return data as MoodEntry[];
  };

  const addChatMessage = async (role: 'user' | 'assistant', content: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('chat_messages')
      .insert([
        { 
          user_id: user.id, 
          role, 
          content 
        }
      ]);

    if (error) {
      console.error('Error adding chat message:', error);
      throw error;
    }
  };

  const getChatHistory = async () => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching chat history:', error);
      return [];
    }

    return data as ChatMessage[];
  };

  const addExerciseLog = async (type: 'breathing' | 'meditation' | 'gratitude', duration?: number, note?: string, prompt?: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('exercise_logs')
      .insert([
        { 
          user_id: user.id, 
          type, 
          duration, 
          note,
          prompt 
        }
      ]);

    if (error) {
      console.error('Error adding exercise log:', error);
      throw error;
    }

    await updateStreak(type);
  };

  const getStreaks = async () => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching streaks:', error);
      return [];
    }

    return data as Streak[];
  };

  const updateStreak = async (type: 'breathing' | 'meditation' | 'gratitude') => {
    if (!user) return;

    const { data: existingStreak, error: fetchError } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', user.id)
      .eq('exercise_type', type)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching streak:', fetchError);
      return;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    
    if (!existingStreak) {
      const { error: insertError } = await supabase
        .from('streaks')
        .insert([
          {
            user_id: user.id,
            exercise_type: type,
            current_streak: 1,
            longest_streak: 1,
            last_completed_at: now.toISOString()
          }
        ]);

      if (insertError) {
        console.error('Error creating streak:', insertError);
      }
      return;
    }

    const lastCompleted = new Date(existingStreak.last_completed_at);
    const lastCompletedDate = new Date(
      lastCompleted.getFullYear(), 
      lastCompleted.getMonth(), 
      lastCompleted.getDate()
    ).toISOString();
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = new Date(
      yesterday.getFullYear(), 
      yesterday.getMonth(), 
      yesterday.getDate()
    ).toISOString();

    let newCurrentStreak = existingStreak.current_streak;
    let newLongestStreak = existingStreak.longest_streak;

    if (lastCompletedDate === today) {
      return;
    } 
    else if (lastCompletedDate === yesterdayDate) {
      newCurrentStreak += 1;
      if (newCurrentStreak > newLongestStreak) {
        newLongestStreak = newCurrentStreak;
      }
    } 
    else {
      newCurrentStreak = 1;
    }

    const { error: updateError } = await supabase
      .from('streaks')
      .update({
        current_streak: newCurrentStreak,
        longest_streak: newLongestStreak,
        last_completed_at: now.toISOString()
      })
      .eq('id', existingStreak.id);

    if (updateError) {
      console.error('Error updating streak:', updateError);
    }
  };

  const getGratitudeEntries = async () => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('exercise_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'gratitude')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching gratitude entries:', error);
      return [];
    }

    console.log('Gratitude entries with prompts:', data);
    return data as ExerciseLog[];
  };

  return (
    <UserContext.Provider value={{
      user,
      session,
      loading,
      login,
      signup,
      logout,
      addMoodEntry,
      addChatMessage,
      addExerciseLog,
      getGratitudeEntries,
      getTodaysMoodEntry,
      getStreaks,
      updateStreak,
      getChatHistory,
      getMoodEntries,
      hasMoodEntryToday
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
