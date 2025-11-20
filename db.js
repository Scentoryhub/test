// ==========================================
// db.js - 产品数据管理中心 (带缓存功能)
// ==========================================

// !!! 请替换成你第一步里复制的 Google Sheet CSV 链接 !!!
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTwZ_BgnXtX_ZdO87jkvLU_IMUByJwFKZoyzVVI0Sghwe-2_Qq676JsqsrO0AnGubJGuCxonKizijyj/pub?gid=0&single=true&output=csv";

// 缓存时间：5分钟 (300000毫秒)
// 意味着：你改了表格，发货员/客户最晚 5 分钟后看到变化。
const CACHE_DURATION = 5 * 60 * 1000;

// 全局变量，用来存放数据
window.perfumeDB = [];

document.addEventListener("DOMContentLoaded", () => {
  initProductData();
});

async function initProductData() {
  const cacheKey = "perfumeDB_Data";
  const timeKey = "perfumeDB_Time";
  const now = new Date().getTime();
  const cachedTime = localStorage.getItem(timeKey);
  const cachedData = localStorage.getItem(cacheKey);

  // 1. 检查缓存：如果有缓存且没过期，直接用
  if (cachedData && cachedTime && now - cachedTime < CACHE_DURATION) {
    console.log("🚀 (Cache) 加载本地数据 - 秒开");
    window.perfumeDB = JSON.parse(cachedData);
    runPageLogic(); // 启动页面渲染
    return;
  }

  // 2. 没有缓存或已过期：去 Google 下载
  console.log("🌐 (Network) 从 Google Sheet 下载最新数据...");

  // 如果是 index.html，可以在这里显示个简单的 loading
  const gallery =
    document.getElementById("perfume-list") ||
    document.getElementById("gallery");
  if (gallery)
    gallery.innerHTML =
      '<div style="grid-column:1/-1; text-align:center; padding:50px; color:#666;">Updating products...</div>';

  try {
    const response = await fetch(SHEET_URL);
    const data = await response.text();

    // 解析 CSV
    window.perfumeDB = parseCSV(data);

    // 自动计算供应商 (你的核心逻辑)
    window.perfumeDB.forEach((p) => {
      p.supplier = getSupplier(p.sku);
    });

    // 存入缓存
    localStorage.setItem(cacheKey, JSON.stringify(window.perfumeDB));
    localStorage.setItem(timeKey, now);

    runPageLogic(); // 启动页面渲染
  } catch (error) {
    console.error("下载失败:", error);
    // 失败回退：如果有旧缓存，就用旧的
    if (cachedData) {
      window.perfumeDB = JSON.parse(cachedData);
      runPageLogic();
      alert("网络较慢，已加载离线数据");
    } else {
      alert("无法连接产品数据库，请检查网络连接。");
    }
  }
}

// --- 页面渲染分发器 ---
function runPageLogic() {
  // 如果是首页 (有 renderPerfumes 函数)
  if (typeof renderPerfumes === "function") {
    renderPerfumes();
  }
  // 如果是购物车页 (有 renderCart 函数)
  // 注意：购物车通常读 localStorage 的 'perfumeCart'，但如果需要同步最新库存状态，
  // 你可以在 renderCart 里对比 window.perfumeDB
  if (typeof renderCart === "function") {
    renderCart();
  }
}

// --- 工具：CSV 解析器 ---
function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");
  const headers = lines[0]
    .trim()
    .split(",")
    .map((h) => h.trim());

  return lines
    .slice(1)
    .map((line) => {
      // 简单的逗号分割 (前提：你的产品名字里不要带逗号！)
      const values = line.split(",");
      const obj = {};

      // 防止空行报错
      if (values.length < headers.length) return null;

      headers.forEach((header, index) => {
        let val = values[index] ? values[index].trim() : "";
        // 数字转换
        if (header === "price" || header === "stock") {
          val = Number(val);
        }
        obj[header] = val;
      });
      return obj;
    })
    .filter((item) => item !== null);
}

// --- 工具：供应商判断逻辑 ---
function getSupplier(sku) {
  if (!sku) return "供应商二";
  if (String(sku).startsWith("1Z")) return "供应商五";
  if (/^H\d+$/.test(sku)) return "供应商三";
  if (/^A\d+$/.test(sku)) return "供应商一";
  if (/[a-z]/.test(sku) && sku.includes("-") && !/[A-Z]/.test(sku))
    return "供应商四";
  return "供应商二";
}
