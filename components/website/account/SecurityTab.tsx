'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

export default function SecurityTab() {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to change password')

      toast.success('Password updated')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setError(err.message ?? 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='bg-white rounded-2xl border border-gray-100 p-6 max-w-md'>
      <h2 className='font-montserrat font-black text-xl text-[#0A1F44] mb-1'>
        Change Password
      </h2>
      <p className='text-sm text-gray-500 font-lato mb-5'>
        Use a password you don't use anywhere else.
      </p>

      <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <label className='block text-xs font-semibold text-gray-500 mb-1.5 font-lato'>
            Current password
          </label>
          <input
            type='password'
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
            className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8553A] transition-colors font-lato'
          />
        </div>
        <div>
          <label className='block text-xs font-semibold text-gray-500 mb-1.5 font-lato'>
            New password
          </label>
          <input
            type='password'
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8553A] transition-colors font-lato'
          />
        </div>
        <div>
          <label className='block text-xs font-semibold text-gray-500 mb-1.5 font-lato'>
            Confirm new password
          </label>
          <input
            type='password'
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8553A] transition-colors font-lato'
          />
        </div>

        {error && <p className='text-xs text-red-500 font-lato'>{error}</p>}

        <button
          type='submit'
          disabled={saving}
          className='bg-[#E8553A] hover:bg-[#D4441F] disabled:opacity-50 text-white font-montserrat font-bold px-6 py-2.5 rounded-full text-sm transition-colors'
        >
          {saving ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}
