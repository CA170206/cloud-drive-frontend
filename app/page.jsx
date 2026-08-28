"use client";

import { useEffect, useState } from "react";

const API_URL = "http://localhost:5000";

export default function Home() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setCheckingAuth(false);
    }
  };

  if (checkingAuth) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return <Dashboard user={user} onLogout={() => setUser(null)} />;
}

function Login({ onLogin }) {
  const [email, setEmail] = useState("test@clouddrive.com");
  const [password, setPassword] = useState("Test@123456");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error?.message || "Login failed");
        return;
      }

      onLogin(data.user);
    } catch (error) {
      setMessage("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-container">
      <div className="login-card">
        <h1>Cloud Drive</h1>
        <p className="subtitle">Sign in to your account</p>

        <form onSubmit={handleLogin}>
          <label>Email</label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {message && <p className="message error">{message}</p>}
      </div>
    </main>
  );
}

function Dashboard({ user, onLogout }) {
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);

  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderStack, setFolderStack] = useState([]);

  const [newFolderName, setNewFolderName] = useState("");
  const [showFolderInput, setShowFolderInput] = useState(false);

  const [renamingFolder, setRenamingFolder] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const [searchQuery, setSearchQuery] = useState("");

  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const [previewFileData, setPreviewFileData] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const [storageStats, setStorageStats] = useState({
    fileCount: 0,
    folderCount: 0,
    storageUsed: 0,
  });

  useEffect(() => {
    loadContents(null);
    loadStorageStats();
  }, []);

  const loadStorageStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/files/stats`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();

        setStorageStats(
          data.stats || {
            fileCount: 0,
            folderCount: 0,
            storageUsed: 0,
          }
        );
      }
    } catch (error) {
      console.error("Failed to load storage stats:", error);
    }
  };

  const loadContents = async (folderId) => {
    setLoading(true);

    try {
      const folderUrl = folderId
        ? `${API_URL}/api/folders?parentId=${folderId}`
        : `${API_URL}/api/folders`;

      const fileUrl = folderId
        ? `${API_URL}/api/files?folderId=${folderId}`
        : `${API_URL}/api/files`;

      const [foldersResponse, filesResponse] = await Promise.all([
        fetch(folderUrl, { credentials: "include" }),
        fetch(fileUrl, { credentials: "include" }),
      ]);

      if (foldersResponse.ok) {
        const folderData = await foldersResponse.json();
        setFolders(folderData.folders || []);
      }

      if (filesResponse.ok) {
        const fileData = await filesResponse.json();
        setFiles(fileData.files || []);
      }
    } catch (error) {
      console.error("Failed to load contents:", error);
    } finally {
      setLoading(false);
    }
  };

  const openFolder = (folder) => {
    setSearchQuery("");

    setFolderStack((previous) => [
      ...previous,
      currentFolder,
    ]);

    setCurrentFolder(folder);
    loadContents(folder.id);
  };

  const goBack = () => {
    setSearchQuery("");

    const previousFolder =
      folderStack.length > 0
        ? folderStack[folderStack.length - 1]
        : null;

    setFolderStack((previous) => previous.slice(0, -1));
    setCurrentFolder(previousFolder);

    loadContents(previousFolder?.id || null);
  };

  const goToBreadcrumb = (index) => {
    setSearchQuery("");

    if (index === 0) {
      setFolderStack([]);
      setCurrentFolder(null);
      loadContents(null);
      return;
    }

    const newCurrentFolder = folderStack[index - 1];
    const newStack = folderStack.slice(0, index);

    setFolderStack(newStack);
    setCurrentFolder(newCurrentFolder);

    loadContents(newCurrentFolder?.id || null);
  };

  const createFolder = async (e) => {
    e.preventDefault();

    if (!newFolderName.trim()) return;

    try {
      const response = await fetch(`${API_URL}/api/folders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentId: currentFolder?.id || null,
        }),
      });

      if (response.ok) {
        setNewFolderName("");
        setShowFolderInput(false);
        loadContents(currentFolder?.id || null);
      } else {
        const data = await response.json();
        alert(data.error?.message || "Unable to create folder");
      }
    } catch (error) {
      console.error("Create folder failed:", error);
    }
  };

  const startRenameFolder = (folder) => {
    setRenamingFolder(folder);
    setRenameValue(folder.name);
  };

  const cancelRename = () => {
    setRenamingFolder(null);
    setRenameValue("");
  };

  const renameFolder = async (e) => {
    e.preventDefault();

    if (!renameValue.trim() || !renamingFolder) return;

    try {
      const response = await fetch(
        `${API_URL}/api/folders/${renamingFolder.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name: renameValue.trim(),
          }),
        }
      );

      if (response.ok) {
        cancelRename();
        loadContents(currentFolder?.id || null);
      } else {
        const data = await response.json();
        alert(data.error?.message || "Unable to rename folder");
      }
    } catch (error) {
      console.error("Rename folder failed:", error);
    }
  };

  const deleteFolder = async (folder) => {
    const confirmed = window.confirm(`Delete "${folder.name}"?`);

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_URL}/api/folders/${folder.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.ok) {
        loadContents(currentFolder?.id || null);
      } else {
        const data = await response.json();
        alert(data.error?.message || "Unable to delete folder");
      }
    } catch (error) {
      console.error("Delete folder failed:", error);
    }
  };

  const uploadFile = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();

      formData.append("file", file);

      if (currentFolder?.id) {
        formData.append("folderId", currentFolder.id);
      }

      const response = await fetch(
        `${API_URL}/api/files/upload`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );

      if (response.ok) {
        loadContents(currentFolder?.id || null);
        loadStorageStats();
      } else {
        const data = await response.json();
        alert(data.error?.message || "Upload failed");
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Unable to upload file");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const previewFile = async (file) => {
    setPreviewLoading(true);
    setPreviewFileData(file);

    try {
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
        setPreviewUrl("");
      }

      const response = await fetch(
        `${API_URL}/api/files/${file.id}/download`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        alert("Unable to preview file");
        setPreviewFileData(null);
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      setPreviewUrl(url);
    } catch (error) {
      console.error("Preview failed:", error);
      alert("Unable to preview file");
      setPreviewFileData(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl("");
    setPreviewFileData(null);
    setPreviewLoading(false);
  };

  const downloadFile = async (file) => {
    try {
      const response = await fetch(
        `${API_URL}/api/files/${file.id}/download`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        alert("Download failed");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = file.name;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Unable to download file");
    }
  };

  const deleteFile = async (file) => {
    const confirmed = window.confirm(`Delete "${file.name}"?`);

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_URL}/api/files/${file.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.ok) {
        loadContents(currentFolder?.id || null);
        loadStorageStats();
      } else {
        const data = await response.json();
        alert(data.error?.message || "Unable to delete file");
      }
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout failed:", error);
    }

    onLogout();
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredFolders = folders.filter((folder) =>
    folder.name.toLowerCase().includes(normalizedSearch)
  );

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(normalizedSearch)
  );

  const breadcrumbs = [
    {
      name: "My Files",
      folder: null,
    },
    ...folderStack
      .filter(Boolean)
      .map((folder) => ({
        name: folder.name,
        folder,
      })),
    ...(currentFolder
      ? [
          {
            name: currentFolder.name,
            folder: currentFolder,
          },
        ]
      : []),
  ];

  return (
    <main className="dashboard">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <CloudIcon />
          </div>
          <span>Cloud Drive</span>
        </div>

        <div className="sidebar-user">
          <div className="avatar">
            {user.name?.charAt(0).toUpperCase()}
          </div>

          <div>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </div>
        </div>

        <button className="sidebar-item active">
          <FolderIcon size={18} />
          <span>My Files</span>
        </button>

        <button className="sidebar-item" onClick={logout}>
          <LogoutIcon size={18} />
          <span>Logout</span>
        </button>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <h2>
              {currentFolder ? currentFolder.name : "My Files"}
            </h2>

            <p>
              {currentFolder
                ? "Files inside this folder"
                : "Your cloud storage"}
            </p>
          </div>

          <div className="actions">
            <label className="upload-button">
              <UploadIcon size={17} />
              {uploading ? "Uploading..." : "Upload File"}

              <input
                type="file"
                onChange={uploadFile}
                disabled={uploading}
              />
            </label>

            <button
              className="new-folder-button"
              onClick={() => setShowFolderInput(true)}
            >
              <PlusIcon size={17} />
              New Folder
            </button>
          </div>
        </header>

        <div className="breadcrumbs">
          {breadcrumbs.map((breadcrumb, index) => {
            const isLast = index === breadcrumbs.length - 1;

            return (
              <div
                className="breadcrumb-item"
                key={`${breadcrumb.name}-${index}`}
              >
                <button
                  className={isLast ? "breadcrumb-current" : ""}
                  onClick={() => goToBreadcrumb(index)}
                  disabled={isLast}
                >
                  {index === 0 && <FolderIcon size={15} />}
                  {breadcrumb.name}
                </button>

                {!isLast && (
                  <span className="breadcrumb-separator">
                    /
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="search-bar">
          <SearchIcon size={18} />

          <input
            type="text"
            placeholder="Search files and folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="clear-search"
            >
              ×
            </button>
          )}
        </div>

        <StorageCard stats={storageStats} />

        {currentFolder && (
          <button className="back-button" onClick={goBack}>
            <ArrowLeftIcon size={16} />
            Back
          </button>
        )}

        {showFolderInput && (
          <form className="new-folder-form" onSubmit={createFolder}>
            <input
              autoFocus
              type="text"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />

            <button type="submit">Create</button>

            <button
              type="button"
              onClick={() => {
                setShowFolderInput(false);
                setNewFolderName("");
              }}
            >
              Cancel
            </button>
          </form>
        )}

        {loading ? (
          <div className="empty-state">Loading...</div>
        ) : (
          <div className="file-area">
            {filteredFolders.length > 0 && (
              <section>
                <h3 className="section-title">Folders</h3>

                <div className="items-grid">
                  {filteredFolders.map((folder) => (
                    <div className="item-card" key={folder.id}>
                      {renamingFolder?.id === folder.id ? (
                        <form
                          className="rename-form"
                          onSubmit={renameFolder}
                        >
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) =>
                              setRenameValue(e.target.value)
                            }
                          />

                          <div className="rename-actions">
                            <button type="submit">Save</button>

                            <button
                              type="button"
                              onClick={cancelRename}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div
                            className="item-main"
                            onDoubleClick={() => openFolder(folder)}
                          >
                            <div className="item-icon">
                              <FolderIcon size={32} />
                            </div>

                            <div className="item-info">
                              <strong>{folder.name}</strong>
                              <span>Folder</span>
                            </div>
                          </div>

                          <div className="folder-actions">
                            <button
                              className="folder-action"
                              onClick={() =>
                                startRenameFolder(folder)
                              }
                            >
                              <EditIcon size={14} />
                              Rename
                            </button>

                            <button
                              className="folder-action delete"
                              onClick={() =>
                                deleteFolder(folder)
                              }
                            >
                              <TrashIcon size={14} />
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {filteredFiles.length > 0 && (
              <section>
                <h3 className="section-title">Files</h3>

                <div className="items-list">
                  {filteredFiles.map((file) => (
                    <div className="file-row" key={file.id}>
                      <div className="file-icon">
                        <FileIcon fileName={file.name} />
                      </div>

                      <div className="file-info">
                        <strong>{file.name}</strong>

                        <span>
                          {formatFileSize(file.size_bytes)}
                        </span>
                      </div>

                      <button
                        className="file-action"
                        onClick={() => previewFile(file)}
                      >
                        <EyeIcon size={15} />
                        Preview
                      </button>

                      <button
                        className="file-action"
                        onClick={() => downloadFile(file)}
                      >
                        <DownloadIcon size={15} />
                        Download
                      </button>

                      <button
                        className="file-action delete"
                        onClick={() => deleteFile(file)}
                      >
                        <TrashIcon size={15} />
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {filteredFolders.length === 0 &&
              filteredFiles.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">
                    {normalizedSearch ? (
                      <SearchIcon size={48} />
                    ) : (
                      <CloudIcon size={48} />
                    )}
                  </div>

                  <h3>
                    {normalizedSearch
                      ? "No results found"
                      : "This folder is empty"}
                  </h3>

                  <p>
                    {normalizedSearch
                      ? `Nothing matches "${searchQuery}"`
                      : "Upload a file or create a folder to get started."}
                  </p>
                </div>
              )}
          </div>
        )}
      </section>

      {previewFileData && (
        <div
          className="preview-overlay"
          onClick={closePreview}
        >
          <div
            className="preview-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="preview-header">
              <div>
                <strong>{previewFileData.name}</strong>

                <span>
                  {formatFileSize(
                    previewFileData.size_bytes
                  )}
                </span>
              </div>

              <button
                className="preview-close"
                onClick={closePreview}
              >
                ×
              </button>
            </div>

            <div className="preview-content">
              {previewLoading ? (
                <div className="preview-loading">
                  Loading preview...
                </div>
              ) : getPreviewType(previewFileData.name) ===
                "image" ? (
                <img
                  src={previewUrl}
                  alt={previewFileData.name}
                  className="image-preview"
                />
              ) : getPreviewType(previewFileData.name) ===
                "pdf" ? (
                <iframe
                  src={previewUrl}
                  title={previewFileData.name}
                  className="pdf-preview"
                />
              ) : getPreviewType(previewFileData.name) ===
                "text" ? (
                <iframe
                  src={previewUrl}
                  title={previewFileData.name}
                  className="text-preview"
                />
              ) : (
                <div className="unsupported-preview">
                  <div className="empty-icon">
                    <FileIcon
                      fileName={previewFileData.name}
                      size={55}
                    />
                  </div>

                  <h3>Preview not available</h3>

                  <p>
                    This file type cannot be previewed in
                    the browser.
                  </p>

                  <button
                    className="file-action"
                    onClick={() =>
                      downloadFile(previewFileData)
                    }
                  >
                    <DownloadIcon size={15} />
                    Download File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function StorageCard({ stats }) {
  const STORAGE_LIMIT = 15 * 1024 * 1024 * 1024;
  const usedBytes = Number(stats.storageUsed || 0);
  const percentage = Math.min(
    (usedBytes / STORAGE_LIMIT) * 100,
    100
  );

  return (
    <div className="storage-card">
      <div className="storage-card-header">
        <div className="storage-title">
          <div className="storage-icon">
            <CloudIcon size={20} />
          </div>

          <div>
            <strong>Storage</strong>
            <span>Your cloud storage</span>
          </div>
        </div>

        <strong className="storage-percentage">
          {percentage < 0.01 ? "<0.01%" : `${percentage.toFixed(1)}%`}
        </strong>
      </div>

      <div className="storage-progress">
        <div
          className="storage-progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="storage-details">
        <span>
          <strong>{formatFileSize(usedBytes)}</strong> used of 15 GB
        </span>

        <div className="storage-stats">
          <span>{stats.fileCount || 0} files</span>
          <span>{stats.folderCount || 0} folders</span>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Icons
========================= */

function Icon({ children, size = 20, className = "" }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function CloudIcon({ size = 20 }) {
  return (
    <Icon size={size}>
      <path d="M17.5 19H8a5 5 0 1 1 1.8-9.66A6 6 0 0 1 21 11.5a3.5 3.5 0 0 1-3.5 3.5H17.5" />
      <path d="M12 12v6" />
      <path d="m9.5 15 2.5 3 2.5-3" />
    </Icon>
  );
}

function FolderIcon({ size = 20 }) {
  return (
    <Icon size={size}>
      <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H10l2 2h6.5A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" />
    </Icon>
  );
}

function SearchIcon({ size = 20 }) {
  return (
    <Icon size={size}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </Icon>
  );
}

function UploadIcon({ size = 20 }) {
  return (
    <Icon size={size}>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 20h14" />
    </Icon>
  );
}

function DownloadIcon({ size = 20 }) {
  return (
    <Icon size={size}>
      <path d="M12 4v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 20h14" />
    </Icon>
  );
}

function PlusIcon({ size = 20 }) {
  return (
    <Icon size={size}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Icon>
  );
}

function ArrowLeftIcon({ size = 20 }) {
  return (
    <Icon size={size}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </Icon>
  );
}

function EyeIcon({ size = 20 }) {
  return (
    <Icon size={size}>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </Icon>
  );
}

function TrashIcon({ size = 20 }) {
  return (
    <Icon size={size}>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="m7 7 1 13h8l1-13" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </Icon>
  );
}

function EditIcon({ size = 20 }) {
  return (
    <Icon size={size}>
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="m14.5 7.5 2 2" />
    </Icon>
  );
}

function LogoutIcon({ size = 20 }) {
  return (
    <Icon size={size}>
      <path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5" />
      <path d="m14 8 4 4-4 4" />
      <path d="M18 12H8" />
    </Icon>
  );
}

function FileIcon({ fileName, size = 32 }) {
  const extension = getFileExtension(fileName);

  let type = "default";

  if (
    ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(
      extension
    )
  ) {
    type = "image";
  } else if (extension === "pdf") {
    type = "pdf";
  } else if (["doc", "docx"].includes(extension)) {
    type = "word";
  } else if (["xls", "xlsx", "csv"].includes(extension)) {
    type = "excel";
  } else if (["ppt", "pptx"].includes(extension)) {
    type = "powerpoint";
  } else if (
    ["zip", "rar", "7z", "tar", "gz"].includes(extension)
  ) {
    type = "archive";
  } else if (
    ["mp3", "wav", "ogg", "m4a"].includes(extension)
  ) {
    type = "audio";
  } else if (
    ["mp4", "webm", "mov", "avi", "mkv"].includes(extension)
  ) {
    type = "video";
  } else if (
    [
      "txt",
      "md",
      "json",
      "xml",
      "html",
      "css",
      "js",
      "jsx",
      "ts",
      "tsx",
    ].includes(extension)
  ) {
    type = "text";
  }

  return (
    <span
      className={`drive-file-icon drive-file-icon-${type}`}
      style={{
        width: size,
        height: size,
      }}
    >
      <FileShape />
      <span className="drive-file-label">
        {type === "image"
          ? "IMG"
          : type === "pdf"
          ? "PDF"
          : type === "word"
          ? "DOC"
          : type === "excel"
          ? "XLS"
          : type === "powerpoint"
          ? "PPT"
          : type === "archive"
          ? "ZIP"
          : type === "audio"
          ? "♪"
          : type === "video"
          ? "▶"
          : type === "text"
          ? "TXT"
          : ""}
      </span>
    </span>
  );
}

function FileShape() {
  return (
    <svg
      viewBox="0 0 40 48"
      className="drive-file-shape"
      aria-hidden="true"
    >
      <path
        d="M7 1h17l9 9v35a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2Z"
        fill="currentColor"
      />
      <path
        d="M24 1v8a2 2 0 0 0 2 2h7"
        fill="none"
        stroke="white"
        strokeOpacity=".65"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function getFileExtension(fileName) {
  return fileName.split(".").pop().toLowerCase();
}

function getPreviewType(fileName) {
  const extension = getFileExtension(fileName);

  if (
    ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(
      extension
    )
  ) {
    return "image";
  }

  if (extension === "pdf") {
    return "pdf";
  }

  if (
    [
      "txt",
      "md",
      "json",
      "xml",
      "html",
      "css",
      "js",
      "jsx",
      "ts",
      "tsx",
    ].includes(extension)
  ) {
    return "text";
  }

  return "unsupported";
}

function formatFileSize(bytes) {
  if (!bytes) return "0 B";

  const units = ["B", "KB", "MB", "GB"];

  const index = Math.floor(
    Math.log(bytes) / Math.log(1024)
  );

  return `${(
    bytes / Math.pow(1024, index)
  ).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}