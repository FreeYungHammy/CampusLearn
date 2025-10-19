import { Request, Response, NextFunction } from "express";
import { BillingService } from "./billing.service";

export const BillingController = {
  async getAvailableMonths(req: Request, res: Response, next: NextFunction) {
    try {
      const months = await BillingService.getAvailableBillingMonths();
      res.json(months);
    } catch (error) {
      next(error);
    }
  },

  async getTutorBills(req: Request, res: Response, next: NextFunction) {
    try {
      const { month, year } = req.query;

      if (!month || !year) {
        return res.status(400).json({ 
          error: "Month and year parameters are required" 
        });
      }

      const billsData = await BillingService.getTutorBills(
        month as string, 
        parseInt(year as string)
      );

      res.json(billsData);
    } catch (error) {
      next(error);
    }
  },
};
