import nodemailer from 'nodemailer';
import { createLogger } from '../config/logger';
import { env } from '../config/env';
import { UserModel } from '../schemas/user.schema';

const logger = createLogger('email-service');

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map();

  constructor() {
    this.transporter = this.createTransport();
  }

  private createTransport(): nodemailer.Transporter {
    const config = {
      host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
      tls: {
        rejectUnauthorized: true, // Use proper SSL verification
        ciphers: 'SSLv3',
      },
      // Additional options for better deliverability
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 20000,
      rateLimit: 5,
    };

    logger.info('Creating email transporter with config:', {
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.auth.user,
    });

    return nodemailer.createTransport(config);
  }

  private checkRateLimit(identifier: string): boolean {
    const now = Date.now();
    const limit = this.rateLimitMap.get(identifier);

    if (!limit || now > limit.resetTime) {
      // Reset or create new limit
      this.rateLimitMap.set(identifier, {
        count: 1,
        resetTime: now + 60 * 60 * 1000, // 1 hour
      });
      return true;
    }

    if (limit.count >= parseInt(process.env.EMAIL_RATE_LIMIT_PER_HOUR || '100')) {
      logger.warn(`Rate limit exceeded for ${identifier}`);
      return false;
    }

    limit.count++;
    return true;
  }

  private async checkUserEmailPreference(email: string, preferenceType: 'bookingConfirmations' | 'tutorApplicationUpdates' | 'generalNotifications' | 'marketingEmails'): Promise<boolean> {
    try {
      const user = await UserModel.findOne({ email }).select('emailPreferences').lean();
      if (!user || !user.emailPreferences) {
        // If user not found or no preferences set, use defaults
        return preferenceType === 'marketingEmails' ? false : true;
      }
      return user.emailPreferences[preferenceType] ?? (preferenceType === 'marketingEmails' ? false : true);
    } catch (error) {
      logger.error('Error checking user email preferences:', error);
      // Default to allowing emails if there's an error
      return preferenceType === 'marketingEmails' ? false : true;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Rate limiting
      const identifier = Array.isArray(options.to) ? options.to.join(',') : options.to;
      if (!this.checkRateLimit(identifier)) {
        throw new Error('Rate limit exceeded');
      }

      // Simplified mail options - remove problematic headers
      const mailOptions = {
        from: options.from || process.env.EMAIL_FROM_ADDRESS || 'noreply@campuslearn-api.run.place',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        // Minimal headers to avoid MIME issues
        headers: {
          'X-Mailer': 'CampusLearn',
          'List-Unsubscribe': '<mailto:unsubscribe@campuslearn-api.run.place>',
        },
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent successfully via Brevo:', {
        messageId: result.messageId,
        to: options.to,
        subject: options.subject,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send email via Brevo:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: options.to,
        subject: options.subject,
      });
      return false;
    }
  }

  // Pre-built email templates
  async sendWelcomeEmail(to: string, name: string): Promise<boolean> {
    const template = this.getWelcomeTemplate(name);
    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<boolean> {
    const template = this.getPasswordResetTemplate(resetLink);
    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  async sendNotificationEmail(to: string, title: string, message: string): Promise<boolean> {
    const template = this.getNotificationTemplate(title, message);
    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  async sendTutorApplicationEmail(to: string, applicantName: string): Promise<boolean> {
    const template = this.getTutorApplicationTemplate(applicantName);
    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  async sendAccountDeletionEmail(to: string, userName: string): Promise<boolean> {
    const template = this.getAccountDeletionTemplate(userName);
    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  async sendAdminAccountDeletionEmail(to: string, userName: string): Promise<boolean> {
    const template = this.getAdminAccountDeletionTemplate(userName);
    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  async sendTutorApplicationReceivedEmail(to: string, applicantName: string): Promise<boolean> {
    // Check if user wants to receive tutor application updates
    const wantsEmails = await this.checkUserEmailPreference(to, 'tutorApplicationUpdates');
    if (!wantsEmails) {
      logger.info(`User ${to} has opted out of tutor application update emails`);
      return true; // Return true to indicate "success" (email was intentionally not sent)
    }

    const template = this.getTutorApplicationReceivedTemplate(applicantName);
    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  async sendEmailVerificationEmail(to: string, verificationLink: string, userName: string): Promise<boolean> {
    const template = this.getEmailVerificationTemplate(verificationLink, userName);
    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  async sendTutorApplicationRejectionEmail(to: string, applicantName: string): Promise<boolean> {
    // Check if user wants to receive tutor application updates
    const wantsEmails = await this.checkUserEmailPreference(to, 'tutorApplicationUpdates');
    if (!wantsEmails) {
      logger.info(`User ${to} has opted out of tutor application update emails`);
      return true; // Return true to indicate "success" (email was intentionally not sent)
    }

    const template = this.getTutorApplicationRejectionTemplate(applicantName);
    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  async sendBookingConfirmationEmail(to: string, bookingDetails: any, recipientType: 'student' | 'tutor'): Promise<boolean> {
    // Check if user wants to receive booking confirmation emails
    const wantsEmails = await this.checkUserEmailPreference(to, 'bookingConfirmations');
    if (!wantsEmails) {
      logger.info(`User ${to} has opted out of booking confirmation emails`);
      return true; // Return true to indicate "success" (email was intentionally not sent)
    }

    const template = this.getBookingConfirmationTemplate(bookingDetails, recipientType);
    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  async sendTutorWelcomeEmail(to: string, tutorName: string): Promise<boolean> {
    const template = this.getTutorWelcomeTemplate(tutorName);
    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  async sendSessionReminderEmail(to: string, sessionDetails: any, recipientType: 'student' | 'tutor'): Promise<boolean> {
    // Check if user wants to receive booking confirmation emails (reuse this preference for session reminders)
    const wantsEmails = await this.checkUserEmailPreference(to, 'bookingConfirmations');
    if (!wantsEmails) {
      logger.info(`User ${to} has opted out of session reminder emails`);
      return true; // Return true to indicate "success" (email was intentionally not sent)
    }

    const template = this.getSessionReminderTemplate(sessionDetails, recipientType);
    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  async sendSuspiciousLoginEmail(to: string, loginDetails: any): Promise<boolean> {
    // Security emails should always be sent regardless of preferences
    const template = this.getSuspiciousLoginTemplate(loginDetails);
    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  async sendForumReplyEmail(to: string, replyDetails: any): Promise<boolean> {
    // Check if user wants to receive general notifications
    const wantsEmails = await this.checkUserEmailPreference(to, 'generalNotifications');
    if (!wantsEmails) {
      logger.info(`User ${to} has opted out of forum reply emails`);
      return true; // Return true to indicate "success" (email was intentionally not sent)
    }

    const template = this.getForumReplyTemplate(replyDetails);
    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  // Email templates
  private getEmailFooter(): string {
    return `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          This email was sent from CampusLearn. If you no longer wish to receive these emails, 
          <a href="mailto:unsubscribe@campuslearn-api.run.place?subject=Unsubscribe" style="color: #6b7280;">unsubscribe here</a>.
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin: 5px 0 0 0;">
          CampusLearn - Your Learning Platform
        </p>
      </div>
    `;
  }

  private getWelcomeTemplate(name: string): EmailTemplate {
    return {
      subject: 'Welcome to CampusLearn!',
      text: `Hi ${name},\n\nWelcome to CampusLearn! We're excited to have you join our learning community.\n\nYou can now:\n- Connect with experienced tutors\n- Join engaging forum discussions\n- Schedule one-on-one video calls\n- Access comprehensive learning resources\n\nGet started at: https://campuslearn.onrender.com\n\nBest regards,\nThe CampusLearn Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">CampusLearn</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Your Learning Platform</p>
          </div>
          
          <h2 style="color: #1f2937;">Welcome, ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6;">We're excited to have you join our learning community. You can now:</p>
          
          <ul style="color: #4b5563; line-height: 1.8;">
            <li>Connect with experienced tutors</li>
            <li>Join engaging forum discussions</li>
            <li>Schedule one-on-one video calls</li>
            <li>Access comprehensive learning resources</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://campuslearn.onrender.com" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Get Started</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Best regards,<br>The CampusLearn Team</p>
          
          ${this.getEmailFooter()}
        </div>
      `,
    };
  }

  private getPasswordResetTemplate(resetLink: string): EmailTemplate {
    return {
      subject: 'CampusLearn - Password Reset Request',
      text: `Hello,\n\nYou requested a password reset for your CampusLearn account.\n\nTo reset your password, please click the link below:\n${resetLink}\n\nThis link will expire in 1 hour for security reasons.\n\nIf you did not request this password reset, please ignore this email and your password will remain unchanged.\n\nBest regards,\nThe CampusLearn Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">CampusLearn</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Password Reset</p>
          </div>
          
          <h2 style="color: #1f2937;">Reset Your Password</h2>
          <p style="color: #4b5563; line-height: 1.6;">You requested a password reset for your CampusLearn account.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">This link will expire in 1 hour for security reasons.</p>
          <p style="color: #6b7280; font-size: 14px;">If you didn't request this password reset, please ignore this email.</p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Best regards,<br>The CampusLearn Team</p>
          
          ${this.getEmailFooter()}
        </div>
      `,
    };
  }

  private getNotificationTemplate(title: string, message: string): EmailTemplate {
    return {
      subject: `CampusLearn Notification: ${title}`,
      text: `${title}\n\n${message}\n\nBest regards,\nThe CampusLearn Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">CampusLearn</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Notification</p>
          </div>
          
          <h2 style="color: #1f2937;">${title}</h2>
          <p style="color: #4b5563; line-height: 1.6;">${message}</p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Best regards,<br>The CampusLearn Team</p>
        </div>
      `,
    };
  }

  private getTutorApplicationTemplate(applicantName: string): EmailTemplate {
    return {
      subject: 'New Tutor Application Received',
      text: `A new tutor application has been received from ${applicantName}.\n\nPlease review the application in the admin panel.\n\nBest regards,\nThe CampusLearn Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">CampusLearn</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Admin Notification</p>
          </div>
          
          <h2 style="color: #1f2937;">New Tutor Application</h2>
          <p style="color: #4b5563; line-height: 1.6;">A new tutor application has been received from <strong>${applicantName}</strong>.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #4b5563; margin: 0; font-size: 14px;">Please review the application in the admin panel to approve or reject the candidate.</p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Best regards,<br>The CampusLearn Team</p>
        </div>
      `,
    };
  }

  private getBookingConfirmationTemplate(bookingDetails: any, recipientType: 'student' | 'tutor' = 'student'): EmailTemplate {
    const isStudent = recipientType === 'student';
    const greeting = isStudent ? 'Your tutoring session has been successfully booked!' : 'You have a new tutoring session booked!';
    const detailsLabel = isStudent ? 'Session Details' : 'New Booking Details';
    
    return {
      subject: `Booking Confirmation - CampusLearn`,
      text: `${greeting}\n\n${isStudent ? 'Tutor' : 'Student'}: ${isStudent ? bookingDetails.tutorName : bookingDetails.studentName}\nSubject: ${bookingDetails.subject}\nDate: ${bookingDetails.date}\nTime: ${bookingDetails.time}\nDuration: ${bookingDetails.duration || '1 hour'}\n\n${isStudent ? 'Please arrive on time for your session.' : 'Please prepare for your tutoring session.'}\n\nBest regards,\nThe CampusLearn Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">CampusLearn</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Booking Confirmation</p>
          </div>
          
          <h2 style="color: #1f2937;">${isStudent ? 'Booking Confirmed!' : 'New Session Booked!'}</h2>
          <p style="color: #4b5563; line-height: 1.6;">${greeting}</p>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">${detailsLabel}</h3>
            <p style="color: #4b5563; margin: 5px 0;"><strong>${isStudent ? 'Tutor' : 'Student'}:</strong> ${isStudent ? bookingDetails.tutorName : bookingDetails.studentName}</p>
            <p style="color: #4b5563; margin: 5px 0;"><strong>Subject:</strong> ${bookingDetails.subject}</p>
            <p style="color: #4b5563; margin: 5px 0;"><strong>Date:</strong> ${bookingDetails.date}</p>
            <p style="color: #4b5563; margin: 5px 0;"><strong>Time:</strong> ${bookingDetails.time}</p>
            <p style="color: #4b5563; margin: 5px 0;"><strong>Duration:</strong> ${bookingDetails.duration || '1 hour'}</p>
          </div>
          
          ${isStudent ? `
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>Reminder:</strong> Please arrive on time for your session. If you need to reschedule, please contact your tutor or our support team.
            </p>
          </div>
          ` : `
          <div style="background-color: #f0fdf4; border: 1px solid #22c55e; border-radius: 6px; padding: 12px; margin: 20px 0;">
            <p style="color: #166534; margin: 0; font-size: 14px;">
              <strong>Preparation:</strong> Please prepare your teaching materials and ensure you're ready for the session. If you need to reschedule, please contact the student or our support team.
            </p>
          </div>
          `}
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Best regards,<br>The CampusLearn Team</p>
          
          ${this.getEmailFooter()}
        </div>
      `,
    };
  }

  private getAccountDeletionTemplate(userName: string): EmailTemplate {
    return {
      subject: 'Account Deleted - CampusLearn',
      text: `Hello ${userName},\n\nYour CampusLearn account has been successfully deleted.\n\nAll your data, including:\n- Profile information\n- Forum posts and replies\n- Chat messages\n- Uploaded content\n- Bookings and subscriptions\n\n...has been permanently removed from our systems.\n\nIf you did not request this deletion, please contact our support team immediately.\n\nThank you for being part of the CampusLearn community.\n\nBest regards,\nThe CampusLearn Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">CampusLearn</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Account Deletion Confirmation</p>
          </div>
          
          <h2 style="color: #1f2937;">Account Successfully Deleted</h2>
          <p style="color: #4b5563; line-height: 1.6;">Hello ${userName},</p>
          <p style="color: #4b5563; line-height: 1.6;">Your CampusLearn account has been successfully deleted as requested.</p>
          
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <h3 style="color: #dc2626; margin-top: 0;">Data Removed</h3>
            <ul style="color: #4b5563; margin: 0; padding-left: 20px;">
              <li>Profile information and settings</li>
              <li>Forum posts and replies</li>
              <li>Chat messages and history</li>
              <li>Uploaded content and files</li>
              <li>Bookings and subscriptions</li>
              <li>All personal data and preferences</li>
            </ul>
          </div>
          
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>⚠️ Important:</strong> If you did not request this account deletion, please contact our support team immediately at support@campuslearn-api.run.place
            </p>
          </div>
          
          <p style="color: #4b5563; line-height: 1.6;">Thank you for being part of the CampusLearn community. We hope you found value in our platform.</p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Best regards,<br>The CampusLearn Team</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            This email confirms the permanent deletion of your CampusLearn account.
          </p>
        </div>
      `,
    };
  }

  private getAdminAccountDeletionTemplate(userName: string): EmailTemplate {
    return {
      subject: 'Account Deleted by Administrator - CampusLearn',
      text: `Hello ${userName},\n\nYour CampusLearn account has been deleted by an administrator.\n\nThis action was taken due to a violation of our terms of service or community guidelines.\n\nAll your data, including:\n- Profile information\n- Course enrollments\n- Forum posts and replies\n- Chat history\n- Uploaded files\n\nHas been permanently removed from our systems.\n\nIf you believe this action was taken in error, please contact our support team at support@campuslearn-api.run.place to appeal this decision.\n\nBest regards,\nThe CampusLearn Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">CampusLearn</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Account Deletion Notice</p>
          </div>
          
          <h2 style="color: #dc2626;">Account Deleted by Administrator</h2>
          <p style="color: #4b5563; line-height: 1.6;">Hello ${userName},</p>
          <p style="color: #4b5563; line-height: 1.6;">Your CampusLearn account has been deleted by an administrator.</p>
          
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="color: #dc2626; margin: 0; font-size: 14px;">
              <strong>Reason:</strong> This action was taken due to a violation of our terms of service or community guidelines.
            </p>
          </div>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">Data Removed</h3>
            <ul style="color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>Profile information</li>
              <li>Course enrollments</li>
              <li>Forum posts and replies</li>
              <li>Chat history</li>
              <li>Uploaded files</li>
            </ul>
          </div>
          
          <div style="background-color: #f0fdf4; border: 1px solid #22c55e; border-radius: 6px; padding: 12px; margin: 20px 0;">
            <p style="color: #166534; margin: 0; font-size: 14px;">
              <strong>Appeal Process:</strong> If you believe this action was taken in error, please contact our support team at support@campuslearn-api.run.place to appeal this decision.
            </p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Best regards,<br>The CampusLearn Team</p>
          
          ${this.getEmailFooter()}
        </div>
      `,
    };
  }

  private getTutorApplicationReceivedTemplate(applicantName: string): EmailTemplate {
    return {
      subject: 'Tutor Application Received - CampusLearn',
      text: `Hello ${applicantName},\n\nThank you for submitting your tutor application to CampusLearn!\n\nWe have received your application and will review it carefully. Our team will evaluate your qualifications and experience.\n\nWhat happens next:\n- Our admin team will review your application\n- We'll check your qualifications and experience\n- You'll receive an email notification once the review is complete\n\nPlease note that this process may take 3-5 business days.\n\nIf you have any questions about your application, please don't hesitate to contact us.\n\nThank you for your interest in joining our tutoring community!\n\nBest regards,\nThe CampusLearn Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">CampusLearn</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Tutor Application</p>
          </div>
          
          <h2 style="color: #1f2937;">Application Received!</h2>
          <p style="color: #4b5563; line-height: 1.6;">Hello ${applicantName},</p>
          <p style="color: #4b5563; line-height: 1.6;">Thank you for submitting your tutor application to CampusLearn! We're excited about your interest in joining our teaching community.</p>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">What Happens Next?</h3>
            <ol style="color: #4b5563; margin: 0; padding-left: 20px;">
              <li><strong>Review Process:</strong> Our admin team will carefully review your application</li>
              <li><strong>Qualification Check:</strong> We'll verify your qualifications and experience</li>
              <li><strong>Decision Notification:</strong> You'll receive an email with our decision</li>
            </ol>
          </div>
          
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>Processing Time:</strong> Please allow 3-5 business days for the review process.
            </p>
          </div>
          
          <p style="color: #4b5563; line-height: 1.6;">If you have any questions about your application or need to provide additional information, please don't hesitate to contact our support team.</p>
          
          <p style="color: #4b5563; line-height: 1.6;">We appreciate your interest in helping students succeed through CampusLearn!</p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Best regards,<br>The CampusLearn Team</p>
          
          ${this.getEmailFooter()}
        </div>
      `,
    };
  }

  private getEmailVerificationTemplate(verificationLink: string, userName: string): EmailTemplate {
    return {
      subject: 'Verify Your Email - CampusLearn',
      text: `Hello ${userName},\n\nWelcome to CampusLearn! To complete your registration, please verify your email address.\n\nClick the link below to verify your email:\n${verificationLink}\n\nThis link will expire in 24 hours for security reasons.\n\nIf you did not create an account with CampusLearn, please ignore this email.\n\nBest regards,\nThe CampusLearn Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">CampusLearn</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Email Verification</p>
          </div>
          
          <h2 style="color: #1f2937;">Verify Your Email Address</h2>
          <p style="color: #4b5563; line-height: 1.6;">Hello ${userName},</p>
          <p style="color: #4b5563; line-height: 1.6;">Welcome to CampusLearn! To complete your registration and start using your account, please verify your email address.</p>
          
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>Important:</strong> If you don't see this email in your inbox, please check your spam/junk folder and mark it as "Not Spam" to ensure you receive future emails from CampusLearn.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email Address</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">This verification link will expire in 24 hours for security reasons.</p>
          <p style="color: #6b7280; font-size: 14px;">If you didn't create an account with CampusLearn, please ignore this email.</p>
          
          <div style="background-color: #f0f9ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">After Verification</h3>
            <p style="color: #4b5563; margin: 0; font-size: 14px;">Once verified, you'll be able to:</p>
            <ul style="color: #4b5563; margin: 5px 0 0 0; padding-left: 20px; font-size: 14px;">
              <li>Access all CampusLearn features</li>
              <li>Connect with tutors and students</li>
              <li>Join forum discussions</li>
              <li>Schedule video calls</li>
            </ul>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Best regards,<br>The CampusLearn Team</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            This email was sent from CampusLearn. If you have any questions, please contact support.
          </p>
        </div>
      `,
    };
  }

  private getTutorApplicationRejectionTemplate(applicantName: string): EmailTemplate {
    return {
      subject: 'Tutor Application Update - CampusLearn',
      text: `Hello ${applicantName},\n\nThank you for your interest in becoming a tutor with CampusLearn.\n\nAfter careful review of your application, we regret to inform you that we are unable to approve your tutor application at this time.\n\nThis decision was based on various factors including qualifications, experience, and current platform needs.\n\nWe encourage you to:\n- Continue developing your skills and expertise\n- Consider reapplying in the future when you have additional qualifications\n- Explore other opportunities within our learning community\n\nThank you for your interest in CampusLearn, and we wish you the best in your educational journey.\n\nBest regards,\nThe CampusLearn Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">CampusLearn</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Tutor Application Update</p>
          </div>
          
          <h2 style="color: #1f2937;">Application Review Complete</h2>
          <p style="color: #4b5563; line-height: 1.6;">Hello ${applicantName},</p>
          <p style="color: #4b5563; line-height: 1.6;">Thank you for your interest in becoming a tutor with CampusLearn.</p>
          
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <h3 style="color: #dc2626; margin-top: 0;">Application Status</h3>
            <p style="color: #4b5563; margin: 0; font-size: 14px;">After careful review of your application, we regret to inform you that we are unable to approve your tutor application at this time.</p>
          </div>
          
          <div style="background-color: #f0f9ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">Next Steps</h3>
            <p style="color: #4b5563; margin: 0; font-size: 14px;">We encourage you to:</p>
            <ul style="color: #4b5563; margin: 5px 0 0 0; padding-left: 20px; font-size: 14px;">
              <li>Continue developing your skills and expertise</li>
              <li>Consider reapplying in the future when you have additional qualifications</li>
              <li>Explore other opportunities within our learning community</li>
            </ul>
          </div>
          
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>💡 Note:</strong> This decision was based on various factors including qualifications, experience, and current platform needs.
            </p>
          </div>
          
          <p style="color: #4b5563; line-height: 1.6;">Thank you for your interest in CampusLearn, and we wish you the best in your educational journey.</p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Best regards,<br>The CampusLearn Team</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            Questions? Contact us at support@campuslearn-api.run.place
          </p>
        </div>
      `,
    };
  }

  private getTutorWelcomeTemplate(tutorName: string): EmailTemplate {
    return {
      subject: 'Welcome to CampusLearn - Tutor Portal',
      text: `Hello ${tutorName},\n\nWelcome to CampusLearn as a tutor! We're excited to have you join our teaching community.\n\nAs a tutor, you can now:\n- Create and manage your tutoring sessions\n- Upload educational materials and videos\n- Connect with students through our platform\n- Track your earnings and schedule\n- Access our tutor dashboard\n\nYour tutor profile is now active and students can book sessions with you.\n\nTo get started:\n1. Complete your tutor profile\n2. Set your availability\n3. Upload your teaching materials\n4. Start receiving booking requests\n\nIf you have any questions about teaching on CampusLearn, please don't hesitate to contact our support team.\n\nThank you for helping students succeed!\n\nBest regards,\nThe CampusLearn Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">CampusLearn</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Tutor Portal</p>
          </div>
          
          <h2 style="color: #1f2937;">Welcome to CampusLearn, ${tutorName}!</h2>
          <p style="color: #4b5563; line-height: 1.6;">We're excited to have you join our teaching community. Your tutor profile is now active and students can book sessions with you.</p>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">Tutor Features</h3>
            <ul style="color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>Create and manage tutoring sessions</li>
              <li>Upload educational materials and videos</li>
              <li>Connect with students through our platform</li>
              <li>Track your earnings and schedule</li>
              <li>Access comprehensive tutor dashboard</li>
            </ul>
          </div>
          
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <h3 style="color: #92400e; margin-top: 0;">Getting Started</h3>
            <ol style="color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li><strong>Complete your tutor profile</strong> - Add your bio, subjects, and qualifications</li>
              <li><strong>Set your availability</strong> - Define when you're available for sessions</li>
              <li><strong>Upload teaching materials</strong> - Share resources with your students</li>
              <li><strong>Start receiving bookings</strong> - Students can now book sessions with you</li>
            </ol>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://campuslearn.onrender.com/tutor-dashboard" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Access Tutor Dashboard</a>
          </div>
          
          <div style="background-color: #f0fdf4; border: 1px solid #22c55e; border-radius: 6px; padding: 12px; margin: 20px 0;">
            <p style="color: #166534; margin: 0; font-size: 14px;">
              <strong>Support:</strong> If you have any questions about teaching on CampusLearn, please don't hesitate to contact our support team at support@campuslearn-api.run.place
            </p>
          </div>
          
          <p style="color: #4b5563; line-height: 1.6;">Thank you for helping students succeed through CampusLearn!</p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Best regards,<br>The CampusLearn Team</p>
          
          ${this.getEmailFooter()}
        </div>
      `,
    };
  }

  private getSessionReminderTemplate(sessionDetails: any, recipientType: 'student' | 'tutor'): EmailTemplate {
    const isStudent = recipientType === 'student';
    const greeting = isStudent ? 'Your tutoring session is starting soon!' : 'You have a tutoring session starting soon!';
    const timeUntilSession = sessionDetails.timeUntilSession || '1 hour';
    
    return {
      subject: `Session Reminder - ${timeUntilSession} - CampusLearn`,
      text: `${greeting}\n\nSession Details:\n${isStudent ? 'Tutor' : 'Student'}: ${isStudent ? sessionDetails.tutorName : sessionDetails.studentName}\nSubject: ${sessionDetails.subject}\nDate: ${sessionDetails.date}\nTime: ${sessionDetails.time}\nDuration: ${sessionDetails.duration || '1 hour'}\n\n${isStudent ? 'Please prepare your questions and materials for the session.' : 'Please prepare your teaching materials and ensure you\'re ready for the session.'}\n\nBest regards,\nThe CampusLearn Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">CampusLearn</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Session Reminder</p>
          </div>
          
          <h2 style="color: #1f2937;">${greeting}</h2>
          <p style="color: #4b5563; line-height: 1.6;">Your tutoring session starts in <strong>${timeUntilSession}</strong>.</p>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">Session Details</h3>
            <p style="color: #4b5563; margin: 5px 0;"><strong>${isStudent ? 'Tutor' : 'Student'}:</strong> ${isStudent ? sessionDetails.tutorName : sessionDetails.studentName}</p>
            <p style="color: #4b5563; margin: 5px 0;"><strong>Subject:</strong> ${sessionDetails.subject}</p>
            <p style="color: #4b5563; margin: 5px 0;"><strong>Date:</strong> ${sessionDetails.date}</p>
            <p style="color: #4b5563; margin: 5px 0;"><strong>Time:</strong> ${sessionDetails.time}</p>
            <p style="color: #4b5563; margin: 5px 0;"><strong>Duration:</strong> ${sessionDetails.duration || '1 hour'}</p>
          </div>
          
          ${isStudent ? `
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>Preparation:</strong> Please prepare your questions and materials for the session. Make sure you have a stable internet connection and are in a quiet environment.
            </p>
          </div>
          ` : `
          <div style="background-color: #f0fdf4; border: 1px solid #22c55e; border-radius: 6px; padding: 12px; margin: 20px 0;">
            <p style="color: #166534; margin: 0; font-size: 14px;">
              <strong>Preparation:</strong> Please prepare your teaching materials and ensure you're ready for the session. Make sure you have a stable internet connection and are in a quiet environment.
            </p>
          </div>
          `}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://campuslearn.onrender.com/sessions" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Session Details</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Best regards,<br>The CampusLearn Team</p>
          
          ${this.getEmailFooter()}
        </div>
      `,
    };
  }

  private getSuspiciousLoginTemplate(loginDetails: any): EmailTemplate {
    return {
      subject: 'Suspicious Login Activity Detected - CampusLearn',
      text: `Security Alert: Suspicious Login Activity\n\nWe detected unusual login activity on your CampusLearn account.\n\nLogin Details:\n- Time: ${loginDetails.time}\n- Location: ${loginDetails.location}\n- Device: ${loginDetails.device}\n- IP Address: ${loginDetails.ipAddress}\n\nIf this was you, no action is required. If you don't recognize this activity, please:\n1. Change your password immediately\n2. Enable two-factor authentication if available\n3. Contact our support team\n\nFor your security, we recommend reviewing your account activity regularly.\n\nBest regards,\nThe CampusLearn Security Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc2626; margin: 0;">CampusLearn</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Security Alert</p>
          </div>
          
          <h2 style="color: #dc2626;">Suspicious Login Activity Detected</h2>
          <p style="color: #4b5563; line-height: 1.6;">We detected unusual login activity on your CampusLearn account.</p>
          
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <h3 style="color: #dc2626; margin-top: 0;">Login Details</h3>
            <p style="color: #4b5563; margin: 5px 0;"><strong>Time:</strong> ${loginDetails.time}</p>
            <p style="color: #4b5563; margin: 5px 0;"><strong>Location:</strong> ${loginDetails.location}</p>
            <p style="color: #4b5563; margin: 5px 0;"><strong>Device:</strong> ${loginDetails.device}</p>
            <p style="color: #4b5563; margin: 5px 0;"><strong>IP Address:</strong> ${loginDetails.ipAddress}</p>
          </div>
          
          <div style="background-color: #f0f9ff; border: 1px solid #93c5fd; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">What to do next</h3>
            <p style="color: #4b5563; margin: 5px 0;">If this was you, no action is required.</p>
            <p style="color: #4b5563; margin: 5px 0;">If you don't recognize this activity:</p>
            <ol style="color: #4b5563; margin: 5px 0; padding-left: 20px;">
              <li>Change your password immediately</li>
              <li>Enable two-factor authentication if available</li>
              <li>Contact our support team</li>
            </ol>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://campuslearn.onrender.com/security" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Review Security Settings</a>
          </div>
          
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>Security Tip:</strong> For your security, we recommend reviewing your account activity regularly and using strong, unique passwords.
            </p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Best regards,<br>The CampusLearn Security Team</p>
          
          ${this.getEmailFooter()}
        </div>
      `,
    };
  }

  private getForumReplyTemplate(replyDetails: any): EmailTemplate {
    return {
      subject: `New Reply to "${replyDetails.postTitle}" - CampusLearn`,
      text: `Someone replied to your forum post!\n\nPost: ${replyDetails.postTitle}\nReplied by: ${replyDetails.replierName}\nTime: ${replyDetails.time}\n\nReply:\n${replyDetails.replyContent}\n\nView the full discussion: ${replyDetails.postUrl}\n\nBest regards,\nThe CampusLearn Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">CampusLearn</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Forum Notification</p>
          </div>
          
          <h2 style="color: #1f2937;">New Reply to Your Post</h2>
          <p style="color: #4b5563; line-height: 1.6;">Someone replied to your forum post!</p>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">Post Details</h3>
            <p style="color: #4b5563; margin: 5px 0;"><strong>Post:</strong> ${replyDetails.postTitle}</p>
            <p style="color: #4b5563; margin: 5px 0;"><strong>Replied by:</strong> ${replyDetails.replierName}</p>
            <p style="color: #4b5563; margin: 5px 0;"><strong>Time:</strong> ${replyDetails.time}</p>
          </div>
          
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">Reply Preview</h3>
            <p style="color: #4b5563; margin: 0; font-style: italic;">"${replyDetails.replyContent.substring(0, 200)}${replyDetails.replyContent.length > 200 ? '...' : ''}"</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${replyDetails.postUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Full Discussion</a>
          </div>
          
          <div style="background-color: #f0fdf4; border: 1px solid #22c55e; border-radius: 6px; padding: 12px; margin: 20px 0;">
            <p style="color: #166534; margin: 0; font-size: 14px;">
              <strong>Tip:</strong> Keep the conversation going! Reply to continue the discussion and help other students.
            </p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Best regards,<br>The CampusLearn Team</p>
          
          ${this.getEmailFooter()}
        </div>
      `,
    };
  }

  // Test email functionality
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('Brevo email server connection verified');
      return true;
    } catch (error) {
      logger.error('Brevo email server connection failed:', error);
      return false;
    }
  }

  // Get rate limit status
  getRateLimitStatus(identifier: string): { count: number; resetTime: number } | null {
    return this.rateLimitMap.get(identifier) || null;
  }
}

export const emailService = new EmailService();
export default emailService;
