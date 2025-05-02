import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useUser, MoodEntry } from '@/context/UserContext';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  TooltipProps
} from 'recharts';
import { format, parseISO, isAfter, isBefore, isEqual } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, TrendingDown, TrendingUp, Minus } from 'lucide-react';

const MoodTracker = () => {
  const { user, addMoodEntry, hasMoodEntryToday, getTodaysMoodEntry, getMoodEntries } = useUser();
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [todaysMoodEntry, setTodaysMoodEntry] = useState<MoodEntry | null>(null);

  useEffect(() => {
    const loadMoodData = async () => {
      if (user) {
        try {
          const entries = await getMoodEntries();
          setMoodEntries(entries);
          
          const todayEntry = await getTodaysMoodEntry();
          if (todayEntry) {
            setTodaysMoodEntry(todayEntry);
            setSelectedRating(todayEntry.rating);
            setNote(todayEntry.note || '');
          }
        } catch (error) {
          console.error('Error loading mood data:', error);
        }
      }
    };
    
    loadMoodData();
  }, [user, getMoodEntries, getTodaysMoodEntry]);

  const handleSubmit = async () => {
    if (selectedRating === null) {
      toast.error('Please select a mood rating');
      return;
    }

    setIsSubmitting(true);
    try {
      await addMoodEntry(selectedRating, note);
      toast.success('Mood recorded successfully');
      
      const newMoodEntry: MoodEntry = {
        id: 'new-' + Date.now(),
        rating: selectedRating,
        note: note,
        created_at: new Date().toISOString(),
        user_id: user?.id || ''
      };
      
      setTodaysMoodEntry(newMoodEntry);
      setMoodEntries(prev => [newMoodEntry, ...prev]);
    } catch (error) {
      toast.error('Failed to record mood. Please try again.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const prepareChartData = () => {
    if (moodEntries.length === 0) return [];

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(today.getDate() - 13);
    twoWeeksAgo.setHours(0, 0, 0, 0);
    
    const dateArray = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date(twoWeeksAgo);
      date.setDate(date.getDate() + i);
      dateArray.push(format(date, 'yyyy-MM-dd'));
    }
    
    const data = dateArray.map(dateStr => {
      const entry = moodEntries.find(e => {
        const entryDate = format(parseISO(e.created_at), 'yyyy-MM-dd');
        return entryDate === dateStr;
      });
      
      return {
        date: dateStr,
        rating: entry ? entry.rating : null,
        formattedDate: format(parseISO(dateStr), 'MMM dd')
      };
    });

    return data;
  };

  const calculateInsights = () => {
    if (moodEntries.length < 3) return null;

    const sortedEntries = [...moodEntries].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    const recentEntries = sortedEntries.slice(0, 7);
    if (recentEntries.length < 3) return null;
    
    const lowMoodCount = recentEntries.slice(0, 3).filter(entry => entry.rating <= 2).length;
    if (lowMoodCount >= 3) {
      return {
        type: 'warning',
        message: 'You\'ve had several low mood days recently. Consider talking to a mental health professional.'
      };
    }

    const dayAverages = new Map<number, { sum: number; count: number }>();
    
    recentEntries.forEach(entry => {
      const entryDate = parseISO(entry.created_at);
      const dayOfWeek = entryDate.getDay();
      const current = dayAverages.get(dayOfWeek) || { sum: 0, count: 0 };
      dayAverages.set(dayOfWeek, {
        sum: current.sum + entry.rating,
        count: current.count + 1
      });
    });

    let lowestDay = -1;
    let lowestAvg = 5;
    let highestDay = -1;
    let highestAvg = 0;

    dayAverages.forEach((value, day) => {
      const avg = value.sum / value.count;
      if (avg < lowestAvg) {
        lowestAvg = avg;
        lowestDay = day;
      }
      if (avg > highestAvg) {
        highestAvg = avg;
        highestDay = day;
      }
    });

    const days = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

    if (highestDay !== -1 && lowestDay !== -1 && highestAvg - lowestAvg > 1) {
      return {
        type: 'insight',
        message: `Your mood tends to be higher on ${days[highestDay]} and lower on ${days[lowestDay]}. Consider planning something special for ${days[lowestDay]}.`
      };
    }

    if (recentEntries.length >= 6) {
      const firstHalf = recentEntries.slice(3, 6).map(entry => entry.rating);
      const secondHalf = recentEntries.slice(0, 3).map(entry => entry.rating);
      
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      if (secondAvg - firstAvg > 0.5) {
        return {
          type: 'positive',
          message: 'Your mood has been improving recently. Keep up whatever you\'re doing!'
        };
      } else if (firstAvg - secondAvg > 0.5) {
        return {
          type: 'negative',
          message: 'Your mood has been declining recently. Consider using the Stress Relief exercises more frequently.'
        };
      }
    }

    return {
      type: 'neutral',
      message: 'Your mood has been relatively stable recently.'
    };
  };

  const chartData = prepareChartData();
  const insights = calculateInsights();

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const rating = payload[0].value;
      if (rating === null) return null;
      
      let emoji = '😐';
      if (rating === 1) emoji = '😢';
      else if (rating === 2) emoji = '😕';
      else if (rating === 4) emoji = '😊';
      else if (rating === 5) emoji = '😄';
      
      return (
        <div className="bg-white p-2 border rounded shadow-sm">
          <p className="text-xs">{label}</p>
          <p className="font-bold">{emoji} {rating}/5</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      <Card className="border-wellness-purple/20 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-wellness-purple">Daily Mood Check-in</CardTitle>
          <CardDescription>
            How are you feeling today?
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todaysMoodEntry ? (
            <div className="text-center py-4">
              <p className="text-lg">You've already recorded your mood for today:</p>
              <div className="mt-2 text-5xl">
                {todaysMoodEntry.rating === 1 && '😢'}
                {todaysMoodEntry.rating === 2 && '😕'}
                {todaysMoodEntry.rating === 3 && '😐'}
                {todaysMoodEntry.rating === 4 && '😊'}
                {todaysMoodEntry.rating === 5 && '😄'}
              </div>
              <p className="mt-4 text-muted-foreground italic">{todaysMoodEntry.note || 'No notes added'}</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center mx-auto max-w-md">
                <div 
                  className={`cursor-pointer text-4xl opacity-70 hover:opacity-100 transition-opacity ${selectedRating === 1 ? 'scale-125 opacity-100' : ''}`}
                  onClick={() => setSelectedRating(1)}
                >
                  😢
                </div>
                <div 
                  className={`cursor-pointer text-4xl opacity-70 hover:opacity-100 transition-opacity ${selectedRating === 2 ? 'scale-125 opacity-100' : ''}`}
                  onClick={() => setSelectedRating(2)}
                >
                  😕
                </div>
                <div 
                  className={`cursor-pointer text-4xl opacity-70 hover:opacity-100 transition-opacity ${selectedRating === 3 ? 'scale-125 opacity-100' : ''}`}
                  onClick={() => setSelectedRating(3)}
                >
                  😐
                </div>
                <div 
                  className={`cursor-pointer text-4xl opacity-70 hover:opacity-100 transition-opacity ${selectedRating === 4 ? 'scale-125 opacity-100' : ''}`}
                  onClick={() => setSelectedRating(4)}
                >
                  😊
                </div>
                <div 
                  className={`cursor-pointer text-4xl opacity-70 hover:opacity-100 transition-opacity ${selectedRating === 5 ? 'scale-125 opacity-100' : ''}`}
                  onClick={() => setSelectedRating(5)}
                >
                  😄
                </div>
              </div>
              <div>
                <Textarea
                  placeholder="Add a note about how you're feeling (optional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="border-wellness-purple/30 focus:border-wellness-purple"
                />
              </div>
              <Button 
                onClick={handleSubmit}
                className="w-full bg-wellness-purple hover:bg-wellness-deepPurple transition-colors"
                disabled={isSubmitting || selectedRating === null}
              >
                {isSubmitting ? 'Recording...' : 'Record Mood'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-wellness-purple/20 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-wellness-purple">Mood Trends</CardTitle>
          <CardDescription>
            Your mood history for the past 14 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="formattedDate" 
                    tick={{ fontSize: 12 }}
                    tickMargin={10}
                  />
                  <YAxis 
                    domain={[0, 5]} 
                    ticks={[1, 2, 3, 4, 5]} 
                    tick={{ fontSize: 12 }} 
                    tickMargin={10}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="rating" 
                    stroke="#8B5CF6" 
                    strokeWidth={2} 
                    connectNulls 
                    dot={{ r: 4, fill: "#8B5CF6" }} 
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-muted-foreground">Start recording your mood to see trends here</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {insights && (
        <Alert className={`
          ${insights.type === 'warning' ? 'bg-yellow-50 border-yellow-200' : ''}
          ${insights.type === 'positive' ? 'bg-green-50 border-green-200' : ''}
          ${insights.type === 'negative' ? 'bg-red-50 border-red-200' : ''}
          ${insights.type === 'insight' ? 'bg-blue-50 border-blue-200' : ''}
          ${insights.type === 'neutral' ? 'bg-gray-50 border-gray-200' : ''}
        `}>
          <div className="flex items-start">
            {insights.type === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />}
            {insights.type === 'positive' && <TrendingUp className="h-5 w-5 text-green-600 mr-2" />}
            {insights.type === 'negative' && <TrendingDown className="h-5 w-5 text-red-600 mr-2" />}
            {insights.type === 'insight' && <AlertCircle className="h-5 w-5 text-blue-600 mr-2" />}
            {insights.type === 'neutral' && <Minus className="h-5 w-5 text-gray-600 mr-2" />}
            <div>
              <AlertTitle className={`
                ${insights.type === 'warning' ? 'text-yellow-700' : ''}
                ${insights.type === 'positive' ? 'text-green-700' : ''}
                ${insights.type === 'negative' ? 'text-red-700' : ''}
                ${insights.type === 'insight' ? 'text-blue-700' : ''}
                ${insights.type === 'neutral' ? 'text-gray-700' : ''}
              `}>
                Mood Insight
              </AlertTitle>
              <AlertDescription className="text-sm">
                {insights.message}
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}
    </div>
  );
};

export default MoodTracker;
