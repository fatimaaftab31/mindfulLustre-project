
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/context/UserContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Heart, Clock, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';

const GRATITUDE_PROMPTS = [
  "What made you smile today?",
  "What's something you're looking forward to?",
  "Name someone who helped you recently and how they helped.",
  "What's something beautiful you noticed today?",
  "What's a small win you had recently?",
  "What's something you're proud of accomplishing?",
  "What's a quality in yourself that you appreciate?",
  "What's something you learned recently?",
  "What's something that brought you comfort today?",
  "What's a moment of joy you experienced recently?"
];

const GratitudeJournal = () => {
  const { addExerciseLog, user, getGratitudeEntries } = useUser();
  const [entry, setEntry] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allEntries, setAllEntries] = useState<any[]>([]);
  const [isAllEntriesOpen, setIsAllEntriesOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const streak = user?.streaks?.gratitude || 0;

  // Set a random prompt
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * GRATITUDE_PROMPTS.length);
    setPrompt(GRATITUDE_PROMPTS[randomIndex]);
  }, []);

  // Directly fetch gratitude entries from Supabase
  const fetchGratitudeEntries = async () => {
    if (!user) return [];
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'gratitude')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching gratitude entries:', error);
        toast.error('Failed to load gratitude entries');
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Exception fetching gratitude entries:', error);
      toast.error('Failed to load gratitude entries');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Load all gratitude entries
  useEffect(() => {
    const loadAllEntries = async () => {
      if (!isAllEntriesOpen || !user) return;
      
      const entries = await fetchGratitudeEntries();
      console.log('Fetched gratitude entries:', entries);
      setAllEntries(entries);
    };

    if (isAllEntriesOpen) {
      loadAllEntries();
    }
  }, [isAllEntriesOpen, user]);

  // Change prompt on button click
  const getNewPrompt = () => {
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * GRATITUDE_PROMPTS.length);
    } while (GRATITUDE_PROMPTS[randomIndex] === prompt);
    
    setPrompt(GRATITUDE_PROMPTS[randomIndex]);
  };

  // Submit gratitude journal entry
  const submitEntry = async () => {
    if (!entry.trim()) {
      toast.error('Please write something you\'re grateful for');
      return;
    }

    setIsSubmitting(true);
    try {
      // Pass the prompt to the addExerciseLog function
      await addExerciseLog('gratitude', undefined, entry, prompt);
      toast.success('Gratitude entry saved!');
      setEntry('');
      
      // Refresh the entries list if it's open
      if (isAllEntriesOpen) {
        const freshEntries = await fetchGratitudeEntries();
        setAllEntries(freshEntries);
      }
      
      // Get a new prompt for next time
      getNewPrompt();
    } catch (error) {
      console.error('Error saving gratitude entry:', error);
      toast.error('Failed to save your gratitude entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get recent gratitude entries
  const getRecentEntries = () => {
    if (!allEntries || allEntries.length === 0) return [];
    return allEntries.slice(0, 3);
  };

  const recentEntries = getRecentEntries();
  
  // Toggle the entries accordion and load entries if needed
  const handleToggleEntries = async (value: string) => {
    const isOpen = value === "all-entries";
    setIsAllEntriesOpen(isOpen);
    
    if (isOpen && allEntries.length === 0) {
      const entries = await fetchGratitudeEntries();
      setAllEntries(entries);
    }
  };

  return (
    <motion.div 
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div 
        className="text-center mb-2"
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <p className="text-muted-foreground">
          Reflecting on what you're grateful for can improve your well-being
        </p>
        
        {streak > 0 && (
          <motion.div 
            className="mt-4 mb-6"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ 
              delay: 0.4, 
              duration: 0.3,
              type: "spring", 
              stiffness: 500 
            }}
          >
            <div className="bg-wellness-purple/10 rounded-full px-4 py-1 inline-block">
              <p className="text-sm text-wellness-purple font-medium">
                🔥 {streak} day streak!
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="border-wellness-purple/20 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium flex items-center">
              <Heart size={18} className="text-red-400 mr-2" />
              Today's Reflection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <motion.div 
                className="bg-wellness-purple/5 p-4 rounded-md"
                whileHover={{ scale: 1.01 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <p className="font-medium text-wellness-purple">{prompt}</p>
              </motion.div>
              
              <Textarea
                placeholder="Write what you're grateful for..."
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                className="min-h-[120px] border-wellness-purple/30 focus:border-wellness-purple"
              />
              
              <div className="flex justify-between">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    variant="outline"
                    onClick={getNewPrompt}
                    disabled={isSubmitting}
                  >
                    Try Another Prompt
                  </Button>
                </motion.div>
                
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button 
                    onClick={submitEntry}
                    className="bg-wellness-purple hover:bg-wellness-deepPurple"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : 'Save Entry'}
                  </Button>
                </motion.div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Past Gratitude Entries Section - Made more prominent */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="border-wellness-purple/20 shadow-md overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium flex items-center">
              <Calendar size={18} className="text-wellness-purple mr-2" />
              Your Gratitude Journey
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion 
              type="single" 
              collapsible 
              className="w-full"
              onValueChange={handleToggleEntries}
            >
              <AccordionItem value="all-entries" className="border-b-0">
                <AccordionTrigger className="py-2 text-wellness-purple hover:text-wellness-deepPurple hover:no-underline">
                  <div className="flex items-center">
                    <span className="font-medium">View All Gratitude Entries</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {isLoading ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Loading your gratitude entries...</p>
                    </div>
                  ) : allEntries.length > 0 ? (
                    <div className="overflow-x-auto mt-2 border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[120px]">Date</TableHead>
                            <TableHead>Prompt</TableHead>
                            <TableHead>Gratitude Entry</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allEntries.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell className="font-medium">
                                {format(new Date(entry.created_at), 'MMM d, yyyy')}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {entry.prompt || 'No prompt recorded'}
                              </TableCell>
                              <TableCell>{entry.note}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No gratitude entries found.</p>
                      <p className="text-sm text-muted-foreground mt-2">Start your gratitude practice by adding an entry above.</p>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            {/* Recent Entries - Quick View */}
            {recentEntries.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-3 text-muted-foreground">Recent Entries</h3>
                <div className="space-y-4">
                  {recentEntries.map((entry, index) => (
                    <motion.div 
                      key={entry.id} 
                      className="border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index, duration: 0.3 }}
                    >
                      <div className="flex items-center text-xs text-muted-foreground mb-1">
                        <Clock size={12} className="mr-1" />
                        {format(new Date(entry.created_at), 'MMMM d, yyyy')}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {entry.prompt || 'No prompt recorded'}
                      </p>
                      <p className="text-sm">{entry.note}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default GratitudeJournal;
