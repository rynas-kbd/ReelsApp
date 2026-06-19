'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { STRINGS } from '@reelvault/shared';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isLogin = mode === 'login';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toast.error(STRINGS.auth.loginError);
          return;
        }
        router.push('/library');
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          toast.error(error.message || STRINGS.common.error);
          return;
        }
        toast.success(STRINGS.auth.signupSuccess);
        router.push('/login');
      }
    } catch {
      toast.error(STRINGS.common.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="shadow-glow">
        <CardContent className="p-6">
          <h1 className="mb-6 text-xl font-semibold text-text">
            {isLogin ? STRINGS.auth.loginTitle : STRINGS.auth.signupTitle}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{STRINGS.auth.email}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="toi@exemple.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{STRINGS.auth.password}</Label>
              <Input
                id="password"
                type="password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              {isLogin ? STRINGS.auth.login : STRINGS.auth.signup}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-text-secondary">
            {isLogin ? STRINGS.auth.noAccount : STRINGS.auth.hasAccount}{' '}
            <Link
              href={isLogin ? '/signup' : '/login'}
              className="font-medium text-accent hover:underline"
            >
              {isLogin ? STRINGS.auth.signup : STRINGS.auth.login}
            </Link>
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
