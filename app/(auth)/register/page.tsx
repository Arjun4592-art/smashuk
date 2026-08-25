'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { SITE_NAME, SITE_LOGO } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import { registerCustomer } from '@/lib/api/auth';
function GoogleIcon() {
  return <svg width='18' height='18' viewBox='0 0 48 48'>
      <path fill='#FFC107' d='M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z' />
      <path fill='#FF3D00' d='M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z' />
      <path fill='#4CAF50' d='M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z' />
      <path fill='#1976D2' d='M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z' />
    </svg>;
}
export default function RegisterPage() {
  const router = useRouter();
  const {
    data: session
  } = useSession();
  const login = useAuthStore(s => s.login);
  const syncFromServer = useAuthStore(s => s.syncFromServer);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: ''
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  useEffect(() => {
    if (session?.user) {
      syncFromServer({
        id: (session.user as any).id ?? session.user.email ?? '',
        name: session.user.name ?? session.user.email ?? '',
        email: session.user.email ?? '',
        role: 'customer',
        createdAt: new Date().toISOString()
      });
      router.push('/profile');
    }
  }, [session, router, syncFromServer]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const user = await registerCustomer(form.name, form.email, form.password);
      login(user);
      router.push('/profile');
    } catch (err: any) {
      setError(err?.message ?? 'Registration failed. Please try again.');
      setLoading(false);
    }
  };
  const handleGoogle = async () => {
    setGoogleLoading(true);
    await signIn('google', {
      callbackUrl: '/profile'
    });
  };
  const fields = [{
    name: 'name',
    label: 'Full Name',
    type: 'text',
    placeholder: 'Arjun Sharma'
  }, {
    name: 'email',
    label: 'Email Address',
    type: 'email',
    placeholder: 'you@example.com'
  }, {
    name: 'password',
    label: 'Password',
    type: 'password',
    placeholder: '••••••••'
  }, {
    name: 'confirm',
    label: 'Confirm Password',
    type: 'password',
    placeholder: '••••••••'
  }];
  return <div className='min-h-screen bg-[#F2F4F7] flex items-center justify-center px-4 py-16'>
      <div className='w-full max-w-md'>
        {}
        <div className='text-center mb-8'>
          <Link href='/' className='inline-flex items-center gap-2 mb-4'>
            {}
            <img src={SITE_LOGO} alt={SITE_NAME} className='h-10 w-auto' />
          </Link>
          <h1 className='font-montserrat font-black text-2xl text-[#0A1F44]'>
            Create an account
          </h1>
          <p className='text-gray-500 font-lato text-sm mt-1'>
            Get 10% off your first order 🎉
          </p>
        </div>

        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-8'>
          {}
          <button onClick={handleGoogle} disabled={googleLoading} className='w-full flex items-center justify-center gap-3 py-3 border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all font-montserrat font-bold text-[#0A1F44] text-sm mb-6 disabled:opacity-60 disabled:cursor-not-allowed'>
            <GoogleIcon />
            {googleLoading ? 'Redirecting...' : 'Continue with Google'}
          </button>

          {}
          <div className='flex items-center gap-3 mb-6'>
            <div className='flex-1 h-px bg-gray-200' />
            <span className='text-xs text-gray-400 font-lato'>
              or create with email
            </span>
            <div className='flex-1 h-px bg-gray-200' />
          </div>

          {}
          <form onSubmit={handleSubmit} className='space-y-4'>
            {fields.map(field => {
            const isPasswordField = field.type === 'password';
            const isConfirm = field.name === 'confirm';
            const visible = isConfirm ? showConfirm : showPassword;
            const toggle = isConfirm ? () => setShowConfirm(v => !v) : () => setShowPassword(v => !v);
            return <div key={field.name}>
                  <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 font-montserrat'>
                    {field.label}
                  </label>
                  <div className={isPasswordField ? 'relative' : undefined}>
                    <input type={isPasswordField ? visible ? 'text' : 'password' : field.type} value={(form as any)[field.name]} onChange={e => setForm(f => ({
                  ...f,
                  [field.name]: e.target.value
                }))} placeholder={field.placeholder} className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8553A] transition-colors font-lato ${isPasswordField ? 'pr-11' : ''}`} required autoComplete={isConfirm ? 'new-password' : isPasswordField ? 'new-password' : undefined} />
                    {isPasswordField && <button type='button' onClick={toggle} className='absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors' aria-label={visible ? 'Hide password' : 'Show password'} tabIndex={-1}>
                        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>}
                  </div>
                </div>;
          })}

            {error && <p className='text-xs text-red-500 font-lato'>{error}</p>}

            <button type='submit' disabled={loading} className={`w-full py-3.5 rounded-xl font-montserrat font-black text-white transition-all mt-2 ${loading ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#E8553A] hover:bg-[#D4441F] shadow-lg hover:-translate-y-0.5'}`}>
              {loading ? 'Creating Account...' : 'Create Free Account'}
            </button>
          </form>

          <div className='mt-6 text-center'>
            <p className='text-sm text-gray-500 font-lato'>
              Already have an account?{' '}
              <Link href='/login' className='text-[#E8553A] font-semibold hover:underline'>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>;
}
