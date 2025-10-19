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
    // Find all unique months and years from completed bookings
    const months = await BookingModel.aggregate([
      { $match: { status: "completed" } },
      {
        $project: {
          year: { $year: "$completedAt" },
          month: { $month: "$completedAt" },
        },
      },
      {
        $group: {
          _id: { year: "$year", month: "$month" },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: {
            $switch: {
              branches: [
                { case: { $eq: ["$month", 1] }, then: "January" },
                { case: { $eq: ["$month", 2] }, then: "February" },
                { case: { $eq: ["$month", 3] }, then: "March" },
                { case: { $eq: ["$month", 4] }, then: "April" },
                { case: { $eq: ["$month", 5] }, then: "May" },
                { case: { $eq: ["$month", 6] }, then: "June" },
                { case: { $eq: ["$month", 7] }, then: "July" },
                { case: { $eq: ["$month", 8] }, then: "August" },
                { case: { $eq: ["$month", 9] }, then: "September" },
                { case: { $eq: ["$month", 10] }, then: "October" },
                { case: { $eq: ["$month", 11] }, then: "November" },
                { case: { $eq: ["$month", 12] }, then: "December" },
              ],
              default: "Unknown",
            },
          },
        },
      },
    ]);

    return months;
  },

  async getTutorBills(month: string, year: number): Promise<BillsData> {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthIndex = monthNames.indexOf(month);

    if (monthIndex === -1) {
      throw new Error("Invalid month name provided.");
    }

    const startDate = new Date(year, monthIndex, 1);
    const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999); // Last day of the month

    console.log(`Looking for completed bookings between ${startDate} and ${endDate}`);

    // Get completed bookings for the specified month
    const completedBookings = await BookingModel.find({
      status: "completed",
      completedAt: {
        $gte: startDate,
        $lte: endDate,
      },
    })
    .populate({
      path: "tutorId",
      select: "userId name surname",
      populate: {
        path: "userId",
        select: "email",
      },
    });

    console.log(`Found ${completedBookings.length} completed bookings`);

    // Group by tutor and calculate totals
    const tutorBillsMap = new Map<string, TutorBill>();

    for (const booking of completedBookings) {
      const tutor = booking.tutorId as any; // Cast to any to access populated fields
      if (!tutor || !tutor.userId) continue;

      const tutorId = tutor._id.toString();
      const tutorEmail = tutor.userId.email;
      const tutorName = `${tutor.name} ${tutor.surname}`;
      const hourlyRate = 75; // Fixed R75/hour

      if (!tutorBillsMap.has(tutorId)) {
        tutorBillsMap.set(tutorId, {
          tutorId,
          tutorName,
          tutorEmail,
          totalHours: 0,
          hourlyRate,
          totalAmount: 0,
          completedBookings: 0,
          month,
          year,
        });
      }

      const tutorBill = tutorBillsMap.get(tutorId)!;
      const hours = booking.duration / 60; // Convert minutes to hours
      
      tutorBill.totalHours += hours;
      tutorBill.totalAmount += hours * hourlyRate;
      tutorBill.completedBookings += 1;
    }

    const tutors = Array.from(tutorBillsMap.values());
    const totalHours = tutors.reduce((sum, tutor) => sum + tutor.totalHours, 0);
    const totalAmount = tutors.reduce((sum, tutor) => sum + tutor.totalAmount, 0);

    console.log(`Returning ${tutors.length} tutors with total hours: ${totalHours}, total amount: ${totalAmount}`);

    return {
      tutors,
      totalHours,
      totalAmount,
      month,
      year,
    };
  },
};
