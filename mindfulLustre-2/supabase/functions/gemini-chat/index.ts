
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Get API key from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if API key is available
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY not set in environment variables");
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not set in environment variables. Please set this in your Supabase environment." }),
        { 
          status: 500, 
          headers: { 
            ...corsHeaders,
            "Content-Type": "application/json" 
          } 
        }
      );
    }

    const { messages, moodData } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Invalid input. 'messages' must be an array." }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders,
            "Content-Type": "application/json" 
          } 
        }
      );
    }

    // Construct a prompt for Gemini that includes context
    let systemPrompt = `You are MindfulLustre's wellness assistant, an AI designed to provide mental health support, 
    emotional guidance, and wellness advice. Respond with compassion, empathy, and evidence-based recommendations.

    Keep responses concise, supportive, and focused on wellbeing. 
    Never diagnose medical or mental health conditions, but gently suggest professional help when appropriate.

    If the user expresses severe distress, suicidal thoughts, or an emergency situation, always prioritize their safety 
    by encouraging them to contact emergency services, a crisis helpline, or a mental health professional immediately.`;

    // Add mood data context if available
    if (moodData && Array.isArray(moodData) && moodData.length > 0) {
      systemPrompt += `\n\nThe user has shared their mood data with you. Here's what you know:`;
      
      // Get recent mood trend
      const sortedMoodData = [...moodData].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const latestMood = sortedMoodData[0];
      systemPrompt += `\n- The user's most recent mood rating was ${latestMood.rating}/5 on ${new Date(latestMood.created_at).toLocaleDateString()}.`;
      
      if (latestMood.note) {
        systemPrompt += ` They noted: "${latestMood.note}"`;
      }

      // Calculate average mood
      const avgMood = moodData.reduce((sum, entry) => sum + entry.rating, 0) / moodData.length;
      systemPrompt += `\n- Their average mood rating is ${avgMood.toFixed(1)}/5.`;

      // Check for low mood streak
      const recentEntries = sortedMoodData.slice(0, 3);
      const hasLowMoodStreak = recentEntries.length >= 3 && 
        recentEntries.every(entry => entry.rating <= 2);
      
      if (hasLowMoodStreak) {
        systemPrompt += `\n- IMPORTANT: The user has had several consecutive low mood days (ratings of 2 or below). Consider suggesting professional support if appropriate.`;
      }
    }

    // Format conversation history for Gemini
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Prepend system message
    formattedMessages.unshift({
      role: 'user',
      parts: [{ text: systemPrompt }]
    });

    console.log("Calling Gemini API with API key:", GEMINI_API_KEY.substring(0, 5) + "...");

    // Call Gemini API
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`;
    console.log("Using API URL:", apiUrl.replace(GEMINI_API_KEY, "[REDACTED]"));
    
    const response = await fetch(
      apiUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: formattedMessages,
          generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            topK: 64,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        }),
      }
    );

    const responseData = await response.json();
    console.log("Gemini API response status:", response.status);

    if (!response.ok) {
      console.error("Gemini API error:", JSON.stringify(responseData));
      throw new Error(responseData.error?.message || "Unknown error from Gemini API");
    }

    if (!responseData.candidates || responseData.candidates.length === 0) {
      console.error("No candidates in response:", JSON.stringify(responseData));
      throw new Error("No response generated from Gemini API");
    }

    // Extract response text
    const aiResponse = responseData.candidates[0].content.parts[0].text;

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  } catch (error) {
    console.error("Error in gemini-chat function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred" }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  }
});
