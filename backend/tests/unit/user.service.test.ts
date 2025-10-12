
import { UserService } from '../../src/modules/users/user.service';
import { UserRepo } from '../../src/modules/users/user.repo';
import { StudentRepo } from '../../src/modules/students/student.repo';
import { TutorRepo } from '../../src/modules/tutors/tutor.repo';
import { AdminModel } from '../../src/schemas/admin.schema';
import { ChatService } from '../../src/modules/chat/chat.service';
import { gcsService } from '../../src/services/gcs.service';
import { ForumPostModel } from '../../src/schemas/forumPost.schema';
import { ForumReplyModel } from '../../src/schemas/forumReply.schema';
import { UserVoteModel } from '../../src/schemas/userVote.schema';
import { FileModel } from '../../src/schemas/tutorUpload.schema';
import { VideoModel } from '../../src/schemas/video.schema';
import { BookingModel } from '../../src/schemas/booking.schema';
import { SubscriptionModel } from '../../src/schemas/subscription.schema';
import { CacheService } from '../../src/services/cache.service';
import { io } from '../../src/config/socket';

// Mock all dependencies
jest.mock('../../src/modules/users/user.repo');
jest.mock('../../src/modules/students/student.repo');
jest.mock('../../src/modules/tutors/tutor.repo');
jest.mock('../../src/schemas/admin.schema');
jest.mock('../../src/modules/chat/chat.service');
jest.mock('../../src/services/gcs.service');
jest.mock('../../src/schemas/forumPost.schema');
jest.mock('../../src/schemas/forumReply.schema');
jest.mock('../../src/schemas/userVote.schema');
jest.mock('../../src/schemas/tutorUpload.schema');
jest.mock('../../src/schemas/video.schema');
jest.mock('../../src/schemas/booking.schema');
jest.mock('../../src/schemas/subscription.schema');
jest.mock('../../src/services/cache.service');
jest.mock('../../src/config/socket', () => ({ io: { emit: jest.fn() } }));

describe('UserService.remove', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully delete a user and all their associated data (Success Path)', async () => {
    const userId = '60f1b3b3b3b3b3b3b3b3b3b3';
    const studentProfileId = '60f1b3b3b3b3b3b3b3b3b3b4';

    // Arrange: Mock all dependent methods to resolve successfully
    (UserRepo.findById as jest.Mock).mockResolvedValue({ _id: userId, email: 'test@student.belgiumcampus.ac.za', role: 'student' });
    (StudentRepo.findOne as jest.Mock).mockResolvedValue({ _id: studentProfileId });
    (ChatService.deleteAllMessagesForUser as jest.Mock).mockResolvedValue(undefined);
    (ForumPostModel.find as jest.Mock).mockReturnValue({ lean: () => Promise.resolve([]) });
    (ForumReplyModel.find as jest.Mock).mockReturnValue({ lean: () => Promise.resolve([]) });
    (ForumReplyModel.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 0 });
    (ForumPostModel.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 0 });
    (UserVoteModel.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 0 });
    (FileModel.find as jest.Mock).mockReturnValue({ lean: () => Promise.resolve([]) });
    (gcsService.deleteObject as jest.Mock).mockResolvedValue(undefined);
    (FileModel.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 0 });
    (VideoModel.find as jest.Mock).mockReturnValue({ lean: () => Promise.resolve([]) });
    (VideoModel.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 0 });
    (BookingModel.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 0 });
    (SubscriptionModel.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 0 });
    (StudentRepo.findByIdAndDelete as jest.Mock).mockResolvedValue(undefined);
    (CacheService.del as jest.Mock).mockResolvedValue(1);
    (UserRepo.deleteById as jest.Mock).mockResolvedValue({ deletedCount: 1 });

    // Act: Call the function
    await UserService.remove(userId);

    // Assert: Verify that every spy for each deletion method was called
    expect(ChatService.deleteAllMessagesForUser).toHaveBeenCalledWith(userId);
    expect(UserVoteModel.deleteMany).toHaveBeenCalledWith({ userId });
    expect(BookingModel.deleteMany).toHaveBeenCalledWith({ studentId: studentProfileId });
    expect(SubscriptionModel.deleteMany).toHaveBeenCalledWith({ studentId: studentProfileId });
    expect(StudentRepo.findByIdAndDelete).toHaveBeenCalledWith(studentProfileId);
    expect(UserRepo.deleteById).toHaveBeenCalledWith(userId);
  });

  it('should throw an error and not delete subsequent data if GCS deletion fails', async () => {
    const userId = '60f1b3b3b3b3b3b3b3b3b3b3';
    const tutorProfileId = '60f1b3b3b3b3b3b3b3b3b3b5';
    const gcsError = new Error('GCS Deletion Failed');

    // Arrange: Mock the user as a tutor and make GCS deletion fail
    (UserRepo.findById as jest.Mock).mockResolvedValue({ _id: userId, email: 'tutor@test.com', role: 'tutor' });
    (TutorRepo.findOne as jest.Mock).mockResolvedValue({ _id: tutorProfileId });
    (ChatService.deleteAllMessagesForUser as jest.Mock).mockResolvedValue(undefined);
    (FileModel.find as jest.Mock).mockReturnValue({ lean: () => Promise.resolve([{ externalUri: 'gs://bucket/file.pdf' }]) });
    (gcsService.deleteObject as jest.Mock).mockRejectedValue(gcsError);

    // Act & Assert: Expect the function to run without throwing an error
    await expect(UserService.remove(userId)).resolves.not.toThrow();

    // Assert: Verify methods before the GCS call were called
    expect(ChatService.deleteAllMessagesForUser).toHaveBeenCalledWith(userId);
    expect(FileModel.find).toHaveBeenCalledWith({ tutorId: tutorProfileId });
    expect(gcsService.deleteObject).toHaveBeenCalledWith('gs://bucket/file.pdf');

    // Assert: Verify that the user is still deleted at the end
    expect(UserRepo.deleteById).toHaveBeenCalledWith(userId);
  });
});
