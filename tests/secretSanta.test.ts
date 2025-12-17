import { assignSecretSanta, getUserAssignment, getAllAssignments } from '../src/services/secretSanta';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../src/models/User';
import Event from '../src/models/Event';
import Assignment from '../src/models/Assignment';

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

beforeEach(async () => {
  await User.deleteMany({});
  await Event.deleteMany({});
  await Assignment.deleteMany({});
});

describe('Secret Santa Assignment Algorithm', () => {
  test('should assign participants correctly with no self-assignments', async () => {
    // Create an event
    const event = await Event.create({
      name: 'Test Event',
      budgetLimit: 50,
      registrationDeadline: new Date(Date.now() + 86400000),
      status: 'open',
    });

    // Create test users
    const users = await User.insertMany([
      { name: 'Alice', email: 'alice@test.com', eventId: event._id, role: 'user' },
      { name: 'Bob', email: 'bob@test.com', eventId: event._id, role: 'user' },
      { name: 'Charlie', email: 'charlie@test.com', eventId: event._id, role: 'user' },
      { name: 'David', email: 'david@test.com', eventId: event._id, role: 'user' },
      { name: 'Eve', email: 'eve@test.com', eventId: event._id, role: 'user' },
    ]);

    // Run assignment
    await assignSecretSanta(event._id as mongoose.Types.ObjectId);

    // Verify assignments
    const assignments = await Assignment.find({ eventId: event._id });

    // Should have one assignment per participant
    expect(assignments.length).toBe(users.length);

    // No one should be assigned to themselves
    for (const assignment of assignments) {
      expect(assignment.santaUserId.toString()).not.toBe(
        assignment.receiverUserId.toString()
      );
    }

    // Each user should appear exactly once as a santa
    const santaIds = assignments.map((a) => a.santaUserId.toString()).sort();
    const userIds = users.map((u) => u._id.toString()).sort();
    expect(santaIds).toEqual(userIds);

    // Each user should appear exactly once as a receiver
    const receiverIds = assignments.map((a) => a.receiverUserId.toString()).sort();
    expect(receiverIds).toEqual(userIds);

    // All receiver numbers should be unique
    const numbers = assignments.map((a) => a.receiverNumber).sort();
    const uniqueNumbers = [...new Set(numbers)];
    expect(uniqueNumbers.length).toBe(users.length);

    // Event status should be updated
    const updatedEvent = await Event.findById(event._id);
    expect(updatedEvent?.status).toBe('assigned');
  });

  test('should work with minimum 2 participants', async () => {
    const event = await Event.create({
      name: 'Small Event',
      budgetLimit: 25,
      registrationDeadline: new Date(Date.now() + 86400000),
      status: 'open',
    });

    const users = await User.insertMany([
      { name: 'User1', email: 'user1@test.com', eventId: event._id, role: 'user' },
      { name: 'User2', email: 'user2@test.com', eventId: event._id, role: 'user' },
    ]);

    await assignSecretSanta(event._id as mongoose.Types.ObjectId);

    const assignments = await Assignment.find({ eventId: event._id });
    expect(assignments.length).toBe(2);

    // With 2 people, they must be assigned to each other
    const [a1, a2] = assignments;
    expect(a1.receiverUserId.toString()).toBe(a2.santaUserId.toString());
    expect(a2.receiverUserId.toString()).toBe(a1.santaUserId.toString());
  });

  test('should fail with less than 2 participants', async () => {
    const event = await Event.create({
      name: 'Tiny Event',
      budgetLimit: 25,
      registrationDeadline: new Date(Date.now() + 86400000),
      status: 'open',
    });

    await User.create({
      name: 'Lonely User',
      email: 'lonely@test.com',
      eventId: event._id,
      role: 'user',
    });

    await expect(
      assignSecretSanta(event._id as mongoose.Types.ObjectId)
    ).rejects.toThrow('Need at least 2 participants');
  });

  test('should allow re-running assignment', async () => {
    const event = await Event.create({
      name: 'Re-run Event',
      budgetLimit: 30,
      registrationDeadline: new Date(Date.now() + 86400000),
      status: 'open',
    });

    const users = await User.insertMany([
      { name: 'User1', email: 'user1@test.com', eventId: event._id, role: 'user' },
      { name: 'User2', email: 'user2@test.com', eventId: event._id, role: 'user' },
      { name: 'User3', email: 'user3@test.com', eventId: event._id, role: 'user' },
    ]);

    // First assignment
    await assignSecretSanta(event._id as mongoose.Types.ObjectId);
    const firstAssignments = await Assignment.find({ eventId: event._id });

    // Re-run assignment
    await assignSecretSanta(event._id as mongoose.Types.ObjectId);
    const secondAssignments = await Assignment.find({ eventId: event._id });

    // Should still have correct number of assignments
    expect(secondAssignments.length).toBe(users.length);

    // No self-assignments
    for (const assignment of secondAssignments) {
      expect(assignment.santaUserId.toString()).not.toBe(
        assignment.receiverUserId.toString()
      );
    }
  });
});

describe('Get User Assignment', () => {
  test('should return user assignment with wishlist', async () => {
    const event = await Event.create({
      name: 'Test Event',
      budgetLimit: 50,
      registrationDeadline: new Date(Date.now() + 86400000),
      status: 'assigned',
    });

    const [user1, user2] = await User.insertMany([
      {
        name: 'User1',
        email: 'user1@test.com',
        eventId: event._id,
        role: 'user',
        wishlist: { wishText: 'I want books', link: 'https://example.com' },
      },
      {
        name: 'User2',
        email: 'user2@test.com',
        eventId: event._id,
        role: 'user',
        wishlist: { wishText: 'I want games', link: '' },
      },
    ]);

    await Assignment.create({
      eventId: event._id,
      santaUserId: user1._id,
      receiverUserId: user2._id,
      receiverNumber: 1,
    });

    const assignment = await getUserAssignment(
      event._id as mongoose.Types.ObjectId,
      user1._id as mongoose.Types.ObjectId
    );

    expect(assignment).not.toBeNull();
    expect(assignment?.receiverNumber).toBe(1);
    expect(assignment?.receiverWishlist.wishText).toBe('I want games');
  });

  test('should return null for non-existent assignment', async () => {
    const event = await Event.create({
      name: 'Test Event',
      budgetLimit: 50,
      registrationDeadline: new Date(Date.now() + 86400000),
      status: 'assigned',
    });

    const user = await User.create({
      name: 'User',
      email: 'user@test.com',
      eventId: event._id,
      role: 'user',
    });

    const assignment = await getUserAssignment(
      event._id as mongoose.Types.ObjectId,
      user._id as mongoose.Types.ObjectId
    );

    expect(assignment).toBeNull();
  });
});
