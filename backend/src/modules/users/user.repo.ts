import { type FilterQuery, type UpdateQuery } from "mongoose";
import { UserModel, type UserDoc } from "../../schemas/user.schema";

export const UserRepo = {
  // CREATE
  create(data: Partial<UserDoc>) {
    // ensure email is lowercase before write (schema also has lowercase:true)
    if (data.email) data.email = data.email.toLowerCase();
    return UserModel.create(data);
  },

  // READ (passwordHash is select:false by default)
  async find(filter: FilterQuery<UserDoc> = {}, limit = 20, skip = 0) {
    const users = await UserModel.find(filter)
      .limit(limit)
      .skip(skip)
      .lean<UserDoc[]>({ virtuals: true });
    // Ensure id field is present for all users
    return users.map((user) => ({
      ...user,
      id: user._id?.toString(),
    }));
  },

  async findById(id: string) {
    const user = await UserModel.findById(id).lean<UserDoc | null>({
      virtuals: true,
    });
    if (!user) return null;
    return {
      ...user,
      id: user._id?.toString(),
    };
  },

  async findOne(filter: FilterQuery<UserDoc>) {
    const user = await UserModel.findOne(filter).lean<UserDoc | null>({
      virtuals: true,
    });
    if (!user) return null;
    return {
      ...user,
      id: user._id?.toString(),
    };
  },

  async findByEmail(email: string) {
    const user = await UserModel.findOne({
      email: email.toLowerCase(),
    }).lean<UserDoc | null>({ virtuals: true });
    if (!user) return null;
    return {
      ...user,
      id: user._id?.toString(),
    };
  },

  // When you specifically need the hash (e.g., auth flow)
  findByEmailWithPassword(email: string) {
    return UserModel.findOne({ email: email.toLowerCase() })
      .select("+passwordHash")
      .lean<
        UserDoc | (UserDoc & { passwordHash: string }) | null
      >({ virtuals: true });
  },

  findByIdWithPassword(id: string) {
    return UserModel.findById(id)
      .select("+passwordHash")
      .lean<
        UserDoc | (UserDoc & { passwordHash: string }) | null
      >({ virtuals: true });
  },

  // UPDATE
  updateById(id: string, update: UpdateQuery<UserDoc>) {
    if ((update as any).email)
      (update as any).email = (update as any).email.toLowerCase();
    return UserModel.findByIdAndUpdate(id, update, {
      new: true,
    }).lean<UserDoc | null>({ virtuals: true });
  },

  // DELETE
  deleteById(id: string) {
    return UserModel.findByIdAndDelete(id).lean<UserDoc | null>({
      virtuals: true,
    });
  },
};
