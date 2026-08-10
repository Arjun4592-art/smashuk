'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { updateProfile, changePassword } from '@/lib/api/store'

export default function EditProfileTab() {
  const { user, updateUser } = useAuthStore()
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [savingProfile, setSavingProfile] = useState(false)

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  if (!user) return null

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const [first_name, ...rest] = name.trim().split(' ')
      await updateProfile({ first_name, last_name: rest.join(' '), phone })
      updateUser({ name, phone })
      toast.success('Profile updated successfully')
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }
    setSavingPassword(true)
    try {
      await changePassword(oldPassword, newPassword)
      toast.success('Password changed successfully')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to change password')
    } finally {
      setSavingPassword(false)
    }
  }

  const inputClass =
    'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8553A] transition-colors font-lato'

  return (
    <div className='space-y-6'>
      {/* Basic info */}
      <form
        onSubmit={handleSaveProfile}
        className='bg-white rounded-2xl border border-gray-100 p-6'
      >
        <h2 className='font-montserrat font-black text-xl text-[#0A1F44] mb-5'>
          Edit Profile
        </h2>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5'>
          <div>
            <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 font-montserrat'>
              Full Name
            </label>
            <input
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 font-montserrat'>
              Phone Number
            </label>
            <input
              type='tel'
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder='+44 7700 900000'
              className={inputClass}
            />
          </div>
          <div className='sm:col-span-2'>
            <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 font-montserrat'>
              Email Address
            </label>
            <input
              type='email'
              value={user.email}
              disabled
              className={`${inputClass} bg-gray-50 text-gray-400 cursor-not-allowed`}
            />
            <p className='text-xs text-gray-400 font-lato mt-1'>
              Contact support to change your email address.
            </p>
          </div>
        </div>
        <button
          type='submit'
          disabled={savingProfile}
          className='bg-[#E8553A] hover:bg-[#D4441F] disabled:bg-gray-300 text-white font-montserrat font-bold px-6 py-2.5 rounded-full text-sm transition-colors'
        >
          {savingProfile ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {/* Password change */}
      <form
        onSubmit={handleChangePassword}
        className='bg-white rounded-2xl border border-gray-100 p-6'
      >
        <h2 className='font-montserrat font-black text-xl text-[#0A1F44] mb-5'>
          Change Password
        </h2>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5'>
          <div className='sm:col-span-2'>
            <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 font-montserrat'>
              Current Password
            </label>
            <div className='relative'>
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className={`${inputClass} pr-11`}
                required
                autoComplete='current-password'
              />
              <button
                type='button'
                onClick={() => setShowOld((v) => !v)}
                className='absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
                tabIndex={-1}
              >
                {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 font-montserrat'>
              New Password
            </label>
            <div className='relative'>
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`${inputClass} pr-11`}
                required
                minLength={8}
                autoComplete='new-password'
              />
              <button
                type='button'
                onClick={() => setShowNew((v) => !v)}
                className='absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
                tabIndex={-1}
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 font-montserrat'>
              Confirm New Password
            </label>
            <input
              type={showNew ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
              required
              minLength={8}
              autoComplete='new-password'
            />
          </div>
        </div>
        <button
          type='submit'
          disabled={savingPassword}
          className='bg-[#0A1F44] hover:bg-[#0A1F44]/90 disabled:bg-gray-300 text-white font-montserrat font-bold px-6 py-2.5 rounded-full text-sm transition-colors'
        >
          {savingPassword ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}
