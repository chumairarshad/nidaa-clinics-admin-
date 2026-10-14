import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const cleanEmail = (email || '').trim().toLowerCase();

    const isMasterAdmin =
      cleanEmail === 'blog@nidclinic.com' && password === 'System-8706411@';

    const cookieStore = cookies();
    const response = NextResponse.json({ success: true, message: 'Authentication successful' });

    if (isMasterAdmin) {
      // 1. Set master admin cookie
      response.cookies.set('nidaa_admin_token', `admin_${Date.now()}`, {
        path: '/',
        httpOnly: false, // Accessible to client and middleware
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      // 2. Try Supabase sign-in or auto-signup if configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder')) {
        try {
          const supabase = createServerClient(supabaseUrl, supabaseKey, {
            cookies: {
              get(name: string) {
                return cookieStore.get(name)?.value;
              },
              set(name: string, value: string, options: any) {
                response.cookies.set(name, value, options);
              },
              remove(name: string, options: any) {
                response.cookies.set(name, '', options);
              },
            },
          });

          // Attempt sign in
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

          // If user doesn't exist in Supabase, attempt sign-up
          if (signInErr && signInErr.message.toLowerCase().includes('invalid')) {
            await supabase.auth.signUp({
              email: cleanEmail,
              password,
            });
          }
        } catch {
          // Non-blocking: master auth still succeeds
        }
      }

      return response;
    }

    // If not master admin, attempt standard Supabase login
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder')) {
      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            response.cookies.set(name, value, options);
          },
          remove(name: string, options: any) {
            response.cookies.set(name, '', options);
          },
        },
      });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (!error && data.user) {
        response.cookies.set('nidaa_admin_token', `admin_${Date.now()}`, {
          path: '/',
          httpOnly: false,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30,
        });
        return response;
      }
    }

    return NextResponse.json(
      { success: false, error: 'Invalid email or password. Please use authorized clinic credentials.' },
      { status: 401 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Server authentication error' },
      { status: 500 }
    );
  }
}
