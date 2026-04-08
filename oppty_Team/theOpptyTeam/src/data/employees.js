// src/data/employees.js
export const employeeDB = [];

export async function syncEmployeesFromAPI() {
  try {
    const response = await fetch("/api/users/", {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) return;

    const users = await response.json();
    employeeDB.length = 0;
    
    users.forEach((user) => {
      employeeDB.push({
        id: user.id,
        name: user.name || user.email,
        email: user.email,
        role: user.role || "employee",
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.email)}&background=random`,
      });
    });
  } catch (error) {
    console.error("Failed to sync employees:", error);
  }
}

export default employeeDB;