
import mongoose from 'mongoose';
import { ForumService } from '../../src/modules/forum/forum.service';
import { ForumPostModel, ForumPostDoc } from '../../src/schemas/forumPost.schema';
import { ForumReplyModel, ForumReplyDoc } from '../../src/schemas/forumReply.schema';
import { UserVoteModel } from '../../src/schemas/userVote.schema';
import { CacheService } from '../../src/services/cache.service';
import { io } from '../../src/config/socket';
import { HttpException } from '../../src/infra/http/HttpException';
import { User } from '../../src/types/User';
import ToxicityService from '../../src/modules/forum/toxicity.service';

// Mock all dependencies
jest.mock('ioredis');
jest.mock('../../src/modules/forum/toxicity.service'); // Prevent real toxicity check
jest.mock('../../src/schemas/forumPost.schema');
jest.mock('../../src/schemas/forumReply.schema');
jest.mock('../../src/schemas/userVote.schema');
jest.mock('../../src/services/cache.service');
jest.mock('../../src/config/socket', () => ({
  io: {
    emit: jest.fn(),
  },
}));

// Mock Mongoose session and transaction
const mockSession = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn().mockResolvedValue(null),
  abortTransaction: jest.fn().mockResolvedValue(null),
  endSession: jest.fn().mockResolvedValue(null),
};

jest.spyOn(mongoose, 'startSession').mockImplementation(() => Promise.resolve(mockSession as any));

describe('ForumService', () => {
  let mockUser: User;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    mockUser = { id: 'user-1', role: 'student', email: 'test@test.com' };
    // Provide a default non-toxic result for the toxicity service mock
    (ToxicityService.checkToxicity as jest.Mock).mockResolvedValue([{ label: 'toxic', score: 0.1 }]);
  });

  describe('castVote', () => {
    it('should create a new upvote and increment the post score by 1', async () => {
      const mockPost = { _id: 'post-1', authorId: 'author-1', upvotes: 10, save: jest.fn() };
      (ForumPostModel.findById as jest.Mock).mockReturnValue({ session: () => mockPost });
      (UserVoteModel.findOne as jest.Mock).mockReturnValue({ session: () => null });
      (ForumPostModel.findByIdAndUpdate as jest.Mock).mockReturnValue({ lean: () => ({ ...mockPost, upvotes: 11 }) });

      const result = await ForumService.castVote(mockUser, 'post-1', 'ForumPost', 1);

      expect(UserVoteModel.create).toHaveBeenCalledWith([{ userId: 'user-1', targetId: 'post-1', targetType: 'ForumPost', voteType: 1 }], { session: mockSession });
      expect(ForumPostModel.findByIdAndUpdate).toHaveBeenCalledWith('post-1', { $inc: { upvotes: 1 } }, { new: true, session: mockSession });
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(CacheService.del).toHaveBeenCalledWith('forum:thread:post-1');
      expect(io.emit).toHaveBeenCalledWith('vote_updated', { targetId: 'post-1', targetType: 'ForumPost', newScore: 11 });
      expect(result?.upvotes).toBe(11);
    });

    it('should change an existing downvote to an upvote and increment score by 2', async () => {
      const mockPost = { _id: 'post-1', authorId: 'author-1', upvotes: 10 };
      const existingVote = { userId: 'user-1', targetId: 'post-1', voteType: -1, save: jest.fn() };
      (ForumPostModel.findById as jest.Mock).mockReturnValue({ session: () => mockPost });
      (UserVoteModel.findOne as jest.Mock).mockReturnValue({ session: () => existingVote });
      (ForumPostModel.findByIdAndUpdate as jest.Mock).mockReturnValue({ lean: () => ({ ...mockPost, upvotes: 12 }) });

      const result = await ForumService.castVote(mockUser, 'post-1', 'ForumPost', 1);

      expect(existingVote.save).toHaveBeenCalled();
      expect(existingVote.voteType).toBe(1);
      expect(ForumPostModel.findByIdAndUpdate).toHaveBeenCalledWith('post-1', { $inc: { upvotes: 2 } }, { new: true, session: mockSession });
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(result?.upvotes).toBe(12);
    });

    it('should remove an existing upvote and decrement score by 1', async () => {
      const mockPost = { _id: 'post-1', authorId: 'author-1', upvotes: 10 };
      const existingVote = { _id: 'vote-1', userId: 'user-1', targetId: 'post-1', voteType: 1 };
      
      // Mock the chainable .session() call for deleteOne
      const deleteOneMock = { session: jest.fn().mockResolvedValue({ deletedCount: 1 }) };
      (UserVoteModel.deleteOne as jest.Mock).mockReturnValue(deleteOneMock);

      (ForumPostModel.findById as jest.Mock).mockReturnValue({ session: () => mockPost });
      (UserVoteModel.findOne as jest.Mock).mockReturnValue({ session: () => existingVote });
      (ForumPostModel.findByIdAndUpdate as jest.Mock).mockReturnValue({ lean: () => ({ ...mockPost, upvotes: 9 }) });

      const result = await ForumService.castVote(mockUser, 'post-1', 'ForumPost', 1);

      expect(UserVoteModel.deleteOne).toHaveBeenCalledWith({ _id: 'vote-1' });
      expect(deleteOneMock.session).toHaveBeenCalledWith(mockSession);
      expect(ForumPostModel.findByIdAndUpdate).toHaveBeenCalledWith('post-1', { $inc: { upvotes: -1 } }, { new: true, session: mockSession });
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(result?.upvotes).toBe(9);
    });

    it('should throw an error and abort transaction if a DB operation fails', async () => {
      const dbError = new Error('DB write failed');
      (ForumPostModel.findById as jest.Mock).mockReturnValue({ session: () => ({ _id: 'post-1', authorId: 'author-1' }) });
      (UserVoteModel.findOne as jest.Mock).mockReturnValue({ session: () => null });
      // Force the create operation to fail
      (UserVoteModel.create as jest.Mock).mockRejectedValue(dbError);

      await expect(ForumService.castVote(mockUser, 'post-1', 'ForumPost', 1)).rejects.toThrow(dbError);

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.commitTransaction).not.toHaveBeenCalled();
      expect(CacheService.del).not.toHaveBeenCalled();
      expect(io.emit).not.toHaveBeenCalled();
    });
  });
});
