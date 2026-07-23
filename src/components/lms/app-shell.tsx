'use client'

import { useState, useEffect, ReactNode } from 'react'
import { useSession } from '@/components/app-provider'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { LogOut, Menu, Bell, User, Settings, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useApi } from '@/lib/api'

export interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface Announcement {
  id: string
  title: string
  body: string
  createdAt: string
  course?: { code: string; title: string } | null
  author: { name: string }
}

export function AppShell({
  brand,
  navItems,
  activeView,
  onNavigate,
  children,
}: {
  brand: { title: string; subtitle: string }
  navItems: NavItem[]
  activeView: string
  onNavigate: (id: string) => void
  children: ReactNode
}) {
  const { user, logout } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const { data: annData } = useApi<{ announcements: Announcement[] }>('/api/announcements')
  const announcements = (annData?.announcements ?? []).slice(0, 5)

  // Track seen notification IDs in localStorage
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    try {
      const raw = localStorage.getItem('seen-notifications')
      if (raw) {
        Promise.resolve().then(() => setSeenIds(new Set(JSON.parse(raw))))
      }
    } catch {}
  }, [])

  // Mark all current notifications as seen when dropdown is opened
  useEffect(() => {
    if (!notifOpen || announcements.length === 0) return
    // Use setTimeout to defer setState outside of the effect body
    const timer = setTimeout(() => {
      const newSeen = new Set(seenIds)
      announcements.forEach(a => newSeen.add(a.id))
      setSeenIds(newSeen)
      try { localStorage.setItem('seen-notifications', JSON.stringify([...newSeen])) } catch {}
    }, 0)
    return () => clearTimeout(timer)
  }, [notifOpen])

  // Dot shows only if there are unseen notifications
  const hasUnseen = announcements.some(a => !seenIds.has(a.id))

  const initials = user?.name?.split(' ').map(n => n[0]).slice(0, 2).join('') || '?'
  const roleLabel = user?.role === 'ADMIN' ? 'Administrator' : user?.role === 'LECTURER' ? 'Lecturer' : 'Student'

  const Sidebar = (
    <div className="flex h-full flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full alhikmah-gradient flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">HUI</div>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-none text-primary truncate">{brand.title}</p>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">{brand.subtitle}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto alhikmah-scroll">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => { onNavigate(item.id); setMobileOpen(false) }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
              activeView === item.id
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground/80 hover:bg-secondary hover:text-foreground'
            }`}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-3 border-t">
        <div className="flex items-center gap-3 p-2">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} title="Sign out" className="h-8 w-8">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r bg-sidebar">
        {Sidebar}
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          {Sidebar}
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 bg-background/95 backdrop-blur">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold text-sm lg:text-base capitalize">
              {navItems.find((n) => n.id === activeView)?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-1">
            {/* Notifications dropdown */}
            <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9 hover:bg-secondary rounded-full transition-colors">
                  <Bell className="h-4 w-4" />
                  {hasUnseen && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-gold rounded-full ring-2 ring-background" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="p-3 border-b flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Notifications</p>
                    <p className="text-[11px] text-muted-foreground">Latest announcements</p>
                  </div>
                  {announcements.length > 0 && (
                    <button
                      onClick={() => { setNotifOpen(false); onNavigate(user?.role === 'STUDENT' ? 'notifications' : 'announcements') }}
                      className="text-[10px] text-primary hover:underline font-medium"
                    >
                      View all
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto alhikmah-scroll">
                  {announcements.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No new notifications
                    </div>
                  ) : (
                    announcements.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => { setNotifOpen(false); onNavigate(user?.role === 'STUDENT' ? 'notifications' : 'announcements') }}
                        className="w-full text-left p-3 border-b last:border-0 hover:bg-secondary/40 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <div className="h-6 w-6 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Bell className="h-3 w-3 text-gold" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium leading-tight">{a.title}</p>
                            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{a.body}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              {a.course && <span className="text-[10px] font-medium text-primary">{a.course.code}</span>}
                              <span className="text-[10px] text-muted-foreground">{timeAgo(a.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 p-1 pr-2 rounded-full hover:bg-secondary transition-colors outline-none">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">{initials}</AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{user?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                    <User className="h-2.5 w-2.5" />
                    {roleLabel}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user?.matricNumber && (
                  <div className="px-3 py-2 text-xs">
                    <p className="text-muted-foreground">Matric Number</p>
                    <p className="font-mono font-medium">{user.matricNumber}</p>
                  </div>
                )}
                {user?.department && (
                  <div className="px-3 py-2 text-xs">
                    <p className="text-muted-foreground">Department</p>
                    <p className="font-medium">{user.department}</p>
                  </div>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

function timeAgo(date: string): string {
  const now = Date.now()
  const diff = now - new Date(date).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const days = Math.floor(hr / 24)
  if (days < 7) return `${days}d ago`
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
