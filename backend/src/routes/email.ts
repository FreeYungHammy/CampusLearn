import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware';
import emailService from '../services/email.service';
import { createLogger } from '../config/logger';

const router = Router();
const logger = createLogger('email-routes');

// Test email connection
router.get('/test', requireAuth, async (req, res) => {
  try {
    const isConnected = await emailService.testConnection();
    
    if (isConnected) {
      res.json({ 
        success: true, 
        message: 'Brevo email server connection successful' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Brevo email server connection failed' 
      });
    }
  } catch (error) {
    logger.error('Email test failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Email test failed' 
    });
  }
});

// Send test email
router.post('/send-test', requireAuth, async (req, res) => {
  try {
    const { to, subject, message } = req.body;
    
    if (!to || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, subject, message'
      });
    }

    const success = await emailService.sendEmail({
      to,
      subject,
      text: message,
      html: `<p>${message}</p>`
    });

    if (success) {
      res.json({ 
        success: true, 
        message: 'Test email sent successfully via Brevo' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send test email' 
      });
    }
  } catch (error) {
    logger.error('Send test email failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send test email' 
    });
  }
});

// Send welcome email
router.post('/welcome', requireAuth, async (req, res) => {
  try {
    const { to, name } = req.body;
    
    if (!to || !name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, name'
      });
    }

    const success = await emailService.sendWelcomeEmail(to, name);

    if (success) {
      res.json({ 
        success: true, 
        message: 'Welcome email sent successfully' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send welcome email' 
      });
    }
  } catch (error) {
    logger.error('Send welcome email failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send welcome email' 
    });
  }
});

// Send password reset email
router.post('/password-reset', async (req, res) => {
  try {
    const { to, resetLink } = req.body;
    
    if (!to || !resetLink) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, resetLink'
      });
    }

    const success = await emailService.sendPasswordResetEmail(to, resetLink);

    if (success) {
      res.json({ 
        success: true, 
        message: 'Password reset email sent successfully' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send password reset email' 
      });
    }
  } catch (error) {
    logger.error('Send password reset email failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send password reset email' 
    });
  }
});

// Send notification email
router.post('/notification', requireAuth, async (req, res) => {
  try {
    const { to, title, message } = req.body;
    
    if (!to || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, title, message'
      });
    }

    const success = await emailService.sendNotificationEmail(to, title, message);

    if (success) {
      res.json({ 
        success: true, 
        message: 'Notification email sent successfully' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send notification email' 
      });
    }
  } catch (error) {
    logger.error('Send notification email failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send notification email' 
    });
  }
});

// Send tutor application email (admin only)
router.post('/tutor-application', requireAuth, async (req, res) => {
  try {
    const { to, applicantName } = req.body;
    
    if (!to || !applicantName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, applicantName'
      });
    }

    const success = await emailService.sendTutorApplicationEmail(to, applicantName);

    if (success) {
      res.json({ 
        success: true, 
        message: 'Tutor application email sent successfully' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send tutor application email' 
      });
    }
  } catch (error) {
    logger.error('Send tutor application email failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send tutor application email' 
    });
  }
});

// Send booking confirmation email
router.post('/booking-confirmation', requireAuth, async (req, res) => {
  try {
    const { to, bookingDetails, recipientType = 'student' } = req.body;
    
    if (!to || !bookingDetails) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, bookingDetails'
      });
    }

    const success = await emailService.sendBookingConfirmationEmail(to, bookingDetails, recipientType);

    if (success) {
      res.json({ 
        success: true, 
        message: 'Booking confirmation email sent successfully' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send booking confirmation email' 
      });
    }
  } catch (error) {
    logger.error('Send booking confirmation email failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send booking confirmation email' 
    });
  }
});

// Send account deletion email
router.post('/account-deletion', requireAuth, async (req, res) => {
  try {
    const { to, userName } = req.body;
    
    if (!to || !userName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, userName'
      });
    }

    const success = await emailService.sendAccountDeletionEmail(to, userName);

    if (success) {
      res.json({ 
        success: true, 
        message: 'Account deletion email sent successfully' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send account deletion email' 
      });
    }
  } catch (error) {
    logger.error('Send account deletion email failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send account deletion email' 
    });
  }
});

// Send tutor application received email
router.post('/tutor-application-received', async (req, res) => {
  try {
    const { to, applicantName } = req.body;
    
    if (!to || !applicantName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, applicantName'
      });
    }

    const success = await emailService.sendTutorApplicationReceivedEmail(to, applicantName);

    if (success) {
      res.json({ 
        success: true, 
        message: 'Tutor application received email sent successfully' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send tutor application received email' 
      });
    }
  } catch (error) {
    logger.error('Send tutor application received email failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send tutor application received email' 
    });
  }
});

// Send email verification email
router.post('/email-verification', async (req, res) => {
  try {
    const { to, verificationLink, userName } = req.body;
    
    if (!to || !verificationLink || !userName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, verificationLink, userName'
      });
    }

    const success = await emailService.sendEmailVerificationEmail(to, verificationLink, userName);

    if (success) {
      res.json({ 
        success: true, 
        message: 'Email verification email sent successfully' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send email verification email' 
      });
    }
  } catch (error) {
    logger.error('Send email verification email failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send email verification email' 
    });
  }
});

// Get rate limit status
router.get('/rate-limit/:identifier', requireAuth, async (req, res) => {
  try {
    const { identifier } = req.params;
    const status = emailService.getRateLimitStatus(identifier);
    
    res.json({ 
      success: true, 
      rateLimit: status 
    });
  } catch (error) {
    logger.error('Get rate limit status failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get rate limit status' 
    });
  }
});

// Send session reminder email
router.post('/session-reminder', requireAuth, async (req, res) => {
  try {
    const { to, sessionDetails, recipientType = 'student' } = req.body;
    
    if (!to || !sessionDetails) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, sessionDetails'
      });
    }

    const success = await emailService.sendSessionReminderEmail(to, sessionDetails, recipientType);

    if (success) {
      res.json({ 
        success: true, 
        message: 'Session reminder email sent successfully' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send session reminder email' 
      });
    }
  } catch (error) {
    logger.error('Send session reminder email failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send session reminder email' 
    });
  }
});

// Send suspicious login email
router.post('/suspicious-login', requireAuth, async (req, res) => {
  try {
    const { to, loginDetails } = req.body;
    
    if (!to || !loginDetails) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, loginDetails'
      });
    }

    const success = await emailService.sendSuspiciousLoginEmail(to, loginDetails);

    if (success) {
      res.json({ 
        success: true, 
        message: 'Suspicious login email sent successfully' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send suspicious login email' 
      });
    }
  } catch (error) {
    logger.error('Send suspicious login email failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send suspicious login email' 
    });
  }
});

// Send forum reply email
router.post('/forum-reply', requireAuth, async (req, res) => {
  try {
    const { to, replyDetails } = req.body;
    
    if (!to || !replyDetails) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, replyDetails'
      });
    }

    const success = await emailService.sendForumReplyEmail(to, replyDetails);

    if (success) {
      res.json({ 
        success: true, 
        message: 'Forum reply email sent successfully' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send forum reply email' 
      });
    }
  } catch (error) {
    logger.error('Send forum reply email failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send forum reply email' 
    });
  }
});

export default router;
