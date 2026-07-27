'use client'

import { useState } from 'react'
import { AppShell, NavItem } from '@/components/lms/app-shell'
import { LayoutDashboard, BookOpen, Award, Brain, Bell, User, ShoppingCart } from 'lucide-react'
import { StudentDashboard } from './dashboard'
import { StudentCourses } from './courses'
import { StudentCertificates } from './certificates'
import { StudentTutor } from './tutor'
import { StudentCoursePlayer } from './course-player'
import { StudentCheckout } from './checkout'
import { StudentProfile } from './profile'
import { StudentNotifications } from './notifications'
import { StudentFinalExam } from './final-exam'
import { StudentCourseCart } from './course-cart'

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'courses', label: 'My Courses', icon: BookOpen },
  { id: 'cart', label: 'Course Cart', icon: ShoppingCart },
  { id: 'certificates', label: 'Certificates', icon: Award },
  { id: 'tutor', label: 'AI Study Buddy', icon: Brain },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'profile', label: 'My Profile', icon: User },
]

export function StudentApp() {
  const [view, setView] = useState('dashboard')
  const [params, setParams] = useState<Record<string, any>>({})

  const navigate = (id: string, p: Record<string, any> = {}) => {
    setView(id)
    setParams(p)
  }

  return (
    <AppShell
      brand={{ title: 'Student Portal', subtitle: 'Dept. of Economics · Al-Bashir Academy' }}
      navItems={navItems}
      activeView={view}
      onNavigate={(id) => navigate(id)}
    >
      {view === 'dashboard' && <StudentDashboard onNavigate={navigate} />}
      {view === 'courses' && <StudentCourses onNavigate={navigate} />}
      {view === 'cart' && <StudentCourseCart onNavigate={navigate} />}
      {view === 'course-player' && <StudentCoursePlayer {...params} onNavigate={navigate} />}
      {view === 'final-exam' && <StudentFinalExam {...params} onNavigate={navigate} />}
      {view === 'certificates' && <StudentCertificates onNavigate={navigate} />}
      {view === 'tutor' && <StudentTutor />}
      {view === 'notifications' && <StudentNotifications />}
      {view === 'profile' && <StudentProfile />}
      {view === 'checkout' && <StudentCheckout {...params} onNavigate={navigate} />}
    </AppShell>
  )
}
