
import { getMockReq, getMockRes } from '@jest-mock/express';
import { Response } from 'express';
import { requireAuth, AuthedRequest } from '../../src/auth/auth.middleware';
import { verifyJwt } from '../../src/auth/jwt';
import { CacheService } from '../../src/services/cache.service';

// Mock the dependencies
jest.mock('ioredis'); // Prevent real Redis connection
jest.mock('../../src/auth/jwt');
jest.mock('../../src/services/cache.service');

const { res: mockRes, next: mockNext, mockClear } = getMockRes();

describe('requireAuth Middleware', () => {
  beforeEach(() => {
    // Clear mock history and reset implementations before each test
    mockClear();
    (verifyJwt as jest.Mock).mockClear();
    (CacheService.get as jest.Mock).mockClear();
  });

  it('should return 401 if authorization header is missing', async () => {
    const req = getMockReq();

    await requireAuth(req as unknown as AuthedRequest, mockRes as unknown as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Missing Authorization header' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 if token scheme is not "Bearer"', async () => {
    const req = getMockReq({
      headers: {
        authorization: 'Basic some-token',
      },
    });

    await requireAuth(req as unknown as AuthedRequest, mockRes as unknown as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid Authorization header' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 if token is invalid or expired', async () => {
    const req = getMockReq({
      headers: {
        authorization: 'Bearer invalid-token',
      },
    });
    // Mock verifyJwt to return null, simulating an invalid token
    (verifyJwt as jest.Mock).mockReturnValue(null);

    await requireAuth(req as unknown as AuthedRequest, mockRes as unknown as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  // This is the highest-priority test case from our plan
  it('should return 401 if token is blacklisted in cache', async () => {
    const req = getMockReq({
      headers: {
        authorization: 'Bearer valid-but-blacklisted-token',
      },
    });

    // Mock a valid JWT payload
    const mockPayload = { id: 'user-123', role: 'student', email: 'test@test.com' };
    (verifyJwt as jest.Mock).mockReturnValue(mockPayload);

    // Mock CacheService to indicate the token is blacklisted
    (CacheService.get as jest.Mock).mockResolvedValue('blacklisted');

    await requireAuth(req as unknown as AuthedRequest, mockRes as unknown as Response, mockNext);

    expect(CacheService.get).toHaveBeenCalledWith('jwt:blacklist:valid-but-blacklisted-token');
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Token has been revoked' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next() and attach user to request on successful authentication', async () => {
    const req = getMockReq({
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    // Mock a valid JWT payload
    const mockPayload = { id: 'user-123', role: 'student', email: 'test@test.com' };
    (verifyJwt as jest.Mock).mockReturnValue(mockPayload);

    // Mock CacheService to indicate the token is NOT blacklisted
    (CacheService.get as jest.Mock).mockResolvedValue(null);

    await requireAuth(req as unknown as AuthedRequest, mockRes as unknown as Response, mockNext);

    expect(verifyJwt).toHaveBeenCalledWith('valid-token');
    expect(CacheService.get).toHaveBeenCalledWith('jwt:blacklist:valid-token');
    expect((req as unknown as AuthedRequest).user).toBeDefined();
    expect((req as unknown as AuthedRequest).user).toEqual(mockPayload);
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });
});
