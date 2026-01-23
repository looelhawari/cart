# Phase 5.5 Stage 1: Deployment Checklist

**Status**: ✅ Ready for Review  
**Deployment**: Pre-Launch Hardening

---

## ✅ Pre-Deployment Checklist

### Code Review

- [ ] Review `frontend/services/httpClient.ts` (new file)
- [ ] Review changes to `paymentMethodsApi.ts`
- [ ] Review changes to `payment-webview.tsx`
- [ ] Review changes to `order-success.tsx`
- [ ] Verify no other files were modified

### Testing (Required Before Merge)

- [ ] Test auth token retrieval works
- [ ] Test 401 error clears auth and triggers logout
- [ ] Test payment methods API calls (list/set default/delete)
- [ ] Test new card payment flow
- [ ] Test saved card payment flow
- [ ] Verify console warnings appear in PaymentWebView
- [ ] Verify order-success shows disclaimer message
- [ ] Test WebView error handling (network error)

### Documentation Review

- [ ] Read `PHASE_5_5_STAGE_1_SUMMARY.md`
- [ ] Understand what was deferred to Stage 2
- [ ] Confirm scope compliance

### Risk Assessment

- [ ] No breaking changes to existing flows? ✅
- [ ] All changes reversible? ✅
- [ ] Auth logic uses existing base.ts? ✅
- [ ] No new dependencies added? ✅
- [ ] No backend changes required? ✅

---

## 🧪 Test Scenarios

### Scenario 1: New Card Payment (Happy Path)

**Steps**:

1. Add items to cart
2. Checkout → Select Card payment
3. Check "Save this card"
4. Complete 3DS in PaymentWebView
5. Observe console logs (should show warnings)
6. Land on order-success screen
7. **Verify**: Disclaimer message visible
8. Navigate to Orders page
9. **Verify**: Order shows pending → confirmed after webhook

**Expected**: User sees disclaimer, payment confirmed after webhook

---

### Scenario 2: Saved Card Payment

**Steps**:

1. Toggle "Use saved card"
2. Select a card
3. Complete 3DS
4. Check console logs
5. **Verify**: Warning about backend confirmation
6. **Verify**: Order-success disclaimer visible

**Expected**: Same disclaimer shown for saved cards

---

### Scenario 3: 401 Auth Error

**Steps**:

1. Manually expire auth token (or wait for expiry)
2. Try to load payment methods
3. **Verify**: Auth data cleared
4. **Verify**: Redirect to login or logout triggered

**Expected**: Clean logout flow, no infinite loops

---

### Scenario 4: Network Error

**Steps**:

1. Disable network during 3DS
2. WebView shows error
3. **Verify**: Retry/Cancel options appear
4. Select Retry → attempt reload
5. Select Cancel → return to previous screen

**Expected**: Graceful error handling

---

## 📋 Files Changed (Review These)

### New Files (1)

- ✅ `frontend/services/httpClient.ts` - Centralized HTTP client

### Modified Files (3)

- ✅ `frontend/services/paymentMethodsApi.ts` - Uses httpClient
- ✅ `frontend/app/payment-webview.tsx` - Success definition docs
- ✅ `frontend/app/order-success.tsx` - Disclaimer message

### NOT Modified (Verify)

- ❌ No changes to backend
- ❌ No changes to navigation structure
- ❌ No changes to checkout flow logic
- ❌ No new dependencies in package.json

---

## 🚀 Deployment Steps

### 1. Code Merge

```bash
git add frontend/services/httpClient.ts
git add frontend/services/paymentMethodsApi.ts
git add frontend/app/payment-webview.tsx
git add frontend/app/order-success.tsx
git add PHASE_5_5_STAGE_1_SUMMARY.md
git add PHASE_5_5_DEPLOYMENT_CHECKLIST.md

git commit -m "Phase 5.5 Stage 1: Production hardening foundations

- Add centralized HTTP client with auth handling
- Migrate payment methods API to httpClient
- Enforce success definition with docs + warnings
- Update user messaging with payment confirmation disclaimer

Scope: Pre-launch hardening only (no polling/lifecycle)
Deferred to Stage 2: Order status polling, app resume handling"

git push origin <your-branch>
```

### 2. Pull Request Review

- [ ] Create PR with title: "Phase 5.5 Stage 1: Production Hardening (Pre-Launch)"
- [ ] Link to `PHASE_5_5_PROPOSAL.md` (approved)
- [ ] Link to `PHASE_5_5_STAGE_1_SUMMARY.md` (implementation details)
- [ ] Request review from stakeholder
- [ ] Include test results

### 3. Staging Deployment

- [ ] Deploy to staging environment
- [ ] Run test scenarios (above)
- [ ] Verify no regressions in existing flows
- [ ] Test with real Paymob sandbox

### 4. Production Deployment

- [ ] Merge to main/production branch
- [ ] Deploy to production
- [ ] Monitor error logs for 24 hours
- [ ] Track user feedback
- [ ] Monitor webhook processing times

---

## 📊 Success Criteria

### Immediate (Post-Deploy)

- [ ] No crashes or errors in Sentry/logs
- [ ] Auth flow works correctly
- [ ] Payment methods API functional
- [ ] Users see disclaimer message
- [ ] No user confusion reported

### Week 1 (Post-Launch Monitoring)

- [ ] <5% user confusion about payment status
- [ ] Webhook processing time <5 seconds (90th percentile)
- [ ] No false "success" reports
- [ ] Customer support tickets <10 about payment confirmation

### Decision Point for Stage 2

- If metrics above → Stage 2 can be deferred further
- If metrics fail → Implement Stage 2 immediately

---

## 🔄 Rollback Plan

If issues found post-deployment:

### Quick Rollback (Option A)

```bash
git revert <commit-hash>
git push origin main
```

### Targeted Fix (Option B)

- Identify specific issue (auth? messaging? API?)
- Create hotfix branch
- Fix and redeploy

### What Can Go Wrong?

1. **Auth token not retrieved properly**
   - Symptom: All API calls fail with 401
   - Fix: Check base.ts getAuthToken() implementation
   - Rollback: Not needed, fix getAuthToken()

2. **Payment methods API returns errors**
   - Symptom: Can't load saved cards
   - Fix: Check httpClient URL construction
   - Rollback: Revert paymentMethodsApi.ts only

3. **User confusion from disclaimer**
   - Symptom: Support tickets about "payment pending"
   - Fix: Refine messaging
   - Rollback: Not needed, clarify text

**No High-Risk Scenarios Identified**

---

## ✅ Final Approval

### Before Merging, Confirm:

- [ ] All tests passed
- [ ] Code reviewed by stakeholder
- [ ] Scope verified (no feature creep)
- [ ] Documentation complete
- [ ] Rollback plan understood

### Sign-Off

- [ ] Technical Lead: ******\_******
- [ ] Product Owner: ******\_******
- [ ] QA: ******\_******

---

**Checklist Version**: 1.0  
**Stage**: 1 of 2 (Stage 2 deferred post-launch)  
**Risk Level**: ✅ LOW  
**Ready for Production**: YES (pending approvals)
