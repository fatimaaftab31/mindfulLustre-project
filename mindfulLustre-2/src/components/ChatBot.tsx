
import React, { useState, useRef, useEffect } from 'react';
import { useUser, ChatMessage } from '@/context/UserContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Bot, User, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ChatBot = () => {
  const { user, addChatMessage, getChatHistory, getMoodEntries, getGratitudeEntries } = useUser();
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load chat history on component mount
  useEffect(() => {
    const loadChatHistory = async () => {
      if (user) {
        try {
          const chatHistory = await getChatHistory();
          setMessages(chatHistory);
        } catch (error) {
          console.error('Error loading chat history:', error);
        }
      }
    };
    
    loadChatHistory();
  }, [user, getChatHistory]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleClearChatHistory = async () => {
    try {
      // Clear messages from state
      setMessages([]);
      // Clear messages from database
      if (user) {
        await supabase
          .from('chat_messages')
          .delete()
          .eq('user_id', user.id);
        toast.success('Chat history cleared');
      }
    } catch (error) {
      console.error('Error clearing chat history:', error);
      toast.error('Failed to clear chat history');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;
    
    const userMessage = input.trim();
    setInput('');
    
    // Add user message to state immediately for UI responsiveness
    const newUserMessage: ChatMessage = {
      id: 'temp-' + Date.now(),
      user_id: user.id,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    
    // Save user message to database
    try {
      await addChatMessage('user', userMessage);
    } catch (error) {
      console.error('Error saving user message:', error);
      toast.error('Failed to save your message');
    }
    
    setIsThinking(true);
    
    try {
      // Get mood and gratitude data for context
      const [moodData, gratitudeData] = await Promise.all([
        getMoodEntries(),
        getGratitudeEntries()
      ]);
      
      // Call the Gemini-powered chatbot
      const response = await fetch('https://jjqbekiloqgkmbrgrdho.supabase.co/functions/v1/gemini-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          messages: [...messages, newUserMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          moodData: moodData,
          gratitudeData: gratitudeData
        })
      });
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const data = await response.json();
      
      // Add AI response to state
      const aiResponse = data.response;
      
      // Save AI response to database
      await addChatMessage('assistant', aiResponse);
      
      // Update state with AI response
      const newAiMessage: ChatMessage = {
        id: 'temp-' + Date.now() + 1,
        user_id: user.id,
        role: 'assistant',
        content: aiResponse,
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, newAiMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast.error('Failed to get response. Please try again.');
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: 'error-' + Date.now(),
        user_id: user.id,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again later.',
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      // Save error message to database
      try {
        await addChatMessage('assistant', errorMessage.content);
      } catch (err) {
        console.error('Error saving error message:', err);
      }
    } finally {
      setIsThinking(false);
    }
  };
  
  return (
    <Card className="border-wellness-purple/20 shadow-lg h-[75vh] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Avatar className="h-8 w-8 mr-2">
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback className="bg-wellness-purple text-white">
                <Bot size={16} />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl font-bold text-wellness-purple">Wellness Assistant</CardTitle>
              <CardDescription>
                I'm here to support your mental wellness journey
              </CardDescription>
            </div>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-wellness-purple"
              >
                <Trash2 size={20} />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-wellness-purple/20">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-wellness-purple">Clear Chat History</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to clear your entire chat history? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="text-gray-600">Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleClearChatHistory}
                  className="bg-wellness-purple hover:bg-wellness-deepPurple"
                >
                  Clear History
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      
      <CardContent className="flex-grow overflow-hidden p-0">
        <ScrollArea className="h-full p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <Bot size={40} className="text-wellness-purple mb-4 opacity-70" />
              <p className="text-muted-foreground">
                Hi there! I'm your wellness assistant. How are you feeling today?
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div 
                  key={message.id || index} 
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`
                      max-w-[80%] rounded-lg p-3 
                      ${message.role === 'user' 
                        ? 'bg-wellness-purple text-white ml-12' 
                        : 'bg-gray-100 mr-12'
                      }
                    `}
                  >
                    <div className="flex items-center mb-1">
                      {message.role === 'assistant' && (
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarFallback className="bg-wellness-purple text-white">
                            <Bot size={12} />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      {message.role === 'user' && (
                        <span className="text-xs opacity-70 mr-1">
                          {formatTime(message.created_at)}
                        </span>
                      )}
                      {message.role === 'user' && (
                        <Avatar className="h-6 w-6 ml-2">
                          <AvatarFallback className="bg-gray-300">
                            <User size={12} />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      {message.role === 'assistant' && (
                        <span className="text-xs text-gray-500 ml-1">
                          {formatTime(message.created_at)}
                        </span>
                      )}
                    </div>
                    <p className={message.role === 'user' ? 'text-white' : 'text-gray-800'}>
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}
              {isThinking && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg p-3 bg-gray-100 mr-12">
                    <div className="flex items-center mb-1">
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarFallback className="bg-wellness-purple text-white">
                          <Bot size={12} />
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-gray-500 ml-1">
                        {formatTime(new Date().toISOString())}
                      </span>
                    </div>
                    <p className="text-gray-800 flex">
                      <span className="animate-pulse">•</span>
                      <span className="animate-pulse ml-1">•</span>
                      <span className="animate-pulse ml-1">•</span>
                    </p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="pt-3">
        <form onSubmit={handleSendMessage} className="flex w-full gap-2">
          <Input
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-grow border-wellness-purple/30 focus:border-wellness-purple"
            disabled={isThinking}
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={!input.trim() || isThinking}
            className="bg-wellness-purple hover:bg-wellness-deepPurple"
          >
            <Send size={18} />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
};

export default ChatBot;
