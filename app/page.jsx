"use client";

import { useEffect, useState } from "react";

const API_URL = "http://localhost:5000";

export default function Home() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    checkAuth();

    const savedTheme = window.localStorage.getItem("cloud-drive-theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("cloud-drive-theme", theme);
  }, [theme]);

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
    return (
      <Login
        onLogin={setUser}
        theme={theme}
        setTheme={setTheme}
      />
    );
  }

  return (
    <Dashboard
      user={user}
      onLogout={() => setUser(null)}
      theme={theme}
      setTheme={setTheme}
    />
  );
}

function Login({ onLogin, theme, setTheme }) {
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

        <button
          type="button"
          className="theme-toggle login-theme-toggle"
          onClick={() =>
            setTheme(theme === "dark" ? "light" : "dark")
          }
          aria-label="Toggle theme"
        >
          <span className="theme-toggle-icon">
            {theme === "dark" ? "☀" : "☾"}
          </span>
          <span>
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </span>
        </button>

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

function Dashboard({ user, onLogout, theme, setTheme }) {
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

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

  const [activeView, setActiveView] = useState("dashboard");

  const [sharedResources, setSharedResources] = useState([]);
  const [sharedLoading, setSharedLoading] = useState(false);

  const [sharedFolder, setSharedFolder] = useState(null);
  const [sharedFolderFolders, setSharedFolderFolders] = useState([]);
  const [sharedFolderFiles, setSharedFolderFiles] = useState([]);
  const [sharedFolderStack, setSharedFolderStack] = useState([]);
  const [sharedFolderLoading, setSharedFolderLoading] = useState(false);

  const [shareTarget, setShareTarget] = useState(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState("viewer");
  const [shareLoading, setShareLoading] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  /* Public Link */
  const [publicLinkTarget, setPublicLinkTarget] = useState(null);
  const [publicLinks, setPublicLinks] = useState([]);
  const [publicLinkLoading, setPublicLinkLoading] = useState(false);
  const [publicLinkPassword, setPublicLinkPassword] = useState("");
  const [publicLinkExpiry, setPublicLinkExpiry] = useState("");
  const [publicLinkMessage, setPublicLinkMessage] = useState("");

  const [starredResources, setStarredResources] = useState([]);
  const [starredLoading, setStarredLoading] = useState(false);
  const [starLoading, setStarLoading] = useState({});

  useEffect(() => {
    loadContents(null);
    loadStorageStats();
    loadSharedWithMe();
    loadStarredResources();
    loadActivities();
  }, []);

  const loadActivities = async () => {
    setActivitiesLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/activities`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error("Failed to load activities:", error);
    } finally {
      setActivitiesLoading(false);
    }
  };

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

  const loadSharedWithMe = async () => {
    setSharedLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/shares/shared-with-me`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSharedResources(data.shared || []);
      }
    } catch (error) {
      console.error("Failed to load shared resources:", error);
    } finally {
      setSharedLoading(false);
    }
  };

  const loadStarredResources = async () => {
    setStarredLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/stars`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setStarredResources(data.starred || []);
      }
    } catch (error) {
      console.error("Failed to load starred resources:", error);
    } finally {
      setStarredLoading(false);
    }
  };

  const isStarred = (resourceType, resourceId) => {
    return starredResources.some(
      (resource) =>
        resource.resource_type === resourceType &&
        resource.resource_id === resourceId
    );
  };

  const toggleStar = async (resourceType, resourceId) => {
    const key = `${resourceType}-${resourceId}`;

    if (starLoading[key]) return;

    setStarLoading((previous) => ({
      ...previous,
      [key]: true,
    }));

    const currentlyStarred = isStarred(
      resourceType,
      resourceId
    );

    try {
      const response = await fetch(`${API_URL}/api/stars`, {
        method: currentlyStarred ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          resourceType,
          resourceId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.error?.message ||
            "Unable to update star"
        );
        return;
      }

      await loadStarredResources();
    } catch (error) {
      console.error("Toggle star failed:", error);
      alert("Unable to update star");
    } finally {
      setStarLoading((previous) => ({
        ...previous,
        [key]: false,
      }));
    }
  };

  const openDashboard = () => {
    setActiveView("dashboard");
    setSearchQuery("");
    setSharedFolder(null);
    setSharedFolderFolders([]);
    setSharedFolderFiles([]);
    setSharedFolderStack([]);
    loadContents(null);
    loadStorageStats();
  };

  const openStarred = () => {
    setActiveView("starred");
    setSearchQuery("");
    setSharedFolder(null);
    setSharedFolderFolders([]);
    setSharedFolderFiles([]);
    setSharedFolderStack([]);
    loadStarredResources();
  };

  const openActivity = () => {
    setActiveView("activity");
    setSearchQuery("");
    setSharedFolder(null);
    setSharedFolderFolders([]);
    setSharedFolderFiles([]);
    setSharedFolderStack([]);
    loadActivities();
  };

  const openStarredFolder = (folder) => {
    setActiveView("my-files");
    setSearchQuery("");
    setFolderStack([]);
    setCurrentFolder(folder);
    loadContents(folder.id);
  };

  const getStarredFiles = () =>
    starredResources.filter(
      (resource) => resource.resource_type === "file"
    );

  const getStarredFolders = () =>
    starredResources.filter(
      (resource) => resource.resource_type === "folder"
    );

  const filteredStarredFiles = getStarredFiles().filter(
    (resource) =>
      resource.name
        ?.toLowerCase()
        .includes(searchQuery.trim().toLowerCase())
  );

  const filteredStarredFolders = getStarredFolders().filter(
    (resource) =>
      resource.name
        ?.toLowerCase()
        .includes(searchQuery.trim().toLowerCase())
  );

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

  const openMyFiles = () => {
    setActiveView("my-files");
    setSearchQuery("");
    setFolderStack([]);
    setCurrentFolder(null);
    setSharedFolder(null);
    setSharedFolderFolders([]);
    setSharedFolderFiles([]);
    setSharedFolderStack([]);
    loadContents(null);
  };

  const openSharedWithMe = () => {
    setActiveView("shared");
    setSearchQuery("");
    setSharedFolder(null);
    setSharedFolderFolders([]);
    setSharedFolderFiles([]);
    setSharedFolderStack([]);
    loadSharedWithMe();
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

  const loadSharedFolder = async (folderId, stack = []) => {
    setSharedFolderLoading(true);
    setSearchQuery("");

    try {
      const response = await fetch(
        `${API_URL}/api/shares/shared-with-me/folder/${folderId}`,
        {
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.error?.message ||
            "Unable to open shared folder"
        );
        return;
      }

      setSharedFolder(data.folder || null);
      setSharedFolderFolders(data.folders || []);
      setSharedFolderFiles(data.files || []);
      setSharedFolderStack(stack);
    } catch (error) {
      console.error("Failed to load shared folder:", error);
      alert("Unable to open shared folder");
    } finally {
      setSharedFolderLoading(false);
    }
  };

  const openSharedFolder = async (folder) => {
    const nextStack = [
      ...sharedFolderStack,
      sharedFolder,
    ];

    await loadSharedFolder(folder.id, nextStack);
  };

  const goBackSharedFolder = async () => {
    if (sharedFolderStack.length === 0) {
      setSharedFolder(null);
      setSharedFolderFolders([]);
      setSharedFolderFiles([]);
      setSharedFolderStack([]);
      return;
    }

    const previousFolder =
      sharedFolderStack[sharedFolderStack.length - 1];

    const newStack = sharedFolderStack.slice(0, -1);

    if (!previousFolder) {
      setSharedFolder(null);
      setSharedFolderFolders([]);
      setSharedFolderFiles([]);
      setSharedFolderStack([]);
      return;
    }

    await loadSharedFolder(previousFolder.id, newStack);
  };

  const exitSharedFolder = () => {
    setSharedFolder(null);
    setSharedFolderFolders([]);
    setSharedFolderFiles([]);
    setSharedFolderStack([]);
    setSearchQuery("");
    loadSharedWithMe();
  };

  const goToSharedFolderBreadcrumb = async (index) => {
    if (index === 0) {
      exitSharedFolder();
      return;
    }

    const target =
      sharedFolderStack[index - 1];

    if (!target) {
      exitSharedFolder();
      return;
    }

    const newStack = sharedFolderStack.slice(
      0,
      index - 1
    );

    await loadSharedFolder(target.id, newStack);
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
        loadStorageStats();
        loadActivities();
      } else {
        const data = await response.json();

        alert(
          data.error?.message ||
            "Unable to create folder"
        );
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
        loadStarredResources();
        loadActivities();
      } else {
        const data = await response.json();

        alert(
          data.error?.message ||
            "Unable to rename folder"
        );
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
        loadStorageStats();
        loadStarredResources();
        loadActivities();
      } else {
        const data = await response.json();

        alert(
          data.error?.message ||
            "Unable to delete folder"
        );
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
        formData.append(
          "folderId",
          currentFolder.id
        );
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
        loadActivities();
      } else {
        const data = await response.json();

        alert(
          data.error?.message ||
            "Upload failed"
        );
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Unable to upload file");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const previewFile = async (file, isShared = false) => {
    setPreviewLoading(true);

    setPreviewFileData({
      ...file,
      shared: isShared,
    });

    try {
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
        setPreviewUrl("");
      }

      const url = isShared
        ? `${API_URL}/api/shares/shared-with-me/${file.id}/download`
        : `${API_URL}/api/files/${file.id}/download`;

      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) {
        alert("Unable to preview file");
        setPreviewFileData(null);
        return;
      }

      const blob = await response.blob();

      const objectUrl = window.URL.createObjectURL(blob);

      setPreviewUrl(objectUrl);
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

  const downloadSharedFile = async (file) => {
    try {
      const response = await fetch(
        `${API_URL}/api/shares/shared-with-me/${file.id}/download`,
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
      console.error("Shared download failed:", error);
      alert("Unable to download shared file");
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
        loadStorageStats();
        loadStarredResources();
        loadActivities();
      } else {
        const data = await response.json();

        alert(
          data.error?.message ||
            "Unable to delete file"
        );
      }
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const removeSharedResource = async (resource) => {
    const confirmed = window.confirm(
      `Remove "${resource.resource_name}" from Shared with me?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_URL}/api/shares/shared-with-me/${resource.share_id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.ok) {
        if (
          sharedFolder &&
          sharedFolder.id === resource.resource_id
        ) {
          exitSharedFolder();
        } else {
          loadSharedWithMe();
        }

        loadActivities();
      } else {
        const data = await response.json();

        alert(
          data.error?.message ||
            "Unable to remove shared resource"
        );
      }
    } catch (error) {
      console.error(
        "Remove shared resource failed:",
        error
      );

      alert("Unable to remove shared resource");
    }
  };

  const openShareModal = (resourceType, resource) => {
    setShareTarget({
      resourceType,
      resourceId: resource.id,
      name: resource.name,
    });
    setShareEmail("");
    setShareRole("viewer");
    setShareMessage("");
  };

  const closeShareModal = () => {
    if (shareLoading) return;

    setShareTarget(null);
    setShareEmail("");
    setShareRole("viewer");
    setShareMessage("");
  };

  const shareResource = async (e) => {
    e.preventDefault();

    const email = shareEmail.trim().toLowerCase();

    if (!shareTarget || !email) {
      setShareMessage(
        "Enter the email address of a registered user."
      );
      return;
    }

    setShareLoading(true);
    setShareMessage("");

    try {
      const response = await fetch(`${API_URL}/api/shares`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          resourceType: shareTarget.resourceType,
          resourceId: shareTarget.resourceId,
          email,
          role: shareRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setShareMessage(
          data.error?.message ||
            "Unable to share resource"
        );
        return;
      }

      setShareMessage(
        data.message ||
          "Resource shared successfully"
      );

      setShareEmail("");
      loadActivities();

      setTimeout(() => {
        closeShareModal();
      }, 700);
    } catch (error) {
      console.error("Share resource failed:", error);
      setShareMessage("Unable to connect to server");
    } finally {
      setShareLoading(false);
    }
  };

  const openPublicLinkModal = async (file) => {
    setPublicLinkTarget(file);
    setPublicLinkPassword("");
    setPublicLinkExpiry("");
    setPublicLinkMessage("");
    setPublicLinkLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/shares/public?resourceType=file&resourceId=${file.id}`,
        {
          credentials: "include",
        }
      );

      const data = await response.json();

      if (response.ok) {
        setPublicLinks(
          (data.links || []).map((link) => ({
            ...link,
            url: link.url.startsWith("http")
              ? link.url
              : `${API_URL}${link.url}`,
          }))
        );
      } else {
        setPublicLinks([]);
        setPublicLinkMessage(
          data.error?.message ||
            "Unable to load public links"
        );
      }
    } catch (error) {
      console.error("Load public links failed:", error);
      setPublicLinks([]);
      setPublicLinkMessage(
        "Unable to connect to server"
      );
    } finally {
      setPublicLinkLoading(false);
    }
  };

  const closePublicLinkModal = () => {
    if (publicLinkLoading) return;

    setPublicLinkTarget(null);
    setPublicLinks([]);
    setPublicLinkPassword("");
    setPublicLinkExpiry("");
    setPublicLinkMessage("");
  };

  const createPublicLink = async () => {
    if (!publicLinkTarget) return;

    setPublicLinkLoading(true);
    setPublicLinkMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/shares/public`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            resourceType: "file",
            resourceId: publicLinkTarget.id,
            role: "viewer",
            password:
              publicLinkPassword.trim() || undefined,
            expiresAt:
              publicLinkExpiry
                ? new Date(
                    publicLinkExpiry
                  ).toISOString()
                : undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setPublicLinkMessage(
          data.error?.message ||
            "Unable to create public link"
        );
        return;
      }

      const link = data.link;

      const fullUrl = link.url.startsWith("http")
        ? link.url
        : `${API_URL}${link.url}`;

      setPublicLinks((previous) => [
        {
          ...link,
          url: fullUrl,
        },
        ...previous,
      ]);

      setPublicLinkPassword("");
      setPublicLinkExpiry("");
      setPublicLinkMessage(
        "Public link created successfully"
      );
    } catch (error) {
      console.error(
        "Create public link failed:",
        error
      );
      setPublicLinkMessage(
        "Unable to connect to server"
      );
    } finally {
      setPublicLinkLoading(false);
    }
  };

  const revokePublicLink = async (linkId) => {
    const confirmed = window.confirm(
      "Revoke this public link?"
    );

    if (!confirmed) return;

    setPublicLinkLoading(true);
    setPublicLinkMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/shares/public/${linkId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setPublicLinkMessage(
          data.error?.message ||
            "Unable to revoke public link"
        );
        return;
      }

      setPublicLinks((previous) =>
        previous.filter(
          (link) => link.id !== linkId
        )
      );

      setPublicLinkMessage(
        "Public link revoked"
      );
    } catch (error) {
      console.error(
        "Revoke public link failed:",
        error
      );
      setPublicLinkMessage(
        "Unable to connect to server"
      );
    } finally {
      setPublicLinkLoading(false);
    }
  };

  const copyPublicLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setPublicLinkMessage(
        "Link copied to clipboard"
      );
    } catch (error) {
      console.error(
        "Copy link failed:",
        error
      );
      setPublicLinkMessage(
        "Unable to copy link"
      );
    }
  };

  const logout = async () => {
    try {
      await fetch(
        `${API_URL}/api/auth/logout`,
        {
          method: "POST",
          credentials: "include",
        }
      );
    } catch (error) {
      console.error("Logout failed:", error);
    }

    onLogout();
  };

  const normalizedSearch =
    searchQuery.trim().toLowerCase();

  const filteredFolders = folders.filter(
    (folder) =>
      folder.name
        .toLowerCase()
        .includes(normalizedSearch)
  );

  const filteredFiles = files.filter(
    (file) =>
      file.name
        .toLowerCase()
        .includes(normalizedSearch)
  );

  const filteredSharedResources =
    sharedResources.filter((resource) =>
      resource.resource_name
        ?.toLowerCase()
        .includes(normalizedSearch)
    );

  const filteredSharedFolders =
    sharedFolderFolders.filter((folder) =>
      folder.name
        .toLowerCase()
        .includes(normalizedSearch)
    );

  const filteredSharedFiles =
    sharedFolderFiles.filter((file) =>
      file.name
        .toLowerCase()
        .includes(normalizedSearch)
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

  const sharedBreadcrumbs = [
    {
      name: "Shared with me",
      folder: null,
    },

    ...sharedFolderStack
      .filter(Boolean)
      .map((folder) => ({
        name: folder.name,
        folder,
      })),

    ...(sharedFolder
      ? [
          {
            name: sharedFolder.name,
            folder: sharedFolder,
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
            {user.name
              ?.charAt(0)
              .toUpperCase()}
          </div>

          <div>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </div>
        </div>

        <button
          className={`sidebar-item ${
            activeView === "dashboard" ? "active" : ""
          }`}
          onClick={openDashboard}
        >
          <DashboardIcon size={17} />
          <span>Dashboard</span>
        </button>

        <button
          className={`sidebar-item ${
            activeView === "my-files"
              ? "active"
              : ""
          }`}
          onClick={openMyFiles}
        >
          <FolderIcon size={18} />
          <span>My Files</span>
        </button>

        <button
          className={`sidebar-item ${
            activeView === "shared"
              ? "active"
              : ""
          }`}
          onClick={openSharedWithMe}
        >
          <UsersIcon size={18} />
          <span>Shared with me</span>
        </button>

        <button
          className={`sidebar-item ${
            activeView === "starred"
              ? "active"
              : ""
          }`}
          onClick={openStarred}
        >
          <StarIcon size={18} filled />
          <span>Starred</span>
        </button>

        <button
          className={`sidebar-item ${
            activeView === "activity"
              ? "active"
              : ""
          }`}
          onClick={openActivity}
        >
          <ActivityIcon size={18} />
          <span>Activity</span>
        </button>

        <button
          className="theme-toggle"
          onClick={() =>
            setTheme(theme === "dark" ? "light" : "dark")
          }
          aria-label="Toggle theme"
        >
          <span className="theme-toggle-icon">
            {theme === "dark" ? "☀" : "☾"}
          </span>
          <span>
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </span>
        </button>

        <button
          className="sidebar-item"
          onClick={logout}
        >
          <LogoutIcon size={18} />
          <span>Logout</span>
        </button>
      </aside>

      <section className="content">
        {activeView === "dashboard" ? (
          <div className="home-dashboard">
            <header className="topbar dashboard-heading">
              <div>
                <h2>Welcome Back</h2>
                <p>Everything you need to manage your cloud files.</p>
              </div>

              <div className="dashboard-search-wrap">
                <div className="dashboard-mini-search">
                  <SearchIcon size={14} />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search your files..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setActiveView("my-files");
                    }}
                  />
                </div>
                <button className="dashboard-upload" onClick={() => document.getElementById("cloud-drive-upload")?.click()}>
                  <UploadIcon size={14} />
                  Upload File
                </button>
              </div>
            </header>

            <div className="dashboard-notice">
              <span>ⓘ</span>
              <span>Take control of your storage, file management, sharing and cloud operations — all in one dashboard.</span>
            </div>

            <section className="dashboard-storage-grid">
              <div className="dashboard-storage-card">
                <div className="dashboard-card-top">
                  <div>
                    <span className="dashboard-eyebrow">DATA STORAGE</span>
                    <strong>{formatFileSize(storageStats.storageUsed)}</strong>
                    <span className="dashboard-storage-sub">used of 15 GB</span>
                  </div>
                  <span className="dashboard-badge">CLOUD DRIVE</span>
                </div>

                <div className="dashboard-storage-track">
                  <div
                    className="dashboard-storage-fill"
                    style={{
                      width: `${Math.min((storageStats.storageUsed / (15 * 1024 * 1024 * 1024)) * 100, 100)}%`,
                    }}
                  />
                </div>

                <div className="dashboard-storage-meta">
                  <span>{storageStats.fileCount} files</span>
                  <span>{storageStats.folderCount} folders</span>
                  <span>{storageStats.storageUsed < 15 * 1024 * 1024 * 1024 ? "Healthy storage" : "Storage full"}</span>
                </div>
              </div>

              <div className="dashboard-transfer-card">
                <span className="dashboard-eyebrow">ACTIVE TRANSFERS</span>
                <strong>{uploading ? "Upload in progress" : "No active transfers"}</strong>
                <span>{uploading ? "Uploading your file..." : "All transfers are complete"}</span>
              </div>
            </section>

            <section>
              <h3 className="dashboard-section-title">QUICK ACCESS</h3>
              <div className="quick-access-grid">
                <button className="quick-card" onClick={openMyFiles}>
                  <span className="quick-icon blue"><FolderIcon size={19} /></span>
                  <strong>Files</strong>
                  <small>Browse and manage files</small>
                </button>

                <button className="quick-card" onClick={openSharedWithMe}>
                  <span className="quick-icon cyan"><UsersIcon size={19} /></span>
                  <strong>Shared</strong>
                  <small>{sharedResources.length} shared items</small>
                </button>

                <button className="quick-card" onClick={openStarred}>
                  <span className="quick-icon purple"><StarIcon size={19} filled /></span>
                  <strong>Starred</strong>
                  <small>{starredResources.length} favorites</small>
                </button>

                <button className="quick-card" onClick={openActivity}>
                  <span className="quick-icon green"><ActivityIcon size={19} /></span>
                  <strong>Activity</strong>
                  <small>{activities.length} recent events</small>
                </button>
              </div>
            </section>

            <section>
              <div className="dashboard-section-heading">
                <h3 className="dashboard-section-title">RECENTLY VIEWED FOLDERS</h3>
                <button onClick={openMyFiles}>View all</button>
              </div>

              <div className="recent-folder-grid">
                {folders.slice(0, 4).map((folder) => (
                  <button className="recent-folder-card" key={folder.id} onClick={() => { setActiveView("my-files"); setCurrentFolder(folder); setFolderStack([]); loadContents(folder.id); }}>
                    <div className="folder-preview"><FolderIcon size={43} /></div>
                    <strong>{folder.name}</strong>
                    <small>Open folder</small>
                  </button>
                ))}
                {folders.length === 0 && (
                  <div className="dashboard-empty-card">No folders yet. Create your first folder from My Files.</div>
                )}
              </div>
            </section>

            <section>
              <div className="dashboard-section-heading">
                <h3 className="dashboard-section-title">RECENT FILES</h3>
                <button onClick={openMyFiles}>View all</button>
              </div>

              <div className="dashboard-file-list">
                {files.slice(0, 5).map((file) => (
                  <div className="dashboard-file-row" key={file.id}>
                    <div className="dashboard-file-type"><FileIcon fileName={file.name} /></div>
                    <div className="dashboard-file-name">
                      <strong>{file.name}</strong>
                      <small>{formatFileSize(file.size_bytes)}</small>
                    </div>
                    <span className="dashboard-file-date">{file.updated_at ? new Date(file.updated_at).toLocaleDateString() : "Recently"}</span>
                    <button className="dashboard-row-action" onClick={() => previewFile(file)}><EyeIcon size={14} /> Preview</button>
                    <button className="dashboard-row-action" onClick={() => downloadFile(file)}><DownloadIcon size={14} /> Download</button>
                  </div>
                ))}
                {files.length === 0 && (
                  <div className="dashboard-empty-row">No files uploaded yet.</div>
                )}
              </div>
            </section>
          </div>
        ) : activeView === "activity" ? (
          <>
            <header className="topbar">
              <div>
                <h2>Activity</h2>
                <p>Recent activity on your Cloud Drive</p>
              </div>
            </header>

            {activitiesLoading ? (
              <div className="empty-state">
                Loading activity...
              </div>
            ) : activities.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <ActivityIcon size={48} />
                </div>

                <h3>No activity yet</h3>

                <p>
                  Your recent Cloud Drive activity will
                  appear here.
                </p>
              </div>
            ) : (
              <div className="activity-list">
                {activities.map((activity) => (
                  <div
                    className="activity-row"
                    key={activity.id}
                  >
                    <div className="activity-icon">
                      <ActivityIcon size={20} />
                    </div>

                    <div className="activity-info">
                      <strong>
                        {formatActivityAction(activity)}
                      </strong>

                      <span>
                        {new Date(
                          activity.created_at
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : activeView === "starred" ? (
          <>
            <header className="topbar">
              <div>
                <h2>Starred</h2>
                <p>Your favorite files and folders</p>
              </div>
            </header>

            <div className="search-bar">
              <SearchIcon size={18} />

              <input
                type="text"
                placeholder="Search starred files and folders..."
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(e.target.value)
                }
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

            {starredLoading ? (
              <div className="empty-state">
                Loading starred items...
              </div>
            ) : (
              <div className="file-area">
                {filteredStarredFolders.length > 0 && (
                  <section>
                    <h3 className="section-title">
                      Folders
                    </h3>

                    <div className="items-grid">
                      {filteredStarredFolders.map(
                        (folder) => {
                          const key = `folder-${folder.resource_id}`;

                          return (
                            <div
                              className="item-card"
                              key={folder.resource_id}
                            >
                              <div
                                className="item-main"
                                onClick={() =>
                                  openStarredFolder(
                                    folder
                                  )
                                }
                                style={{
                                  cursor: "pointer",
                                }}
                              >
                                <div className="item-icon">
                                  <FolderIcon size={32} />
                                </div>

                                <div className="item-info">
                                  <strong>
                                    {folder.name}
                                  </strong>

                                  <span>
                                    Folder
                                  </span>
                                </div>
                              </div>

                              <div className="folder-actions">
                                <button
                                  className="folder-action"
                                  onClick={() =>
                                    openStarredFolder(
                                      folder
                                    )
                                  }
                                >
                                  <FolderIcon size={14} />
                                  Open
                                </button>

                                <button
                                  className="folder-action"
                                  onClick={() =>
                                    toggleStar(
                                      "folder",
                                      folder.resource_id
                                    )
                                  }
                                  disabled={starLoading[key]}
                                >
                                  <StarIcon
                                    size={14}
                                    filled
                                  />
                                  {starLoading[key]
                                    ? "..."
                                    : "Unstar"}
                                </button>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </section>
                )}

                {filteredStarredFiles.length > 0 && (
                  <section>
                    <h3 className="section-title">
                      Files
                    </h3>

                    <div className="items-list">
                      {filteredStarredFiles.map(
                        (file) => {
                          const key = `file-${file.resource_id}`;

                          return (
                            <div
                              className="file-row"
                              key={file.resource_id}
                            >
                              <div className="file-icon">
                                <FileIcon
                                  fileName={file.name}
                                />
                              </div>

                              <div className="file-info">
                                <strong>
                                  {file.name}
                                </strong>

                                <span>
                                  {formatFileSize(
                                    file.size_bytes
                                  )}
                                </span>
                              </div>

                              <button
                                className="file-action"
                                onClick={() =>
                                  previewFile({
                                    id: file.resource_id,
                                    name: file.name,
                                    size_bytes:
                                      file.size_bytes,
                                  })
                                }
                              >
                                <EyeIcon size={15} />
                                Preview
                              </button>

                              <button
                                className="file-action"
                                onClick={() =>
                                  downloadFile({
                                    id: file.resource_id,
                                    name: file.name,
                                  })
                                }
                              >
                                <DownloadIcon size={15} />
                                Download
                              </button>

                              <button
  className="file-action"
  onClick={() => openPublicLinkModal(file)}
>
  🔗
  Public Link
</button>

                              <button
                                className="file-action"
                                onClick={() =>
                                  toggleStar(
                                    "file",
                                    file.resource_id
                                  )
                                }
                                disabled={starLoading[key]}
                              >
                                <StarIcon
                                  size={15}
                                  filled
                                />
                                {starLoading[key]
                                  ? "..."
                                  : "Unstar"}
                              </button>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </section>
                )}

                {filteredStarredFolders.length === 0 &&
                  filteredStarredFiles.length === 0 && (
                    <div className="empty-state">
                      <div className="empty-icon">
                        <StarIcon
                          size={48}
                          filled
                        />
                      </div>

                      <h3>
                        {normalizedSearch
                          ? "No results found"
                          : "No starred items"}
                      </h3>

                      <p>
                        {normalizedSearch
                          ? `Nothing matches "${searchQuery}"`
                          : "Star files or folders to find them quickly here."}
                      </p>
                    </div>
                  )}
              </div>
            )}
          </>
        ) : activeView === "shared" ? (
          <>
            {!sharedFolder ? (
              <>
                <header className="topbar">
                  <div>
                    <h2>Shared with me</h2>
                    <p>Files and folders shared with you</p>
                  </div>
                </header>

                <div className="search-bar">
                  <SearchIcon size={18} />

                  <input
                    type="text"
                    placeholder="Search shared files and folders..."
                    value={searchQuery}
                    onChange={(e) =>
                      setSearchQuery(e.target.value)
                    }
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

                {sharedLoading ? (
                  <div className="empty-state">
                    Loading shared files...
                  </div>
                ) : filteredSharedResources.length > 0 ? (
                  <section>
                    <h3 className="section-title">
                      Shared items
                    </h3>

                    <div className="items-list">
                      {filteredSharedResources.map(
                        (resource) => (
                          <div
                            className="file-row"
                            key={resource.share_id}
                          >
                            <div className="file-icon">
                              {resource.resource_type ===
                              "folder" ? (
                                <FolderIcon size={30} />
                              ) : (
                                <FileIcon
                                  fileName={
                                    resource.resource_name
                                  }
                                  size={30}
                                />
                              )}
                            </div>

                            <div
                              className="file-info"
                              onDoubleClick={() => {
                                if (
                                  resource.resource_type ===
                                  "folder"
                                ) {
                                  openSharedFolder(resource);
                                }
                              }}
                              style={{
                                cursor:
                                  resource.resource_type ===
                                  "folder"
                                    ? "pointer"
                                    : "default",
                              }}
                            >
                              <strong>
                                {resource.resource_name}
                              </strong>

                              <span>
                                {resource.resource_type ===
                                "folder"
                                  ? "Folder"
                                  : formatFileSize(
                                      resource.size_bytes
                                    )}
                              </span>
                            </div>

                            <div className="shared-owner">
                              <span className="shared-owner-label">
                                Shared by
                              </span>

                              <span className="shared-owner-name">
                                {resource.owner_name ||
                                  resource.owner_email}
                              </span>
                            </div>

                            <span className="shared-role">
                              {resource.role}
                            </span>

                            {resource.resource_type ===
                            "folder" ? (
                              <button
                                className="file-action"
                                onClick={() =>
                                  openSharedFolder(resource)
                                }
                              >
                                <FolderIcon size={15} />
                                Open
                              </button>
                            ) : (
                              <>
                                <button
                                  className="file-action"
                                  onClick={() =>
                                    previewFile(
                                      {
                                        id: resource.resource_id,
                                        name: resource.resource_name,
                                        size_bytes:
                                          resource.size_bytes,
                                      },
                                      true
                                    )
                                  }
                                >
                                  <EyeIcon size={15} />
                                  Preview
                                </button>

                                <button
                                  className="file-action"
                                  onClick={() =>
                                    downloadSharedFile({
                                      id: resource.resource_id,
                                      name: resource.resource_name,
                                    })
                                  }
                                >
                                  <DownloadIcon size={15} />
                                  Download
                                </button>
                              </>
                            )}

                            <button
                              className="file-action delete"
                              onClick={() =>
                                removeSharedResource(resource)
                              }
                            >
                              <TrashIcon size={15} />
                              Remove
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  </section>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <UsersIcon size={48} />
                    </div>

                    <h3>
                      {normalizedSearch
                        ? "No results found"
                        : "Nothing shared with you"}
                    </h3>

                    <p>
                      {normalizedSearch
                        ? `Nothing matches "${searchQuery}"`
                        : "Files and folders shared with you will appear here."}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <header className="topbar">
                  <div>
                    <h2>{sharedFolder.name}</h2>

                    <p>
                      Shared folder ·{" "}
                      {sharedFolder.role}
                    </p>
                  </div>
                </header>

                <div className="breadcrumbs">
                  {sharedBreadcrumbs.map(
                    (breadcrumb, index) => {
                      const isLast =
                        index ===
                        sharedBreadcrumbs.length - 1;

                      return (
                        <div
                          className="breadcrumb-item"
                          key={`${breadcrumb.name}-${index}`}
                        >
                          <button
                            className={
                              isLast
                                ? "breadcrumb-current"
                                : ""
                            }
                            onClick={() =>
                              goToSharedFolderBreadcrumb(
                                index
                              )
                            }
                            disabled={isLast}
                          >
                            {index === 0 && (
                              <UsersIcon size={15} />
                            )}

                            {breadcrumb.name}
                          </button>

                          {!isLast && (
                            <span className="breadcrumb-separator">
                              /
                            </span>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>

                <div className="search-bar">
                  <SearchIcon size={18} />

                  <input
                    type="text"
                    placeholder="Search this shared folder..."
                    value={searchQuery}
                    onChange={(e) =>
                      setSearchQuery(e.target.value)
                    }
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

                <button
                  className="back-button"
                  onClick={goBackSharedFolder}
                >
                  <ArrowLeftIcon size={16} />
                  Back
                </button>

                {sharedFolderLoading ? (
                  <div className="empty-state">
                    Loading shared folder...
                  </div>
                ) : (
                  <>
                    {filteredSharedFolders.length > 0 && (
                      <section>
                        <h3 className="section-title">
                          Folders
                        </h3>

                        <div className="items-grid">
                          {filteredSharedFolders.map(
                            (folder) => (
                              <div
                                className="item-card"
                                key={folder.id}
                              >
                                <div
                                  className="item-main"
                                  onDoubleClick={() =>
                                    openSharedFolder(folder)
                                  }
                                  onClick={() =>
                                    openSharedFolder(folder)
                                  }
                                >
                                  <div className="item-icon">
                                    <FolderIcon size={32} />
                                  </div>

                                  <div className="item-info">
                                    <strong>
                                      {folder.name}
                                    </strong>

                                    <span>
                                      Shared folder
                                    </span>
                                  </div>
                                </div>

                                <div className="folder-actions">
                                  <button
                                    className="folder-action"
                                    onClick={() =>
                                      openSharedFolder(folder)
                                    }
                                  >
                                    <FolderIcon size={14} />
                                    Open
                                  </button>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </section>
                    )}

                    {filteredSharedFiles.length > 0 && (
                      <section>
                        <h3 className="section-title">
                          Files
                        </h3>

                        <div className="items-list">
                          {filteredSharedFiles.map(
                            (file) => (
                              <div
                                className="file-row"
                                key={file.id}
                              >
                                <div className="file-icon">
                                  <FileIcon
                                    fileName={file.name}
                                  />
                                </div>

                                <div className="file-info">
                                  <strong>
                                    {file.name}
                                  </strong>

                                  <span>
                                    {formatFileSize(
                                      file.size_bytes
                                    )}
                                  </span>
                                </div>

                                <button
                                  className="file-action"
                                  onClick={() =>
                                    previewFile(file, true)
                                  }
                                >
                                  <EyeIcon size={15} />
                                  Preview
                                </button>

                                <button
                                  className="file-action"
                                  onClick={() =>
                                    downloadSharedFile(file)
                                  }
                                >
                                  <DownloadIcon size={15} />
                                  Download
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      </section>
                    )}

                    {filteredSharedFolders.length === 0 &&
                      filteredSharedFiles.length === 0 && (
                        <div className="empty-state">
                          <div className="empty-icon">
                            <FolderIcon size={48} />
                          </div>

                          <h3>
                            {normalizedSearch
                              ? "No results found"
                              : "This shared folder is empty"}
                          </h3>

                          <p>
                            {normalizedSearch
                              ? `Nothing matches "${searchQuery}"`
                              : "There are no files or folders here."}
                          </p>
                        </div>
                      )}
                  </>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <header className="topbar">
              <div>
                <h2>
                  {currentFolder
                    ? currentFolder.name
                    : "My Files"}
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

                  {uploading
                    ? "Uploading..."
                    : "Upload File"}

                  <input
                    id="cloud-drive-upload"
                    type="file"
                    onChange={uploadFile}
                    disabled={uploading}
                  />
                </label>

                <button
                  className="new-folder-button"
                  onClick={() =>
                    setShowFolderInput(true)
                  }
                >
                  <PlusIcon size={17} />
                  New Folder
                </button>
              </div>
            </header>

            <div className="breadcrumbs">
              {breadcrumbs.map(
                (breadcrumb, index) => {
                  const isLast =
                    index === breadcrumbs.length - 1;

                  return (
                    <div
                      className="breadcrumb-item"
                      key={`${breadcrumb.name}-${index}`}
                    >
                      <button
                        className={
                          isLast
                            ? "breadcrumb-current"
                            : ""
                        }
                        onClick={() =>
                          goToBreadcrumb(index)
                        }
                        disabled={isLast}
                      >
                        {index === 0 && (
                          <FolderIcon size={15} />
                        )}

                        {breadcrumb.name}
                      </button>

                      {!isLast && (
                        <span className="breadcrumb-separator">
                          /
                        </span>
                      )}
                    </div>
                  );
                }
              )}
            </div>

            <div className="search-bar">
              <SearchIcon size={18} />

              <input
                type="text"
                placeholder="Search files and folders..."
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(e.target.value)
                }
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
              <button
                className="back-button"
                onClick={goBack}
              >
                <ArrowLeftIcon size={16} />
                Back
              </button>
            )}

            {showFolderInput && (
              <form
                className="new-folder-form"
                onSubmit={createFolder}
              >
                <input
                  autoFocus
                  type="text"
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) =>
                    setNewFolderName(e.target.value)
                  }
                />

                <button type="submit">
                  Create
                </button>

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
              <div className="empty-state">
                Loading...
              </div>
            ) : (
              <div className="file-area">
                {filteredFolders.length > 0 && (
                  <section>
                    <h3 className="section-title">
                      Folders
                    </h3>

                    <div className="items-grid">
                      {filteredFolders.map(
                        (folder) => {
                          const starKey =
                            `folder-${folder.id}`;

                          return (
                            <div
                              className="item-card"
                              key={folder.id}
                            >
                              {renamingFolder?.id ===
                              folder.id ? (
                                <form
                                  className="rename-form"
                                  onSubmit={renameFolder}
                                >
                                  <input
                                    autoFocus
                                    value={renameValue}
                                    onChange={(e) =>
                                      setRenameValue(
                                        e.target.value
                                      )
                                    }
                                  />

                                  <div className="rename-actions">
                                    <button type="submit">
                                      Save
                                    </button>

                                    <button
                                      type="button"
                                      onClick={
                                        cancelRename
                                      }
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
                                      <FolderIcon size={32} />
                                    </div>

                                    <div className="item-info">
                                      <strong>
                                        {folder.name}
                                      </strong>

                                      <span>
                                        Folder
                                      </span>
                                    </div>
                                  </div>

                                  <div className="folder-actions">
                                    <button
                                      className="folder-action"
                                      onClick={() =>
                                        startRenameFolder(
                                          folder
                                        )
                                      }
                                    >
                                      <EditIcon size={14} />
                                      Rename
                                    </button>

                                    <button
                                      className="folder-action"
                                      onClick={() =>
                                        openShareModal(
                                          "folder",
                                          folder
                                        )
                                      }
                                    >
                                      <UsersIcon size={14} />
                                      Share
                                    </button>

                                    <button
                                      className="folder-action"
                                      onClick={() =>
                                        toggleStar(
                                          "folder",
                                          folder.id
                                        )
                                      }
                                      disabled={
                                        starLoading[starKey]
                                      }
                                    >
                                      <StarIcon
                                        size={14}
                                        filled={isStarred(
                                          "folder",
                                          folder.id
                                        )}
                                      />

                                      {starLoading[starKey]
                                        ? "..."
                                        : isStarred(
                                            "folder",
                                            folder.id
                                          )
                                        ? "Unstar"
                                        : "Star"}
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
                          );
                        }
                      )}
                    </div>
                  </section>
                )}

                {filteredFiles.length > 0 && (
                  <section>
                    <h3 className="section-title">
                      Files
                    </h3>

                    <div className="items-list">
                      {filteredFiles.map(
                        (file) => {
                          const starKey =
                            `file-${file.id}`;

                          return (
                            <div
                              className="file-row"
                              key={file.id}
                            >
                              <div className="file-icon">
                                <FileIcon
                                  fileName={file.name}
                                />
                              </div>

                              <div className="file-info">
                                <strong>
                                  {file.name}
                                </strong>

                                <span>
                                  {formatFileSize(
                                    file.size_bytes
                                  )}
                                </span>
                              </div>

                              <button
                                className="file-action"
                                onClick={() =>
                                  previewFile(file)
                                }
                              >
                                <EyeIcon size={15} />
                                Preview
                              </button>

                              <button
                                className="file-action"
                                onClick={() =>
                                  downloadFile(file)
                                }
                              >
                                <DownloadIcon size={15} />
                                Download
                              </button>

                              <button
                                className="file-action"
                                onClick={() =>
                                  openShareModal(
                                    "file",
                                    file
                                  )
                                }
                              >
                                <UsersIcon size={15} />
                                Share
                              </button>
                              <button
                                className="file-action"
                                onClick={() =>
                                  openPublicLinkModal(file)
                                }
                              >
                                🔗
                                Public Link
                              </button>


                              <button
                                className="file-action"
                                onClick={() =>
                                  toggleStar(
                                    "file",
                                    file.id
                                  )
                                }
                                disabled={
                                  starLoading[starKey]
                                }
                              >
                                <StarIcon
                                  size={15}
                                  filled={isStarred(
                                    "file",
                                    file.id
                                  )}
                                />

                                {starLoading[starKey]
                                  ? "..."
                                  : isStarred(
                                      "file",
                                      file.id
                                    )
                                  ? "Unstar"
                                  : "Star"}
                              </button>

                              <button
                                className="file-action delete"
                                onClick={() =>
                                  deleteFile(file)
                                }
                              >
                                <TrashIcon size={15} />
                                Delete
                              </button>
                            </div>
                          );
                        }
                      )}
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
          </>
        )}
      </section>

      {shareTarget && (
        <div
          className="preview-overlay"
          onClick={closeShareModal}
        >
          <div
            className="share-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="share-modal-header">
              <div>
                <strong>Share</strong>
                <span>{shareTarget.name}</span>
              </div>

              <button
                className="preview-close"
                onClick={closeShareModal}
                disabled={shareLoading}
              >
                ×
              </button>
            </div>

            <form
              className="share-form"
              onSubmit={shareResource}
            >
              <label>Email address</label>

              <input
                type="email"
                placeholder="Enter registered user's email"
                value={shareEmail}
                onChange={(e) =>
                  setShareEmail(e.target.value)
                }
                autoFocus
                required
                disabled={shareLoading}
              />

              <label>Permission</label>

              <select
                value={shareRole}
                onChange={(e) =>
                  setShareRole(e.target.value)
                }
                disabled={shareLoading}
              >
                <option value="viewer">
                  Viewer — can preview and download
                </option>

                <option value="editor">
                  Editor — can modify and delete
                </option>
              </select>

              {shareMessage && (
                <p
                  className={`message ${
                    shareMessage
                      .toLowerCase()
                      .includes("success")
                      ? "success"
                      : "error"
                  }`}
                >
                  {shareMessage}
                </p>
              )}

              <div className="share-modal-actions">
                <button
                  type="button"
                  className="file-action"
                  onClick={closeShareModal}
                  disabled={shareLoading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="new-folder-button"
                  disabled={shareLoading}
                >
                  {shareLoading
                    ? "Sharing..."
                    : "Share"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {publicLinkTarget && (
        <div
          className="preview-overlay"
          onClick={closePublicLinkModal}
        >
          <div
            className="share-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="share-modal-header">
              <div>
                <strong>Public Link</strong>
                <span>{publicLinkTarget.name}</span>
              </div>

              <button
                className="preview-close"
                onClick={closePublicLinkModal}
                disabled={publicLinkLoading}
              >
                ×
              </button>
            </div>

            <div className="share-form">
              <label>Password (optional)</label>

              <input
                type="password"
                placeholder="Leave empty for no password"
                value={publicLinkPassword}
                onChange={(e) =>
                  setPublicLinkPassword(e.target.value)
                }
                disabled={publicLinkLoading}
              />

              <label>Expires at (optional)</label>

              <input
                type="datetime-local"
                value={publicLinkExpiry}
                onChange={(e) =>
                  setPublicLinkExpiry(e.target.value)
                }
                disabled={publicLinkLoading}
              />

              <button
                type="button"
                className="new-folder-button"
                onClick={createPublicLink}
                disabled={publicLinkLoading}
              >
                {publicLinkLoading
                  ? "Working..."
                  : "Create Public Link"}
              </button>

              {publicLinkMessage && (
                <p
                  className={`message ${
                    publicLinkMessage
                      .toLowerCase()
                      .includes("success") ||
                    publicLinkMessage
                      .toLowerCase()
                      .includes("copied") ||
                    publicLinkMessage
                      .toLowerCase()
                      .includes("revoked")
                      ? "success"
                      : "error"
                  }`}
                >
                  {publicLinkMessage}
                </p>
              )}

              {publicLinks.length > 0 && (
                <div
                  style={{
                    marginTop: "20px",
                  }}
                >
                  <label>Existing links</label>

                  {publicLinks.map((link) => {
                    const fullUrl =
                      link.url.startsWith("http")
                        ? link.url
                        : `${API_URL}${link.url}`;

                    return (
                      <div
                        key={link.id}
                        style={{
                          marginTop: "10px",
                          padding: "12px",
                          border: "1px solid #ddd",
                          borderRadius: "8px",
                        }}
                      >
                        <input
                          value={fullUrl}
                          readOnly
                        />

                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            marginTop: "8px",
                          }}
                        >
                          <button
                            type="button"
                            className="file-action"
                            onClick={() =>
                              copyPublicLink(
                                fullUrl
                              )
                            }
                          >
                            Copy
                          </button>

                          <button
                            type="button"
                            className="file-action delete"
                            onClick={() =>
                              revokePublicLink(
                                link.id
                              )
                            }
                          >
                            Revoke
                          </button>
                        </div>

                        {link.password_protected && (
                          <small>
                            🔒 Password protected
                          </small>
                        )}

                        {link.expires_at && (
                          <small>
                            <br />
                            Expires:{" "}
                            {new Date(
                              link.expires_at
                            ).toLocaleString()}
                          </small>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="share-modal-actions">
                <button
                  type="button"
                  className="file-action"
                  onClick={closePublicLinkModal}
                  disabled={publicLinkLoading}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <strong>
                  {previewFileData.name}
                </strong>

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
              ) : getPreviewType(
                  previewFileData.name
                ) === "image" ? (
                <img
                  src={previewUrl}
                  alt={previewFileData.name}
                  className="image-preview"
                />
              ) : getPreviewType(
                  previewFileData.name
                ) === "pdf" ? (
                <iframe
                  src={previewUrl}
                  title={previewFileData.name}
                  className="pdf-preview"
                />
              ) : getPreviewType(
                  previewFileData.name
                ) === "video" ? (
                <video
                  src={previewUrl}
                  className="video-preview"
                  controls
                  autoPlay
                >
                  Your browser does not support video playback.
                </video>
              ) : getPreviewType(
                  previewFileData.name
                ) === "audio" ? (
                <div className="audio-preview">
                  <div className="audio-preview-icon">
                    🎵
                  </div>

                  <h3>
                    {previewFileData.name}
                  </h3>

                  <audio
                    src={previewUrl}
                    controls
                    autoPlay
                  >
                    Your browser does not support audio playback.
                  </audio>
                </div>
              ) : getPreviewType(
                  previewFileData.name
                ) === "text" ? (
                <iframe
                  src={previewUrl}
                  title={previewFileData.name}
                  className="text-preview"
                />
              ) : (
                <div className="unsupported-preview">
                  <div className="empty-icon">
                    <FileIcon
                      fileName={
                        previewFileData.name
                      }
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
                      previewFileData.shared
                        ? downloadSharedFile(
                            previewFileData
                          )
                        : downloadFile(
                            previewFileData
                          )
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
  const STORAGE_LIMIT =
    15 * 1024 * 1024 * 1024;

  const usedBytes = Number(
    stats.storageUsed || 0
  );

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
          {percentage < 0.01
            ? "<0.01%"
            : `${percentage.toFixed(1)}%`}
        </strong>
      </div>

      <div className="storage-progress">
        <div
          className="storage-progress-fill"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

      <div className="storage-details">
        <span>
          <strong>
            {formatFileSize(usedBytes)}
          </strong>{" "}
          used of 15 GB
        </span>

        <div className="storage-stats">
          <span>
            {stats.fileCount || 0} files
          </span>

          <span>
            {stats.folderCount || 0} folders
          </span>
        </div>
      </div>
    </div>
  );
}

function Icon({
  children,
  size = 20,
  className = "",
}) {
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

function DashboardIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function UploadIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" />
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

function UsersIcon({ size = 20 }) {
  return (
    <Icon size={size}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19a6 6 0 0 1 12 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.8" />
      <path d="M18 13a5 5 0 0 1 3 4.5" />
    </Icon>
  );
}

function StarIcon({ size = 20, filled = false }) {
  return (
    <Icon size={size}>
      <path
        d="m12 3 2.78 5.63 6.22.9-4.5 4.38 1.06 6.19L12 17.18l-5.56 2.92 1.06-6.19L3 9.53l6.22-.9L12 3Z"
        fill={filled ? "currentColor" : "none"}
      />
    </Icon>
  );
}

function ActivityIcon({ size = 20 }) {
  return (
    <Icon size={size}>
      <path d="M3 12h4l2-7 4 14 2-7h6" />
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

// function UploadIcon({ size = 20 }) {
//   return (
//     <Icon size={size}>
//       <path d="M12 16V4" />
//       <path d="m7 9 5-5 5 5" />
//       <path d="M5 20h14" />
//     </Icon>
//   );
// }

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

function FileIcon({
  fileName,
  size = 32,
}) {
  const extension =
    getFileExtension(fileName);

  let type = "default";

  if (
    [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "bmp",
      "svg",
    ].includes(extension)
  ) {
    type = "image";
  } else if (extension === "pdf") {
    type = "pdf";
  } else if (
    ["doc", "docx"].includes(extension)
  ) {
    type = "word";
  } else if (
    ["xls", "xlsx", "csv"].includes(extension)
  ) {
    type = "excel";
  } else if (
    ["ppt", "pptx"].includes(extension)
  ) {
    type = "powerpoint";
  } else if (
    ["zip", "rar", "7z", "tar", "gz"].includes(
      extension
    )
  ) {
    type = "archive";
  } else if (
    ["mp3", "wav", "ogg", "m4a"].includes(extension)
  ) {
    type = "audio";
  } else if (
    [
      "mp4",
      "webm",
      "mov",
      "avi",
      "mkv",
    ].includes(extension)
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
  return fileName
    .split(".")
    .pop()
    .toLowerCase();
}

function getPreviewType(fileName) {
  const extension = getFileExtension(fileName);

  if (
    [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "bmp",
      "svg",
    ].includes(extension)
  ) {
    return "image";
  }

  if (extension === "pdf") {
    return "pdf";
  }

  if (
    [
      "mp4",
      "webm",
      "ogg",
      "mov",
      "avi",
      "mkv",
    ].includes(extension)
  ) {
    return "video";
  }

  if (
    [
      "mp3",
      "wav",
      "ogg",
      "m4a",
      "aac",
      "flac",
    ].includes(extension)
  ) {
    return "audio";
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
      "csv",
    ].includes(extension)
  ) {
    return "text";
  }

  return "unsupported";
}

function formatActivityAction(activity) {
  const resourceName =
    activity.context?.name ||
    activity.context?.resource_name ||
    "resource";

  const action = activity.action
    ?.replace(/_/g, " ")
    .toLowerCase();

  return `${action || "updated"} — ${resourceName}`;
}

function formatFileSize(bytes) {
  if (!bytes) return "0 B";

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
  ];

  const index = Math.floor(
    Math.log(bytes) / Math.log(1024)
  );

  return `${(
    bytes /
    Math.pow(1024, index)
  ).toFixed(index === 0 ? 0 : 1)} ${
    units[index]
  }`;
}