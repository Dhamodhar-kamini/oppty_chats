// src/utils/auth.js
const AUTH_KEY = "chat_auth_user";

export function getAuthUser() {
  try {
    const data = localStorage.getItem(AUTH_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function setAuthUser(user) {
  if (user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_KEY);
  }
}

export function clearAuthUser() {
  localStorage.removeItem(AUTH_KEY);
  sessionStorage.clear();
}

export function updateAuthUser(updates) {
  const user = getAuthUser();
  if (user) {
    const updated = { ...user, ...updates };
    setAuthUser(updated);
    return updated;
  }
  return null;
}

export function getCsrfToken() {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrftoken') {
      return value;
    }
  }
  return null;
}

function hasSessionCookie() {
  return document.cookie.includes('sessionid=');
}

function clearCookies() {
  document.cookie.split(";").forEach((c) => {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });
}

async function ensureCsrfToken() {
  if (!getCsrfToken()) {
    try {
      await fetch("/api/me/", {
        method: "GET",
        credentials: "include",
      });
    } catch (err) {
      // Ignore
    }
  }
}

export async function loginUser(email, password) {
  console.log("🔐 Attempting login for:", email);
  
  await ensureCsrfToken();
  const csrfToken = getCsrfToken();
  
  try {
    const headers = { "Content-Type": "application/json" };
    if (csrfToken) headers["X-CSRFToken"] = csrfToken;
    
    const response = await fetch("/api/login/", {
      method: "POST",
      credentials: "include",
      headers: headers,
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Login failed");
    }

    console.log("✅ Login successful:", data);
    setAuthUser(data);
    
    let attempts = 0;
    while (!hasSessionCookie() && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      attempts++;
    }
    
    return { success: true, user: data };
    
  } catch (error) {
    console.error("❌ Login error:", error.message);
    return { success: false, error: error.message };
  }
}

export async function logoutUser() {
  const csrfToken = getCsrfToken();
  
  try {
    const headers = { "Content-Type": "application/json" };
    if (csrfToken) headers["X-CSRFToken"] = csrfToken;
    
    await fetch("/api/logout/", {
      method: "POST",
      credentials: "include",
      headers: headers,
    });
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    clearAuthUser();
    clearCookies();
  }
}