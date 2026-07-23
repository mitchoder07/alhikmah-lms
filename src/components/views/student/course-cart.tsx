'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useApi, apiPost } from '@/lib/api'
import { ShoppingCart, Trash2, Loader2, CreditCard, ShieldCheck, ArrowLeft, Tag, CheckCircle2, Lock } from 'lucide-react'
import { toast } from 'sonner'

const CART_STORAGE_KEY = 'alhikmah-course-cart'

interface Course {
  id: string
  code: string
  title: string
  description: string
  level: string
  courseFee?: number
  accessDurationMonths?: number
  isPaid?: boolean
  lecturer: { name: string }
}

interface BulkDiscountResponse {
  total: number
  discount: number
  finalAmount: number
  discountRate: number
  breakdown: Array<{ courseId: string; code: string; title: string; fee: number }>
}

export function getCartIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveCartIds(ids: string[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(ids))
  // Dispatch event so other components can re-render
  window.dispatchEvent(new Event('alhikmah-cart-change'))
}

export function useCartIds() {
  const [ids, setIds] = useState<string[]>(() => getCartIds())

  useEffect(() => {
    const onChange = () => setIds(getCartIds())
    window.addEventListener('alhikmah-cart-change', onChange)
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener('alhikmah-cart-change', onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [])

  const toggle = useCallback((id: string) => {
    const current = getCartIds()
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    saveCartIds(next)
  }, [])

  const remove = useCallback((id: string) => {
    const current = getCartIds()
    saveCartIds(current.filter((x) => x !== id))
  }, [])

  const clear = useCallback(() => {
    saveCartIds([])
  }, [])

  return { ids, toggle, remove, clear }
}

export function StudentCourseCart({ onNavigate }: { onNavigate: (v: string, p?: any) => void }) {
  const { ids, remove, clear } = useCartIds()
  const { data: coursesData, loading } = useApi<{ courses: Course[] }>('/api/courses')
  const [discount, setDiscount] = useState<BulkDiscountResponse | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [paying, setPaying] = useState(false)
  const [success, setSuccess] = useState(false)

  const allCourses = coursesData?.courses ?? []
  const cartCourses = allCourses.filter((c) => ids.includes(c.id) && c.isPaid)
  // Cart IDs that have actually been resolved to paid courses. Tracked separately
  // from `ids` so the bulk-discount effect re-runs once the catalog finishes loading
  // (otherwise the effect short-circuits with an empty cartCourses and never re-fires
  // when the same `ids` value already triggered it).
  const cartKey = cartCourses.map((c) => c.id).join(',')

  // Calculate bulk discount whenever the resolved cart changes
  useEffect(() => {
    let cancelled = false
    if (cartCourses.length === 0) {
      setDiscount(null)
      return
    }
    setCalculating(true)
    apiPost('/api/courses/bulk-discount', { courseIds: cartCourses.map((c) => c.id) })
      .then((res: BulkDiscountResponse) => {
        if (!cancelled) setDiscount(res)
      })
      .catch((e: any) => {
        if (!cancelled) {
          toast.error(e.message || 'Failed to compute discount')
          setDiscount(null)
        }
      })
      .finally(() => {
        if (!cancelled) setCalculating(false)
      })
    return () => { cancelled = true }
  }, [cartKey])

  const payForAll = async () => {
    if (cartCourses.length === 0) return
    setPaying(true)
    try {
      // Initiate payment for each course sequentially (demo mode will auto-succeed)
      const references: Array<{ courseId: string; reference: string; demo: boolean; authorization_url?: string }> = []
      for (const course of cartCourses) {
        const res = await apiPost(`/api/courses/${course.id}/access`, { provider: 'paystack' })
        references.push({
          courseId: course.id,
          reference: res.reference,
          demo: !!res.demo,
          authorization_url: res.authorization_url,
        })
      }

      // Check if any require real payment gateway redirect
      const realRedirect = references.find((r) => !r.demo && r.authorization_url?.startsWith('http'))
      if (realRedirect) {
        // Real gateway — redirect to the first real checkout
        window.location.href = realRedirect.authorization_url!
        return
      }

      // Demo mode — verify each payment as success
      const failed: string[] = []
      for (const r of references) {
        try {
          await apiPost(`/api/courses/${r.courseId}/access/verify`, {
            reference: r.reference,
            status: 'success',
          })
        } catch {
          failed.push(r.courseId)
        }
      }

      if (failed.length > 0) {
        toast.error(`${failed.length} payment(s) failed to verify`)
      } else {
        toast.success(`Successfully paid for ${cartCourses.length} course(s)!`)
        clear()
        setSuccess(true)
      }
    } catch (e: any) {
      toast.error(e.message || 'Payment initiation failed')
    } finally {
      setPaying(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card className="border-green-500">
          <CardContent className="p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-9 w-9 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
            <p className="text-sm text-muted-foreground mb-6">
              You now have access to all the courses in your cart. Start learning right away.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button className="bg-primary hover:bg-primary/90" onClick={() => onNavigate('courses')}>
                Browse Courses
              </Button>
              <Button variant="outline" onClick={() => onNavigate('dashboard')}>
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" /> Course Cart
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Buy access to multiple paid courses at once and get a bulk discount.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onNavigate('courses')} className="text-xs">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Browse Courses
        </Button>
      </div>

      {/* Discount tier explainer */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Bulk Discount Tiers</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className={`rounded-md p-2 ${cartCourses.length >= 1 && cartCourses.length <= 2 ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'}`}>
              <p className="font-semibold">1–2 courses</p>
              <p>0% off</p>
            </div>
            <div className={`rounded-md p-2 ${cartCourses.length >= 3 && cartCourses.length <= 4 ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'}`}>
              <p className="font-semibold">3–4 courses</p>
              <p>10% off</p>
            </div>
            <div className={`rounded-md p-2 ${cartCourses.length >= 5 ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'}`}>
              <p className="font-semibold">5+ courses</p>
              <p>15% off</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : cartCourses.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="font-semibold text-lg mb-1">Your cart is empty</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Browse the course catalog and add paid courses to your cart to unlock bulk discounts.
            </p>
            <Button onClick={() => onNavigate('courses')} className="bg-primary hover:bg-primary/90">
              Browse Courses
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Cart items */}
          <div className="lg:col-span-2 space-y-3">
            {cartCourses.map((c) => (
              <Card key={c.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-md alhikmah-gradient flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                      {c.code}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">{c.level} Level</Badge>
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-[10px]">
                          <Lock className="h-2.5 w-2.5 mr-0.5" /> Paid
                        </Badge>
                      </div>
                      <p className="font-medium text-sm leading-tight">{c.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{c.lecturer.name}</p>
                      {c.accessDurationMonths && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {c.accessDurationMonths} {c.accessDurationMonths === 1 ? 'month' : 'months'} access
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="font-semibold text-amber-700 text-sm">
                        ₦{(c.courseFee ?? 0).toLocaleString()}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => remove(c.id)}
                        title="Remove from cart"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order summary */}
          <div className="lg:col-span-1">
            <Card className="lg:sticky lg:top-20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Order Summary</CardTitle>
                <CardDescription className="text-xs">
                  {cartCourses.length} course{cartCourses.length !== 1 ? 's' : ''} in cart
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₦{(discount?.total ?? cartCourses.reduce((s, c) => s + (c.courseFee ?? 0), 0)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount tier</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {calculating ? (
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      ) : discount ? (
                        `${Math.round(discount.discountRate * 100)}% off`
                      ) : '0% off'}
                    </Badge>
                  </div>
                  {discount && discount.discount > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3" /> You save
                      </span>
                      <span className="font-medium">−₦{discount.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span className="text-gold">
                      ₦{(discount?.finalAmount ?? cartCourses.reduce((s, c) => s + (c.courseFee ?? 0), 0)).toLocaleString()}
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full bg-primary hover:bg-primary/90"
                  onClick={payForAll}
                  disabled={paying || calculating || cartCourses.length === 0}
                >
                  {paying ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing payments…</>
                  ) : (
                    <><CreditCard className="h-4 w-4 mr-2" /> Pay for All (₦{(discount?.finalAmount ?? 0).toLocaleString()})</>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    if (confirm('Clear all courses from cart?')) clear()
                  }}
                >
                  Clear Cart
                </Button>

                <div className="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-muted-foreground">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Secured via Paystack · 256-bit SSL</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
