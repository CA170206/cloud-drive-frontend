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

  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContents(null);
  }, []);

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
        fetch(folderUrl, {
          credentials: "include",
        }),
        fetch(fileUrl, {
          credentials: "include",
        }),
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
    setFolderStack((previous) => [...previous, currentFolder]);
    setCurrentFolder(folder);
    loadContents(folder.id);
  };

  const goBack = () => {
    const previousFolder =
      folderStack.length > 0
        ? folderStack[folderStack.length - 1]
        : null;

    setFolderStack((previous) => previous.slice(0, -1));
    setCurrentFolder(previousFolder);

    loadContents(previousFolder?.id || null);
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
    const confirmed = window.confirm(
      `Delete "${folder.name}"?`
    );

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

      const response = await fetch(`${API_URL}/api/files/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (response.ok) {
        loadContents(currentFolder?.id || null);
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
    }
  };

  const deleteFile = async (file) => {
    const confirmed = window.confirm(
      `Delete "${file.name}"?`
    );

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

  return (
    <main className="dashboard">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">☁</div>
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
          📁 My Files
        </button>

        <button className="sidebar-item" onClick={logout}>
          ↪ Logout
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
              {uploading ? "Uploading..." : "↑ Upload File"}

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
              + New Folder
            </button>
          </div>
        </header>

        {currentFolder && (
          <button className="back-button" onClick={goBack}>
            ← Back
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
        ) : folders.length === 0 && files.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">☁</div>
            <h3>This folder is empty</h3>
            <p>
              Upload a file or create a folder to get started.
            </p>
          </div>
        ) : (
          <div className="file-area">
            {folders.length > 0 && (
              <section>
                <h3 className="section-title">Folders</h3>

                <div className="items-grid">
                  {folders.map((folder) => (
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
                            <button type="submit">
                              Save
                            </button>

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
                            onDoubleClick={() =>
                              openFolder(folder)
                            }
                          >
                            <div className="item-icon">
                              📁
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
                              Rename
                            </button>

                            <button
                              className="folder-action delete"
                              onClick={() =>
                                deleteFolder(folder)
                              }
                            >
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

            {files.length > 0 && (
              <section>
                <h3 className="section-title">Files</h3>

                <div className="items-list">
                  {files.map((file) => (
                    <div className="file-row" key={file.id}>
                      <div className="file-icon">📄</div>

                      <div className="file-info">
                        <strong>{file.name}</strong>

                        <span>
                          {formatFileSize(file.size_bytes)}
                        </span>
                      </div>

                      <button
                        className="file-action"
                        onClick={() => downloadFile(file)}
                      >
                        Download
                      </button>

                      <button
                        className="file-action delete"
                        onClick={() => deleteFile(file)}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function formatFileSize(bytes) {
  if (!bytes) return "0 B";

  const units = ["B", "KB", "MB", "GB"];

  const index = Math.floor(
    Math.log(bytes) / Math.log(1024)
  );

  return `${(bytes / Math.pow(1024, index)).toFixed(
    index === 0 ? 0 : 1
  )} ${units[index]}`;
}