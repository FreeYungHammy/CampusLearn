import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { UserModel } from '../../schemas/user.schema';
import { StudentModel } from '../../schemas/students.schema';
import { env } from '../../config/env';

async function createTestUser() {
  try {
    await mongoose.connect(env.mongoUri);
    console.log('✅ Connected to MongoDB');

    const email = 'test.student@student.belgiumcampus.ac.za';
    const password = 'password123';

    // Check if user already exists
    const existingUser = await UserModel.findOne({ email });
    
    if (existingUser) {
      console.log('⚠️  User already exists. Updating password...');
      
      // Update the password
      const hashedPassword = await bcrypt.hash(password, 10);
      existingUser.passwordHash = hashedPassword;
      await existingUser.save();
      
      console.log('✅ Password updated successfully!');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
    } else {
      console.log('📝 Creating new test user...');
      
      // Create user
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await UserModel.create({
        email,
        passwordHash: hashedPassword,
        role: 'student',
      });

      // Create student profile
      await StudentModel.create({
        userId: user._id,
        name: 'Test',
        surname: 'Student',
        enrolledCourses: ['Programming'],
      });

      console.log('✅ Test user created successfully!');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      console.log(`   User ID: ${user._id}`);
    }

    await mongoose.disconnect();
    console.log('✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTestUser();

