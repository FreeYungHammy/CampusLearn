import React, { useState, useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { adminDeleteUser } from "../services/settingsApi";
import api from "../lib/api";

interface User {
  id: string;
  email: string;
  role: "student" | "tutor" | "admin";
  name?: string;
  surname?: string;
  createdAt: string;
  updatedAt: string;
}

interface DeleteUserModalProps {
  show: boolean;
  user: User | null;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

function DeleteUserModal({
  show,
  user,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteUserModalProps) {
  if (!show || !user) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Confirm User Deletion</h2>
        <div className="modal-body">
          <p style={{ marginBottom: "1rem", color: "var(--danger)" }}>
            ⚠️ Are you sure you want to delete this user account?
          </p>
          <div
            style={{
              marginBottom: "1rem",
              padding: "1rem",
              backgroundColor: "var(--bg-secondary)",
              borderRadius: "8px",
            }}
          >
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>Name:</strong> {user.name} {user.surname}
            </p>
            <p>
              <strong>Role:</strong> {user.role}
            </p>
            <p>
              <strong>Created:</strong>{" "}
              {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
          <p style={{ color: "var(--danger)" }}>
            This will permanently delete all user data including messages,
            posts, uploads, and bookings. This action cannot be undone.
          </p>
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger-solid"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete User"}
          </button>
        </div>
      </div>
    </div>
  );
}

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const { user: currentUser, token } = useAuthStore((state) => ({
    user: state.user,
    token: state.token,
  }));

  // Redirect if not admin
  useEffect(() => {
    if (currentUser && currentUser.role !== "admin") {
      window.location.href = "/schedule";
    }
  }, [currentUser]);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      if (!token) return;

      try {
        setLoading(true);
        const response = await api.get("/users", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setUsers(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to fetch users");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [token]);

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete || !token) return;

    if (!userToDelete.id) {
      alert("Error: User ID is missing");
      return;
    }

    setIsDeleting(true);
    try {
      await adminDeleteUser(token, userToDelete.id);
      setUsers(users.filter((u) => u.id !== userToDelete.id));
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (err: any) {
      console.error("Delete user error:", err);
      alert(err.response?.data?.message || "Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const fullName = `${user.name || ""} ${user.surname || ""}`.trim();
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fullName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    // Don't show current admin user in the list
    const isNotCurrentUser = user.id !== currentUser?.id;

    return matchesSearch && matchesRole && isNotCurrentUser;
  });

  if (currentUser?.role !== "admin") {
    return <div>Access denied. Admin privileges required.</div>;
  }

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: "2rem" }}></i>
        <p>Loading users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{ padding: "2rem", textAlign: "center", color: "var(--danger)" }}
      >
        <i
          className="fas fa-exclamation-triangle"
          style={{ fontSize: "2rem", marginBottom: "1rem" }}
        ></i>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <>
      <DeleteUserModal
        show={showDeleteModal}
        user={userToDelete}
        onClose={() => {
          setShowDeleteModal(false);
          setUserToDelete(null);
        }}
        onConfirm={confirmDeleteUser}
        isDeleting={isDeleting}
      />

      <div style={{ padding: "2rem" }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ marginBottom: "0.5rem" }}>User Management</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Manage user accounts and permissions
          </p>
        </div>

        {/* Filters */}
        <div
          style={{
            display: "flex",
            gap: "1rem",
            marginBottom: "2rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ flex: "1", minWidth: "300px" }}>
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "1rem",
              }}
            />
          </div>
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{
                padding: "0.75rem",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "1rem",
                minWidth: "120px",
              }}
            >
              <option value="all">All Roles</option>
              <option value="student">Students</option>
              <option value="tutor">Tutors</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div
          style={{
            backgroundColor: "var(--surface)",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            border: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              padding: "1rem 1.5rem",
              borderBottom: "1px solid var(--border)",
              backgroundColor: "var(--surface-2)",
            }}
          >
            <h3 style={{ margin: 0 }}>Users ({filteredUsers.length})</h3>
          </div>

          {filteredUsers.length === 0 ? (
            <div
              style={{
                padding: "3rem",
                textAlign: "center",
                color: "var(--text-secondary)",
              }}
            >
              <i
                className="fas fa-users"
                style={{ fontSize: "3rem", marginBottom: "1rem" }}
              ></i>
              <p>No users found matching your criteria</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "var(--surface-2)" }}>
                    <th
                      style={{
                        padding: "1rem",
                        textAlign: "left",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      User
                    </th>
                    <th
                      style={{
                        padding: "1rem",
                        textAlign: "left",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      Role
                    </th>
                    <th
                      style={{
                        padding: "1rem",
                        textAlign: "left",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      Created
                    </th>
                    <th
                      style={{
                        padding: "1rem",
                        textAlign: "center",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        backgroundColor: "var(--surface)",
                        transition: "background-color 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "var(--surface-2)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "var(--surface)";
                      }}
                    >
                      <td style={{ padding: "1rem" }}>
                        <div>
                          <div
                            style={{
                              fontWeight: "500",
                              marginBottom: "0.25rem",
                              color: "var(--text-primary)",
                            }}
                          >
                            {user.name && user.surname
                              ? `${user.name} ${user.surname}`
                              : user.name ||
                                user.surname ||
                                "Name not available"}
                          </div>
                          <div
                            style={{
                              color: "var(--text-secondary)",
                              fontSize: "0.875rem",
                            }}
                          >
                            {user.email}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <span
                          style={{
                            padding: "0.25rem 0.75rem",
                            borderRadius: "20px",
                            fontSize: "0.75rem",
                            fontWeight: "500",
                            textTransform: "uppercase",
                            backgroundColor:
                              user.role === "admin"
                                ? "var(--danger-light)"
                                : user.role === "tutor"
                                  ? "var(--warning-light)"
                                  : "var(--success-light)",
                            color:
                              user.role === "admin"
                                ? "var(--danger)"
                                : user.role === "tutor"
                                  ? "var(--warning)"
                                  : "var(--success)",
                          }}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "1rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "1rem", textAlign: "center" }}>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          style={{
                            padding: "0.5rem 1rem",
                            backgroundColor: "var(--danger)",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "0.875rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "var(--danger-dark)";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "var(--danger)";
                          }}
                        >
                          <i className="fas fa-trash"></i>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminUsers;
