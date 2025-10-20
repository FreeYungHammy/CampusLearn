import api from "../lib/api";

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalContent: number;
  systemHealth: string;
  weeklyGrowth: number;
  dailyActiveUsers: number;
  monthlyContentGrowth: number;
}

export interface RecentActivity {
  icon: string;
  title: string;
  description: string;
  time: string;
  type: "success" | "warning" | "error" | "info";
}

export interface HealthCheckResult {
  name: string;
  status: "healthy" | "warning" | "error";
  message: string;
  responseTime?: number;
  lastChecked: string;
}

export interface HealthScore {
  score: number;
  averageResponseTime: number;
  status: "excellent" | "good" | "fair" | "warning" | "error";
  message: string;
}

export interface TutorBill {
  tutorId: string;
  tutorName: string;
  tutorEmail: string;
  totalHours: number;
  hourlyRate: number;
  totalAmount: number;
  completedBookings: number;
  month: string;
  year: number;
}

export interface BillsData {
  tutors: TutorBill[];
  totalHours: number;
  totalAmount: number;
  month: string;
  year: number;
}


export const adminApi = {
  async getAdminStats(token: string): Promise<AdminStats> {
    const response = await api.get("/users/admin/stats", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  async getRecentActivity(token: string): Promise<RecentActivity[]> {
    const response = await api.get("/users/admin/activity", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  async getSystemHealth(token: string): Promise<HealthCheckResult[]> {
    const response = await api.get("/users/admin/health", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  async getSystemHealthScore(token: string): Promise<HealthScore> {
    const response = await api.get("/users/admin/health-score", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  // Database Tools CRUD operations
  async getAllEntities(token: string, entityType: string): Promise<any[]> {
    const response = await api.get(`/admin/${entityType}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  async getEntityById(
    token: string,
    entityType: string,
    id: string,
  ): Promise<any> {
    const response = await api.get(`/admin/${entityType}/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  async createEntity(
    token: string,
    entityType: string,
    data: any,
  ): Promise<any> {
    const response = await api.post(`/admin/${entityType}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  async updateEntity(
    token: string,
    entityType: string,
    id: string,
    data: any,
  ): Promise<any> {
    const response = await api.put(`/admin/${entityType}/${id}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  async deleteEntity(
    token: string,
    entityType: string,
    id: string,
  ): Promise<void> {
    await api.delete(`/admin/${entityType}/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // Billing API methods
  async getAvailableBillingMonths(token: string): Promise<{ month: string; year: number }[]> {
    const response = await api.get("/admin/billing/months", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  async getTutorBills(token: string, month: string, year: number): Promise<BillsData> {
    const response = await api.get(`/admin/billing/tutors?month=${encodeURIComponent(month)}&year=${year}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

};
