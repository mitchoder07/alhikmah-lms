'use client'

import { useState, useMemo } from 'react'
import { AppShell, NavItem } from '@/components/lms/app-shell'
import { LayoutDashboard, BookOpen, Users, BarChart3, Award, Megaphone, Settings, UserCog, Newspaper, ShieldCheck } from 'lucide-react'
import { useSession } from '@/components/app-provider'
import { AdminDashboard } from './dashboard'
import { AdminCourses } from './courses'
import { AdminStudents } from './students'
import { AdminGradebook } from './gradebook'
import { AdminRevenue } from './revenue'
import { AdminCertificates } from './certificates'
import { AdminAnnouncements } from './announcements'
import { AdminBlog } from './blog'
import { AdminLecturers } from './lecturers'
import { AdminSettings } from './settings'

export function AdminApp() {
  const { user } = useSession()
  const [view, setView] = useState('dashboard')
  const [params, setParams] = useState<Record<string, any>>({})

  const navigate = (id: string, p: Record<string, any> = {}) => {
    setView(id)
    setParams(p)
  }

  // Build nav items based on role — admin sees Lecturers management, lecturer doesn't
  const navItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'courses', label: 'Courses', icon: BookOpen },
      { id: 'students', label: 'Students', icon: Users },
    ]
    // Only admins can manage lecturers
    if (user?.role === 'ADMIN') {
      items.push({ id: 'lecturers', label: 'Lecturers', icon: UserCog })
    }
    items.push(
      { id: 'gradebook', label: 'Gradebook', icon: BarChart3 },
      { id: 'certificates', label: 'Certificates', icon: Award },
      { id: 'revenue', label: 'Revenue', icon: Settings },
      { id: 'announcements', label: 'Announcements', icon: Megaphone },
      { id: 'blog', label: 'Blog', icon: Newspaper },
      { id: 'security', label: 'Security', icon: ShieldCheck },
    )
    return items
  }, [user?.role])

  const brandTitle = user?.role === 'ADMIN' ? 'Admin Portal' : 'Lecturer Portal'
  const brandSubtitle = user?.role === 'ADMIN' ? 'Dept. of Economics · Administrator' : 'Dept. of Economics · Lecturer'

  return (
    <AppShell
      brand={{ title: brandTitle, subtitle: brandSubtitle }}
      navItems={navItems}
      activeView={view}
      onNavigate={(id) => navigate(id)}
    >
      {view === 'dashboard' && <AdminDashboard onNavigate={navigate} />}
      {view === 'courses' && <AdminCourses onNavigate={navigate} />}
      {view === 'course-builder' && <AdminCourseBuilder {...params} onNavigate={navigate} />}
      {view === 'students' && <AdminStudents />}
      {view === 'lecturers' && user?.role === 'ADMIN' && <AdminLecturers />}
      {view === 'gradebook' && <AdminGradebook />}
      {view === 'certificates' && <AdminCertificates />}
      {view === 'revenue' && <AdminRevenue />}
      {view === 'announcements' && <AdminAnnouncements />}
      {view === 'blog' && <AdminBlog />}
      {view === 'security' && <AdminSettings />}
    </AppShell>
  )
}

// Forward-import the builder to avoid circular imports
import { AdminCourseBuilder } from './course-builder'
