import { BookingModel } from "../../schemas/booking.schema";
import { TutorModel } from "../../schemas/tutor.schema";
import { UserModel } from "../../schemas/user.schema";

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

export const BillingService = {
  async getAvailableBillingMonths(): Promise<{ month: string; year: number }[]> {
    try {
      // Get all completed bookings and extract unique months
      const completedBookings = await BookingModel.find({
        status: "completed",
        completedAt: { $exists: true }
      }).select("completedAt").lean();

      const months = new Set<string>();
      
      completedBookings.forEach(booking => {
        if (booking.completedAt) {
          const date = new Date(booking.completedAt);
          const month = date.toLocaleString('default', { month: 'long' });
          const year = date.getFullYear();
          months.add(`${month}-${year}`);
        }
      });

      // Convert to array and sort by date (newest first)
      const monthArray = Array.from(months).map(monthYear => {
        const [month, year] = monthYear.split('-');
        return { month, year: parseInt(year) };
      });

      // Sort by year and month (newest first)
      return monthArray.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        const monthOrder = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return monthOrder.indexOf(b.month) - monthOrder.indexOf(a.month);
      });
    } catch (error) {
      console.error("Error fetching available billing months:", error);
      throw new Error("Failed to fetch available billing months");
    }
  },

  async getTutorBills(month: string, year: number): Promise<BillsData> {
    try {
      // Create date range for the specified month
      const startDate = new Date(year, this.getMonthIndex(month), 1);
      const endDate = new Date(year, this.getMonthIndex(month) + 1, 0, 23, 59, 59, 999);

      // Get all completed bookings for the month
      const completedBookings = await BookingModel.find({
        status: "completed",
        completedAt: {
          $gte: startDate,
          $lte: endDate
        }
      }).populate('tutorId', 'userId').lean();

      if (completedBookings.length === 0) {
        return {
          tutors: [],
          totalHours: 0,
          totalAmount: 0,
          month,
          year
        };
      }

      // Get tutor details and calculate bills
      const tutorBillsMap = new Map<string, TutorBill>();

      for (const booking of completedBookings) {
        const tutorId = booking.tutorId._id.toString();
        
        if (!tutorBillsMap.has(tutorId)) {
          // Get tutor and user details
          const tutor = await TutorModel.findById(tutorId).lean();
          const user = await UserModel.findById(tutor?.userId).lean();
          
          if (tutor && user) {
            // Fixed hourly rate of R75
            const hourlyRate = 75;
            
            tutorBillsMap.set(tutorId, {
              tutorId,
              tutorName: `${tutor.name} ${tutor.surname}`,
              tutorEmail: user.email,
              totalHours: 0,
              hourlyRate,
              totalAmount: 0,
              completedBookings: 0,
              month,
              year
            });
          }
        }

        const tutorBill = tutorBillsMap.get(tutorId)!;
        const hours = booking.duration / 60; // Convert minutes to hours
        
        tutorBill.totalHours += hours;
        tutorBill.completedBookings += 1;
        tutorBill.totalAmount = tutorBill.totalHours * tutorBill.hourlyRate;
      }

      const tutors = Array.from(tutorBillsMap.values());
      const totalHours = tutors.reduce((sum, tutor) => sum + tutor.totalHours, 0);
      const totalAmount = tutors.reduce((sum, tutor) => sum + tutor.totalAmount, 0);

      return {
        tutors,
        totalHours,
        totalAmount,
        month,
        year
      };
    } catch (error) {
      console.error("Error fetching tutor bills:", error);
      throw new Error("Failed to fetch tutor billing data");
    }
  },

  getMonthIndex(month: string): number {
    const monthMap: { [key: string]: number } = {
      'January': 0, 'February': 1, 'March': 2, 'April': 3,
      'May': 4, 'June': 5, 'July': 6, 'August': 7,
      'September': 8, 'October': 9, 'November': 10, 'December': 11
    };
    return monthMap[month] ?? 0;
  }
};
