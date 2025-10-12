
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Types } from 'mongoose';
import { SubscriptionRepo } from '../../src/modules/subscriptions/subscription.repo';
import { StudentModel } from '../../src/schemas/students.schema';
import { TutorModel } from '../../src/schemas/tutor.schema';
import { SubscriptionModel } from '../../src/schemas/subscription.schema';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }
});

describe('SubscriptionRepo.findByStudentId', () => {
  it('should return the correct tutor data shape for a given student subscription', async () => {
    // Arrange: Seed the in-memory database with a known state
    const student = await StudentModel.create({ 
        userId: new Types.ObjectId(), 
        name: 'Test', 
        surname: 'Student',
        enrolledCourses: ['Math']
    });
    const subscribedTutor = await TutorModel.create({
      userId: new Types.ObjectId(),
      name: 'Subscribed',
      surname: 'Tutor',
      subjects: ['Math'],
      rating: 4.5,
      pfp: { data: Buffer.from('pfp-data'), contentType: 'image/png' },
    });
    const otherTutor = await TutorModel.create({
        userId: new Types.ObjectId(),
        name: 'Other',
        surname: 'Tutor',
        subjects: ['Science'],
        rating: 4.0,
      });

    await SubscriptionModel.create({ studentId: student._id, tutorId: subscribedTutor._id });
    // This subscription should be counted for the studentCount
    await SubscriptionModel.create({ studentId: new Types.ObjectId(), tutorId: subscribedTutor._id });

    // Act: Call the function being tested
    const result = await SubscriptionRepo.findByStudentId(student._id.toString());

    // Assert: Check the return value
    expect(result).toHaveLength(1);
    const tutorResult = result[0];
    expect(tutorResult.id.toString()).toBe(subscribedTutor._id.toString());
    expect(tutorResult.name).toBe('Subscribed');
    expect(tutorResult.studentCount).toBe(2);
    expect(tutorResult.pfp).toBeDefined();
    expect(tutorResult.pfp.contentType).toBe('image/png');
  });
});
