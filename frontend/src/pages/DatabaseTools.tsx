import React, { useState, useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { adminApi } from "../services/adminApi";
import "./DatabaseTools.css";

interface EntityData {
  id: string;
  [key: string]: any;
}

interface AdminUser extends EntityData {
  email: string;
  role: "admin" | "student" | "tutor";
  name?: string;
  surname?: string;
  createdAt: string;
  updatedAt: string;
}

interface File extends EntityData {
  title: string;
  subject: string;
  subtopic: string;
  description: string;
  tutorId: string;
  tutorName?: string;
  contentType: string;
  externalUri?: string;
  createdAt: string;
  updatedAt: string;
}

interface ForumPost extends EntityData {
  title: string;
  content: string;
  topic: string;
  authorId: string;
  authorRole: "student" | "tutor" | "admin";
  authorName?: string;
  isAnonymous: boolean;
  upvotes: number;
  replies: string[];
  createdAt: string;
  updatedAt: string;
}

interface ForumReply extends EntityData {
  postId: string;
  content: string;
  authorId: string;
  authorRole: "student" | "tutor" | "admin";
  authorName?: string;
  isAnonymous: boolean;
  upvotes: number;
  createdAt: string;
  updatedAt: string;
}

interface Student extends EntityData {
  userId: string;
  name: string;
  surname: string;
  enrolledCourses: string[];
  createdAt: string;
  updatedAt: string;
}

interface Tutor extends EntityData {
  userId: string;
  name: string;
  surname: string;
  subjects: string[];
  rating: {
    totalScore: number;
    count: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface Video extends EntityData {
  filename: string;
  bucketPath: string;
  uploaderId: string;
  courseId: string;
  description?: string;
  duration?: number;
  createdAt: string;
  updatedAt: string;
}

type EntityType =
  | "admins"
  | "files"
  | "forum-posts"
  | "forum-replies"
  | "students"
  | "tutors";

const DatabaseTools: React.FC = () => {
  const [activeTab, setActiveTab] = useState<EntityType>("admins");
  const [data, setData] = useState<EntityData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<EntityData | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<EntityData | null>(null);
  const [viewingItem, setViewingItem] = useState<EntityData | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const { user, token } = useAuthStore((state) => ({
    user: state.user,
    token: state.token,
  }));

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== "admin") {
      window.location.href = "/schedule";
    }
  }, [user]);

  // Fetch data when tab changes
  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [activeTab, token]);

  const fetchData = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getAllEntities(token, activeTab);
      console.log("API Response:", response);
      console.log("Entities:", response.entities);
      setData(response.entities || []);
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(err.response?.data?.message || "Failed to fetch data");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (formData: any) => {
    if (!token) return;

    try {
      setLoading(true);
      await adminApi.createEntity(token, activeTab, formData);
      await fetchData();
      setShowCreateModal(false);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create item");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string, formData: any) => {
    if (!token) return;

    try {
      setLoading(true);
      await adminApi.updateEntity(token, activeTab, id, formData);
      await fetchData();
      setEditingItem(null);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update item");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !itemToDelete) return;

    try {
      setLoading(true);
      const itemId = itemToDelete.id || itemToDelete._id;
      if (!itemId) {
        throw new Error("Item ID not found");
      }
      console.log("Deleting item with ID:", itemId);
      await adminApi.deleteEntity(token, activeTab, itemId);
      await fetchData();
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (err: any) {
      console.error("Delete error:", err);
      setError(
        err.response?.data?.message || err.message || "Failed to delete item",
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredData = (data || []).filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return Object.values(item).some((value) =>
      String(value).toLowerCase().includes(searchLower),
    );
  });

  const getEntityDisplayName = (entityType: EntityType): string => {
    const names = {
      admins: "Admins",
      files: "Files",
      "forum-posts": "Forum Posts",
      "forum-replies": "Forum Replies",
      students: "Students",
      tutors: "Tutors",
    };
    return names[entityType];
  };

  const getEntityFields = (entityType: EntityType): string[] => {
    const fields = {
      admins: ["email", "name", "surname", "createdAt"],
      files: [
        "title",
        "subject",
        "subtopic",
        "description",
        "tutorName",
        "fileType",
        "createdAt",
      ],
      "forum-posts": [
        "title",
        "topic",
        "authorName",
        "authorRole",
        "upvotes",
        "createdAt",
      ],
      "forum-replies": [
        "content",
        "authorName",
        "authorRole",
        "upvotes",
        "createdAt",
      ],
      students: ["name", "surname", "enrolledCourses", "createdAt"],
      tutors: ["name", "surname", "subjects", "rating", "createdAt"],
    };
    return fields[entityType] || [];
  };

  const formatFieldName = (field: string): string => {
    // Add spaces before capital letters and convert to title case
    return field
      .replace(/([A-Z])/g, " $1") // Add space before capital letters
      .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
      .trim(); // Remove any leading/trailing spaces
  };

  const formatValue = (value: any, field: string): string => {
    if (value === null || value === undefined) return "N/A";

    if (field === "createdAt" || field === "updatedAt") {
      return new Date(value).toLocaleDateString();
    }

    if (field === "enrolledCourses" || field === "subjects") {
      return Array.isArray(value) ? value.join(", ") : "N/A";
    }

    if (field === "rating") {
      return typeof value === "object" && value.count > 0
        ? `${(value.totalScore / value.count).toFixed(1)} (${value.count} reviews)`
        : "No ratings";
    }

    if (field === "fileType" || field === "contentType") {
      if (value && value.includes("video")) return "Video";
      if (value && value.includes("image")) return "Image";
      if (value && value.includes("pdf")) return "PDF";
      if (value && value.includes("text")) return "Text";
      return "File";
    }

    return String(value);
  };

  if (user?.role !== "admin") {
    return (
      <div className="database-tools">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="database-tools">
      <div className="database-tools-header">
        <div className="header-content">
          <h1>
            <i className="fas fa-database"></i> Database Tools
          </h1>
          <p>Manage all entities in the system</p>
        </div>
      </div>

      <div className="database-tools-content">
        <div className="tabs">
          {(
            [
              "admins",
              "files",
              "forum-posts",
              "forum-replies",
              "students",
              "tutors",
            ] as EntityType[]
          ).map((tab) => (
            <button
              key={tab}
              className={`tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {getEntityDisplayName(tab)}
            </button>
          ))}
        </div>

        <div className="toolbar">
          <div className="search-box">
            <input
              type="text"
              placeholder={`Search ${getEntityDisplayName(activeTab).toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            className="create-btn"
            onClick={() => setShowCreateModal(true)}
          >
            + Add {getEntityDisplayName(activeTab).slice(0)}
          </button>
        </div>

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        )}

        {error && (
          <div className="error">
            <p>{error}</p>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {!loading && !error && (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  {getEntityFields(activeTab).map((field) => (
                    <th key={field}>{formatFieldName(field)}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, index) => {
                  console.log(`Item ${index}:`, item);
                  const itemId = item.id || item._id || index;
                  return (
                    <tr key={itemId}>
                      {getEntityFields(activeTab).map((field) => {
                        const value = formatValue(item[field], field);
                        const originalValue = item[field];
                        console.log(
                          `Field ${field}:`,
                          item[field],
                          "Formatted:",
                          value,
                        );
                        return (
                          <td key={field} title={String(originalValue)}>
                            {value}
                          </td>
                        );
                      })}
                      <td className="actions">
                        <button
                          className="view-btn"
                          onClick={() => {
                            console.log("View clicked for item:", item);
                            setViewingItem(item);
                            setShowViewModal(true);
                          }}
                          title="View Details"
                        >
                          View
                        </button>
                        <button
                          className="edit-btn"
                          onClick={() => {
                            console.log("Edit clicked for item:", item);
                            setEditingItem(item);
                          }}
                          title="Edit Record"
                        >
                          Edit
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => {
                            console.log("Delete clicked for item:", item);
                            setItemToDelete(item);
                            setShowDeleteModal(true);
                          }}
                          title="Delete Record"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredData.length === 0 && (
              <div className="empty-state">
                <p>No {getEntityDisplayName(activeTab).toLowerCase()} found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateModal
          entityType={activeTab}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
        />
      )}

      {/* Edit Modal */}
      {editingItem && (
        <EditModal
          entityType={activeTab}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSubmit={(formData) =>
            handleUpdate(editingItem.id || editingItem._id || "", formData)
          }
        />
      )}

      {/* Delete Modal */}
      {showDeleteModal && itemToDelete && (
        <DeleteModal
          entityType={activeTab}
          item={itemToDelete}
          onClose={() => {
            setShowDeleteModal(false);
            setItemToDelete(null);
          }}
          onConfirm={handleDelete}
        />
      )}

      {/* View Modal */}
      {showViewModal && viewingItem && (
        <ViewModal
          entityType={activeTab}
          item={viewingItem}
          onClose={() => {
            setShowViewModal(false);
            setViewingItem(null);
          }}
        />
      )}
    </div>
  );
};

// Create Modal Component
interface CreateModalProps {
  entityType: EntityType;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const CreateModal: React.FC<CreateModalProps> = ({
  entityType,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<any>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Automatically detect content type
      const contentType = file.type || "application/octet-stream";
      setFormData({ ...formData, contentType });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (entityType === "files" && selectedFile) {
      // For files, we need to handle file upload differently
      const submitData = {
        ...formData,
        file: selectedFile,
      };
      onSubmit(submitData);
    } else {
      onSubmit(formData);
    }
  };

  const getFormFields = (entityType: EntityType) => {
    const fields: any = {
      admins: [
        { name: "email", type: "email", required: true },
        { name: "name", type: "text", required: true },
        { name: "surname", type: "text", required: true },
      ],
      files: [
        {
          name: "title",
          type: "text",
          required: true,
          placeholder: "File title/name",
        },
        { name: "subject", type: "text", required: true },
        { name: "subtopic", type: "text", required: true },
        { name: "description", type: "textarea", required: false },
        {
          name: "contentType",
          type: "select",
          required: true,
          options: [
            "video/mp4",
            "image/jpeg",
            "image/png",
            "application/pdf",
            "text/plain",
            "application/octet-stream",
          ],
        },
        {
          name: "tutorId",
          type: "text",
          required: true,
          placeholder: "Tutor User ID",
        },
      ],
      "forum-posts": [
        { name: "title", type: "text", required: true },
        { name: "content", type: "textarea", required: true },
        { name: "topic", type: "text", required: true },
        { name: "authorId", type: "text", required: true },
        {
          name: "authorRole",
          type: "select",
          required: true,
          options: ["student", "tutor", "admin"],
        },
      ],
      "forum-replies": [
        { name: "postId", type: "text", required: true },
        { name: "content", type: "textarea", required: true },
        { name: "authorId", type: "text", required: true },
        {
          name: "authorRole",
          type: "select",
          required: true,
          options: ["student", "tutor", "admin"],
        },
      ],
      students: [
        { name: "userId", type: "text", required: true },
        { name: "name", type: "text", required: true },
        { name: "surname", type: "text", required: true },
        {
          name: "enrolledCourses",
          type: "text",
          required: false,
          placeholder: "Comma-separated list",
        },
      ],
      tutors: [
        { name: "userId", type: "text", required: true },
        { name: "name", type: "text", required: true },
        { name: "surname", type: "text", required: true },
        {
          name: "subjects",
          type: "text",
          required: true,
          placeholder: "Comma-separated list",
        },
      ],
    };
    return fields[entityType] || [];
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Create {entityType.slice(0)}</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {entityType === "files" && (
              <div className="form-group">
                <label>
                  File Upload
                  <span className="required">*</span>
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept="*/*"
                  required
                />
                {selectedFile && (
                  <div className="file-info">
                    <p>
                      <strong>Selected:</strong> {selectedFile.name}
                    </p>
                    <p>
                      <strong>Type:</strong>{" "}
                      {selectedFile.type || "application/octet-stream"}
                    </p>
                    <p>
                      <strong>Size:</strong>{" "}
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
              </div>
            )}
            {getFormFields(entityType).map((field) => (
              <div key={field.name} className="form-group">
                <label>
                  {field.name.charAt(0).toUpperCase() + field.name.slice(1)}
                  {field.required && <span className="required">*</span>}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    value={formData[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                ) : field.type === "select" ? (
                  <select
                    value={formData[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    required={field.required}
                  >
                    <option value="">Select...</option>
                    {field.options?.map((option: any) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : field.type === "checkbox" ? (
                  <input
                    type="checkbox"
                    checked={formData[field.name] || false}
                    onChange={(e) => handleChange(field.name, e.target.checked)}
                  />
                ) : (
                  <input
                    type={field.type}
                    value={formData[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Modal Component
interface EditModalProps {
  entityType: EntityType;
  item: EntityData;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const EditModal: React.FC<EditModalProps> = ({
  entityType,
  item,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<any>(item);

  const getFormFields = (entityType: EntityType) => {
    // Same as CreateModal but exclude id and timestamps
    const fields: any = {
      admins: [
        { name: "email", type: "email", required: true },
        { name: "name", type: "text", required: true },
        { name: "surname", type: "text", required: true },
      ],
      files: [
        {
          name: "title",
          type: "text",
          required: true,
          placeholder: "File title/name",
        },
        { name: "subject", type: "text", required: true },
        { name: "subtopic", type: "text", required: true },
        { name: "description", type: "textarea", required: false },
        {
          name: "contentType",
          type: "select",
          required: true,
          options: [
            "video/mp4",
            "image/jpeg",
            "image/png",
            "application/pdf",
            "text/plain",
            "application/octet-stream",
          ],
        },
      ],
      "forum-posts": [
        { name: "title", type: "text", required: true },
        { name: "content", type: "textarea", required: true },
        { name: "topic", type: "text", required: true },
      ],
      "forum-replies": [{ name: "content", type: "textarea", required: true }],
      students: [
        { name: "name", type: "text", required: true },
        { name: "surname", type: "text", required: true },
        {
          name: "enrolledCourses",
          type: "text",
          required: false,
          placeholder: "Comma-separated list",
        },
      ],
      tutors: [
        { name: "name", type: "text", required: true },
        { name: "surname", type: "text", required: true },
        {
          name: "subjects",
          type: "text",
          required: true,
          placeholder: "Comma-separated list",
        },
      ],
    };
    return fields[entityType] || [];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Edit {entityType.slice(0)}</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {getFormFields(entityType).map((field) => (
              <div key={field.name} className="form-group">
                <label>
                  {field.name.charAt(0).toUpperCase() + field.name.slice(1)}
                  {field.required && <span className="required">*</span>}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    value={formData[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                ) : field.type === "checkbox" ? (
                  <input
                    type="checkbox"
                    checked={formData[field.name] || false}
                    onChange={(e) => handleChange(field.name, e.target.checked)}
                  />
                ) : (
                  <input
                    type={field.type}
                    value={formData[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit">Update</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Delete Modal Component
interface DeleteModalProps {
  entityType: EntityType;
  item: EntityData;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  entityType,
  item,
  onClose,
  onConfirm,
}) => {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Delete {entityType.slice(0)}</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <p>Are you sure you want to delete this {entityType.slice(0)}?</p>
          <p>
            <strong>ID:</strong> {item.id}
          </p>
        </div>
        <div className="modal-footer">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="delete-btn" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// View Modal Component
interface ViewModalProps {
  entityType: EntityType;
  item: EntityData;
  onClose: () => void;
}

const ViewModal: React.FC<ViewModalProps> = ({ entityType, item, onClose }) => {
  const getEntityDisplayName = (entityType: EntityType): string => {
    const names: Record<EntityType, string> = {
      admins: "Admin",
      files: "File",
      "forum-posts": "Forum Post",
      "forum-replies": "Forum Reply",
      students: "Student",
      tutors: "Tutor",
    };
    return names[entityType];
  };

  const formatValue = (value: any, field: string): string => {
    if (value === null || value === undefined) return "N/A";

    if (field === "createdAt" || field === "updatedAt") {
      return new Date(value).toLocaleString();
    }

    if (field === "enrolledCourses" || field === "subjects") {
      return Array.isArray(value) ? value.join(", ") : "N/A";
    }

    if (field === "rating") {
      return typeof value === "object" && value.count > 0
        ? `${(value.totalScore / value.count).toFixed(1)} (${value.count} reviews)`
        : "No ratings";
    }

    if (field === "fileType" || field === "contentType") {
      if (value && value.includes("video")) return "Video";
      if (value && value.includes("image")) return "Image";
      if (value && value.includes("pdf")) return "PDF";
      if (value && value.includes("text")) return "Text";
      return "File";
    }

    return String(value);
  };

  return (
    <div className="modal-overlay">
      <div className="modal view-modal">
        <div className="modal-header">
          <h2>View {getEntityDisplayName(entityType)} Details</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="view-content">
            {Object.entries(item).map(([key, value]) => (
              <div key={key} className="detail-row">
                <div className="detail-label">
                  {key.charAt(0).toUpperCase() +
                    key.slice(1).replace(/([A-Z])/g, " $1")}
                </div>
                <div className="detail-value">{formatValue(value, key)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatabaseTools;
