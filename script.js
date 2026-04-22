const STORAGE_KEYS = {
  searchEngine: "selectedSearchEngine",
  wallpaper: "wallpaperCache",
  migrated: "legacyStorageMigrated",
};

const BING_WALLPAPER_API =
  "https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN";
const FETCH_TIMEOUT_MS = 6000;
const IMAGE_TIMEOUT_MS = 8000;

const state = {
  searchForm: null,
  searchEngine: null,
  searchEngineToggle: null,
  searchEngineLabel: null,
  searchEngineMenu: null,
  searchEngineOptions: [],
  searchInput: null,
  statusMessage: null,
};

document.addEventListener("DOMContentLoaded", () => {
  void init();
});

async function init() {
  cacheDomElements();
  bindEvents();

  await migrateLegacyStorage();

  const selectedSearchEngine = await getStoredValue(STORAGE_KEYS.searchEngine);
  if (isKnownSearchEngine(selectedSearchEngine)) {
    const selectedOption = state.searchEngineOptions.find(
      (option) => option.dataset.value === selectedSearchEngine
    );
    setSelectedSearchEngine(selectedSearchEngine, selectedOption.dataset.label);
  }

  state.searchInput.focus();

  const wallpaperCache = await getStoredValue(STORAGE_KEYS.wallpaper);
  const hasCachedWallpaper = Boolean(wallpaperCache?.url);

  if (hasCachedWallpaper) {
    applyBackgroundImage(wallpaperCache.url);
  }

  if (!isFreshWallpaper(wallpaperCache)) {
    await refreshWallpaper(hasCachedWallpaper);
  }
}

function cacheDomElements() {
  state.searchForm = document.getElementById("search-form");
  state.searchEngine = document.getElementById("search-engine");
  state.searchEngineToggle = document.getElementById("search-engine-toggle");
  state.searchEngineLabel = document.getElementById("search-engine-label");
  state.searchEngineMenu = document.getElementById("search-engine-menu");
  state.searchEngineOptions = Array.from(
    document.querySelectorAll(".search-select-option")
  );
  state.searchInput = document.getElementById("search-input");
  state.statusMessage = document.getElementById("status-message");
}

function bindEvents() {
  state.searchForm.addEventListener("submit", handleSearchSubmit);
  state.searchEngineToggle.addEventListener("click", handleSearchEngineToggle);
  state.searchEngineToggle.addEventListener(
    "keydown",
    handleSearchEngineToggleKeydown
  );
  state.searchEngineOptions.forEach((option) => {
    option.addEventListener("click", handleSearchEngineOptionClick);
  });
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleDocumentKeydown);
}

function handleSearchSubmit(event) {
  event.preventDefault();

  const query = state.searchInput.value.trim();
  if (!query) {
    setStatus("输入关键词后再搜索。", true);
    state.searchInput.focus();
    return;
  }

  clearStatus();

  const baseUrl = getSelectedSearchEngineValue();
  window.location.href = `${baseUrl}${encodeURIComponent(query)}`;
}

function handleSearchEngineToggle() {
  const isOpen = state.searchEngineToggle.getAttribute("aria-expanded") === "true";
  setSearchMenuOpen(!isOpen);
}

function handleSearchEngineToggleKeydown(event) {
  if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    setSearchMenuOpen(true);
    focusSelectedSearchEngineOption();
  }
}

async function handleSearchEngineOptionClick(event) {
  const option = event.currentTarget;
  const value = option.dataset.value;
  const label = option.dataset.label;

  setSelectedSearchEngine(value, label);
  setSearchMenuOpen(false);
  state.searchEngineToggle.focus();

  await setStoredValue(STORAGE_KEYS.searchEngine, value);
}

function handleDocumentClick(event) {
  if (state.searchEngine.contains(event.target)) {
    return;
  }

  setSearchMenuOpen(false);
}

function handleDocumentKeydown(event) {
  if (event.key === "Escape") {
    setSearchMenuOpen(false);
    state.searchEngineToggle.blur();
  }
}

async function refreshWallpaper(hasCachedWallpaper) {
  try {
    const imageUrl = await fetchLatestWallpaperUrl();

    await preloadImage(imageUrl, IMAGE_TIMEOUT_MS);
    applyBackgroundImage(imageUrl);

    await setStoredValue(STORAGE_KEYS.wallpaper, {
      url: imageUrl,
      dayKey: getCurrentDayKey(),
      fetchedAt: Date.now(),
    });

    clearStatus();
  } catch (error) {
    console.error("Failed to refresh wallpaper:", error);

    if (hasCachedWallpaper) {
      setStatus("壁纸刷新失败，已继续使用缓存图片。", false);
      return;
    }

    clearBackgroundImage();
    setStatus("壁纸加载失败，已回退到默认背景。", true);
  }
}

