'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { requestOtp, verifyOtp } from '@/lib/admin-api'

export default function AdminLogin() {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const codeInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus the code input when step changes to 'code'
  useEffect(() => {
    if (step === 'code') codeInputRef.current?.focus()
  }, [step])

  // Count down the resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await requestOtp(email)
      setStep('code')
      setResendCooldown(30)
    } catch (err) {
      setError((err as Error).message)
      // Cooldown timer is NOT started on error
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const token = await verifyOtp(email, code)
      localStorage.setItem('admin_token', token)
      router.replace('/admin/dashboard')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError('')
    setLoading(true)
    try {
      await requestOtp(email)
      setResendCooldown(30)
      setCode('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function handleChangeEmail() {
    setStep('email')
    setCode('')
    setError('')
    setResendCooldown(0)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white border border-gray-200 p-10 w-full max-w-sm">
        <h1 className="font-sans uppercase tracking-[0.0625em] text-sm mb-8 text-center">
          Admin Login
        </h1>

        {step === 'email' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 px-3 py-2 text-sm font-sans focus:outline-none focus:border-black"
            />
            {error && <p className="text-red-600 text-xs font-sans">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-2 text-sm font-sans uppercase tracking-[0.0625em] hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-xs font-sans text-gray-500 text-center">
              Code sent to {email}
            </p>
            <input
              ref={codeInputRef}
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              required
              className="w-full border border-gray-300 px-3 py-2 text-sm font-sans text-center tracking-widest focus:outline-none focus:border-black"
            />
            {error && <p className="text-red-600 text-xs font-sans">{error}</p>}
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full bg-black text-white py-2 text-sm font-sans uppercase tracking-[0.0625em] hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? 'Verifying…' : 'Verify'}
            </button>
            <div className="flex justify-between text-xs font-sans text-gray-500">
              <button
                type="button"
                onClick={handleChangeEmail}
                className="hover:underline"
              >
                Use a different email
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || loading}
                className="hover:underline disabled:opacity-40 disabled:cursor-default"
              >
                {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend code'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
