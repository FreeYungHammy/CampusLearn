import nodemailer from 'nodemailer';
import { createLogger } from '../config/logger';
import { env } from '../config/env';

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
        rejectUnauthorized: false, // For self-signed certificates
      },
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

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Rate limiting
      const identifier = Array.isArray(options.to) ? options.to.join(',') : options.to;
      if (!this.checkRateLimit(identifier)) {
        throw new Error('Rate limit exceeded');
      }

      const mailOptions = {
        from: options.from || process.env.EMAIL_FROM_ADDRESS || 'noreply@campuslearn-api.run.place',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
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

  async sendBookingConfirmationEmail(to: string, bookingDetails: any): Promise<boolean> {
    const template = this.getBookingConfirmationTemplate(bookingDetails);
    return this.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  // Email templates
  private getWelcomeTemplate(name: string): EmailTemplate {
    return {
      subject: 'Welcome to CampusLearn!',
      text: `Hi ${name},\n\nWelcome to CampusLearn! We're excited to have you join our learning community.\n\nBest regards,\nThe CampusLearn Team`,
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
            <li>Track your learning progress</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://campuslearn.onrender.com" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Get Started</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Best regards,<br>The CampusLearn Team</p>
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
          
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>📧 Important:</strong> If you don't see this email in your inbox, please check your spam/junk folder and mark it as "Not Spam" to ensure you receive future emails from CampusLearn.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">This link will expire in 1 hour for security reasons.</p>
          <p style="color: #6b7280; font-size: 14px;">If you didn't request this password reset, please ignore this email.</p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Best regards,<br>The CampusLearn Team</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            This email was sent from CampusLearn. If you have any questions, please contact support.
          </p>
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

  private getBookingConfirmationTemplate(bookingDetails: any): EmailTemplate {
    return {
      subject: 'Booking Confirmation - CampusLearn',
      text: `Your booking has been confirmed!\n\nTutor: ${bookingDetails.tutorName}\nSubject: ${bookingDetails.subject}\nDate: ${bookingDetails.date}\nTime: ${bookingDetails.time}\n\nBest regards,\nThe CampusLearn Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">CampusLearn</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Booking Confirmation</p>
          </div>
          
          <h2 style="color: #1f2937;">Booking Confirmed! ✅</h2>
          <p style="color: #4b5563; line-height: 1.6;">Your tutoring session has been successfully booked.</p>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">Session Details</h3>
            <p style="color: #4b5563; margin: 5px 0;"><strong>Tutor:</strong> ${bookingDetails.tutorName}</p>
            <p style="color: #4b5563; margin: 5px 0;"><strong>Subject:</strong> ${bookingDetails.subject}</p>
            <p style="color: #4b5563; margin: 5px 0;"><strong>Date:</strong> ${bookingDetails.date}</p>
            <p style="color: #4b5563; margin: 5px 0;"><strong>Time:</strong> ${bookingDetails.time}</p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Best regards,<br>The CampusLearn Team</p>
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
