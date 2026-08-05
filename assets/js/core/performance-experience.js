(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var VERSION = '20260804-ux-perf-001-v1';
  var STATES = Object.freeze({
    BOOTING: 'booting',
    SHELL_READY: 'shell_ready',
    CONTENT_READY: 'content_ready',
    INTERACTIVE: 'interactive',
    SETTLED: 'settled',
    DEGRADED: 'degraded'
  });
  var PRIORITIES = Object.freeze({
    CRITICAL: 'critical',
    IMPORTANT: 'important',
    OPTIONAL: 'optional',
    DEFERRED: 'deferred'
  });
  var TASK_STATES = Object.freeze({
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETE: 'complete',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    SKIPPED: 'skipped'
  });
  var DEFAULT_BUDGETS = Object.freeze({
    shellReadyMs: 1800,
    firstUsefulContentMs: 2500,
    interactiveMs: 3200,
    settleMs: 4500,
    longTaskMs: 50,
    maxLongTasksBeforeContent: 3,
    maxCumulativeLayoutShift: 0.1
  });
  var journeys = new Map();
  var listeners = new Set();
  var globalMetrics = {
    paint: {},
    largestContentfulPaint: 0,
    cumulativeLayoutShift: 0,
    longTasks: 0,
    longTaskDuration: 0
  };
  var observerHandles = [];
  var defaultJourney = null;

  function now() {
    try {
      return root.performance && typeof root.performance.now === 'function'
        ? root.performance.now()
        : Date.now();
    } catch (error) {
      return Date.now();
    }
  }

  function safeText(value, fallback) {
    var text = String(value == null ? '' : value)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._:-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 96);
    return text || fallback || 'unknown';
  }

  function pageName() {
    var declared = document.body && document.body.getAttribute('data-page');
    if (declared) return safeText(declared, 'page');
    try {
      return safeText((root.location.pathname.split('/').pop() || 'index.html').replace(/\.html$/i, ''), 'index');
    } catch (error) {
      return 'page';
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function finite(value, fallback) {
    var number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function mergeBudgets(input) {
    var result = {};
    Object.keys(DEFAULT_BUDGETS).forEach(function (key) {
      result[key] = Math.max(0, finite(input && input[key], DEFAULT_BUDGETS[key]));
    });
    return Object.freeze(result);
  }

  function connectionProfile() {
    var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
    return Object.freeze({
      saveData: connection && connection.saveData === true,
      effectiveType: safeText(connection && connection.effectiveType, 'unknown'),
      deviceMemory: Math.max(0, finite(navigator.deviceMemory, 0)),
      hardwareConcurrency: Math.max(0, finite(navigator.hardwareConcurrency, 0))
    });
  }

  function emit(type, detail) {
    var payload = Object.freeze(Object.assign({
      type: safeText(type, 'event'),
      at: Math.round(now())
    }, detail || {}));
    listeners.forEach(function (listener) {
      try { listener(payload); } catch (error) { console.error('[DokePerformance]', error); }
    });
    try {
      document.dispatchEvent(new CustomEvent('doke:performance-experience', { detail: payload }));
    } catch (error) {}
    return payload;
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return function () {};
    listeners.add(listener);
    return function unsubscribe() { listeners.delete(listener); };
  }

  function rootState(state, budgetState) {
    if (!document.documentElement) return;
    document.documentElement.dataset.dokePerformanceState = state;
    if (budgetState) document.documentElement.dataset.dokePerformanceBudget = budgetState;
  }

  function startJourney(options) {
    options = options || {};
    var id = safeText(options.id || options.page || pageName(), 'journey');
    var existing = journeys.get(id);
    if (existing && !existing.isTerminal()) return existing;

    var startedAt = now();
    var budgets = mergeBudgets(options.budgets);
    var route = safeText(options.route || options.page || pageName(), 'page');
    var source = safeText(options.source || 'runtime', 'runtime');
    var tasks = new Map();
    var milestones = Object.create(null);
    var flags = {
      shellReady: false,
      contentReady: false,
      interactive: false,
      settled: false,
      degraded: false,
      longTasksAtContent: null,
      clsAtContent: null
    };
    var state = STATES.BOOTING;
    var budgetState = 'pending';
    var watchdog = 0;

    function elapsed() {
      return Math.max(0, now() - startedAt);
    }

    function blockingPending() {
      var count = 0;
      tasks.forEach(function (task) {
        if (task.blocking && (task.state === TASK_STATES.PENDING || task.state === TASK_STATES.RUNNING)) count += 1;
      });
      return count;
    }

    function computeState() {
      if (flags.degraded) return STATES.DEGRADED;
      if (flags.settled) return STATES.SETTLED;
      if (flags.interactive) return STATES.INTERACTIVE;
      if (flags.contentReady) return STATES.CONTENT_READY;
      if (flags.shellReady) return STATES.SHELL_READY;
      return STATES.BOOTING;
    }

    function setState(reason) {
      var next = computeState();
      if (next === state) return state;
      var previous = state;
      state = next;
      rootState(state, budgetState);
      emit('journey-state', {
        journeyId: id,
        route: route,
        state: state,
        previousState: previous,
        reason: safeText(reason, 'update'),
        elapsedMs: Math.round(elapsed()),
        blockingTasks: blockingPending()
      });
      return state;
    }

    function mark(name, detail) {
      var key = safeText(name, 'milestone');
      if (!milestones[key]) milestones[key] = Math.round(elapsed());
      emit('milestone', {
        journeyId: id,
        route: route,
        milestone: key,
        elapsedMs: milestones[key],
        source: safeText(detail && detail.source, source)
      });
      return milestones[key];
    }

    function evaluateBudgets() {
      var checks = [];
      function check(name, milestoneName, limit) {
        if (typeof milestones[milestoneName] !== 'number') return;
        checks.push({ name: name, value: milestones[milestoneName], limit: limit, passed: milestones[milestoneName] <= limit });
      }
      check('shell-ready', 'shell-ready', budgets.shellReadyMs);
      check('first-useful-content', 'content-ready', budgets.firstUsefulContentMs);
      check('interactive', 'interactive', budgets.interactiveMs);
      check('settled', 'settled', budgets.settleMs);
      checks.push({
        name: 'long-tasks-before-content',
        value: flags.longTasksAtContent == null ? globalMetrics.longTasks : flags.longTasksAtContent,
        limit: budgets.maxLongTasksBeforeContent,
        passed: (flags.longTasksAtContent == null ? globalMetrics.longTasks : flags.longTasksAtContent) <= budgets.maxLongTasksBeforeContent
      });
      checks.push({
        name: 'cumulative-layout-shift',
        value: Number((flags.clsAtContent == null ? globalMetrics.cumulativeLayoutShift : flags.clsAtContent).toFixed(4)),
        limit: budgets.maxCumulativeLayoutShift,
        passed: (flags.clsAtContent == null ? globalMetrics.cumulativeLayoutShift : flags.clsAtContent) <= budgets.maxCumulativeLayoutShift
      });
      budgetState = checks.every(function (entry) { return entry.passed; }) ? 'within' : 'exceeded';
      rootState(state, budgetState);
      emit('budget-evaluated', {
        journeyId: id,
        route: route,
        budgetState: budgetState,
        failedChecks: checks.filter(function (entry) { return !entry.passed; }).length
      });
      return checks;
    }

    function maybeSettle(reason) {
      if (flags.settled || flags.degraded) return false;
      if (!flags.contentReady || !flags.interactive || blockingPending() > 0) return false;
      flags.settled = true;
      mark('settled', { source: reason || 'automatic' });
      setState(reason || 'automatic-settle');
      if (watchdog) root.clearTimeout(watchdog);
      evaluateBudgets();
      return true;
    }

    function markShellReady(detail) {
      if (!flags.shellReady) {
        flags.shellReady = true;
        mark('shell-ready', detail);
      }
      setState('shell-ready');
      maybeSettle('shell-ready');
      return api;
    }

    function markContentReady(detail) {
      if (!flags.contentReady) {
        flags.contentReady = true;
        flags.longTasksAtContent = globalMetrics.longTasks;
        flags.clsAtContent = globalMetrics.cumulativeLayoutShift;
        mark('content-ready', detail);
      }
      setState('content-ready');
      maybeSettle('content-ready');
      return api;
    }

    function markInteractive(detail) {
      if (!flags.interactive) {
        flags.interactive = true;
        mark('interactive', detail);
      }
      setState('interactive');
      maybeSettle('interactive');
      return api;
    }

    function degrade(reason) {
      if (flags.settled) return api;
      flags.degraded = true;
      mark('degraded', { source: reason || 'runtime' });
      setState(reason || 'degraded');
      if (watchdog) root.clearTimeout(watchdog);
      evaluateBudgets();
      return api;
    }

    function settle(detail) {
      if (!flags.contentReady) markContentReady(detail);
      if (!flags.interactive) markInteractive(detail);
      maybeSettle(detail && detail.source || 'manual');
      return api;
    }

    function beginTask(taskOptions) {
      taskOptions = taskOptions || {};
      var taskId = safeText(taskOptions.id || ('task-' + (tasks.size + 1)), 'task');
      var existingTask = tasks.get(taskId);
      if (existingTask && (existingTask.state === TASK_STATES.PENDING || existingTask.state === TASK_STATES.RUNNING)) {
        return existingTask.handle;
      }
      var priority = Object.values(PRIORITIES).indexOf(taskOptions.priority) >= 0
        ? taskOptions.priority
        : PRIORITIES.IMPORTANT;
      var blocking = typeof taskOptions.blocking === 'boolean'
        ? taskOptions.blocking
        : priority === PRIORITIES.CRITICAL;
      var task = {
        id: taskId,
        priority: priority,
        blocking: blocking,
        state: TASK_STATES.RUNNING,
        startedAt: now(),
        completedAt: 0,
        errorCode: ''
      };

      function finish(nextState, detail) {
        if (task.state !== TASK_STATES.RUNNING && task.state !== TASK_STATES.PENDING) return false;
        task.state = nextState;
        task.completedAt = now();
        task.errorCode = safeText(detail && detail.code, '');
        emit('task-state', {
          journeyId: id,
          route: route,
          taskId: taskId,
          priority: priority,
          blocking: blocking,
          state: nextState,
          durationMs: Math.round(task.completedAt - task.startedAt),
          errorCode: task.errorCode
        });
        if (nextState === TASK_STATES.FAILED && blocking) degrade(detail && detail.code || 'critical-task-failed');
        else maybeSettle('task-finished');
        return true;
      }

      var handle = Object.freeze({
        id: taskId,
        complete: function (detail) { return finish(TASK_STATES.COMPLETE, detail); },
        fail: function (detail) { return finish(TASK_STATES.FAILED, detail); },
        cancel: function (detail) { return finish(TASK_STATES.CANCELLED, detail); },
        skip: function (detail) { return finish(TASK_STATES.SKIPPED, detail); },
        getState: function () { return task.state; }
      });
      task.handle = handle;
      tasks.set(taskId, task);
      emit('task-state', {
        journeyId: id,
        route: route,
        taskId: taskId,
        priority: priority,
        blocking: blocking,
        state: TASK_STATES.RUNNING,
        durationMs: 0,
        errorCode: ''
      });
      return handle;
    }

    function getSnapshot() {
      var taskSummary = { pending: 0, running: 0, complete: 0, failed: 0, cancelled: 0, skipped: 0 };
      tasks.forEach(function (task) {
        if (Object.prototype.hasOwnProperty.call(taskSummary, task.state)) taskSummary[task.state] += 1;
      });
      return Object.freeze({
        id: id,
        route: route,
        source: source,
        state: state,
        budgetState: budgetState,
        elapsedMs: Math.round(elapsed()),
        milestones: clone(milestones),
        tasks: Object.freeze(taskSummary),
        blockingTasks: blockingPending(),
        connection: connectionProfile()
      });
    }

    function isTerminal() {
      return state === STATES.SETTLED || state === STATES.DEGRADED;
    }

    var api = Object.freeze({
      id: id,
      route: route,
      budgets: budgets,
      mark: mark,
      beginTask: beginTask,
      markShellReady: markShellReady,
      markContentReady: markContentReady,
      markInteractive: markInteractive,
      settle: settle,
      degrade: degrade,
      evaluateBudgets: evaluateBudgets,
      getSnapshot: getSnapshot,
      getState: function () { return state; },
      isTerminal: isTerminal
    });

    journeys.set(id, api);
    emit('journey-started', { journeyId: id, route: route, state: state, source: source });
    watchdog = root.setTimeout(function () {
      if (!api.isTerminal()) api.degrade('journey-watchdog');
    }, Math.max(budgets.settleMs * 2, 8000));
    return api;
  }

  function scheduleOptional(options) {
    options = typeof options === 'function' ? { run: options } : (options || {});
    var id = safeText(options.id, 'optional-work');
    var run = typeof options.run === 'function' ? options.run : function () {};
    var journey = options.journeyId ? journeys.get(safeText(options.journeyId, '')) : null;
    var task = journey ? journey.beginTask({ id: id, priority: PRIORITIES.OPTIONAL, blocking: false }) : null;
    var cancelled = false;
    var timer = 0;
    var idleHandle = 0;
    var resolvePromise;
    var rejectPromise;
    var promise = new Promise(function (resolve, reject) {
      resolvePromise = resolve;
      rejectPromise = reject;
    });

    function finishSkipped(code) {
      if (cancelled) return;
      task && task.skip({ code: code });
      resolvePromise({ status: TASK_STATES.SKIPPED, code: code });
    }

    function execute() {
      if (cancelled) return;
      var profile = connectionProfile();
      if (options.requireVisible !== false && document.hidden) {
        finishSkipped('document-hidden');
        return;
      }
      if (profile.saveData && options.allowSaveData !== true) {
        finishSkipped('save-data');
        return;
      }
      Promise.resolve()
        .then(run)
        .then(function (value) {
          task && task.complete();
          resolvePromise({ status: TASK_STATES.COMPLETE, value: value });
        })
        .catch(function (error) {
          task && task.fail({ code: safeText(error && error.code || error && error.message, 'optional-failed') });
          rejectPromise(error);
        });
    }

    var timeout = Math.max(0, finite(options.timeout, 1200));
    if (typeof root.requestIdleCallback === 'function') {
      idleHandle = root.requestIdleCallback(execute, { timeout: timeout });
    } else {
      timer = root.setTimeout(execute, Math.min(timeout, 32));
    }

    return Object.freeze({
      id: id,
      promise: promise,
      cancel: function () {
        if (cancelled) return false;
        cancelled = true;
        if (idleHandle && typeof root.cancelIdleCallback === 'function') root.cancelIdleCallback(idleHandle);
        if (timer) root.clearTimeout(timer);
        task && task.cancel({ code: 'cancelled' });
        resolvePromise({ status: TASK_STATES.CANCELLED });
        return true;
      }
    });
  }

  function getJourney(id) {
    return journeys.get(safeText(id, '')) || null;
  }

  function getSnapshot() {
    return Object.freeze({
      version: VERSION,
      page: pageName(),
      journeys: Array.from(journeys.values()).map(function (journey) { return journey.getSnapshot(); }),
      metrics: Object.freeze({
        firstPaint: finite(globalMetrics.paint['first-paint'], 0),
        firstContentfulPaint: finite(globalMetrics.paint['first-contentful-paint'], 0),
        largestContentfulPaint: finite(globalMetrics.largestContentfulPaint, 0),
        cumulativeLayoutShift: Number(globalMetrics.cumulativeLayoutShift.toFixed(4)),
        longTasks: globalMetrics.longTasks,
        longTaskDuration: Math.round(globalMetrics.longTaskDuration)
      }),
      connection: connectionProfile()
    });
  }

  function observePerformance() {
    if (typeof root.PerformanceObserver !== 'function') return;
    function observe(type, callback) {
      try {
        var observer = new root.PerformanceObserver(function (list) {
          list.getEntries().forEach(callback);
        });
        observer.observe({ type: type, buffered: true });
        observerHandles.push(observer);
      } catch (error) {}
    }
    observe('paint', function (entry) {
      globalMetrics.paint[safeText(entry.name, 'paint')] = Math.round(finite(entry.startTime, 0));
    });
    observe('largest-contentful-paint', function (entry) {
      globalMetrics.largestContentfulPaint = Math.max(globalMetrics.largestContentfulPaint, finite(entry.startTime, 0));
    });
    observe('longtask', function (entry) {
      globalMetrics.longTasks += 1;
      globalMetrics.longTaskDuration += finite(entry.duration, 0);
      emit('long-task', { durationMs: Math.round(finite(entry.duration, 0)) });
    });
    observe('layout-shift', function (entry) {
      if (entry.hadRecentInput) return;
      globalMetrics.cumulativeLayoutShift += finite(entry.value, 0);
    });
  }

  function bindGlobalLifecycle() {
    defaultJourney = startJourney({ id: 'document', route: pageName(), source: 'performance-bootstrap' });
    if (document.documentElement && document.documentElement.dataset.dokeDocumentBoot === 'ready') {
      defaultJourney.markShellReady({ source: 'existing-document-state' });
    }
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      defaultJourney.mark('dom-ready', { source: 'existing-ready-state' });
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        defaultJourney.mark('dom-ready', { source: 'dom-content-loaded' });
      }, { once: true });
    }
    if (document.readyState === 'complete') {
      defaultJourney.mark('window-load', { source: 'existing-ready-state' });
    } else {
      root.addEventListener('load', function () {
        defaultJourney.mark('window-load', { source: 'window-load' });
      }, { once: true });
    }
    document.addEventListener('doke:document-preloader-release', function () {
      defaultJourney.markShellReady({ source: 'document-preloader-release' });
    });
    document.addEventListener('doke:page-bootstrap-ready', function () {
      defaultJourney.markShellReady({ source: 'page-bootstrap-ready' });
      var readyBoundary = document.querySelector && document.querySelector('[data-state-boundary][data-view-state="ready"], [data-state-boundary][data-view-state="empty"], main');
      if (readyBoundary) defaultJourney.markContentReady({ source: 'existing-dom-boundary' });
      defaultJourney.markInteractive({ source: 'page-bootstrap-ready' });
    });
    document.addEventListener('doke:page-hydration-state', function (event) {
      var detail = event && event.detail || {};
      if (detail.state === 'ready' || detail.state === 'empty') {
        defaultJourney.markContentReady({ source: 'page-hydration' });
      } else if (detail.state === 'error') {
        defaultJourney.degrade('page-hydration-error');
      }
    });
  }

  var api = Object.freeze({
    version: VERSION,
    states: STATES,
    priorities: PRIORITIES,
    taskStates: TASK_STATES,
    budgets: DEFAULT_BUDGETS,
    startJourney: startJourney,
    getJourney: getJourney,
    scheduleOptional: scheduleOptional,
    subscribe: subscribe,
    getSnapshot: getSnapshot,
    markShellReady: function (detail) { return defaultJourney && defaultJourney.markShellReady(detail); },
    markContentReady: function (detail) { return defaultJourney && defaultJourney.markContentReady(detail); },
    markInteractive: function (detail) { return defaultJourney && defaultJourney.markInteractive(detail); },
    settle: function (detail) { return defaultJourney && defaultJourney.settle(detail); }
  });

  Doke.performanceExperience = api;
  rootState(STATES.BOOTING, 'pending');
  observePerformance();
  bindGlobalLifecycle();
  emit('authority-ready', { version: VERSION, page: pageName() });
}());
