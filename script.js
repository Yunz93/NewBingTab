// script.js

document.addEventListener("DOMContentLoaded", function () {
  // 尝试使用缓存图片
  tryUseCachedImageUrl();

  // 获取新的随机壁纸
  fetchRandomWallpaperFromBing();

  // 监听搜索表单提交事件
  document
    .getElementById("search-form")
    .addEventListener("submit", handleSearch);

  // 检查本地存储中是否保存了搜索引擎选择
  const selectedSearchEngine = localStorage.getItem("selectedSearchEngine");
  if (selectedSearchEngine) {
    document.getElementById("search-engine").value = selectedSearchEngine;
  }
});

// 处理搜索表单提交事件
function handleSearch(event) {
  event.preventDefault();
  const searchEngineUrl = document.getElementById("search-engine").value;
  const query = document.getElementById("search-input").value;
  const searchUrl = searchEngineUrl + encodeURIComponent(query);
  // 重定向到搜索页
  window.location.href = searchUrl;
}

function tryUseCachedImageUrl() {
  var cachedImageUrl = localStorage.getItem("cachedImageUrl");
  if (cachedImageUrl) {
    setBackgroundImage(cachedImageUrl);
  }
}

function fetchRandomWallpaperFromBing() {
  fetch("https://bing.img.run/rand.php")
    .then((response) => response.url)
    .then((imageUrl) => {
      setBackgroundImage(imageUrl.trim());
    })
    .catch((error) => {
      console.error("Error fetching random wallpaper:", error);
      tryUseCachedImageUrl();
    });
}

function setBackgroundImage(imageUrl) {
  var img = new Image();
  img.src = imageUrl;
  img.onload = function () {
    document.body.style.transition = "none";
    document.body.style.backgroundImage = 'url("' + img.src + '")';
    // 成功加载图片后，将图片地址缓存在本地存储中
    localStorage.setItem("cachedImageUrl", imageUrl);
    // 等待下一帧重新启用过渡效果
    requestAnimationFrame(function () {
      document.body.style.transition = "background-image 0.1s ease";
    });
  };
}

// 当搜索引擎选择改变时，将其保存到本地存储中
document
  .getElementById("search-engine")
  .addEventListener("change", function (event) {
    localStorage.setItem("selectedSearchEngine", event.target.value);
  });
