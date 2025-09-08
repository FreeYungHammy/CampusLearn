import React, { useState, useRef, useEffect } from "react";
import api from "../lib/api";
import { useAuthStore } from "../store/authStore";

const Upload = () => {
  const [subject, setSubject] = useState("");
  const [subtopic, setSubtopic] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();
  const tutorId = user?.role === "tutor" ? user._id : null; // Get tutorId from auth store

  useEffect(() => {
    if (file) {
      const fileName = file.name;
      const lastDot = fileName.lastIndexOf(".");
      const title = lastDot > -1 ? fileName.substring(0, lastDot) : fileName;
      setTitle(title);
    }
  }, [file]);

  const validate = () => {
    const newErrors: any = {};
    if (!file) newErrors.file = "File is required";
    if (!title) newErrors.title = "Title is required";
    if (!subject) newErrors.subject = "Subject is required";
    if (!subtopic) newErrors.subtopic = "Subtopic is required";
    if (!description) newErrors.description = "Description is required";
    if (!tutorId)
      newErrors.auth = "You must be logged in as a tutor to upload files.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (validate()) {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("file", file as Blob);
      formData.append("title", title);
      formData.append("subject", subject);
      formData.append("subtopic", subtopic);
      formData.append("description", description);
      formData.append("tutorId", tutorId as string);

      try {
        const response = await api.post("/files", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        console.log("Upload successful:", response.data);
        alert("File uploaded successfully!");
        // Clear form fields
        setFile(null);
        setTitle("");
        setSubject("");
        setSubtopic("");
        setDescription("");
        setErrors({});
      } catch (error) {
        console.error("Upload failed:", error);
        alert("File upload failed. Please check the console for details.");
        setErrors({ api: "File upload failed." });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="content-view" id="upload-view">
      <h2 className="section-title">
        <i className="fas fa-upload"></i>Upload Learning Materials
      </h2>
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <i className="fas fa-plus-circle"></i>Add New Content
          </div>
        </div>
        <div className="card-body">
          <div
            className={`upload-area ${errors.file ? "is-invalid" : ""}`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="upload-icon">
              <i className="fas fa-cloud-upload-alt"></i>
            </div>
            <div className="upload-text">
              <p>Drag & drop files here or click to browse</p>
              {file && <p>Selected file: {file.name}</p>}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <button className="btn btn-outline" onClick={handleBrowseClick}>
              <i className="fas fa-folder-open"></i> Select Files
            </button>
          </div>
          {errors.file && (
            <div className="invalid-feedback d-block upload-error">
              {errors.file}
            </div>
          )}
          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-heading"></i>Title
            </label>
            <input
              type="text"
              className={`form-control ${errors.title ? "is-invalid" : ""}`}
              placeholder="Enter a title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {errors.title && (
              <div className="invalid-feedback d-block upload-error">
                {errors.title}
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-book"></i>Subject
            </label>
            <select
              className={`form-control ${errors.subject ? "is-invalid" : ""}`}
              id="subject-select"
              onChange={(e) => setSubject(e.target.value)}
              value={subject}
            >
              <option value="">Select a subject</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Business">Business</option>
            </select>
            {errors.subject && (
              <div className="invalid-feedback d-block upload-error">
                {errors.subject}
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-tag"></i>Subtopic
            </label>
            <input
              type="text"
              className={`form-control ${errors.subtopic ? "is-invalid" : ""}`}
              placeholder="Enter a subtopic"
              value={subtopic}
              onChange={(e) => setSubtopic(e.target.value)}
            />
            {errors.subtopic && (
              <div className="invalid-feedback d-block upload-error">
                {errors.subtopic}
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-align-left"></i>Description
            </label>
            <textarea
              className={`form-control ${errors.description ? "is-invalid" : ""}`}
              placeholder="Enter a description for this content"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {errors.description && (
              <div className="invalid-feedback d-block upload-error">
                {errors.description}
              </div>
            )}
          </div>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Uploading..." : "Upload Content"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Upload;
