#!/usr/bin/env node

/**
 * Email Test Script
 * Tests the fixed email service to ensure proper formatting
 */

import { EmailService } from './src/services/email.service';

async function testEmailService() {
  console.log('🧪 Testing Email Service...');
  
  const emailService = new EmailService();
  
  try {
    // Test welcome email
    console.log('📧 Testing welcome email...');
    const welcomeResult = await emailService.sendWelcomeEmail(
      'test@example.com',
      'Test User'
    );
    console.log('✅ Welcome email test:', welcomeResult ? 'PASSED' : 'FAILED');
    
    // Test password reset email
    console.log('🔐 Testing password reset email...');
    const resetResult = await emailService.sendPasswordResetEmail(
      'test@example.com',
      'https://example.com/reset?token=test123'
    );
    console.log('✅ Password reset email test:', resetResult ? 'PASSED' : 'FAILED');
    
    // Test tutor application email
    console.log('👨‍🏫 Testing tutor application email...');
    const applicationResult = await emailService.sendTutorApplicationReceivedEmail(
      'test@example.com',
      'Test Applicant'
    );
    console.log('✅ Tutor application email test:', applicationResult ? 'PASSED' : 'FAILED');
    
    // Test booking confirmation emails
    console.log('📅 Testing booking confirmation emails...');
    const bookingDetails = {
      studentName: 'John Student',
      tutorName: 'Jane Tutor',
      subject: 'Mathematics',
      date: '2025-01-20',
      time: '14:00',
      duration: '60 minutes',
    };
    
    const studentBookingResult = await emailService.sendBookingConfirmationEmail(
      'student@example.com',
      bookingDetails,
      'student'
    );
    console.log('✅ Student booking email test:', studentBookingResult ? 'PASSED' : 'FAILED');
    
    const tutorBookingResult = await emailService.sendBookingConfirmationEmail(
      'tutor@example.com',
      bookingDetails,
      'tutor'
    );
    console.log('✅ Tutor booking email test:', tutorBookingResult ? 'PASSED' : 'FAILED');
    
    // Test tutor welcome email
    console.log('🎓 Testing tutor welcome email...');
    const tutorWelcomeResult = await emailService.sendTutorWelcomeEmail(
      'tutor@example.com',
      'Test Tutor'
    );
    console.log('✅ Tutor welcome email test:', tutorWelcomeResult ? 'PASSED' : 'FAILED');
    
    // Test session reminder email
    console.log('\n📅 Testing session reminder email...');
    const sessionReminderResult = await emailService.sendSessionReminderEmail(
      'student@example.com',
      {
        tutorName: 'Dr. Smith',
        studentName: 'John Doe',
        subject: 'Mathematics',
        date: '2024-01-20',
        time: '2:00 PM',
        duration: '1 hour',
        timeUntilSession: '1 hour'
      },
      'student'
    );
    console.log('✅ Session reminder email test:', sessionReminderResult ? 'PASSED' : 'FAILED');
    
    // Test suspicious login email
    console.log('\n🔒 Testing suspicious login email...');
    const suspiciousLoginResult = await emailService.sendSuspiciousLoginEmail(
      'user@example.com',
      {
        time: '2024-01-18 3:45 AM',
        location: 'Unknown Location',
        device: 'Chrome on Windows',
        ipAddress: '192.168.1.100'
      }
    );
    console.log('✅ Suspicious login email test:', suspiciousLoginResult ? 'PASSED' : 'FAILED');
    
    // Test forum reply email
    console.log('\n💬 Testing forum reply email...');
    const forumReplyResult = await emailService.sendForumReplyEmail(
      'student@example.com',
      {
        postTitle: 'Help with Calculus Integration',
        replierName: 'Jane Smith',
        time: '2024-01-18 2:30 PM',
        replyContent: 'I can help you with that! The key is to remember the power rule...',
        postUrl: 'https://campuslearn.onrender.com/forum/post/123'
      }
    );
    console.log('✅ Forum reply email test:', forumReplyResult ? 'PASSED' : 'FAILED');
    
    console.log('\n🎉 All email tests completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Check your email client for proper formatting');
    console.log('2. Verify emails are not showing raw MIME boundaries');
    console.log('3. Confirm no quoted-printable encoding artifacts');
    console.log('4. Test with real email addresses');
    console.log('5. Test email preferences in Settings page');
    console.log('6. Verify booking emails respect user preferences');
    
    console.log('\n📧 Email Preferences Available:');
    console.log('- bookingConfirmations: Control booking confirmation emails');
    console.log('- tutorApplicationUpdates: Control tutor application emails');
    console.log('- generalNotifications: Control general notification emails');
    console.log('- marketingEmails: Control marketing emails');
    
    console.log('\n🔧 API Endpoints:');
    console.log('- GET /api/users/email-preferences - Get user preferences');
    console.log('- PATCH /api/users/email-preferences - Update preferences');
    
  } catch (error) {
    console.error('❌ Email test failed:', error);
  }
}

// Run the test
testEmailService().catch(console.error);
