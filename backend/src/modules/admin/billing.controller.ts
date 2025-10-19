import { Request, Response, NextFunction } from "express";
import { BillingService } from "./billing.service";
import { AuthedRequest } from "../../auth/auth.middleware";

export const BillingController = {
  async getAvailableMonths(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const months = await BillingService.getAvailableBillingMonths();
      res.json(months);
    } catch (error) {
      next(error);
    }
  },

  async getTutorBills(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const { month, year } = req.query;
      
      if (!month || !year) {
        return res.status(400).json({ 
          error: "Month and year parameters are required" 
        });
      }

      const monthStr = month as string;
      const yearNum = parseInt(year as string);

      if (isNaN(yearNum)) {
        return res.status(400).json({ 
          error: "Year must be a valid number" 
        });
      }

      const billsData = await BillingService.getTutorBills(monthStr, yearNum);
      res.json(billsData);
    } catch (error) {
      next(error);
    }
  }
};
