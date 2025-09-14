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
  find(filter: FilterQuery<UserDoc> = {}, limit = 20, skip = 0) {
    return UserModel.find(filter).limit(limit).skip(skip).lean<UserDoc[]>();
  },

  findById(id: string) {
    return UserModel.findById(id).lean<UserDoc | null>();
  },

  findOne(filter: FilterQuery<UserDoc>) {
    return UserModel.findOne(filter).lean<UserDoc | null>();
  },

  findByEmail(email: string) {
    return UserModel.findOne({
      email: email.toLowerCase(),
    }).lean<UserDoc | null>();
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
      .lean<UserDoc | (UserDoc & { passwordHash: string }) | null>();
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