async function fetchLatestWallpaperUrl() {
  const response = await fetchWithTimeout(BING_WALLPAPER_API, FETCH_TIMEOUT_MS);

  if (!response.ok) {
    throw new Error(`Wallpaper API responded with ${response.status}.`);
  }

  const payload = await response.json();
  const imagePath = payload?.images?.[0]?.url?.trim();

  if (!imagePath) {
    throw new Error("Missing wallpaper URL in response.");
  }

  return new URL(imagePath, "https://cn.bing.com").toString();
}

function applyBackgroundImage(imageUrl) {
  document.body.style.setProperty("--background-image", `url("${imageUrl}")`);
}

function clearBackgroundImage() {
  document.body.style.setProperty("--background-image", "none");
}

function setStatus(message, isError) {
  state.statusMessage.textContent = message;
  state.statusMessage.classList.toggle("is-error", Boolean(isError));
}

function clearStatus() {
  setStatus("", false);
}

function isFreshWallpaper(wallpaperCache) {
  if (!wallpaperCache?.url) {
    return false;
  }

  if (wallpaperCache.dayKey) {
    return wallpaperCache.dayKey === getCurrentDayKey();
  }

  return false;
}

function isKnownSearchEngine(value) {
  return state.searchEngineOptions.some(
    (option) => option.dataset.value === value
  );
}

function getSelectedSearchEngineValue() {
  return state.searchEngine.dataset.value;
}

function setSelectedSearchEngine(value, label) {
  state.searchEngine.dataset.value = value;
  state.searchEngineLabel.textContent = label;

  state.searchEngineOptions.forEach((option) => {
    const isSelected = option.dataset.value === value;
    option.classList.toggle("is-selected", isSelected);
    option.setAttribute("aria-selected", String(isSelected));
  });
}

function setSearchMenuOpen(isOpen) {
  state.searchEngineToggle.setAttribute("aria-expanded", String(isOpen));
  state.searchEngineMenu.hidden = !isOpen;
}

function focusSelectedSearchEngineOption() {
  const selectedOption = state.searchEngineOptions.find((option) =>
    option.classList.contains("is-selected")
  );

  selectedOption?.focus();
}

function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, {
    signal: controller.signal,
    cache: "no-store",
  }).finally(() => {
    window.clearTimeout(timeoutId);
  });
}

function preloadImage(imageUrl, timeoutMs) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("Wallpaper image load timed out."));
    }, timeoutMs);

    function cleanup() {
      window.clearTimeout(timeoutId);
      image.onload = null;
      image.onerror = null;
    }

    image.onload = () => {
      cleanup();
      resolve();
    };

    image.onerror = () => {
      cleanup();
      reject(new Error("Wallpaper image failed to load."));
    };

    image.src = imageUrl;
  });
}

async function migrateLegacyStorage() {
  const isMigrated = await getStoredValue(STORAGE_KEYS.migrated);
  if (isMigrated) {
    return;
  }

  const legacySearchEngine = localStorage.getItem(STORAGE_KEYS.searchEngine);
  const legacyWallpaperUrl = localStorage.getItem("cachedImageUrl");

  if (legacySearchEngine && isKnownSearchEngine(legacySearchEngine)) {
    await setStoredValue(STORAGE_KEYS.searchEngine, legacySearchEngine);
  }

  if (legacyWallpaperUrl) {
    await setStoredValue(STORAGE_KEYS.wallpaper, {
      url: legacyWallpaperUrl,
      dayKey: getCurrentDayKey(),
      fetchedAt: Date.now(),
    });
  }

  await setStoredValue(STORAGE_KEYS.migrated, true);

  localStorage.removeItem(STORAGE_KEYS.searchEngine);
  localStorage.removeItem("cachedImageUrl");
}

function getStorageArea() {
  if (globalThis.chrome?.storage?.local) {
    return globalThis.chrome.storage.local;
  }

  return null;
}

function getStoredValue(key) {
  const storageArea = getStorageArea();
  if (!storageArea) {
    const rawValue = localStorage.getItem(key);
    return Promise.resolve(rawValue ? JSON.parse(rawValue) : null);
  }

  return new Promise((resolve) => {
    storageArea.get([key], (result) => {
      resolve(result[key] ?? null);
    });
  });
}

function setStoredValue(key, value) {
  const storageArea = getStorageArea();
  if (!storageArea) {
    localStorage.setItem(key, JSON.stringify(value));
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    storageArea.set({ [key]: value }, () => resolve());
  });
}

function getCurrentDayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
