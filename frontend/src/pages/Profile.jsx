import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import useAuthStore from '../store/authStore'
import api from '../utils/api'
import { Save, Download } from 'lucide-react'

export default function Profile() {
  const { user, updateUser, refreshUser } = useAuthStore()
  const [form, setForm] = useState({ name: '', company: '', job_role: '', skills: '', interests: '', bio: '', linkedin: '', twitter: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) setForm({ name: user.name || '', company: user.company || '', job_role: user.job_role || '', skills: user.skills || '', interests: user.interests || '', bio: user.bio || '', linkedin: user.linkedin || '', twitter: user.twitter || '' })
  }, [user?.id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.put('/users/profile', form)
      updateUser(data)
      toast.success('Profile updated!')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Your Profile</h1>

      {/* QR Code card */}
      <div className="card p-6 flex flex-col items-center gap-4">
        <h2 className="font-semibold text-lg self-start">Your Networking QR Code</h2>
        <div className="p-4 bg-white rounded-2xl shadow-md">
          <QRCodeSVG value={`connectquest://user/${user?.id}`} size={180} level="H"
            imageSettings={{ src: '', excavate: false }} />
        </div>
        <p className="text-sm text-gray-500 text-center">Others scan this to connect with you and validate bingo challenges</p>
        <div className="flex gap-2">
          <div className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 text-sm px-4 py-1.5">
            ⭐ {user?.points || 0} total points
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="card p-6">
        <h2 className="font-semibold text-lg mb-5">Edit Profile</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Full Name *</label>
              <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Company / Organization</label>
              <input className="input" placeholder="Acme Corp" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Role / Title</label>
              <input className="input" placeholder="Software Engineer" value={form.job_role} onChange={e => setForm(p => ({ ...p, job_role: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">LinkedIn</label>
              <input className="input" placeholder="linkedin.com/in/..." value={form.linkedin} onChange={e => setForm(p => ({ ...p, linkedin: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Skills (comma-separated)</label>
            <input className="input" placeholder="React, Python, Product Management" value={form.skills} onChange={e => setForm(p => ({ ...p, skills: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Interests (comma-separated)</label>
            <input className="input" placeholder="AI, Startups, Design" value={form.interests} onChange={e => setForm(p => ({ ...p, interests: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Bio</label>
            <textarea className="input resize-none" rows={3} placeholder="Tell others about yourself..." value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            <Save size={16} /> {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}
