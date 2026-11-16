(() => {
  const LEGACY_TASKS_KEY = "todolist_tasks_v1";
  const TASKS_BY_DATE_KEY = "todolist_tasks_by_date_v2";
  const DATE_KEY = "todolist_last_date_v1";
  const WEATHER_KEY = "todolist_weather_hanoi_v1";
  const CALENDAR_KEY = "todolist_calendar_v1";
  const CUSTOM_BG_KEY = "todolist_custom_bg_v1";
  const POMO_SETTINGS_KEY = "todolist_pomo_settings_v1";
  const AMBIENT_SETTINGS_KEY = "todolist_ambient_settings_v1";
  const SCRATCHPAD_KEY = "todolist_scratchpad_v1";

  function safeGetItem(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function safeSetItem(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function safeRemoveItem(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore storage errors
    }
  }

  const OPEN_METEO_URL =
    "https://api.open-meteo.com/v1/forecast?latitude=21.0285&longitude=105.8542&current_weather=true&timezone=Asia%2FBangkok";
  const WTTR_BACKUP_URL = "https://wttr.in/Hanoi?format=j1";

  const TAG_META = {
    work: { label: "💻 Công việc", className: "tag-work" },
    study: { label: "📚 Học tập", className: "tag-study" },
    personal: { label: "🏠 Cá nhân", className: "tag-personal" },
    sport: { label: "🏃‍♂️ Thể thao", className: "tag-sport" },
  };

  // DOM Elements
  const currentDateEl = document.getElementById("currentDate");
  const currentTimeEl = document.getElementById("currentTime");
  const weatherPillEl = document.getElementById("weatherPill");
  const weatherIconEl = document.getElementById("weatherIcon");
  const weatherTextEl = document.getElementById("weatherText");

  const selectedDayLabelEl = document.getElementById("selectedDayLabel");
  const backToTodayBtn = document.getElementById("backToTodayBtn");
  const progressTextEl = document.getElementById("progressText");
  const progressPercentEl = document.getElementById("progressPercent");
  const progressBarFillEl = document.getElementById("progressBarFill");

  const addTaskForm = document.getElementById("addTaskForm");
  const taskInput = document.getElementById("taskInput");
  const startTimeInput = document.getElementById("startTimeInput");
  const endTimeInput = document.getElementById("endTimeInput");
  const repeatToggleInput = document.getElementById("repeatToggleInput");
  const resetDailyBtn = document.getElementById("resetDailyBtn");
  const tagPickButtons = document.querySelectorAll(".tag-pick-btn");

  const filterButtons = document.querySelectorAll(".filter-btn");
  const taskListEl = document.getElementById("taskList");
  const emptyStateEl = document.getElementById("emptyState");

  const calendarMonthTitleEl = document.getElementById("calendarMonthTitle");
  const confirmDayBtn = document.getElementById("confirmDayBtn");
  const doneDaysCountEl = document.getElementById("doneDaysCount");
  const pendingDaysCountEl = document.getElementById("pendingDaysCount");
  const streakHeroCountEl = document.getElementById("streakHeroCount");
  const bestStreakCountEl = document.getElementById("bestStreakCount");
  const monthRateTextEl = document.getElementById("monthRateText");
  const calendarGridEl = document.getElementById("calendarGrid");

  // Sticky Pomodoro Mini Bar DOM
  const miniPomoTimerEl = document.getElementById("miniPomoTimer");
  const miniPomoStatusEl = document.getElementById("miniPomoStatus");
  const miniPomoTaskEl = document.getElementById("miniPomoTask");
  const miniPomoToggleBtn = document.getElementById("miniPomoToggleBtn");
  const miniPomoResetBtn = document.getElementById("miniPomoResetBtn");

  // Background & Backup DOM
  const bgFileInput = document.getElementById("bgFileInput");
  const uploadBgBtn = document.getElementById("uploadBgBtn");
  const resetBgBtn = document.getElementById("resetBgBtn");
  const exportJsonBtn = document.getElementById("exportJsonBtn");
  const importJsonBtn = document.getElementById("importJsonBtn");
  const importJsonInput = document.getElementById("importJsonInput");

  // Pomodoro DOM
  const pomoCycleStatusEl = document.getElementById("pomoCycleStatus");
  const pomoModeButtons = document.querySelectorAll(".pomo-mode-btn");
  const pomoWorkInput = document.getElementById("pomoWorkInput");
  const pomoBreakInput = document.getElementById("pomoBreakInput");
  const pomoCyclesInput = document.getElementById("pomoCyclesInput");
  const pomoFocusTaskEl = document.getElementById("pomoFocusTask");
  const pomoTimerDisplayEl = document.getElementById("pomoTimerDisplay");
  const pomoStartBtn = document.getElementById("pomoStartBtn");
  const pomoPauseBtn = document.getElementById("pomoPauseBtn");
  const pomoResetBtn = document.getElementById("pomoResetBtn");

  // Ambient Sound DOM
  const ambientButtons = document.querySelectorAll(".ambient-btn");
  const ambientVolumeInput = document.getElementById("ambientVolume");

  // Scratchpad DOM
  const scratchpadInput = document.getElementById("scratchpadInput");
  const scratchpadStatusEl = document.getElementById("scratchpadStatus");
  const clearScratchpadBtn = document.getElementById("clearScratchpadBtn");

  // App State
  let tasksByDate = {};
  let calendarStatus = {};
  let selectedDateKey = "";
  let activeDateKey = "";
  let currentFilter = "all";
  let selectedNewTag = "work";
  let isNewTaskRepeatDaily = false;
  let draggedTaskId = null;
  const expandedTaskIds = new Set();

  // Pomodoro State
  let pomoWorkMin = 25;
  let pomoBreakMin = 5;
  let pomoTotalCycles = 4;
  let pomoCurrentCycle = 1;
  let pomoCompletedAll = false;
  let pomoMode = "work"; // "work" | "break"
  let pomoSecondsLeft = 25 * 60;
  let pomoIntervalId = null;
  let focusedTaskId = null;
  let audioCtx = null;

  // Ambient Sound State
  let activeAmbientType = null; // "rain" | "stream" | "forest" | null
  let ambientNodes = [];
  let ambientMasterGain = null;
  let ambientBirdTimer = null;

  function getDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function parseDateKey(key) {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function generateId() {
    return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
  }

  // Web Audio API: Tiếng chuông "keng" mượt mà
  function playBellSound() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioCtx) {
        audioCtx = new AudioContextClass();
      }
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }

      const now = audioCtx.currentTime;
      const partials = [
        { freq: 1046.5, gain: 0.24, decay: 1.4 }, // C6
        { freq: 2093.0, gain: 0.12, decay: 1.0 }, // C7
        { freq: 3135.96, gain: 0.06, decay: 0.7 }, // G7
      ];

      partials.forEach(({ freq, gain, decay }) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.exponentialRampToValueAtTime(gain, now + 0.015);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decay);

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + decay + 0.05);
      });
    } catch {
      // Bỏ qua nếu trình duyệt chặn audio context
    }
  }

  // Clock & Midnight Auto-Reset
  function updateClockAndDate() {
    const now = new Date();
    const formattedDate = new Intl.DateTimeFormat("vi-VN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(now);

    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    currentDateEl.textContent = formattedDate;
    currentTimeEl.textContent = `${hours}:${minutes}:${seconds}`;

    const todayKey = getDateKey(now);
    if (activeDateKey && todayKey !== activeDateKey) {
      const wasViewingToday = selectedDateKey === activeDateKey;
      activeDateKey = todayKey;
      localStorage.setItem(DATE_KEY, todayKey);
      ensureDateInitialized(todayKey);
      if (wasViewingToday) {
        selectedDateKey = todayKey;
      }
      syncDateCalendarStatus(todayKey);
      render();
      renderCalendar();
    }
  }

  // Weather (Open-Meteo HTTPS + wttr.in backup + localStorage cache)
  function getWeatherEmoji(code, isDay) {
    if (code === 0) return isDay ? "☀️" : "🌙";
    if (code === 1 || code === 2) return isDay ? "🌤️" : "☁️";
    if (code === 3) return "☁️";
    if (code === 45 || code === 48) return "🌫️";
    if (code >= 51 && code <= 67) return "🌧️";
    if (code >= 71 && code <= 77) return "❄️";
    if (code >= 80 && code <= 82) return "🌦️";
    if (code >= 95) return "⛈️";
    return "🌡️";
  }

  function renderWeather(temp, code, isDay) {
    if (typeof temp !== "number" || Number.isNaN(temp)) return false;
    const rounded = Math.round(temp);
    weatherIconEl.textContent = getWeatherEmoji(code, isDay);
    weatherTextEl.textContent = `Hà Nội: ${rounded}°C`;
    return true;
  }

  function loadCachedWeather() {
    try {
      const raw = localStorage.getItem(WEATHER_KEY);
      if (!raw) return false;
      const cached = JSON.parse(raw);
      if (cached && typeof cached.temp === "number") {
        return renderWeather(cached.temp, cached.code, cached.isDay);
      }
    } catch {
      // ignore
    }
    return false;
  }

  async function fetchJsonWithTimeout(url, timeoutMs = 6000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: "GET",
        mode: "cors",
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchHanoiWeather(showLoading = false) {
    if (showLoading) {
      weatherIconEl.textContent = "⏳";
      weatherTextEl.textContent = "Hà Nội: Đang cập nhật...";
    }

    try {
      const data = await fetchJsonWithTimeout(OPEN_METEO_URL, 6000);
      const cw = data && data.current_weather;
      if (cw && typeof cw.temperature === "number") {
        const temp = cw.temperature;
        const code = cw.weathercode;
        const isDay = cw.is_day === 1;
        renderWeather(temp, code, isDay);
        localStorage.setItem(
          WEATHER_KEY,
          JSON.stringify({ temp, code, isDay, updatedAt: Date.now() })
        );
        return;
      }
    } catch {
      // Fallback below
    }

    try {
      const backup = await fetchJsonWithTimeout(WTTR_BACKUP_URL, 6000);
      const current = backup && backup.current_condition && backup.current_condition[0];
      if (current && current.temp_C !== undefined) {
        const temp = Number(current.temp_C);
        const hour = new Date().getHours();
        const isDay = hour >= 6 && hour < 18;
        if (!Number.isNaN(temp)) {
          renderWeather(temp, 1, isDay);
          localStorage.setItem(
            WEATHER_KEY,
            JSON.stringify({ temp, code: 1, isDay, updatedAt: Date.now() })
          );
          return;
        }
      }
    } catch {
      // Fallback below
    }

    const hasCached = loadCachedWeather();
    if (!hasCached) {
      weatherIconEl.textContent = "⚠️";
      weatherTextEl.textContent = "Hà Nội: Thử lại";
    }
  }

  // Storage & Per-Date Task Management
  function getDailyRepeatTemplates() {
    const seenTitles = new Set();
    const templates = [];
    const dates = Object.keys(tasksByDate).sort().reverse();
    for (const d of dates) {
      const list = Array.isArray(tasksByDate[d]) ? tasksByDate[d] : [];
      for (const task of list) {
        if (task.repeatDaily && !seenTitles.has(task.title)) {
          seenTitles.add(task.title);
          templates.push({
            id: generateId(),
            title: task.title,
            startTime: task.startTime || "",
            endTime: task.endTime || "",
            tag: task.tag || "work",
            repeatDaily: true,
            completed: false,
            createdAt: Date.now(),
          });
        }
      }
    }
    return templates;
  }

  function ensureDateInitialized(dateKey) {
    if (Array.isArray(tasksByDate[dateKey])) return;
    if (dateKey >= activeDateKey) {
      tasksByDate[dateKey] = getDailyRepeatTemplates();
    } else {
      tasksByDate[dateKey] = [];
    }
    saveTasksByDate();
  }

  function loadData() {
    const todayKey = getDateKey();
    activeDateKey = todayKey;
    selectedDateKey = todayKey;

    const rawV2 = localStorage.getItem(TASKS_BY_DATE_KEY);
    if (rawV2 !== null) {
      try {
        const parsed = JSON.parse(rawV2);
        tasksByDate = parsed && typeof parsed === "object" ? parsed : {};
      } catch {
        tasksByDate = {};
      }
    } else {
      // Di chuyển dữ liệu từ v1 sang v2 nếu có
      const rawV1 = localStorage.getItem(LEGACY_TASKS_KEY);
      if (rawV1 !== null) {
        try {
          const parsedV1 = JSON.parse(rawV1);
          tasksByDate[todayKey] = Array.isArray(parsedV1)
            ? parsedV1.map((t) => ({ ...t, tag: t.tag || "work" }))
            : [];
        } catch {
          tasksByDate[todayKey] = [];
        }
      } else {
        tasksByDate[todayKey] = [
          {
            id: generateId(),
            title: "Uống nước & tập thể dục nhẹ",
            startTime: "07:00",
            endTime: "07:30",
            tag: "sport",
            repeatDaily: true,
            completed: false,
            createdAt: Date.now(),
          },
          {
            id: generateId(),
            title: "Đọc sách & ghi chú kiến thức",
            startTime: "08:30",
            endTime: "09:15",
            tag: "study",
            repeatDaily: true,
            completed: false,
            createdAt: Date.now() + 1,
          },
          {
            id: generateId(),
            title: "Hoàn thành công việc trọng tâm",
            startTime: "14:00",
            endTime: "16:00",
            tag: "work",
            repeatDaily: false,
            completed: false,
            createdAt: Date.now() + 2,
          },
        ];
      }
      saveTasksByDate();
    }

    ensureDateInitialized(todayKey);

    const lastDate = safeGetItem(DATE_KEY);
    if (lastDate && lastDate !== todayKey) {
      resetDailyTasks(todayKey, false);
    }
    safeSetItem(DATE_KEY, todayKey);

    try {
      const rawCal = safeGetItem(CALENDAR_KEY);
      calendarStatus = rawCal ? JSON.parse(rawCal) : {};
      if (!calendarStatus || typeof calendarStatus !== "object") calendarStatus = {};
    } catch {
      calendarStatus = {};
    }
  }

  function saveTasksByDate() {
    safeSetItem(TASKS_BY_DATE_KEY, JSON.stringify(tasksByDate));
  }

  function saveCalendarStatus() {
    safeSetItem(CALENDAR_KEY, JSON.stringify(calendarStatus));
  }

  function getCurrentTasks() {
    ensureDateInitialized(selectedDateKey);
    return tasksByDate[selectedDateKey];
  }

  function setCurrentTasks(newList) {
    tasksByDate[selectedDateKey] = newList;
    saveTasksByDate();
  }

  function syncDateCalendarStatus(dateKey = selectedDateKey) {
    const list = tasksByDate[dateKey] || [];
    if (list.length === 0) {
      if (dateKey === activeDateKey) {
        calendarStatus[dateKey] = "pending";
        saveCalendarStatus();
      }
      return;
    }
    const allCompleted = list.every((t) => t.completed);
    calendarStatus[dateKey] = allCompleted ? "done" : "pending";
    saveCalendarStatus();
  }

  function resetDailyTasks(dateKey = selectedDateKey, shouldRender = true) {
    const list = tasksByDate[dateKey] || [];
    let changed = false;
    tasksByDate[dateKey] = list.map((task) => {
      if (task.repeatDaily && task.completed) {
        changed = true;
        return { ...task, completed: false };
      }
      return task;
    });
    if (changed) {
      saveTasksByDate();
    }
    if (shouldRender) {
      syncDateCalendarStatus(dateKey);
      render();
      renderCalendar();
    }
  }

  function formatTimeRange(startTime, endTime) {
    if (startTime && endTime) return `${startTime} – ${endTime}`;
    if (startTime) return startTime;
    if (endTime) return `Trước ${endTime}`;
    return "";
  }

  function getFilteredTasks() {
    const list = getCurrentTasks();
    switch (currentFilter) {
      case "study":
      case "work":
      case "personal":
      case "sport":
        return list.filter((t) => (t.tag || "work") === currentFilter);
      case "daily":
        return list.filter((t) => t.repeatDaily);
      case "pending":
        return list.filter((t) => !t.completed);
      case "completed":
        return list.filter((t) => t.completed);
      default:
        return list;
    }
  }

  function updateSelectedDayHeader() {
    const isToday = selectedDateKey === activeDateKey;
    const dateObj = parseDateKey(selectedDateKey);
    const formatted = new Intl.DateTimeFormat("vi-VN", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(dateObj);

    selectedDayLabelEl.textContent = isToday
      ? `Đang xem: Hôm nay (${formatted})`
      : `Đang xem ngày: ${formatted}`;
    backToTodayBtn.hidden = isToday;
  }

  function updateProgress() {
    const list = getCurrentTasks();
    const total = list.length;
    const completedCount = list.filter((t) => t.completed).length;
    const percent = total === 0 ? 0 : Math.round((completedCount / total) * 100);

    progressTextEl.textContent = `🎯 ${completedCount}/${total} công việc hoàn thành`;
    progressPercentEl.textContent = `${percent}%`;
    progressBarFillEl.style.width = `${percent}%`;
  }

  // SVG Icon Helpers
  function createCheckIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "13");
    svg.setAttribute("height", "13");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "3");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyline.setAttribute("points", "20 6 9 17 4 12");
    svg.appendChild(polyline);
    return svg;
  }

  function createRepeatIcon(size = 15) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2.2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    const p1 = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    p1.setAttribute("points", "17 1 21 5 17 9");
    const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path1.setAttribute("d", "M3 11V9a4 4 0 0 1 4-4h14");
    const p2 = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    p2.setAttribute("points", "7 23 3 19 7 15");
    const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path2.setAttribute("d", "M21 13v2a4 4 0 0 1-4 4H3");
    svg.append(p1, path1, p2, path2);
    return svg;
  }

  function createClockIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "12");
    svg.setAttribute("height", "12");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2.2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", "12");
    circle.setAttribute("r", "10");
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    poly.setAttribute("points", "12 6 12 12 16 14");
    svg.append(circle, poly);
    return svg;
  }

  function createTrashIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2.2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    const p1 = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    p1.setAttribute("points", "3 6 5 6 21 6");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6");
    const p2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p2.setAttribute("d", "M10 11v6");
    const p3 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p3.setAttribute("d", "M14 11v6");
    const p4 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p4.setAttribute("d", "M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2");
    svg.append(p1, path, p2, p3, p4);
    return svg;
  }

  // Inline Edit Helpers
  function startInlineTitleEdit(task, titleEl) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "inline-edit-input";
    input.value = task.title;

    let finished = false;
    const commit = () => {
      if (finished) return;
      finished = true;
      const nextTitle = input.value.trim();
      if (nextTitle && nextTitle !== task.title) {
        setCurrentTasks(
          getCurrentTasks().map((t) => (t.id === task.id ? { ...t, title: nextTitle } : t))
        );
        updatePomodoroFocusLabel();
      }
      render();
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      } else if (e.key === "Escape") {
        finished = true;
        render();
      }
    });
    input.addEventListener("blur", commit);

    titleEl.replaceWith(input);
    input.focus();
    input.select();
  }

  function startInlineTimeEdit(task, timeBadgeEl) {
    const wrapper = document.createElement("div");
    wrapper.className = "inline-time-editor";

    const startInput = document.createElement("input");
    startInput.type = "time";
    startInput.className = "inline-time-input";
    startInput.value = task.startTime || "";

    const sep = document.createElement("span");
    sep.textContent = "–";

    const endInput = document.createElement("input");
    endInput.type = "time";
    endInput.className = "inline-time-input";
    endInput.value = task.endTime || "";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "inline-time-save";
    saveBtn.textContent = "Lưu";

    const commit = () => {
      setCurrentTasks(
        getCurrentTasks().map((t) =>
          t.id === task.id
            ? { ...t, startTime: startInput.value, endTime: endInput.value }
            : t
        )
      );
      render();
    };

    const handleKey = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      } else if (e.key === "Escape") {
        render();
      }
    };

    startInput.addEventListener("keydown", handleKey);
    endInput.addEventListener("keydown", handleKey);
    saveBtn.addEventListener("click", commit);

    wrapper.append(startInput, sep, endInput, saveBtn);
    timeBadgeEl.replaceWith(wrapper);
    startInput.focus();
  }

  function reorderTasks(draggedId, targetId) {
    if (!draggedId || !targetId || draggedId === targetId) return;
    const list = [...getCurrentTasks()];
    const fromIdx = list.findIndex((t) => t.id === draggedId);
    const toIdx = list.findIndex((t) => t.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    setCurrentTasks(list);
    render();
  }

  function renderTaskItem(task) {
    const li = document.createElement("li");
    li.className = `task-item${task.completed ? " completed" : ""}`;
    li.dataset.id = task.id;
    li.draggable = true;

    // Drag & Drop handlers
    li.addEventListener("dragstart", (e) => {
      draggedTaskId = task.id;
      li.classList.add("dragging");
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", task.id);
      }
    });

    li.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (draggedTaskId && draggedTaskId !== task.id) {
        li.classList.add("drag-over");
      }
    });

    li.addEventListener("dragleave", () => {
      li.classList.remove("drag-over");
    });

    li.addEventListener("drop", (e) => {
      e.preventDefault();
      li.classList.remove("drag-over");
      reorderTasks(draggedTaskId, task.id);
    });

    li.addEventListener("dragend", () => {
      draggedTaskId = null;
      document
        .querySelectorAll(".task-item.dragging, .task-item.drag-over")
        .forEach((el) => el.classList.remove("dragging", "drag-over"));
    });

    const dragHandle = document.createElement("span");
    dragHandle.className = "drag-handle";
    dragHandle.title = "Kéo thả để sắp xếp thứ tự ưu tiên";
    dragHandle.textContent = "⋮⋮";

    const checkBtn = document.createElement("button");
    checkBtn.type = "button";
    checkBtn.className = "check-btn";
    checkBtn.setAttribute(
      "aria-label",
      task.completed ? "Đánh dấu chưa hoàn thành" : "Đánh dấu hoàn thành"
    );
    checkBtn.appendChild(createCheckIcon());
    checkBtn.addEventListener("click", () => toggleComplete(task.id));

    const content = document.createElement("div");
    content.className = "task-content";

    const titleEl = document.createElement("span");
    titleEl.className = "task-title";
    titleEl.title = "Nhấp đúp để sửa tên công việc";
    titleEl.textContent = task.title;
    titleEl.addEventListener("dblclick", () => startInlineTitleEdit(task, titleEl));
    content.appendChild(titleEl);

    const metaEl = document.createElement("div");
    metaEl.className = "task-meta";

    const tagKey = task.tag && TAG_META[task.tag] ? task.tag : "work";
    const tagBadge = document.createElement("span");
    tagBadge.className = `tag-badge ${TAG_META[tagKey].className}`;
    tagBadge.textContent = TAG_META[tagKey].label;
    metaEl.appendChild(tagBadge);

    const timeText = formatTimeRange(task.startTime, task.endTime);
    const timeBadge = document.createElement("span");
    timeBadge.className = `time-badge${timeText ? "" : " time-empty"}`;
    timeBadge.title = "Nhấp đúp để sửa giờ giấc";
    timeBadge.appendChild(createClockIcon());
    const tSpan = document.createElement("span");
    tSpan.textContent = timeText || "Thêm giờ";
    timeBadge.appendChild(tSpan);
    timeBadge.addEventListener("dblclick", () => startInlineTimeEdit(task, timeBadge));
    metaEl.appendChild(timeBadge);

    if (task.repeatDaily) {
      const repeatBadge = document.createElement("span");
      repeatBadge.className = "repeat-badge";
      repeatBadge.appendChild(createRepeatIcon(11));
      const rSpan = document.createElement("span");
      rSpan.textContent = "Hàng ngày";
      repeatBadge.appendChild(rSpan);
      metaEl.appendChild(repeatBadge);
    }

    const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
    const hasDetails = Boolean((task.note && task.note.trim()) || subtasks.length > 0);
    const isExpanded = expandedTaskIds.has(task.id);

    if (subtasks.length > 0) {
      const doneSub = subtasks.filter((s) => s.done).length;
      const subBadge = document.createElement("span");
      subBadge.className = "time-badge";
      subBadge.textContent = `☑️ ${doneSub}/${subtasks.length}`;
      metaEl.appendChild(subBadge);
    }

    content.appendChild(metaEl);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const detailsBtn = document.createElement("button");
    detailsBtn.type = "button";
    detailsBtn.className = `icon-btn details-btn${hasDetails ? " has-details" : ""}${
      isExpanded ? " active" : ""
    }`;
    detailsBtn.title = "Mở ghi chú & việc nhỏ (Sub-tasks)";
    detailsBtn.setAttribute("aria-label", "Mở ghi chú và việc nhỏ");
    detailsBtn.textContent = "📝";
    detailsBtn.addEventListener("click", () => {
      if (expandedTaskIds.has(task.id)) {
        expandedTaskIds.delete(task.id);
      } else {
        expandedTaskIds.add(task.id);
      }
      render();
    });

    const focusBtn = document.createElement("button");
    focusBtn.type = "button";
    focusBtn.className = `icon-btn focus-btn${focusedTaskId === task.id ? " active" : ""}`;
    focusBtn.title = "Chọn làm công việc tập trung cho Pomodoro";
    focusBtn.setAttribute("aria-label", "Chọn cho Pomodoro");
    focusBtn.textContent = "🍅";
    focusBtn.addEventListener("click", () => selectFocusTask(task.id));

    const repeatBtn = document.createElement("button");
    repeatBtn.type = "button";
    repeatBtn.className = `icon-btn repeat-btn${task.repeatDaily ? " active" : ""}`;
    repeatBtn.title = task.repeatDaily
      ? "Tắt lặp lại mỗi ngày"
      : "Bật lặp lại mỗi ngày";
    repeatBtn.setAttribute(
      "aria-label",
      task.repeatDaily ? "Tắt lặp lại mỗi ngày" : "Bật lặp lại mỗi ngày"
    );
    repeatBtn.appendChild(createRepeatIcon(15));
    repeatBtn.addEventListener("click", () => toggleRepeatDaily(task.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "icon-btn delete-btn";
    deleteBtn.title = "Xóa công việc";
    deleteBtn.setAttribute("aria-label", "Xóa công việc");
    deleteBtn.appendChild(createTrashIcon());
    deleteBtn.addEventListener("click", () => deleteTask(task.id));

    actions.append(detailsBtn, focusBtn, repeatBtn, deleteBtn);

    const mainRow = document.createElement("div");
    mainRow.className = "task-main-row";
    mainRow.append(dragHandle, checkBtn, content, actions);
    li.appendChild(mainRow);

    if (isExpanded) {
      const panel = document.createElement("div");
      panel.className = "task-details-panel";

      const noteInput = document.createElement("input");
      noteInput.type = "text";
      noteInput.className = "task-note-input";
      noteInput.placeholder = "📌 Ghi chú chi tiết cho công việc này...";
      noteInput.value = task.note || "";
      noteInput.addEventListener("input", () => {
        setCurrentTasks(
          getCurrentTasks().map((t) =>
            t.id === task.id ? { ...t, note: noteInput.value } : t
          )
        );
      });
      panel.appendChild(noteInput);

      if (subtasks.length > 0) {
        const subUl = document.createElement("ul");
        subUl.className = "subtask-list";
        subtasks.forEach((sub) => {
          const subLi = document.createElement("li");
          subLi.className = `subtask-item${sub.done ? " done" : ""}`;

          const subCheck = document.createElement("input");
          subCheck.type = "checkbox";
          subCheck.className = "subtask-check";
          subCheck.checked = Boolean(sub.done);
          subCheck.addEventListener("change", () => toggleSubtask(task.id, sub.id));

          const subText = document.createElement("span");
          subText.className = "subtask-text";
          subText.textContent = sub.text;

          const subDel = document.createElement("button");
          subDel.type = "button";
          subDel.className = "subtask-del-btn";
          subDel.title = "Xóa việc nhỏ";
          subDel.textContent = "✕";
          subDel.addEventListener("click", () => deleteSubtask(task.id, sub.id));

          subLi.append(subCheck, subText, subDel);
          subUl.appendChild(subLi);
        });
        panel.appendChild(subUl);
      }

      const subAddRow = document.createElement("div");
      subAddRow.className = "subtask-add-row";

      const subInput = document.createElement("input");
      subInput.type = "text";
      subInput.className = "subtask-input";
      subInput.placeholder = "+ Thêm việc nhỏ (sub-task)...";

      const subAddBtn = document.createElement("button");
      subAddBtn.type = "button";
      subAddBtn.className = "subtask-add-btn";
      subAddBtn.textContent = "Thêm";

      const submitSubtask = () => {
        const val = subInput.value.trim();
        if (!val) return;
        addSubtask(task.id, val);
      };

      subAddBtn.addEventListener("click", submitSubtask);
      subInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submitSubtask();
        }
      });

      subAddRow.append(subInput, subAddBtn);
      panel.appendChild(subAddRow);
      li.appendChild(panel);
    }

    return li;
  }

  function render() {
    updateSelectedDayHeader();
    updateProgress();
    const visibleTasks = getFilteredTasks();
    taskListEl.innerHTML = "";

    if (visibleTasks.length === 0) {
      emptyStateEl.hidden = false;
    } else {
      emptyStateEl.hidden = true;
      const fragment = document.createDocumentFragment();
      visibleTasks.forEach((task) => {
        fragment.appendChild(renderTaskItem(task));
      });
      taskListEl.appendChild(fragment);
    }
    updatePomodoroFocusLabel();
  }

  // Habit Streak Calculation (🔥 X ngày liên tiếp)
  function calculateStreak() {
    let streak = 0;
    const cursor = new Date();
    const todayKey = getDateKey(cursor);

    // Nếu hôm nay chưa xong thì tính chuỗi liên tiếp đến hết hôm qua
    if (calendarStatus[todayKey] !== "done") {
      cursor.setDate(cursor.getDate() - 1);
    }

    while (true) {
      const key = getDateKey(cursor);
      if (calendarStatus[key] === "done") {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  function renderCalendar() {
    const viewDate = parseDateKey(selectedDateKey);
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const todayKey = activeDateKey;

    const monthTitle = new Intl.DateTimeFormat("vi-VN", {
      month: "long",
      year: "numeric",
    }).format(viewDate);
    calendarMonthTitleEl.textContent = monthTitle;

    const firstDayOfMonth = new Date(year, month, 1);
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    calendarGridEl.innerHTML = "";
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < startOffset; i++) {
      const emptyCell = document.createElement("div");
      emptyCell.className = "calendar-cell-empty";
      fragment.appendChild(emptyCell);
    }

    let doneCount = 0;
    let pendingCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      const key = getDateKey(dateObj);
      const status = calendarStatus[key];

      if (status === "done") doneCount++;
      if (status === "pending") pendingCount++;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "calendar-day";
      if (key === todayKey) btn.classList.add("is-today");
      if (key === selectedDateKey) btn.classList.add("is-selected");
      if (status === "done") btn.classList.add("status-done");
      if (status === "pending") btn.classList.add("status-pending");

      btn.setAttribute(
        "aria-label",
        `Ngày ${day} tháng ${month + 1}: ${
          status === "done"
            ? "Đã hoàn thành"
            : status === "pending"
            ? "Chưa hoàn thành"
            : "Chưa đánh dấu"
        }`
      );

      const numSpan = document.createElement("span");
      numSpan.className = "day-number";
      numSpan.textContent = String(day);

      const markSpan = document.createElement("span");
      markSpan.className = "day-mark";
      markSpan.textContent = status === "done" ? "✔️" : status === "pending" ? "❌" : "";

      btn.append(numSpan, markSpan);
      btn.addEventListener("click", () => selectCalendarDate(key));
      fragment.appendChild(btn);
    }

    calendarGridEl.appendChild(fragment);
    doneDaysCountEl.textContent = String(doneCount);
    pendingDaysCountEl.textContent = String(pendingCount);

    const currentStreak = calculateStreak();
    const bestStreak = calculateBestStreak();
    const trackedDays = doneCount + pendingCount;
    const monthRate = trackedDays === 0 ? 0 : Math.round((doneCount / trackedDays) * 100);

    streakHeroCountEl.textContent = String(currentStreak);
    bestStreakCountEl.textContent = `${bestStreak} ngày`;
    monthRateTextEl.textContent = `${monthRate}%`;

    const selectedDone = calendarStatus[selectedDateKey] === "done";
    confirmDayBtn.classList.toggle("is-done", selectedDone);
    confirmDayBtn.textContent = selectedDone
      ? "✔️ Đã xong ngày này"
      : "✔️ Xác nhận xong ngày";
  }

  function calculateBestStreak() {
    const doneKeys = Object.keys(calendarStatus)
      .filter((k) => calendarStatus[k] === "done")
      .sort();
    if (doneKeys.length === 0) return 0;

    let best = 1;
    let run = 1;
    for (let i = 1; i < doneKeys.length; i++) {
      const prev = parseDateKey(doneKeys[i - 1]);
      const curr = parseDateKey(doneKeys[i]);
      const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        run++;
        if (run > best) best = run;
      } else {
        run = 1;
      }
    }
    return best;
  }

  function addSubtask(taskId, text) {
    setCurrentTasks(
      getCurrentTasks().map((t) => {
        if (t.id !== taskId) return t;
        const nextSubs = Array.isArray(t.subtasks) ? [...t.subtasks] : [];
        nextSubs.push({ id: generateId(), text, done: false });
        return { ...t, subtasks: nextSubs };
      })
    );
    render();
  }

  function toggleSubtask(taskId, subId) {
    setCurrentTasks(
      getCurrentTasks().map((t) => {
        if (t.id !== taskId) return t;
        const nextSubs = (t.subtasks || []).map((s) =>
          s.id === subId ? { ...s, done: !s.done } : s
        );
        return { ...t, subtasks: nextSubs };
      })
    );
    render();
  }

  function deleteSubtask(taskId, subId) {
    setCurrentTasks(
      getCurrentTasks().map((t) => {
        if (t.id !== taskId) return t;
        const nextSubs = (t.subtasks || []).filter((s) => s.id !== subId);
        return { ...t, subtasks: nextSubs };
      })
    );
    render();
  }

  function selectCalendarDate(dateKey) {
    selectedDateKey = dateKey;
    ensureDateInitialized(dateKey);
    render();
    renderCalendar();
  }

  function toggleConfirmSelectedDay() {
    const isCurrentlyDone = calendarStatus[selectedDateKey] === "done";
    calendarStatus[selectedDateKey] = isCurrentlyDone ? "pending" : "done";
    saveCalendarStatus();
    renderCalendar();
  }

  // Task CRUD
  function addTask(title, startTime, endTime, repeatDaily, tag) {
    const newTask = {
      id: generateId(),
      title,
      startTime,
      endTime,
      tag: tag || "work",
      repeatDaily,
      completed: false,
      createdAt: Date.now(),
    };
    setCurrentTasks([...getCurrentTasks(), newTask]);
    syncDateCalendarStatus(selectedDateKey);
    render();
    renderCalendar();
  }

  function toggleComplete(id) {
    setCurrentTasks(
      getCurrentTasks().map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      )
    );
    syncDateCalendarStatus(selectedDateKey);
    render();
    renderCalendar();
  }

  function toggleRepeatDaily(id) {
    setCurrentTasks(
      getCurrentTasks().map((t) =>
        t.id === id ? { ...t, repeatDaily: !t.repeatDaily } : t
      )
    );
    render();
  }

  function deleteTask(id) {
    setCurrentTasks(getCurrentTasks().filter((t) => t.id !== id));
    if (focusedTaskId === id) focusedTaskId = null;
    syncDateCalendarStatus(selectedDateKey);
    render();
    renderCalendar();
  }

  // Pomodoro Auto-Loop & Custom Duration Logic
  function getAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function loadPomodoroSettings() {
    try {
      const raw = localStorage.getItem(POMO_SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        pomoWorkMin = clampInt(parsed.workMin, 1, 120, 25);
        pomoBreakMin = clampInt(parsed.breakMin, 1, 60, 5);
        pomoTotalCycles = clampInt(parsed.totalCycles, 1, 12, 4);
      }
    } catch {
      // keep defaults
    }
    pomoWorkInput.value = String(pomoWorkMin);
    pomoBreakInput.value = String(pomoBreakMin);
    pomoCyclesInput.value = String(pomoTotalCycles);
    pomoSecondsLeft = (pomoMode === "work" ? pomoWorkMin : pomoBreakMin) * 60;
  }

  function savePomodoroSettings() {
    localStorage.setItem(
      POMO_SETTINGS_KEY,
      JSON.stringify({
        workMin: pomoWorkMin,
        breakMin: pomoBreakMin,
        totalCycles: pomoTotalCycles,
      })
    );
  }

  function clampInt(value, min, max, fallback) {
    const n = parseInt(value, 10);
    if (Number.isNaN(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function applyPomodoroInputs() {
    pomoWorkMin = clampInt(pomoWorkInput.value, 1, 120, 25);
    pomoBreakMin = clampInt(pomoBreakInput.value, 1, 60, 5);
    pomoTotalCycles = clampInt(pomoCyclesInput.value, 1, 12, 4);
    pomoWorkInput.value = String(pomoWorkMin);
    pomoBreakInput.value = String(pomoBreakMin);
    pomoCyclesInput.value = String(pomoTotalCycles);
    savePomodoroSettings();

    if (pomoCurrentCycle > pomoTotalCycles) {
      pomoCurrentCycle = pomoTotalCycles;
    }
    if (pomoIntervalId === null) {
      pomoCompletedAll = false;
      pomoSecondsLeft = (pomoMode === "work" ? pomoWorkMin : pomoBreakMin) * 60;
      renderPomodoro();
    }
  }

  function updatePomodoroFocusLabel() {
    const allCurrent = getCurrentTasks();
    const found = allCurrent.find((t) => t.id === focusedTaskId);
    let labelText = "Chưa chọn công việc";
    if (found) {
      labelText = found.title;
    } else {
      const firstPending = allCurrent.find((t) => !t.completed);
      if (firstPending) {
        labelText = `${firstPending.title} (gợi ý)`;
      }
    }
    pomoFocusTaskEl.textContent = labelText;
    miniPomoTaskEl.textContent = labelText;
  }

  function selectFocusTask(id) {
    focusedTaskId = focusedTaskId === id ? null : id;
    render();
  }

  function formatPomoTime(totalSec) {
    const m = String(Math.floor(totalSec / 60)).padStart(2, "0");
    const s = String(totalSec % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  function renderPomodoro() {
    const formatted = formatPomoTime(pomoSecondsLeft);
    pomoTimerDisplayEl.textContent = formatted;
    miniPomoTimerEl.textContent = formatted;

    const isRunning = pomoIntervalId !== null;
    pomoStartBtn.disabled = isRunning;
    pomoPauseBtn.disabled = !isRunning;
    miniPomoToggleBtn.textContent = isRunning ? "⏸" : "▶";
    miniPomoToggleBtn.title = isRunning ? "Tạm dừng (Space)" : "Bắt đầu (Space)";

    pomoModeButtons.forEach((b) =>
      b.classList.toggle("active", b.dataset.mode === pomoMode)
    );

    if (pomoCompletedAll) {
      pomoCycleStatusEl.textContent = `🎉 Hoàn thành ${pomoTotalCycles}/${pomoTotalCycles} chu kỳ!`;
      miniPomoStatusEl.textContent = `Xong ${pomoTotalCycles}/${pomoTotalCycles}`;
    } else if (pomoMode === "work") {
      pomoCycleStatusEl.textContent = `Chu kỳ làm việc ${pomoCurrentCycle}/${pomoTotalCycles}`;
      miniPomoStatusEl.textContent = `Làm việc ${pomoCurrentCycle}/${pomoTotalCycles}`;
    } else {
      pomoCycleStatusEl.textContent = `Chu kỳ nghỉ ${pomoCurrentCycle}/${pomoTotalCycles}`;
      miniPomoStatusEl.textContent = `Nghỉ ${pomoCurrentCycle}/${pomoTotalCycles}`;
    }
  }

  function setPomodoroMode(mode) {
    stopPomodoroInterval();
    pomoCompletedAll = false;
    pomoMode = mode;
    pomoSecondsLeft = (mode === "work" ? pomoWorkMin : pomoBreakMin) * 60;
    renderPomodoro();
  }

  function stopPomodoroInterval() {
    if (pomoIntervalId !== null) {
      clearInterval(pomoIntervalId);
      pomoIntervalId = null;
    }
  }

  function startPomodoro() {
    if (pomoIntervalId !== null) return;
    if (pomoCompletedAll) {
      pomoCompletedAll = false;
      pomoCurrentCycle = 1;
      pomoMode = "work";
      pomoSecondsLeft = pomoWorkMin * 60;
    }
    playBellSound();
    pomoIntervalId = setInterval(() => {
      if (pomoSecondsLeft > 0) {
        pomoSecondsLeft--;
        renderPomodoro();
        return;
      }

      // Hết giờ của pha hiện tại -> phát chuông & tự động chuyển pha/chu kỳ
      playBellSound();
      if (pomoMode === "work") {
        pomoMode = "break";
        pomoSecondsLeft = pomoBreakMin * 60;
        renderPomodoro();
      } else {
        if (pomoCurrentCycle < pomoTotalCycles) {
          pomoCurrentCycle++;
          pomoMode = "work";
          pomoSecondsLeft = pomoWorkMin * 60;
          renderPomodoro();
        } else {
          stopPomodoroInterval();
          pomoCompletedAll = true;
          setTimeout(playBellSound, 280);
          renderPomodoro();
        }
      }
    }, 1000);
    renderPomodoro();
  }

  function pausePomodoro() {
    stopPomodoroInterval();
    renderPomodoro();
  }

  function resetPomodoro() {
    stopPomodoroInterval();
    pomoCompletedAll = false;
    pomoCurrentCycle = 1;
    pomoMode = "work";
    pomoSecondsLeft = pomoWorkMin * 60;
    renderPomodoro();
  }

  // Custom Background Uploader
  function applyCustomBackground(dataUrl) {
    if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
      return;
    }
    document.body.style.backgroundImage = `url("${dataUrl}")`;
    resetBgBtn.hidden = false;
  }

  function loadCustomBackground() {
    const saved = safeGetItem(CUSTOM_BG_KEY);
    if (saved) {
      applyCustomBackground(saved);
    }
  }

  function resetCustomBackground() {
    document.body.style.backgroundImage = "";
    safeRemoveItem(CUSTOM_BG_KEY);
    resetBgBtn.hidden = true;
    bgFileInput.value = "";
  }

  function handleBackgroundFileUpload(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      if (!result || !result.startsWith("data:image/")) return;

      // Nếu ảnh nhỏ hơn ~2MB thì lưu thẳng; nếu lớn hơn thì nén nhẹ để vừa localStorage
      if (result.length < 2 * 1024 * 1024) {
        if (safeSetItem(CUSTOM_BG_KEY, result)) {
          applyCustomBackground(result);
          return;
        }
      }

      const img = new Image();
      img.onload = () => {
        const maxW = 2560;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL("image/jpeg", 0.85);
        safeSetItem(CUSTOM_BG_KEY, compressed);
        applyCustomBackground(compressed);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  }

  // Ambient Sounds Synthesizer (Web Audio API)
  function stopAmbientSound() {
    if (ambientBirdTimer !== null) {
      clearInterval(ambientBirdTimer);
      ambientBirdTimer = null;
    }
    ambientNodes.forEach((node) => {
      try {
        if (typeof node.stop === "function") node.stop();
        node.disconnect();
      } catch {
        // ignore
      }
    });
    ambientNodes = [];
    ambientMasterGain = null;
  }

  function createNoiseBuffer(ctx, seconds = 3) {
    const bufferSize = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.04 * white) / 1.04;
      data[i] = lastOut * 2.4;
    }
    return buffer;
  }

  function triggerBirdChirp(ctx, dest) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const baseFreq = 1800 + Math.random() * 900;
    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.35, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, now + 0.16);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  function startAmbientSound(type) {
    const ctx = getAudioContext();
    if (!ctx) return;

    stopAmbientSound();

    const masterGain = ctx.createGain();
    const vol = Number(ambientVolumeInput.value) / 100;
    masterGain.gain.setValueAtTime(vol * 0.55, ctx.currentTime);
    masterGain.connect(ctx.destination);
    ambientMasterGain = masterGain;

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = createNoiseBuffer(ctx, 4);
    noiseSource.loop = true;

    const filter = ctx.createBiquadFilter();

    if (type === "rain") {
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1100, ctx.currentTime);
      filter.Q.setValueAtTime(0.6, ctx.currentTime);
      noiseSource.connect(filter);
      filter.connect(masterGain);
    } else if (type === "stream") {
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(520, ctx.currentTime);
      filter.Q.setValueAtTime(1.1, ctx.currentTime);

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(0.22, ctx.currentTime);
      lfoGain.gain.setValueAtTime(220, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();
      ambientNodes.push(lfo, lfoGain);

      noiseSource.connect(filter);
      filter.connect(masterGain);
    } else if (type === "forest") {
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(420, ctx.currentTime);

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(0.1, ctx.currentTime);
      lfoGain.gain.setValueAtTime(140, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();
      ambientNodes.push(lfo, lfoGain);

      noiseSource.connect(filter);
      filter.connect(masterGain);

      triggerBirdChirp(ctx, masterGain);
      ambientBirdTimer = setInterval(() => {
        if (activeAmbientType === "forest") {
          triggerBirdChirp(ctx, masterGain);
        }
      }, 4200);
    }

    noiseSource.start();
    ambientNodes.push(noiseSource, filter, masterGain);
  }

  function toggleAmbientSound(type) {
    if (activeAmbientType === type) {
      activeAmbientType = null;
      stopAmbientSound();
    } else {
      activeAmbientType = type;
      startAmbientSound(type);
    }
    ambientButtons.forEach((btn) =>
      btn.classList.toggle("active", btn.dataset.sound === activeAmbientType)
    );
  }

  // Ambient Settings Persistence
  function loadAmbientSettings() {
    try {
      const raw = safeGetItem(AMBIENT_SETTINGS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.volume === "number") {
        ambientVolumeInput.value = String(clampInt(parsed.volume, 0, 100, 45));
      }
    } catch {
      // ignore
    }
  }

  function saveAmbientSettings() {
    safeSetItem(
      AMBIENT_SETTINGS_KEY,
      JSON.stringify({ volume: clampInt(ambientVolumeInput.value, 0, 100, 45) })
    );
  }

  // Export & Import JSON Backup (with strict validation & XSS-safe sanitization)
  function sanitizeTaskObject(rawTask) {
    if (!rawTask || typeof rawTask !== "object") return null;
    const title = typeof rawTask.title === "string" ? rawTask.title.trim() : "";
    if (!title) return null;

    const validTags = ["work", "study", "personal", "sport"];
    const tag = validTags.includes(rawTask.tag) ? rawTask.tag : "work";
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    const startTime =
      typeof rawTask.startTime === "string" && timeRegex.test(rawTask.startTime)
        ? rawTask.startTime
        : "";
    const endTime =
      typeof rawTask.endTime === "string" && timeRegex.test(rawTask.endTime)
        ? rawTask.endTime
        : "";

    const subtasks = Array.isArray(rawTask.subtasks)
      ? rawTask.subtasks
          .filter((s) => s && typeof s.text === "string" && s.text.trim())
          .map((s) => ({
            id: typeof s.id === "string" && s.id ? s.id : generateId(),
            text: s.text.trim(),
            done: Boolean(s.done),
          }))
      : [];

    return {
      id: typeof rawTask.id === "string" && rawTask.id ? rawTask.id : generateId(),
      title,
      startTime,
      endTime,
      tag,
      note: typeof rawTask.note === "string" ? rawTask.note : "",
      subtasks,
      repeatDaily: Boolean(rawTask.repeatDaily),
      completed: Boolean(rawTask.completed),
      createdAt:
        typeof rawTask.createdAt === "number" && Number.isFinite(rawTask.createdAt)
          ? rawTask.createdAt
          : Date.now(),
    };
  }

  function exportBackupJson() {
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      tasksByDate,
      calendarStatus,
      pomoSettings: {
        workMin: pomoWorkMin,
        breakMin: pomoBreakMin,
        totalCycles: pomoTotalCycles,
      },
      ambientSettings: {
        volume: clampInt(ambientVolumeInput.value, 0, 100, 45),
      },
      scratchpad: scratchpadInput.value,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `personal-dashboard-backup-${getDateKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function importBackupJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || "{}"));
        if (!parsed || typeof parsed !== "object") {
          throw new Error("Invalid backup format");
        }

        const dateKeyRegex = /^\d{4}-\d{2}-\d{2}$/;

        if (parsed.tasksByDate && typeof parsed.tasksByDate === "object") {
          const nextTasksByDate = {};
          for (const [k, list] of Object.entries(parsed.tasksByDate)) {
            if (!dateKeyRegex.test(k) || !Array.isArray(list)) continue;
            nextTasksByDate[k] = list.map(sanitizeTaskObject).filter(Boolean);
          }
          tasksByDate = nextTasksByDate;
          ensureDateInitialized(selectedDateKey);
          saveTasksByDate();
        }

        if (parsed.calendarStatus && typeof parsed.calendarStatus === "object") {
          const nextCal = {};
          for (const [k, v] of Object.entries(parsed.calendarStatus)) {
            if (dateKeyRegex.test(k) && (v === "done" || v === "pending")) {
              nextCal[k] = v;
            }
          }
          calendarStatus = nextCal;
          saveCalendarStatus();
        }

        if (parsed.pomoSettings && typeof parsed.pomoSettings === "object") {
          pomoWorkMin = clampInt(parsed.pomoSettings.workMin, 1, 120, 25);
          pomoBreakMin = clampInt(parsed.pomoSettings.breakMin, 1, 60, 5);
          pomoTotalCycles = clampInt(parsed.pomoSettings.totalCycles, 1, 12, 4);
          pomoWorkInput.value = String(pomoWorkMin);
          pomoBreakInput.value = String(pomoBreakMin);
          pomoCyclesInput.value = String(pomoTotalCycles);
          savePomodoroSettings();
          resetPomodoro();
        }

        if (parsed.ambientSettings && typeof parsed.ambientSettings === "object") {
          ambientVolumeInput.value = String(
            clampInt(parsed.ambientSettings.volume, 0, 100, 45)
          );
          saveAmbientSettings();
        }

        if (typeof parsed.scratchpad === "string") {
          scratchpadInput.value = parsed.scratchpad;
          saveScratchpad();
        }

        syncDateCalendarStatus(selectedDateKey);
        render();
        renderCalendar();
        scratchpadStatusEl.textContent = "✓ Đã nhập dữ liệu JSON";
      } catch {
        scratchpadStatusEl.textContent = "⚠️ File JSON không hợp lệ";
      } finally {
        importJsonInput.value = "";
      }
    };
    reader.readAsText(file, "utf-8");
  }

  // Quick Scratchpad
  function loadScratchpad() {
    const saved = safeGetItem(SCRATCHPAD_KEY);
    if (saved !== null) {
      scratchpadInput.value = saved;
    }
  }

  function saveScratchpad() {
    safeSetItem(SCRATCHPAD_KEY, scratchpadInput.value);
    scratchpadStatusEl.textContent = "✓ Đã tự động lưu";
  }

  // Event Listeners
  repeatToggleInput.addEventListener("click", () => {
    isNewTaskRepeatDaily = !isNewTaskRepeatDaily;
    repeatToggleInput.classList.toggle("active", isNewTaskRepeatDaily);
    repeatToggleInput.setAttribute("aria-pressed", String(isNewTaskRepeatDaily));
  });

  tagPickButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tagPickButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedNewTag = btn.dataset.tag;
    });
  });

  addTaskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = taskInput.value.trim();
    if (!title) return;

    addTask(
      title,
      startTimeInput.value,
      endTimeInput.value,
      isNewTaskRepeatDaily,
      selectedNewTag
    );

    taskInput.value = "";
    startTimeInput.value = "";
    endTimeInput.value = "";
    isNewTaskRepeatDaily = false;
    repeatToggleInput.classList.remove("active");
    repeatToggleInput.setAttribute("aria-pressed", "false");
    taskInput.focus();
  });

  resetDailyBtn.addEventListener("click", () => {
    resetDailyTasks(selectedDateKey, true);
  });

  backToTodayBtn.addEventListener("click", () => {
    selectCalendarDate(activeDateKey);
  });

  confirmDayBtn.addEventListener("click", toggleConfirmSelectedDay);
  weatherPillEl.addEventListener("click", () => fetchHanoiWeather(true));

  uploadBgBtn.addEventListener("click", () => bgFileInput.click());
  bgFileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleBackgroundFileUpload(file);
  });
  resetBgBtn.addEventListener("click", resetCustomBackground);

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      render();
    });
  });

  pomoModeButtons.forEach((btn) => {
    btn.addEventListener("click", () => setPomodoroMode(btn.dataset.mode));
  });
  pomoWorkInput.addEventListener("change", applyPomodoroInputs);
  pomoBreakInput.addEventListener("change", applyPomodoroInputs);
  pomoCyclesInput.addEventListener("change", applyPomodoroInputs);
  pomoStartBtn.addEventListener("click", startPomodoro);
  pomoPauseBtn.addEventListener("click", pausePomodoro);
  pomoResetBtn.addEventListener("click", resetPomodoro);

  miniPomoToggleBtn.addEventListener("click", () => {
    if (pomoIntervalId !== null) {
      pausePomodoro();
    } else {
      startPomodoro();
    }
  });
  miniPomoResetBtn.addEventListener("click", resetPomodoro);

  // Phím tắt bàn phím: Ctrl+N (hoặc Alt+N) thêm việc nhanh, Space chạy/dừng Pomodoro
  document.addEventListener("keydown", (e) => {
    const tag = document.activeElement ? document.activeElement.tagName : "";
    const isTyping =
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      (document.activeElement && document.activeElement.isContentEditable);

    if ((e.ctrlKey || e.altKey) && e.key.toLowerCase() === "n") {
      e.preventDefault();
      taskInput.focus();
      taskInput.select();
      return;
    }

    if (e.code === "Space" && !isTyping) {
      e.preventDefault();
      if (pomoIntervalId !== null) {
        pausePomodoro();
      } else {
        startPomodoro();
      }
    }
  });

  ambientButtons.forEach((btn) => {
    btn.addEventListener("click", () => toggleAmbientSound(btn.dataset.sound));
  });
  ambientVolumeInput.addEventListener("input", () => {
    saveAmbientSettings();
    if (ambientMasterGain && audioCtx) {
      const vol = Number(ambientVolumeInput.value) / 100;
      ambientMasterGain.gain.setValueAtTime(vol * 0.55, audioCtx.currentTime);
    }
  });

  exportJsonBtn.addEventListener("click", exportBackupJson);
  importJsonBtn.addEventListener("click", () => importJsonInput.click());
  importJsonInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) importBackupJson(file);
  });

  scratchpadInput.addEventListener("input", saveScratchpad);
  clearScratchpadBtn.addEventListener("click", () => {
    scratchpadInput.value = "";
    saveScratchpad();
    scratchpadInput.focus();
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateClockAndDate();
  });
  window.addEventListener("focus", updateClockAndDate);

  // Init
  loadCustomBackground();
  loadPomodoroSettings();
  loadAmbientSettings();
  loadScratchpad();
  loadData();
  syncDateCalendarStatus(activeDateKey);
  updateClockAndDate();
  render();
  renderCalendar();
  renderPomodoro();

  loadCachedWeather();
  fetchHanoiWeather(false);

  setInterval(updateClockAndDate, 1000);
  setInterval(() => fetchHanoiWeather(false), 10 * 60 * 1000);
})();
