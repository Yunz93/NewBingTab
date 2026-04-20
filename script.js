const STORAGE_KEYS = {
  searchEngine: "selectedSearchEngine",
  wallpaper: "wallpaperCache",
  migrated: "legacyStorageMigrated",
};

const WALLPAPER_ENDPOINT = "https://bing.img.run/rand.php";
const FETCH_TIMEOUT_MS = 6000;
const IMAGE_TIMEOUT_MS = 8000;

const state = {
  searchForm: null,
  searchEngine: null,
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
    state.searchEngine.value = selectedSearchEngine;
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
  state.searchInput = document.getElementById("search-input");
  state.statusMessage = document.getElementById("status-message");
}

function bindEvents() {
  state.searchForm.addEventListener("submit", handleSearchSubmit);
  state.searchEngine.addEventListener("change", handleSearchEngineChange);
}

async function handleSearchEngineChange(event) {
  await setStoredValue(STORAGE_KEYS.searchEngine, event.target.value);
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

  const baseUrl = state.searchEngine.value;
  window.location.href = `${baseUrl}${encodeURIComponent(query)}`;
}

async function refreshWallpaper(hasCachedWallpaper) {
  try {
    const response = await fetchWithTimeout(WALLPAPER_ENDPOINT, FETCH_TIMEOUT_MS);
    const imageUrl = response.url?.trim();

    if (!imageUrl) {
      throw new Error("Missing wallpaper URL in response.");
    }

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
  return Array.from(state.searchEngine.options).some(
    (option) => option.value === value
  );
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
