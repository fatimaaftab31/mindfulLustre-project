
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const Login = () => {
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to Auth page
    navigate('/auth');
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-wellness-purple/10 to-wellness-blue/10">
      <div className="w-full max-w-md p-4">
        <Card className="border-wellness-purple/20 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-wellness-purple">MindfulLustre</CardTitle>
            <CardDescription className="text-muted-foreground">
              Your personal mental wellness companion
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p>Redirecting to authentication page...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
