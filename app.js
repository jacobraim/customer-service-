(() => {
  // Shopify retention-offer destination. Replace this URL when the dedicated offer page is ready.
  // If this is ever left blank, the offer panel stays hidden and cancellation remains request-only.
  const RETENTION_OFFER_URL = 'https://shop.washingtonian.com/';

  const views = new Map([...document.querySelectorAll('[data-view]')].map(el => [el.dataset.view, el]));
  const main = document.getElementById('main');
  const historyStack = [];
  let currentView = 'home';

  const statusRequest = document.getElementById('subscription-status-request');
  const retentionOffer = document.getElementById('retention-offer');
  const retentionOfferLink = document.getElementById('retention-offer-link');
  const cancelRequestNote = document.getElementById('cancel-request-note');
  const cancellationReasonFields = document.getElementById('cancellation-reason-fields');
  const cancellationReason = document.getElementById('cancellation-reason');
  const cancellationOtherWrap = document.getElementById('cancellation-other-wrap');
  const cancellationReasonOther = document.getElementById('cancellation-reason-other');

  function updateCancellationReasonUI() {
    const isOther = cancellationReason && cancellationReason.value === 'Other';
    if (cancellationOtherWrap) cancellationOtherWrap.hidden = !isOther;
    if (cancellationReasonOther) {
      cancellationReasonOther.required = Boolean(isOther);
      if (!isOther) cancellationReasonOther.value = '';
    }
  }

  function updateStatusRequestUI() {
    if (!statusRequest) return;
    const isCancel = statusRequest.value === 'Cancel my subscription';
    if (cancelRequestNote) cancelRequestNote.hidden = !isCancel;
    if (cancellationReasonFields) cancellationReasonFields.hidden = !isCancel;
    if (cancellationReason) {
      cancellationReason.required = isCancel;
      if (!isCancel) cancellationReason.value = '';
    }
    if (!isCancel && cancellationReasonOther) cancellationReasonOther.value = '';
    updateCancellationReasonUI();

    const hasOffer = Boolean(RETENTION_OFFER_URL);
    if (retentionOffer) retentionOffer.hidden = !(isCancel && hasOffer);
    if (retentionOfferLink && hasOffer) retentionOfferLink.href = RETENTION_OFFER_URL;
  }

  if (statusRequest) statusRequest.addEventListener('change', updateStatusRequestUI);
  if (cancellationReason) cancellationReason.addEventListener('change', updateCancellationReasonUI);

  function validRoute(route) {
    return views.has(route) ? route : 'home';
  }

  function showView(route, { pushHistory = true, replaceHash = false } = {}) {
    const next = validRoute(route);
    if (pushHistory && next !== currentView) historyStack.push(currentView);

    views.forEach((view, name) => { view.hidden = name !== next; });
    currentView = next;

    const hash = next === 'home' ? '' : `#${next}`;
    if (replaceHash) history.replaceState({ route: next }, '', `${location.pathname}${location.search}${hash}`);
    else if (location.hash !== hash) history.pushState({ route: next }, '', `${location.pathname}${location.search}${hash}`);

    window.scrollTo({ top: 0, behavior: 'auto' });
    main.focus({ preventScroll: true });
  }

  function routeFromLocation() {
    return validRoute(location.hash.replace(/^#/, '') || 'home');
  }

  document.addEventListener('click', (event) => {
    const routeButton = event.target.closest('[data-route]');
    if (routeButton) {
      showView(routeButton.dataset.route);
      return;
    }

    const backButton = event.target.closest('[data-back]');
    if (backButton) {
      const prior = historyStack.pop() || 'home';
      showView(prior, { pushHistory: false });
    }
  });

  window.addEventListener('popstate', () => {
    const route = routeFromLocation();
    views.forEach((view, name) => { view.hidden = name !== route; });
    currentView = route;
    window.scrollTo({ top: 0, behavior: 'auto' });
  });

  document.querySelectorAll('[data-support-form]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      const submit = form.querySelector('button[type="submit"]');
      const status = form.querySelector('.form-status');
      const payload = Object.fromEntries(new FormData(form).entries());
      payload.category = form.dataset.category;
      payload.source = 'washingtonian-customer-service';

      submit.disabled = true;
      status.classList.remove('error');
      status.textContent = 'Submitting…';

      try {
        const response = await fetch('/api/support', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Unable to submit request.');

        document.getElementById('reference-number').textContent = result.reference || 'WASH-SUPPORT';
        form.reset();
        updateStatusRequestUI();
        status.textContent = '';
        showView('success');
      } catch (error) {
        status.classList.add('error');
        status.textContent = 'We could not submit this request. Please email washsub@washingtonian.com.';
      } finally {
        submit.disabled = false;
      }
    });
  });

  updateStatusRequestUI();
  showView(routeFromLocation(), { pushHistory: false, replaceHash: true });
})();
