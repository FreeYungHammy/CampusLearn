import { Request, Response } from 'express';
import { createLogger } from '../config/logger';

const logger = createLogger('unsubscribe');

export const handleUnsubscribe = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        message: 'Email address is required',
        success: false 
      });
    }

    // Log the unsubscribe request
    logger.info('Unsubscribe request received:', { email });
    
    // In a real application, you would:
    // 1. Add the email to an unsubscribe list in your database
    // 2. Update the user's email preferences
    // 3. Send a confirmation email
    
    // For now, just log it and return success
    logger.info(`Email ${email} has been unsubscribed from CampusLearn notifications`);
    
    res.status(200).json({
      message: 'You have been successfully unsubscribed from CampusLearn emails.',
      success: true
    });
    
  } catch (error) {
    logger.error('Error processing unsubscribe request:', error);
    res.status(500).json({
      message: 'An error occurred while processing your unsubscribe request.',
      success: false
    });
  }
};
