import api from "../lib/api";

export const updateProfilePicture = async (
  token: string,
  file: File,
): Promise<string> => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  return new Promise((resolve, reject) => {
    reader.onload = async () => {
      try {
        const base64String = reader.result as string;
        await api.patch(
          "/users/pfp",
          { pfp: base64String },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        resolve(base64String);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => {
      reject(error);
    };
  });
};

export const updateProfile = async (
  token: string,
  firstName: string,
  lastName: string,
): Promise<void> => {
  await api.patch(
    "/users/profile",
    { firstName, lastName },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
};

export const updatePassword = async (
  token: string,
  current: string,
  newPass: string,
): Promise<void> => {
  await api.patch(
    "/users/password",
    { current, new: newPass },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
};

export const updateEnrolledCourses = async (
  token: string,
  enrolledCourses: string[],
): Promise<{ enrolledCourses: string[] }> => {
  const response = await api.patch(
    "/users/enrolled-courses",
    { enrolledCourses },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return response.data;
};

export const deleteAccount = async (
  token: string,
  password: string,
): Promise<void> => {
  await api.delete("/users/account", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: {
      password,
    },
  });
};

export const adminDeleteUser = async (
  token: string,
  userId: string,
): Promise<void> => {
  await api.delete(`/users/admin/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};
