(function () {
  'use strict';

  var STORAGE_KEY = 'daybook-tasks-v1';
  var store = {};
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    store = raw ? JSON.parse(raw) : {};
  } catch (e) { store = {}; }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }
    catch (e) { /* storage unavailable, continue in-memory */ }
  }

  function key(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  var today = startOfDay(new Date());
  var current = startOfDay(new Date());
  var calMonthCursor = new Date(current.getFullYear(), current.getMonth(), 1);

  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var DOW_SHORT = ['S','M','T','W','T','F','S'];

  var book = document.getElementById('book');
  var monthDayEl = document.getElementById('monthDay');
  var weekdayYearEl = document.getElementById('weekdayYear');
  var todayPill = document.getElementById('todayPill');
  var jumpToday = document.getElementById('jumpToday');
  var taskList = document.getElementById('taskList');
  var addForm = document.getElementById('addForm');
  var taskInput = document.getElementById('taskInput');
  var overlay = document.getElementById('overlay');
  var calGrid = document.getElementById('calGrid');
  var calMonthLabel = document.getElementById('calMonthLabel');

  function tasksFor(d) {
    var k = key(d);
    if (!store[k]) store[k] = [];
    return store[k];
  }

  // Bug fix: the checkbox's 3D "pop" animation runs for 450ms
  // (see .check.popping / @keyframes checkPop in style.css), but the
  // list used to re-render after only 260ms. That destroyed the
  // animating button mid-spin and swapped in a static replacement,
  // producing a visible snap instead of a smooth finish. The render
  // delay below now matches the animation's real duration.
  var CHECK_ANIM_MS = 450;

  function render() {
    monthDayEl.textContent = MONTHS[current.getMonth()] + ' ' + current.getDate();
    weekdayYearEl.textContent = WEEKDAYS[current.getDay()] + ', ' + current.getFullYear();
    var isToday = sameDay(current, today);
    todayPill.style.display = isToday ? 'inline-block' : 'none';
    jumpToday.style.display = isToday ? 'none' : 'block';

    var list = tasksFor(current);
    taskList.innerHTML = '';
    if (list.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'empty';
      empty.innerHTML = '<span class="glyph">' + (current < today ? '·' : '✎') + '</span>' +
        (current < today ? 'Nothing was recorded for this day.' : 'This page is blank. Add the first task below.');
      taskList.appendChild(empty);
      return;
    }
    list.forEach(function (task) {
      var li = document.createElement('li');
      li.className = 'task' + (task.done ? ' done' : '');

      var check = document.createElement('button');
      check.className = 'check';
      check.setAttribute('aria-label', task.done ? 'Mark not done' : 'Mark done');
      check.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 9 17 20 6"></polyline></svg>';
      check.addEventListener('click', function () {
        task.done = !task.done;
        save();
        check.classList.add('popping');
        setTimeout(function () { render(); }, CHECK_ANIM_MS);
      });

      var text = document.createElement('span');
      text.className = 'task-text';
      text.textContent = task.text;

      var del = document.createElement('button');
      del.className = 'del-btn';
      del.setAttribute('aria-label', 'Delete task');
      del.textContent = '×';
      del.addEventListener('click', function () {
        var idx = list.indexOf(task);
        if (idx > -1) list.splice(idx, 1);
        save();
        render();
      });

      li.appendChild(check);
      li.appendChild(text);
      li.appendChild(del);
      taskList.appendChild(li);
    });
  }

  function goTo(newDate, direction) {
    current = startOfDay(newDate);
    if (direction) {
      book.classList.remove('flip-next', 'flip-prev');
      void book.offsetWidth;
      book.classList.add(direction === 1 ? 'flip-next' : 'flip-prev');
      book.addEventListener('animationend', function handler() {
        book.classList.remove('flip-next', 'flip-prev');
        book.removeEventListener('animationend', handler);
      });
    }
    render();
  }

  document.getElementById('prevBtn').addEventListener('click', function () {
    var d = new Date(current); d.setDate(d.getDate() - 1);
    goTo(d, -1);
  });
  document.getElementById('nextBtn').addEventListener('click', function () {
    var d = new Date(current); d.setDate(d.getDate() + 1);
    goTo(d, 1);
  });
  document.getElementById('jumpTodayBtn').addEventListener('click', function () {
    goTo(today, today < current ? -1 : 1);
  });

  addForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var val = taskInput.value.trim();
    if (!val) return;
    tasksFor(current).push({ text: val, done: false });
    save();
    taskInput.value = '';
    render();
  });

  /* Calendar overlay */
  function openCal() {
    calMonthCursor = new Date(current.getFullYear(), current.getMonth(), 1);
    renderCal();
    overlay.classList.add('open');
  }
  function closeCal() {
    overlay.classList.remove('open');
  }
  document.getElementById('calBtn').addEventListener('click', openCal);
  document.getElementById('calClose').addEventListener('click', closeCal);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeCal();
  });
  document.getElementById('calPrevMonth').addEventListener('click', function () {
    calMonthCursor.setMonth(calMonthCursor.getMonth() - 1);
    renderCal();
  });
  document.getElementById('calNextMonth').addEventListener('click', function () {
    calMonthCursor.setMonth(calMonthCursor.getMonth() + 1);
    renderCal();
  });

  function renderCal() {
    calMonthLabel.textContent = MONTHS[calMonthCursor.getMonth()] + ' ' + calMonthCursor.getFullYear();
    calGrid.innerHTML = '';
    DOW_SHORT.forEach(function (d) {
      var el = document.createElement('div');
      el.className = 'dow';
      el.textContent = d;
      calGrid.appendChild(el);
    });

    var firstOfMonth = new Date(calMonthCursor.getFullYear(), calMonthCursor.getMonth(), 1);
    var startOffset = firstOfMonth.getDay();
    var gridStart = new Date(firstOfMonth);
    gridStart.setDate(gridStart.getDate() - startOffset);

    for (var i = 0; i < 42; i++) {
      var cellDate = new Date(gridStart);
      cellDate.setDate(gridStart.getDate() + i);
      var btn = document.createElement('button');
      btn.className = 'cal-cell';
      if (cellDate.getMonth() !== calMonthCursor.getMonth()) btn.classList.add('muted');
      if (sameDay(cellDate, today)) btn.classList.add('today');
      if (sameDay(cellDate, current)) btn.classList.add('selected');

      var num = document.createElement('span');
      num.textContent = cellDate.getDate();
      btn.appendChild(num);

      var k = key(cellDate);
      if (store[k] && store[k].length > 0) {
        var dot = document.createElement('span');
        dot.className = 'dot';
        btn.appendChild(dot);
      }

      (function (d) {
        btn.addEventListener('click', function () {
          var dir = startOfDay(d) < current ? -1 : (startOfDay(d) > current ? 1 : 0);
          closeCal();
          goTo(d, dir || null);
        });
      })(cellDate);

      calGrid.appendChild(btn);
    }
  }

  /* Heart rainfall */
  var heartRain = document.getElementById('heartRain');
  var HEART_SVG = '<svg viewBox="0 0 32 29" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M16 28.6c-.6-.5-6.6-5.6-10.6-10C1.9 14.6 0 11.6 0 8.4 0 3.9 3.6.3 8 .3c3 0 5.4 1.6 8 4.7 2.6-3.1 5-4.7 8-4.7 4.4 0 8 3.6 8 8.1 0 3.2-1.9 6.2-5.4 10.2-4 4.4-10 9.5-10.6 10z"/></svg>';
  var HEART_COLORS = ['var(--danger)', 'var(--gold)', '#D98B7B', 'var(--evergreen-dark)'];

  function spawnHearts(count) {
    if (!heartRain) return;
    heartRain.innerHTML = '';
    for (var i = 0; i < count; i++) {
      var h = document.createElement('span');
      h.className = 'heart';
      h.innerHTML = HEART_SVG;
      var size = (12 + Math.random() * 16).toFixed(0) + 'px';
      var left = (Math.random() * 100).toFixed(1) + 'vw';
      var duration = (7 + Math.random() * 7).toFixed(2) + 's';
      var delay = (-Math.random() * 14).toFixed(2) + 's';
      var drift = ((Math.random() * 80) - 40).toFixed(0) + 'px';
      var spin = ((Math.random() * 240) - 120).toFixed(0) + 'deg';
      var color = HEART_COLORS[i % HEART_COLORS.length];
      h.style.setProperty('--hs', size);
      h.style.setProperty('--hx', left);
      h.style.setProperty('--hd', duration);
      h.style.setProperty('--hdelay', delay);
      h.style.setProperty('--hdrift', drift);
      h.style.setProperty('--hspin', spin);
      h.style.setProperty('--hc', color);
      heartRain.appendChild(h);
    }
  }

  spawnHearts(22);

  /* Pointer-driven 3D tilt — gives the book constant, tactile depth */
  var stage = document.getElementById('stage');
  var tiltRaf = null;

  function applyTilt(clientX, clientY) {
    var rect = book.getBoundingClientRect();
    var px = (clientX - rect.left) / rect.width;   // 0..1
    var py = (clientY - rect.top) / rect.height;   // 0..1
    var rotY = (px - 0.5) * 16;   // left/right
    var rotX = (0.5 - py) * 12;   // up/down
    if (tiltRaf) cancelAnimationFrame(tiltRaf);
    tiltRaf = requestAnimationFrame(function () {
      book.style.transform = 'rotateX(' + rotX.toFixed(2) + 'deg) rotateY(' + rotY.toFixed(2) + 'deg) translateZ(6px)';
      book.style.boxShadow = (-rotY * 1.6).toFixed(1) + 'px ' + (18 + rotX * 1.2).toFixed(1) + 'px 44px var(--shadow), 0 2px 0 var(--rule) inset';
    });
  }
  function resetTilt() {
    if (tiltRaf) cancelAnimationFrame(tiltRaf);
    book.style.transform = '';
    book.style.boxShadow = '';
  }
  if (stage) {
    stage.addEventListener('pointermove', function (e) {
      if (book.classList.contains('flip-next') || book.classList.contains('flip-prev')) return;
      applyTilt(e.clientX, e.clientY);
    });
    stage.addEventListener('pointerleave', resetTilt);
    stage.addEventListener('pointerdown', function (e) { applyTilt(e.clientX, e.clientY); });
  }

  render();

  /* Register the service worker so the app can install and work offline.
     Guarded so the app still runs fine if the browser has no SW support
     or the page is opened straight from disk (file://), where SW
     registration always fails. */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {
        /* offline/installable support is a bonus, not required to use the app */
      });
    });
  }
})();
