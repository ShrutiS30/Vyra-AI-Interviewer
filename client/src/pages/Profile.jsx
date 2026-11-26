import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db, isFirebaseConfigured } from '../firebase';
import Navbar from '../components/Navbar';
import {
  User, GraduationCap, Plus, X, Save, Check, ArrowLeft, Mail, Briefcase, Calendar, BookOpen
} from 'lucide-react';

export default function Profile() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    name: currentUser?.displayName || '',
    college: '',
    degree: '',
    graduationYear: '',
    experience: '',
    skills: []
  });
  const [skillInput, setSkillInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    async function fetchProfile() {
      try {
        if (!isFirebaseConfigured) {
          const key = `ai_interviewer_profile_${currentUser.email}`;
          const saved = JSON.parse(localStorage.getItem(key) || 'null');
          if (saved) {
            setProfile(prev => ({
              ...prev,
              ...saved,
              skills: Array.isArray(saved.skills) ? saved.skills : []
            }));
          }
          return;
        }
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        if (snap.exists()) {
          const data = snap.data();
          setProfile(prev => ({
            ...prev,
            name: data.displayName || data.name || prev.name,
            college: data.college || '',
            degree: data.degree || '',
            graduationYear: data.graduationYear || '',
            experience: data.experience || '',
            skills: Array.isArray(data.skills) ? data.skills : []
          }));
        }
      } catch (e) {
        console.error('Failed to load profile:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [currentUser]);

  async function handleSave(e) {
    if (e) e.preventDefault();
    if (!currentUser) return;
    setSaving(true);
    try {
      if (!isFirebaseConfigured) {
        const key = `ai_interviewer_profile_${currentUser.email}`;
        localStorage.setItem(
          key,
          JSON.stringify({ ...profile, email: currentUser.email, updatedAt: new Date().toISOString() })
        );
      } else {
        await setDoc(
          doc(db, 'users', currentUser.uid),
          {
            email: currentUser.email,
            displayName: profile.name,
            college: profile.college,
            degree: profile.degree,
            graduationYear: profile.graduationYear,
            experience: profile.experience,
            skills: profile.skills,
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );
      }
      setSavedMsg('Profile saved');
      setTimeout(() => setSavedMsg(''), 2500);
    } catch (err) {
      console.error('Save profile error:', err);
    } finally {
      setSaving(false);
    }
  }

  function handleAddSkill(e) {
    if (e) e.preventDefault();
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    const exists = profile.skills.some(s => s.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      setProfile(prev => ({ ...prev, skills: [...prev.skills, trimmed] }));
    }
    setSkillInput('');
  }

  function handleRemoveSkill(skillToRemove) {
    setProfile(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillToRemove)
    }));
  }

  return (
    <div className="min-h-screen transition-colors duration-300">
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
                Candidate Profile
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                Manage your academic details, experience, and skills extracted from your resume.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {savedMsg && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Check size={15} />
                {savedMsg}
              </span>
            )}
            <button
              type="button"
              disabled={saving || loading}
              onClick={handleSave}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Save size={15} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="card space-y-6">
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  value={profile.name}
                  onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                  className="input-field pl-11"
                  placeholder="Your full name"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                Account Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  type="email"
                  value={currentUser?.email || ''}
                  disabled
                  className="input-field pl-11 opacity-60 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                College / University
              </label>
              <div className="relative">
                <GraduationCap size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  value={profile.college}
                  onChange={e => setProfile(p => ({ ...p, college: e.target.value }))}
                  className="input-field pl-11"
                  placeholder="e.g. IIT Delhi, NIT Trichy"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                Degree & Branch
              </label>
              <div className="relative">
                <BookOpen size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  value={profile.degree}
                  onChange={e => setProfile(p => ({ ...p, degree: e.target.value }))}
                  className="input-field pl-11"
                  placeholder="e.g. B.Tech Computer Science"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                Graduation Year
              </label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  value={profile.graduationYear}
                  onChange={e => setProfile(p => ({ ...p, graduationYear: e.target.value }))}
                  className="input-field pl-11"
                  placeholder="e.g. 2026"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                Experience / Target Role
              </label>
              <div className="relative">
                <Briefcase size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  value={profile.experience}
                  onChange={e => setProfile(p => ({ ...p, experience: e.target.value }))}
                  className="input-field pl-11"
                  placeholder="e.g. SDE Intern / 1 yr SDE-1"
                />
              </div>
            </div>
          </div>

          {/* Skills Section */}
          <div className="pt-5 border-t border-zinc-200/80 dark:border-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Technical Skills ({profile.skills.length})
              </label>
              <span className="text-xs text-zinc-400">
                Auto-populated when you upload a resume; edit anytime.
              </span>
            </div>

            <form onSubmit={handleAddSkill} className="flex gap-2 mb-4">
              <input
                type="text"
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                className="input-field px-3.5 flex-1"
                placeholder="Add a skill (e.g. React, C++, System Design, Docker) and press Enter"
              />
              <button
                type="submit"
                className="btn-secondary py-2 px-4 text-xs flex items-center gap-1.5 whitespace-nowrap"
              >
                <Plus size={14} />
                Add Skill
              </button>
            </form>

            {profile.skills.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No skills added yet. Upload a resume on the Dashboard or add skills manually above.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.skills.map(skill => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[#f8f7f4] dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-zinc-400 hover:text-red-500 transition-colors"
                      aria-label={`Remove ${skill}`}
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

