import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Popconfirm } from 'antd'
import type { UserInfo } from '../types/auth'
import type { OrganizationDetail } from '../types/organization'
import type { PaymentStatusResponse } from '../types/index'
import { getOrganizationById, getMyOrganizations } from '../api/organizationApi'
import { getPaymentStatus, connectStripeAccount, disconnectStripeAccount } from '../api/paymentApi'
import { getMyMembership } from '../api/memberApi'

import { OrgMembersTab } from '../components/org/OrgMembersTab'
import { OrgInvitationsTab } from '../components/org/OrgInvitationsTab'
import { OrgPermissionsTab } from '../components/org/OrgPermissionsTab'
import { OrgEventsTab } from '../components/org/OrgEventsTab'
import { OrgAnalyticsSection } from '../components/org/OrgAnalyticsSection'

type Tab = 'events' | 'members' | 'invitations' | 'permissions' | 'payment' | 'analytics'

interface Props { user?: UserInfo | null }
interface NavItem { key: Tab; label: string; icon: React.ReactNode }
const NAV: NavItem[] = [
  { key: 'events', label: 'Events Management', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-2.25h.008v.008H16.5V15zm0 2.25h.008v.008H16.5v-.008z" /></svg> },
  { key: 'members', label: 'Members', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg> },
  { key: 'invitations', label: 'Invitations', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg> },
  { key: 'permissions', label: 'Permissions', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg> },
  { key: 'payment', label: 'Payment', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg> },
  { key: 'analytics', label: 'Analytics', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg> },
]

export function OrgWorkspacePage({ user }: Props) {
  const { orgId } = useParams<{ orgId: string }>()
  const navigate = useNavigate()

  // Org data
  const [org, setOrg] = useState<OrganizationDetail | null>(null)
  const [loadingOrg, setLoadingOrg] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Org switcher
  const [myOrgs, setMyOrgs] = useState<OrganizationDetail[]>([])
  const [showSwitcher, setShowSwitcher] = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)

  // Active tab
  const [tab, setTab] = useState<Tab>('events')

  // Members
  const [memberCount, setMemberCount] = useState(0)
  const [isDesigner, setIsDesigner] = useState(false)

  // Invitations
  const [invSuccess, setInvSuccess] = useState<string | null>(null)

  // Payment
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusResponse | null>(null)
  const [loadingPayment, setLoadingPayment] = useState(false)
  const [connectingStripe, setConnectingStripe] = useState(false)
  const [disconnectingStripe, setDisconnectingStripe] = useState(false)

  // Fetch org + switcher orgs
  useEffect(() => {
    if (!orgId) return
    setLoadingOrg(true)
    setTab('events')
    getOrganizationById(orgId)
      .then(setOrg)
      .catch(() => setError('Organization not found.'))
      .finally(() => setLoadingOrg(false))

    getMyOrganizations(1, 100).then(r => setMyOrgs(r.data)).catch(() => { })
  }, [orgId])

  useEffect(() => {
    if (!orgId || user?.currentRole !== 'Staff' || user?.orgId !== orgId) return
    getMyMembership(orgId).then(m => setIsDesigner(m.isDesigner)).catch(() => {})
  }, [orgId, user?.currentRole, user?.orgId])

  // Close switcher on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node))
        setShowSwitcher(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // End API fetchers

  const fetchPayment = useCallback(async (id: string) => {
    setLoadingPayment(true)
    try { setPaymentStatus(await getPaymentStatus(id)) } catch { }
    finally { setLoadingPayment(false) }
  }, [])

  const handleTab = (t: Tab) => {
    if (!orgId) return
    setTab(t)
    if (t === 'payment') fetchPayment(orgId)
  }

  // Stripe Handlers

  const handleConnectStripe = async () => {
    if (!orgId) return
    setConnectingStripe(true); setError(null)
    try {
      const result = await connectStripeAccount(orgId)
      if (result.onboardingUrl) window.location.href = result.onboardingUrl
    } catch (e: any) { setError(e?.response?.data?.Message || e?.response?.data?.message || 'Failed to connect Stripe.') }
    finally { setConnectingStripe(false) }
  }

  const handleDisconnectStripe = async () => {
    if (!orgId) return
    setDisconnectingStripe(true); setError(null)
    try { await disconnectStripeAccount(orgId); fetchPayment(orgId) }
    catch (e: any) { setError(e?.response?.data?.Message || e?.response?.data?.message || 'Failed to disconnect.') }
    finally { setDisconnectingStripe(false) }
  }

  const avatar = (name: string) => name?.[0]?.toUpperCase() ?? '?'

  // Role check
  const isOrgRole = user?.currentRole === 'Organization'
  const isStaffRole = user?.currentRole === 'Staff'
  const isCorrectOrg = user?.orgId === orgId
  const needsRoleSwitch = (!isOrgRole && !isStaffRole) || !isCorrectOrg
  const canEdit = !isStaffRole

  if (loadingOrg) return (
    <div className="flex h-[calc(100vh-57px)] items-center justify-center">
      <div className="spinner" />
    </div>
  )

  if (error && !org) return (
    <div className="flex h-[calc(100vh-57px)] items-center justify-center">
      <div className="glass p-8 text-center text-sm text-red-400">{error}</div>
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-57px)]">

      {/* ── Left Sidebar ── */}
      <aside className="flex w-64 flex-shrink-0 flex-col border-r border-slate-800/60 bg-slate-950/40">

        {/* Org header */}
        <div className="border-b border-slate-800/60 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-sm font-bold text-indigo-300">
              {org ? avatar(org.name) : '?'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-100">{org?.name}</p>
              {org?.isOwner && (
                <span className="text-[10px] font-medium text-amber-400/80">Owner</span>
              )}
            </div>
          </div>
          {org?.description && (
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500 line-clamp-2">{org.description}</p>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto space-y-0.5 p-2">
          {NAV.filter(item => !isStaffRole || item.key === 'events' || item.key === 'members').map(item => (
            <button
              key={item.key}
              onClick={() => handleTab(item.key)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${tab === item.key
                  ? 'bg-indigo-500/15 text-indigo-300'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
            >
              {item.icon}
              {item.label}
              {item.key === 'members' && memberCount > 0 && (
                <span className="ml-auto rounded-full bg-slate-700/50 px-1.5 py-0.5 text-[10px] text-slate-400">{memberCount}</span>
              )}
            </button>
          ))}
        </nav>

        {/* ── Org Switcher (bottom) ── */}
        <div ref={switcherRef} className="relative border-t border-slate-800/60 p-2">
          {showSwitcher && (
            <div className="absolute bottom-full left-2 right-2 mb-2 overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900 shadow-2xl">
              {/* Other orgs */}
              {myOrgs.length > 0 && (
                <div className="p-2">
                  <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Your Organizations</p>
                  <div className="space-y-0.5">
                    {myOrgs.map(o => (
                      <button
                        key={o.id}
                        onClick={() => { navigate(`/organizations/${o.id}`); setShowSwitcher(false) }}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${o.id === orgId
                            ? 'bg-indigo-500/10 text-indigo-300'
                            : 'text-slate-300 hover:bg-slate-800'
                          }`}
                      >
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-700/60 text-xs font-bold">
                          {avatar(o.name)}
                        </div>
                        <span className="flex-1 truncate">{o.name}</span>
                        {o.id === orgId && (
                          <svg className="h-3.5 w-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="border-t border-slate-800/60 p-2 space-y-0.5">
                <button
                  onClick={() => { navigate('/organizations'); setShowSwitcher(false) }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
                  All Organizations
                </button>
                <button
                  onClick={() => { navigate('/'); setShowSwitcher(false) }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
                  Customer View
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowSwitcher(v => !v)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-slate-800/60"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-sm font-bold text-indigo-300">
              {org ? avatar(org.name) : '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-200">{org?.name}</p>
              <p className="text-[10px] text-slate-500">Switch workspace</p>
            </div>
            <svg className={`h-4 w-4 text-slate-500 transition-transform ${showSwitcher ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" /></svg>
          </button>
        </div>
      </aside>

      {/* ── Right Content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-8 py-8 space-y-6">

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{error}</div>
          )}

          {/* ── Role Switch Banner ── */}
          {needsRoleSwitch && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
              <svg className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-300">Organization role required</p>
                <p className="text-xs text-amber-400/80 mt-0.5">
                  {!isOrgRole
                    ? 'You are currently in User mode. Switch to Organization role to manage members, invitations, permissions, and payments.'
                    : `Your active workspace is a different org. Switch to "${org?.name}" to manage it.`}
                </p>
                <button
                  onClick={() => navigate('/switch-role')}
                  className="mt-2.5 rounded-lg bg-amber-500/20 border border-amber-500/30 px-4 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 transition-colors"
                >
                  Switch to Organization Role →
                </button>
              </div>
            </div>
          )}


          {/* ── EVENTS ── */}
          {tab === 'events' && orgId && (
            <OrgEventsTab orgId={orgId} canEdit={canEdit} isDesigner={isDesigner} isOrg={isOrgRole} />
          )}

          {/* ── MEMBERS ── */}
          {tab === 'members' && orgId && (
            <OrgMembersTab
              orgId={orgId}
              isStaffRole={isStaffRole}
              onError={setError}
              onCountChange={setMemberCount}
            />
          )}

          {/* ── INVITATIONS ── */}
          {tab === 'invitations' && orgId && (
            <div className="fade-in space-y-4">
              {invSuccess && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {invSuccess}
                </div>
              )}
              <OrgInvitationsTab
                orgId={orgId}
                onError={setError}
                onSuccess={(msg) => { setInvSuccess(msg); setTimeout(() => setInvSuccess(null), 4000) }}
              />
            </div>
          )}

          {/* ── PERMISSIONS ── */}
          {tab === 'permissions' && orgId && (
            <OrgPermissionsTab
              orgId={orgId}
              onError={setError}
            />
          )}

          {/* ── PAYMENT ── */}
          {tab === 'payment' && (
            <div className="fade-in space-y-6">
              <div>
                <h1>Payment</h1>
                <p className="text-sm text-slate-400">Connect Stripe to accept payments for your events.</p>
              </div>

              {loadingPayment ? (
                <div className="glass p-6"><div className="skeleton h-16 w-full" /></div>
              ) : (
                <div className="space-y-4">
                  {/* Status card */}
                  <div className="glass p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${paymentStatus?.isPaymentReady ? 'bg-emerald-500/15' : 'bg-slate-700/40'}`}>
                        <svg className={`h-5 w-5 ${paymentStatus?.isPaymentReady ? 'text-emerald-400' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">Stripe Integration</h3>
                        <p className="text-xs text-slate-400">{paymentStatus?.isPaymentReady ? 'Connected and ready to accept payments' : 'Connect your Stripe account to enable payments'}</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase ${paymentStatus?.isPaymentReady ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                      {paymentStatus?.isPaymentReady ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {paymentStatus?.isPaymentReady ? (
                    <div className="space-y-3">
                      <div className="glass p-5 space-y-3">
                        {paymentStatus.stripeAccountId && (
                          <div className="flex justify-between text-sm"><span className="text-slate-400">Account ID</span><span className="font-mono text-xs text-slate-200">{paymentStatus.stripeAccountId}</span></div>
                        )}
                        {paymentStatus.paymentConfiguredAt && (
                          <div className="flex justify-between text-sm"><span className="text-slate-400">Connected On</span><span className="text-slate-200">{new Date(paymentStatus.paymentConfiguredAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
                        )}
                        <div className="flex justify-between text-sm"><span className="text-slate-400">Status</span><span className="text-emerald-400">● Ready</span></div>
                      </div>
                      <Popconfirm
                        title="Disconnect Stripe"
                        description="Disconnect Stripe? This will disable payment processing."
                        onConfirm={handleDisconnectStripe}
                        okText="Yes"
                        cancelText="No"
                      >
                        <button disabled={disconnectingStripe} className="w-full rounded-xl border border-red-500/30 py-2.5 text-sm font-medium text-red-400 transition-all hover:border-red-500/50 hover:bg-red-500/10 disabled:opacity-40">
                          {disconnectingStripe ? <span className="flex items-center justify-center gap-2"><span className="spinner h-4! w-4!" /> Disconnecting...</span> : 'Disconnect Stripe'}
                        </button>
                      </Popconfirm>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="glass border-dashed p-8 text-center space-y-3">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10">
                          <svg className="h-7 w-7 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
                        </div>
                        <p className="text-sm font-medium text-slate-300">No Stripe Account Connected</p>
                        <p className="text-xs text-slate-500">Connect Stripe to enable ticket sales and payment processing for your events.</p>
                      </div>
                      <button onClick={handleConnectStripe} disabled={connectingStripe} className="w-full rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-400 disabled:opacity-40">
                        {connectingStripe ? <span className="flex items-center justify-center gap-2"><span className="spinner h-4! w-4!" /> Connecting...</span> : '⚡ Connect Stripe Account'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'analytics' && orgId && (
            <div className="fade-in space-y-4">
              <div>
                <h1>Analytics</h1>
                <p className="text-sm text-slate-400">Revenue and ticket sales overview for your organization.</p>
              </div>
              <OrgAnalyticsSection orgId={orgId} />
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
