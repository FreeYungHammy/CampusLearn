// Mock the toxicity service before any imports that might use it
jest.mock('../../src/modules/forum/toxicity.service');
// Mock socket.io to prevent issues in tests
jest.mock('../../src/config/socket', () => ({
  io: {
    emit: jest.fn(),
  },
}));

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { app, server } from '../../src/app';
import { UserModel, UserDoc } from '../../src/schemas/user.schema';
import { StudentModel } from '../../src/schemas/students.schema';
import { ForumPostModel } from '../../src/schemas/forumPost.schema';
import { signJwt } from '../../src/auth/jwt';

let mongoServer: MongoMemoryServer;
let studentUser: UserDoc;
let studentToken: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Manually create user and profile to avoid UserService dependency issues in this test
  studentUser = await UserModel.create({
    email: 'test.student@student.belgiumcampus.ac.za',
    passwordHash: 'hashedpassword',
    role: 'student',
  });

  await StudentModel.create({
    userId: studentUser._id,
    name: 'Test',
    surname: 'Student',
    enrolledCourses: ['Programming'],
  });

  // Correctly generate the token using the string representation of the ObjectId
  studentToken = signJwt({ id: studentUser._id.toString(), email: studentUser.email, role: 'student' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  server.close(); // Close the server to release the port
});

afterEach(async () => {
    // Clean up the database after each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }
});

describe('Forum API Integration Tests', () => {
  describe('POST /api/forum/threads', () => {
    it('should create a new forum thread and return 201 Created', async () => {
      const postData = {
        title: 'My First Integration Test Post',
        content: 'This is the content of the post.',
        topic: 'Programming',
      };

      const response = await request(app)
        .post('/api/forum/threads')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(postData);

      // Assertion 1: API Response
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body.title).toBe(postData.title);
      expect(response.body.content).toBe(postData.content);
      expect(response.body.topic).toBe(postData.topic);
      expect(response.body.author).toBeDefined();
      expect(response.body.author.name).toBe('Test');

      // Assertion 2: Database State
      const savedPost = await ForumPostModel.findById(response.body._id);
      expect(savedPost).not.toBeNull();
      expect(savedPost?.title).toBe(postData.title);
      expect(savedPost?.content).toBe(postData.content);
    }, 30000);

    it('should return 401 Unauthorized if no token is provided', async () => {
      const postData = {
        title: 'Another Post',
        content: 'Some content.',
        topic: 'Databases',
      };

      const response = await request(app)
        .post('/api/forum/threads')
        .send(postData);

      expect(response.status).toBe(401);
    });

    it('should return 400 Bad Request if title is missing', async () => {
        const postData = {
          content: 'This post has no title.',
          topic: 'Programming',
        };
  
        const response = await request(app)
          .post('/api/forum/threads')
          .set('Authorization', `Bearer ${studentToken}`)
          .send(postData);
  
        expect(response.status).toBe(400);
      });
  });
});
