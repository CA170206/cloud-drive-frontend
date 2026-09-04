// app/page.jsx

"use client";

import { useEffect, useRef, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const recentGridMenuButtonStyle = {
  width: "100%",
  height: "30px",
  minHeight: "30px",
  margin: 0,
  padding: "0 9px",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "8px",
  boxSizing: "border-box",
  border: 0,
  borderRadius: "6px",
  background: "transparent",
  color: "#cbd5e1",
  fontSize: "10px",
  fontWeight: 500,
  textAlign: "left",
  whiteSpace: "nowrap",
  cursor: "pointer",
};

export default function Home() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    const savedTheme = window.localStorage.getItem("cloud-drive-theme");
    return savedTheme === "light" || savedTheme === "dark" ? savedTheme : "dark";
  });

  useEffect(() => {
    checkAuth();
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
    return <Login onLogin={setUser} theme={theme} setTheme={setTheme} />;
  }

  return <Dashboard user={user} onLogout={() => setUser(null)} theme={theme} setTheme={setTheme} />;
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
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          <span className="theme-toggle-icon">{theme === "dark" ? "☀" : "☾"}</span>
          <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
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
  const [renamingFile, setRenamingFile] = useState(null);
  const [renameFileValue, setRenameFileValue] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("name-asc");
  const [filterOpen, setFilterOpen] = useState(false);
  const [fileTypeFilter, setFileTypeFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [viewMode, setViewMode] = useState("list");

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const dragDepth = useRef(0);
  const [loading, setLoading] = useState(true);

  const [previewFileData, setPreviewFileData] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPptxBuffer, setPreviewPptxBuffer] = useState(null);

  const [detailsTarget, setDetailsTarget] = useState(null);

  const [storageStats, setStorageStats] = useState({
    fileCount: 0,
    folderCount: 0,
    storageUsed: 0,
  });

  const [activeView, setActiveView] = useState("dashboard");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  /* File Versioning */
  const [versionTarget, setVersionTarget] = useState(null);
  const [fileVersions, setFileVersions] = useState([]);
  const [versionLoading, setVersionLoading] = useState(false);
  const [versionUploading, setVersionUploading] = useState(false);
  const [versionMessage, setVersionMessage] = useState("");

  /* Recent Files */
  const [recentFiles, setRecentFiles] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentGridMenuOpen, setRecentGridMenuOpen] = useState(null);

  const [starredResources, setStarredResources] = useState([]);
  const [starredLoading, setStarredLoading] = useState(false);
  const [starLoading, setStarLoading] = useState({});
  const [selectedFileIds, setSelectedFileIds] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [tagEditor, setTagEditor] = useState(null);
  const [tagInput, setTagInput] = useState("");
  const [fileTags, setFileTags] = useState({});
  const [visibleFileCount, setVisibleFileCount] = useState(20);

  const [trashFiles, setTrashFiles] = useState([]);
  const [trashFolders, setTrashFolders] = useState([]);
  const [trashLoading, setTrashLoading] = useState(false);

  useEffect(() => {
    loadContents(null);
    loadStorageStats();
    loadSharedWithMe();
    loadStarredResources();
    loadActivities();
    loadRecentFiles();
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cloud-drive-file-tags");
      if (saved) setFileTags(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("cloud-drive-file-tags", JSON.stringify(fileTags)); } catch {}
  }, [fileTags]);

  useEffect(() => {
    const dropdownSelector =
      "details.desktop-file-options, details.recent-desktop-file-options, details.starred-desktop-file-options, details.shared-desktop-file-options, details.grid-file-options, details.mobile-file-options, .recent-grid-file-options-control";

    const closeOtherDropdowns = (except) => {
      document.querySelectorAll(dropdownSelector).forEach((details) => {
        if (details !== except && details.open) {
          details.removeAttribute("open");
        }
      });
    };

    const positionOpenDropdown = (details) => {
      if (!details) return;

      const isRecentGridControl = details.classList?.contains(
        "recent-grid-file-options-control"
      );

      const summary = isRecentGridControl
        ? details.querySelector("button[aria-label=\"File options\"]")
        : details.querySelector(":scope > summary");

      const menu = isRecentGridControl
        ? details.querySelector(".recent-grid-file-options-menu")
        : details.querySelector(
            ":scope > .desktop-file-options-menu, :scope > .grid-file-menu-dropdown, :scope > .mobile-file-options-menu"
          );

      const isOpen = isRecentGridControl
        ? !!menu
        : !!details.open;

      if (!summary || !menu || !isOpen) return;

      const summaryRect = summary.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const gap = 8;
      const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top;
      const spaceBelow = viewportHeight - summaryRect.bottom;
      const spaceAbove = summaryRect.top;

      if (spaceBelow >= menuRect.height + gap || spaceBelow >= spaceAbove) {
        top = summaryRect.bottom + gap;
      } else {
        top = summaryRect.top - menuRect.height - gap;
      }

      top = Math.max(8, Math.min(top, viewportHeight - menuRect.height - 8));

      const right = Math.max(8, viewportWidth - summaryRect.right);

      menu.style.setProperty("--cd-menu-top", `${Math.round(top)}px`);
      menu.style.setProperty("--cd-menu-right", `${Math.round(right)}px`);
      menu.style.setProperty("--cd-menu-ready", "1");
    };

    const closeOnOutsidePointer = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const clickedDropdown = target.closest(dropdownSelector);

      if (clickedDropdown) {
        if (clickedDropdown.classList.contains("recent-grid-file-options-control")) {
          // The React-controlled Recent grid menu handles its own toggle.
          // Keep it open while clicking inside its button/menu.
          closeOtherDropdowns(null);
        } else {
          // Clicking a native <details> dropdown closes the React-controlled
          // Recent grid menu and closes every other native dropdown.
          setRecentGridMenuOpen(null);
          closeOtherDropdowns(clickedDropdown);
        }
      } else {
        // Clicking anywhere outside a dropdown closes every file menu.
        setRecentGridMenuOpen(null);
        closeOtherDropdowns(null);
      }
    };

    const handleToggle = (event) => {
      const details = event.target;
      if (!(details instanceof HTMLDetailsElement)) return;
      if (!details.matches(dropdownSelector)) return;

      if (details.open) {
        closeOtherDropdowns(details);
        requestAnimationFrame(() => positionOpenDropdown(details));
      }
    };

    const handleViewportChange = () => {
      document.querySelectorAll(`${dropdownSelector}[open]`).forEach(positionOpenDropdown);
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.attributeName === "open") {
          const details = mutation.target;
          if (details instanceof HTMLDetailsElement && details.open) {
            closeOtherDropdowns(details);
            requestAnimationFrame(() => positionOpenDropdown(details));
          }
        }
      }
    });

    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    document.addEventListener("toggle", handleToggle, true);
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"] });
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
      document.removeEventListener("toggle", handleToggle, true);
      observer.disconnect();
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, []);

  useEffect(() => {
    const handler = (event) => {
      if (event.key === "Escape") { setContextMenu(null); setTagEditor(null); setShortcutHelpOpen(false); return; }
      const t = event.target;
      const typing = t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement || t?.isContentEditable;
      if (typing) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") { event.preventDefault(); if (activeView === "my-files") toggleSelectAllFiles(); }
      if (event.key === "Delete" && selectedFileIds.length && activeView === "my-files") { event.preventDefault(); bulkDeleteFiles(); }
      if (event.key === "?") { event.preventDefault(); setShortcutHelpOpen(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeView, selectedFileIds]);

  useEffect(() => {
    if (!recentGridMenuOpen) return;

    const frame = requestAnimationFrame(() => {
      const control = document.querySelector(
        ".recent-grid-file-options-control"
      );
      if (control) {
        const button = control.querySelector(
          'button[aria-label="File options"]'
        );
        const menu = control.querySelector(
          ".recent-grid-file-options-menu"
        );

        if (button && menu) {
          const buttonRect = button.getBoundingClientRect();
          const menuRect = menu.getBoundingClientRect();
          const gap = 8;
          const viewportWidth =
            document.documentElement.clientWidth || window.innerWidth;
          const viewportHeight = window.innerHeight;

          const spaceBelow = viewportHeight - buttonRect.bottom;
          const spaceAbove = buttonRect.top;
          let top =
            spaceBelow >= menuRect.height + gap || spaceBelow >= spaceAbove
              ? buttonRect.bottom + gap
              : buttonRect.top - menuRect.height - gap;

          top = Math.max(8, Math.min(
            top,
            viewportHeight - menuRect.height - 8
          ));

          const right = Math.max(
            8,
            viewportWidth - buttonRect.right
          );

          menu.style.setProperty(
            "--cd-menu-top",
            `${Math.round(top)}px`
          );
          menu.style.setProperty(
            "--cd-menu-right",
            `${Math.round(right)}px`
          );
        }
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [recentGridMenuOpen]);

  useEffect(() => { setVisibleFileCount(20); }, [searchQuery, fileTypeFilter, ownerFilter, sortOption, currentFolder]);

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

  const loadRecentFiles = async () => {
    setRecentLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/files/recent`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRecentFiles(data.files || []);
      }
    } catch (error) {
      console.error("Failed to load recent files:", error);
    } finally {
      setRecentLoading(false);
    }
  };

  const loadTrash = async () => {
    setTrashLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/files/trash`, {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error?.message || "Unable to load Trash");
        return;
      }

      setTrashFiles(data.trash?.files || []);
      setTrashFolders(data.trash?.folders || []);
    } catch (error) {
      console.error("Failed to load trash:", error);
      alert("Unable to load Trash");
    } finally {
      setTrashLoading(false);
    }
  };

  const openTrash = () => {
    setActiveView("trash");
    setSearchQuery("");
    setCurrentFolder(null);
    setFolderStack([]);
    setSharedFolder(null);
    setSharedFolderFolders([]);
    setSharedFolderFiles([]);
    setSharedFolderStack([]);
    loadTrash();
  };

  const restoreTrashFile = async (file) => {
    try {
      const response = await fetch(
        `${API_URL}/api/files/trash/${file.id}/restore`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.error?.message || "Unable to restore file");
        return;
      }

      setTrashFiles((previous) => previous.filter((item) => item.id !== file.id));
      loadStorageStats();
      loadActivities();
    } catch (error) {
      console.error("Restore file failed:", error);
      alert("Unable to restore file");
    }
  };

  const restoreTrashFolder = async (folder) => {
    try {
      const response = await fetch(
        `${API_URL}/api/files/trash/folder/${folder.id}/restore`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.error?.message || "Unable to restore folder");
        return;
      }

      setTrashFolders((previous) => previous.filter((item) => item.id !== folder.id));
      loadActivities();
    } catch (error) {
      console.error("Restore folder failed:", error);
      alert("Unable to restore folder");
    }
  };

  const getTrashDaysLeft = (updatedAt) => {
    if (!updatedAt) return 30;
    const deletedAt = new Date(updatedAt).getTime();
    const expiresAt = deletedAt + 30 * 24 * 60 * 60 * 1000;
    return Math.max(0, Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000)));
  };

  const openDashboard = () => {
    setActiveView("dashboard");
    setSearchQuery("");
    setSharedFolder(null);
    setSharedFolderFolders([]);
    setSharedFolderFiles([]);
    setSharedFolderStack([]);
    setFolderStack([]);
    setCurrentFolder(null);
    loadContents(null);
    loadStorageStats();
  };

  const openRecent = () => {
    setActiveView("recent");
    setSearchQuery("");
    setCurrentFolder(null);
    setFolderStack([]);
    setSharedFolder(null);
    setSharedFolderFolders([]);
    setSharedFolderFiles([]);
    setSharedFolderStack([]);
    loadRecentFiles();
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
    setSelectedFileIds([]);
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
    setSelectedFileIds([]);
    setSearchQuery("");

    setFolderStack((previous) => [
      ...previous,
      currentFolder,
    ]);

    setCurrentFolder(folder);
    loadContents(folder.id);
  };

  const goBack = () => {
    setSelectedFileIds([]);
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

  const startRenameFile = (file) => {
    setRenamingFile(file);
    setRenameFileValue(file.name);
  };

  const cancelRenameFile = () => {
    setRenamingFile(null);
    setRenameFileValue("");
  };

  const renameFile = async (e) => {
    e.preventDefault();

    if (!renameFileValue.trim() || !renamingFile) return;

    try {
      const response = await fetch(
        `${API_URL}/api/files/${renamingFile.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name: renameFileValue.trim(),
          }),
        }
      );

      if (response.ok) {
        cancelRenameFile();
        loadContents(currentFolder?.id || null);
        loadStarredResources();
        loadActivities();
      } else {
        const data = await response.json();
        alert(data.error?.message || "Unable to rename file");
      }
    } catch (error) {
      console.error("Rename file failed:", error);
      alert("Unable to rename file");
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

  const uploadSelectedFile = (file) => {
    return new Promise((resolve, reject) => {
      if (!file) {
        resolve(false);
        return;
      }

      setUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("file", file);

      if (currentFolder?.id) {
        formData.append("folderId", currentFolder.id);
      }

      const xhr = new XMLHttpRequest();

      xhr.open("POST", `${API_URL}/api/files/upload`, true);
      xhr.withCredentials = true;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadProgress(100);
          loadContents(currentFolder?.id || null);
          loadStorageStats();
          loadActivities();
          resolve(true);
        } else {
          let message = "Upload failed";
          try {
            const data = JSON.parse(xhr.responseText);
            message = data.error?.message || message;
          } catch {}
          alert(message);
          resolve(false);
        }
      };

      xhr.onerror = () => {
        console.error("Upload failed: network error");
        alert("Unable to upload file");
        reject(new Error("Upload failed"));
      };

      xhr.onloadend = () => {
        setUploading(false);
      };

      xhr.send(formData);
    });
  };

  const uploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await uploadSelectedFile(file);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      e.target.value = "";
    }
  };

  const isFileDrag = (e) => {
    const types = Array.from(e.dataTransfer?.types || []);
    return types.includes("Files") || types.includes("application/x-moz-file");
  };

  const handleDragEnter = (e) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
    if (!uploading) setDragActive(true);
  };

  const handleDragOver = (e) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = uploading ? "none" : "copy";
    if (!uploading) setDragActive(true);
  };

  const handleDragLeave = (e) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragActive(false);
  };

  const handleDrop = async (e) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setDragActive(false);

    if (uploading) return;

    const files = Array.from(e.dataTransfer.files || []).filter(Boolean);
    if (!files.length) return;

    try {
      for (const file of files) {
        await uploadSelectedFile(file);
      }
    } catch (error) {
      console.error("Drop upload failed:", error);
    }
  };

  const openDetails = (file) => {
    setDetailsTarget(file);
  };

  const closeDetails = () => {
    setDetailsTarget(null);
  };

  const previewFile = async (file, isShared = false) => {
    setPreviewLoading(true);
    setPreviewFileData({
      ...file,
      shared: isShared,
    });
    setPreviewText("");
    setPreviewPptxBuffer(null);

    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }

    try {
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

      /*
       * TEXT FILES:
       * Read the file directly and render the text in a <pre>.
       * This intentionally avoids an iframe so the file's own
       * HTML/background styling cannot affect our preview UI.
       */
      const previewType = getPreviewType(file.name);

      if (previewType === "text") {
        const text = await blob.text();
        setPreviewText(text);
      } else if (previewType === "powerpoint") {
        const buffer = await blob.arrayBuffer();
        setPreviewPptxBuffer(buffer);
      } else {
        const objectUrl = window.URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      }
    } catch (error) {
      console.error("Preview failed:", error);
      alert("Unable to preview file");
      setPreviewFileData(null);
      setPreviewText("");
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl("");
    setPreviewText("");
    setPreviewPptxBuffer(null);
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


  const toggleFileSelection = (fileId) => {
    setSelectedFileIds((previous) =>
      previous.includes(fileId)
        ? previous.filter((id) => id !== fileId)
        : [...previous, fileId]
    );
  };

  const toggleSelectAllFiles = () => {
    const visibleIds = filteredFiles.map((file) => file.id);

    if (
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedFileIds.includes(id))
    ) {
      setSelectedFileIds((previous) =>
        previous.filter((id) => !visibleIds.includes(id))
      );
    } else {
      setSelectedFileIds((previous) => [
        ...new Set([...previous, ...visibleIds]),
      ]);
    }
  };

  const clearFileSelection = () => setSelectedFileIds([]);

  const bulkDeleteFiles = async () => {
    if (!selectedFileIds.length) return;

    if (
      !window.confirm(
        `Delete ${selectedFileIds.length} selected file${selectedFileIds.length === 1 ? "" : "s"}?`
      )
    ) {
      return;
    }

    for (const id of selectedFileIds) {
      try {
        await fetch(`${API_URL}/api/files/${id}`, {
          method: "DELETE",
          credentials: "include",
        });
      } catch (error) {
        console.error("Bulk delete failed:", error);
      }
    }

    clearFileSelection();
    await loadContents(currentFolder?.id || null);
    await loadStorageStats();
    await loadStarredResources();
    loadActivities();
  };

  const bulkDownloadFiles = async () => {
    const selected = files.filter((file) =>
      selectedFileIds.includes(file.id)
    );

    for (const file of selected) {
      await downloadFile(file);
    }

    clearFileSelection();
  };

  const bulkStarFiles = async () => {
    const selected = files.filter((file) =>
      selectedFileIds.includes(file.id)
    );

    for (const file of selected) {
      if (isStarred("file", file.id)) continue;

      try {
        await fetch(`${API_URL}/api/stars`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            resourceType: "file",
            resourceId: file.id,
          }),
        });
      } catch (error) {
        console.error("Bulk star failed:", error);
      }
    }

    await loadStarredResources();
    clearFileSelection();
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

  const openVersionHistory = async (file) => {
    setVersionTarget(file);
    setFileVersions([]);
    setVersionMessage("");
    setVersionLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/files/${file.id}/versions`,
        {
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setVersionMessage(
          data.error?.message ||
            "Unable to load version history"
        );
        return;
      }

      setFileVersions(data.versions || []);
    } catch (error) {
      console.error(
        "Load version history failed:",
        error
      );
      setVersionMessage("Unable to connect to server");
    } finally {
      setVersionLoading(false);
    }
  };

  const closeVersionHistory = () => {
    if (versionLoading || versionUploading) return;

    setVersionTarget(null);
    setFileVersions([]);
    setVersionMessage("");
  };

  const uploadNewFileVersion = () => {
    if (!versionTarget || versionUploading) return;

    const input = document.createElement("input");
    input.type = "file";

    input.onchange = async (event) => {
      const selectedFile = event.target.files?.[0];

      if (!selectedFile) return;

      setVersionUploading(true);
      setVersionMessage("");

      try {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const response = await fetch(
          `${API_URL}/api/files/${versionTarget.id}/versions`,
          {
            method: "POST",
            credentials: "include",
            body: formData,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          setVersionMessage(
            data.error?.message ||
              "Unable to upload new version"
          );
          return;
        }

        setVersionMessage(
          data.message ||
            "New version uploaded successfully"
        );

        await loadContents(
          currentFolder ? currentFolder.id : null
        );
        await loadStorageStats();

        const versionsResponse = await fetch(
          `${API_URL}/api/files/${versionTarget.id}/versions`,
          {
            credentials: "include",
          }
        );

        if (versionsResponse.ok) {
          const versionsData =
            await versionsResponse.json();

          setFileVersions(
            versionsData.versions || []
          );
        }

        loadActivities();
      } catch (error) {
        console.error(
          "Upload new version failed:",
          error
        );
        setVersionMessage("Unable to connect to server");
      } finally {
        setVersionUploading(false);
      }
    };

    input.click();
  };

  const downloadFileVersion = async (
    version
  ) => {
    if (!versionTarget) return;

    try {
      const response = await fetch(
        `${API_URL}/api/files/${versionTarget.id}/versions/${version.id}/download`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(
          () => ({})
        );

        setVersionMessage(
          data.error?.message ||
            "Unable to download version"
        );
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = versionTarget.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(
        "Download version failed:",
        error
      );
      setVersionMessage("Unable to download version");
    }
  };

  const restoreVersion = async (version) => {
    if (!versionTarget) return;

    const confirmed = window.confirm(
      `Restore Version ${version.version_number}?`
    );

    if (!confirmed) return;

    setVersionLoading(true);
    setVersionMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/files/${versionTarget.id}/versions/${version.id}/restore`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setVersionMessage(
          data.error?.message ||
            "Unable to restore version"
        );
        return;
      }

      setVersionMessage(
        data.message ||
          `Version ${version.version_number} restored successfully`
      );

      await loadContents(
        currentFolder ? currentFolder.id : null
      );
      await loadStorageStats();

      const versionsResponse = await fetch(
        `${API_URL}/api/files/${versionTarget.id}/versions`,
        {
          credentials: "include",
        }
      );

      if (versionsResponse.ok) {
        const versionsData =
          await versionsResponse.json();

        setFileVersions(
          versionsData.versions || []
        );
      }

      loadActivities();
    } catch (error) {
      console.error(
        "Restore version failed:",
        error
      );
      setVersionMessage("Unable to connect to server");
    } finally {
      setVersionLoading(false);
    }
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
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

  const ownerOptions = Array.from(
    new Map(
      files.map((file) => {
        const ownerId = String(file.owner_id || user?.id || "current");
        const ownerLabel =
          file.owner_name ||
          file.owner_email ||
          user?.name ||
          user?.email ||
          "Current user";
        return [ownerId, { id: ownerId, label: ownerLabel }];
      })
    ).values()
  );

  const activeFilterCount =
    (fileTypeFilter !== "all" ? 1 : 0) +
    (ownerFilter !== "all" ? 1 : 0);

  const clearAdvancedFilters = () => {
    setFileTypeFilter("all");
    setOwnerFilter("all");
  };

  const filteredFolders = sortItems(
    folders.filter((folder) => {
      const matchesSearch = folder.name
        .toLowerCase()
        .includes(normalizedSearch);
      const matchesOwner =
        ownerFilter === "all" ||
        String(folder.owner_id || user?.id || "current") === ownerFilter;
      return matchesSearch && matchesOwner;
    }),
    sortOption
  );

  const filteredFiles = sortItems(
    files.filter((file) => {
      const matchesSearch = file.name
        .toLowerCase()
        .includes(normalizedSearch);
      const matchesType =
        fileTypeFilter === "all" ||
        getAdvancedFileType(file) === fileTypeFilter;
      const matchesOwner =
        ownerFilter === "all" ||
        String(file.owner_id || user?.id || "current") === ownerFilter;
      return matchesSearch && matchesType && matchesOwner;
    }),
    sortOption
  );

  const visibleFiles = filteredFiles.slice(0, visibleFileCount);

  const openContextMenu = (event, item, type) => {
    event.preventDefault(); event.stopPropagation();
    setContextMenu({ x: Math.min(event.clientX, window.innerWidth - 220), y: Math.min(event.clientY, window.innerHeight - 250), item, type });
  };

  const addFileTag = (fileId) => {
    const tag = tagInput.trim();
    if (!tag) return;
    setFileTags((current) => ({ ...current, [fileId]: Array.from(new Set([...(current[fileId] || []), tag])).slice(0, 8) }));
    setTagInput(""); setTagEditor(null);
  };

  const removeFileTag = (fileId, tag) => {
    setFileTags((current) => ({ ...current, [fileId]: (current[fileId] || []).filter((item) => item !== tag) }));
  };

  const loadMoreFiles = () => setVisibleFileCount((count) => Math.min(count + 20, filteredFiles.length));

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

  const filteredRecentFiles = sortItems(
    recentFiles.filter((file) =>
      file.name
        ?.toLowerCase()
        .includes(searchQuery.trim().toLowerCase())
    ),
    sortOption
  );

  return (
    <main className="dashboard">
      <header className="mobile-header">
        <button
          type="button"
          className={`mobile-menu-button ${mobileMenuOpen ? "open" : ""}`}
          onClick={() => setMobileMenuOpen((previous) => !previous)}
          aria-label="Open navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className="mobile-brand">
          <div className="brand-icon">
            <CloudIcon />
          </div>
          <strong>Cloud Drive</strong>
        </div>

        <div className="mobile-profile">
          <div className="avatar">
            {user.name?.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      <aside className={`sidebar ${mobileMenuOpen ? "mobile-open" : ""}`}>
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
          onClick={() => { openDashboard(); closeMobileMenu(); }}
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
          onClick={() => { openMyFiles(); closeMobileMenu(); }}
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
          onClick={() => { openSharedWithMe(); closeMobileMenu(); }}
        >
          <UsersIcon size={18} />
          <span>Shared with me</span>
        </button>

        <button
          className={`sidebar-item ${
            activeView === "recent"
              ? "active"
              : ""
          }`}
          onClick={() => { openRecent(); closeMobileMenu(); }}
        >
          <ClockIcon size={18} />
          <span>Recent</span>
        </button>

        

        <button
          className={`sidebar-item ${
            activeView === "starred"
              ? "active"
              : ""
          }`}
          onClick={() => { openStarred(); closeMobileMenu(); }}
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
          onClick={() => { openActivity(); closeMobileMenu(); }}
        >
          <ActivityIcon size={18} />
          <span>Activity</span>
        </button>

        <button
          className={`sidebar-item ${
            activeView === "trash"
              ? "active"
              : ""
          }`}
          onClick={() => { openTrash(); closeMobileMenu(); }}
        >
          <TrashIcon size={18} />
          <span>Trash</span>
        </button>

        <button
          className="theme-toggle"
          onClick={() => { setTheme(theme === "dark" ? "light" : "dark"); closeMobileMenu(); }}
          aria-label="Toggle theme"
        >
          <span className="theme-toggle-icon">{theme === "dark" ? "☀" : "☾"}</span>
          <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>

        <button
          className="sidebar-item"
          onClick={() => { setShowLogoutConfirm(true); closeMobileMenu(); }}
        >
          <LogoutIcon size={18} />
          <span>Logout</span>
        </button>
      </aside>

      <section
        className="content"
        onDragEnter={activeView === "my-files" ? handleDragEnter : undefined}
        onDragOver={activeView === "my-files" ? handleDragOver : undefined}
        onDragLeave={activeView === "my-files" ? handleDragLeave : undefined}
        onDrop={activeView === "my-files" ? handleDrop : undefined}
      >
        {activeView === "my-files" && dragActive && !uploading && (
          <div className="file-drop-overlay" aria-hidden="true">
            <div className="file-drop-overlay-card">
              <UploadIcon size={30} />
              <strong>Drop files to upload</strong>
              <span>Release anywhere in My Files</span>
            </div>
          </div>
        )}
        {activeView === "dashboard" ? (
          <div className="home-dashboard">
            <header className="topbar dashboard-heading">
              <div>
                <h2>Dashboard</h2>
                <p>Welcome back. Everything you need to manage your cloud files.</p>
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
                <input
                  id="cloud-drive-upload"
                  type="file"
                  onChange={uploadFile}
                  disabled={uploading}
                  style={{ display: "none" }}
                />
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
                <strong>{uploading ? `Upload in progress — ${uploadProgress}%` : "No active transfers"}</strong>
                <span>{uploading ? "Uploading your file..." : "All transfers are complete"}</span>
              </div>
            </section>

            <section>
              <h3 className="dashboard-section-title">QUICK ACCESS</h3>
              <div className="quick-access-grid">
                <button className="quick-card" onClick={() => { openMyFiles(); closeMobileMenu(); }}>
                  <span className="quick-icon blue"><FolderIcon size={19} /></span>
                  <strong>Files</strong>
                  <small>Browse and manage files</small>
                </button>

                <button className="quick-card" onClick={() => { openSharedWithMe(); closeMobileMenu(); }}>
                  <span className="quick-icon cyan"><UsersIcon size={19} /></span>
                  <strong>Shared</strong>
                  <small>{sharedResources.length} shared items</small>
                </button>

                <button className="quick-card" onClick={() => { openStarred(); closeMobileMenu(); }}>
                  <span className="quick-icon purple"><StarIcon size={19} filled /></span>
                  <strong>Starred</strong>
                  <small>{starredResources.length} favorites</small>
                </button>

                <button className="quick-card" onClick={() => { openActivity(); closeMobileMenu(); }}>
                  <span className="quick-icon green"><ActivityIcon size={19} /></span>
                  <strong>Activity</strong>
                  <small>{activities.length} recent events</small>
                </button>
              </div>
            </section>

            <section>
              <div className="dashboard-section-heading">
                <h3 className="dashboard-section-title">RECENTLY VIEWED FOLDERS</h3>
                <button onClick={() => { openMyFiles(); closeMobileMenu(); }}>View all</button>
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
                <button onClick={() => { openMyFiles(); closeMobileMenu(); }}>View all</button>
              </div>

              <div className="dashboard-file-list">
                {recentFiles.slice(0, 5).map((file) => (
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
                {recentFiles.length === 0 && (
                  <div className="dashboard-empty-row">No files uploaded yet.</div>
                )}
              </div>
            </section>
          </div>
        ) : activeView === "activity" ? (
          <>
            <header className="topbar">
              <div>
                <h2>Activities</h2>
                <p>Recent activity on your Cloud Drive</p>
              </div>
            </header>

            {activitiesLoading ? (
              <div className="frontend-skeleton-list" aria-label="Loading activity">
    {Array.from({ length: 6 }).map((_, index) => (
      <div className="frontend-skeleton-row" key={index}>
        <span className="skeleton-box skeleton-icon" />
        <span className="skeleton-box skeleton-line wide" />
        <span className="skeleton-box skeleton-line short" />
      </div>
    ))}
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
        ) : activeView === "trash" ? (
          <>
            <header className="topbar">
              <div>
                <h2>Trash</h2>
                <p>Deleted items are permanently removed after 30 days.</p>
              </div>
            </header>

            {trashLoading ? (
              <div className="frontend-skeleton-list" aria-label="Loading activity">
    {Array.from({ length: 6 }).map((_, index) => (
      <div className="frontend-skeleton-row" key={index}>
        <span className="skeleton-box skeleton-icon" />
        <span className="skeleton-box skeleton-line wide" />
        <span className="skeleton-box skeleton-line short" />
      </div>
    ))}
  </div>
            ) : trashFiles.length === 0 && trashFolders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <TrashIcon size={48} />
                </div>
                <h3>Trash is empty</h3>
                <p>Deleted files and folders will appear here.</p>
              </div>
            ) : (
              <div className="trash-page">
                <div className="trash-retention-banner">
                  <TrashIcon size={16} />
                  <span>Items stay in Trash for 30 days before permanent deletion.</span>
                </div>

                {trashFolders.length > 0 && (
                  <section className="trash-section">
                    <div className="trash-section-title">Folders</div>
                    <div className="trash-list">
                      {trashFolders.map((folder) => {
                        const daysLeft = getTrashDaysLeft(folder.updated_at);
                        return (
                          <div className="trash-row" key={`folder-${folder.id}`}>
                            <div className="trash-item-icon"><FolderIcon size={24} /></div>
                            <div className="trash-item-info">
                              <strong>{folder.name}</strong>
                              <span>Deleted {folder.updated_at ? new Date(folder.updated_at).toLocaleDateString() : "recently"}</span>
                            </div>
                            <div className="trash-expiry">{daysLeft} day{daysLeft === 1 ? "" : "s"} left</div>
                            <button type="button" className="file-action trash-restore-button" onClick={() => restoreTrashFolder(folder)}>Restore</button>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {trashFiles.length > 0 && (
                  <section className="trash-section">
                    <div className="trash-section-title">Files</div>
                    <div className="trash-list">
                      {trashFiles.map((file) => {
                        const daysLeft = getTrashDaysLeft(file.updated_at);
                        return (
                          <div className="trash-row" key={`file-${file.id}`}>
                            <div className="trash-item-icon"><FileIcon fileName={file.name} size={28} /></div>
                            <div className="trash-item-info">
                              <strong>{file.name}</strong>
                              <span>{formatFileSize(file.size_bytes)} · Deleted {file.updated_at ? new Date(file.updated_at).toLocaleDateString() : "recently"}</span>
                            </div>
                            <div className="trash-expiry">{daysLeft} day{daysLeft === 1 ? "" : "s"} left</div>
                            <button type="button" className="file-action trash-restore-button" onClick={() => restoreTrashFile(file)}>Restore</button>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
            )}
          </>
        ) : activeView === "recent" ? (
          <>
            <header className="topbar">
              <div>
                <h2>Recent</h2>
                <p>Your recently updated files</p>
              </div>
            </header>

            <div className="search-bar">
              <SearchIcon size={18} />

              <input
                type="text"
                placeholder="Search recent files..."
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(e.target.value)
                }
              />

              <select
                className="sort-select"
                value={sortOption}
                onChange={(e) =>
                  setSortOption(e.target.value)
                }
                aria-label="Sort recent files"
              >
                <option value="name-asc">Name A–Z</option>
                <option value="name-desc">Name Z–A</option>
                <option value="date-desc">Newest first</option>
                <option value="date-asc">Oldest first</option>
                <option value="size-desc">Largest first</option>
                <option value="size-asc">Smallest first</option>
              </select>

              <div className="view-toggle" role="group" aria-label="View mode">
                <button
                  type="button"
                  className={`view-toggle-button ${viewMode === "list" ? "active" : ""}`}
                  onClick={() => setViewMode("list")}
                  aria-label="List view"
                  title="List view"
                >
                  ☷
                </button>
                <button
                  type="button"
                  className={`view-toggle-button ${viewMode === "grid" ? "active" : ""}`}
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                  title="Grid view"
                >
                  ▦
                </button>
              </div>

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="clear-search"
                >
                  ×
                </button>
              )}
            </div>

            {recentLoading ? (
  <div className="frontend-skeleton-list recent-skeleton" aria-label="Loading recent files">
    {Array.from({ length: 5 }).map((_, index) => (
      <div className="frontend-skeleton-row" key={index}>
        <span className="skeleton-box skeleton-icon" />
        <span className="skeleton-box skeleton-line wide" />
        <span className="skeleton-box skeleton-line short" />
      </div>
    ))}
  </div>
) : (
              <div className="file-area">
                {filteredRecentFiles.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <ClockIcon size={48} />
                    </div>

                    <h3>
                      {searchQuery
                        ? "No results found"
                        : "No recent files"}
                    </h3>

                    <p>
                      {searchQuery
                        ? `Nothing matches "${searchQuery}"`
                        : "Files you recently update will appear here."}
                    </p>
                  </div>
                ) : (
                  <section>
                    <h3 className="section-title">
                      Recent files
                    </h3>

                    <div
                      className={`items-list mobile-actions-list ${viewMode === "grid" ? "grid-view" : ""}`}
                      style={
                        viewMode === "grid"
                          ? { overflow: "visible" }
                          : undefined
                      }
                    >
                      {filteredRecentFiles.map((file) => (
                        <div
                          className={`file-row shared-resource-row ${viewMode === "grid" ? "grid-view-item" : ""}`}
                          key={file.id}
                          style={
                            viewMode === "grid"
                              ? {
                                  position: "relative",
                                  overflow: "visible",
                                  zIndex:
                                    recentGridMenuOpen === file.id
                                      ? 1000
                                      : 1,
                                }
                              : undefined
                          }
                        >
                          <div className="file-icon">
                            <FileIcon fileName={file.name} />
                          </div>

                          <div className="file-info">
                            <strong>{file.name}</strong>

                            <span>
                              {formatFileSize(file.size_bytes)}
                              {" • "}
                              Updated{" "}
                              {new Date(
                                file.updated_at
                              ).toLocaleString()}
                            </span>
                          </div>

                          <details className="mobile-file-options">
                            <summary aria-label="File options">⋮</summary>
                            <div className="mobile-file-options-menu">
                              <button type="button" onClick={() => openDetails(file)}>ℹ️ Details</button>
                              <button type="button" onClick={() => previewFile(file)}><EyeIcon size={14} /> Preview</button>
                              <button type="button" onClick={() => downloadFile(file)}><DownloadIcon size={14} /> Download</button>
                              <button type="button" onClick={() => openVersionHistory(file)}>🕘 Versions</button>
                              <button type="button" onClick={() => openPublicLinkModal(file)}>🔗 Public Link</button>
                            </div>
                          </details>

                          {viewMode === "grid" ? (
                            <div
                              className="recent-grid-file-options-control"
                              style={{
                                position: "absolute",
                                top: "9px",
                                right: "9px",
                                zIndex: 1001,
                              }}
                            >
                              <button
                                type="button"
                                aria-label="File options"
                                aria-expanded={
                                  recentGridMenuOpen === file.id
                                }
                                onClick={() =>
                                  setRecentGridMenuOpen(
                                    recentGridMenuOpen === file.id
                                      ? null
                                      : file.id
                                  )
                                }
                                style={{
                                  width: "28px",
                                  height: "28px",
                                  padding: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  border: "1px solid #34404d",
                                  borderRadius: "7px",
                                  background: "#202832",
                                  color: "#cbd5e1",
                                  fontSize: "18px",
                                  fontWeight: 700,
                                  lineHeight: 1,
                                  cursor: "pointer",
                                }}
                              >
                                ⋮
                              </button>

                              {recentGridMenuOpen === file.id && (
                                <div
                                  className="recent-grid-file-options-menu"
                                  style={{
                                    position: "absolute",
                                    top: "33px",
                                    right: 0,
                                    width: "155px",
                                    padding: "5px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "2px",
                                    boxSizing: "border-box",
                                    background: "#1b222b",
                                    border: "1px solid #35404d",
                                    borderRadius: "9px",
                                    boxShadow:
                                      "0 12px 30px rgba(0,0,0,.35)",
                                    zIndex: 10000,
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRecentGridMenuOpen(null);
                                      openDetails(file);
                                    }}
                                    style={recentGridMenuButtonStyle}
                                  >
                                    ℹ️ Details
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRecentGridMenuOpen(null);
                                      previewFile(file);
                                    }}
                                    style={recentGridMenuButtonStyle}
                                  >
                                    <EyeIcon size={14} />
                                    Preview
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRecentGridMenuOpen(null);
                                      downloadFile(file);
                                    }}
                                    style={recentGridMenuButtonStyle}
                                  >
                                    <DownloadIcon size={14} />
                                    Download
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRecentGridMenuOpen(null);
                                      openVersionHistory(file);
                                    }}
                                    style={recentGridMenuButtonStyle}
                                  >
                                    🕘 Versions
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRecentGridMenuOpen(null);
                                      openPublicLinkModal(file);
                                    }}
                                    style={recentGridMenuButtonStyle}
                                  >
                                    🔗 Public Link
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <details className="recent-desktop-file-options">
                              <summary aria-label="File options">
                                ⋮
                              </summary>

                              <div className="desktop-file-options-menu">
                                <button
                                  type="button"
                                  onClick={() => openDetails(file)}
                                >
                                  ℹ️
                                  <span>Details</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => previewFile(file)}
                                >
                                  <EyeIcon size={14} />
                                  <span>Preview</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => downloadFile(file)}
                                >
                                  <DownloadIcon size={14} />
                                  <span>Download</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openVersionHistory(file)}
                                >
                                  🕘
                                  <span>Versions</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openPublicLinkModal(file)}
                                >
                                  🔗
                                  <span>Public Link</span>
                                </button>
                              </div>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
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
  <div className="frontend-skeleton-list" aria-label="Loading starred items">
    {Array.from({ length: 5 }).map((_, index) => (
      <div className="frontend-skeleton-row" key={index}>
        <span className="skeleton-box skeleton-icon" />
        <span className="skeleton-box skeleton-line wide" />
        <span className="skeleton-box skeleton-line short" />
      </div>
    ))}
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

                    <div className={`items-list mobile-actions-list ${viewMode === "grid" ? "grid-view" : ""}`}>
                      {filteredStarredFiles.map(
                        (file) => {
                          const key = `file-${file.resource_id}`;

                          return (
                            <div
                              className={`file-row ${viewMode === "grid" ? "grid-view-item" : ""}`}
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

                              <details className="starred-desktop-file-options">
                                <summary aria-label="File options">⋮</summary>
                                <div className="desktop-file-options-menu">
                                  <button type="button" onClick={() => openDetails({ id: file.resource_id, name: file.name, size_bytes: file.size_bytes })}>ℹ️ <span>Details</span></button>
                                  <button type="button" onClick={() => previewFile({ id: file.resource_id, name: file.name, size_bytes: file.size_bytes })}><EyeIcon size={14} /> <span>Preview</span></button>
                                  <button type="button" onClick={() => downloadFile({ id: file.resource_id, name: file.name })}><DownloadIcon size={14} /> <span>Download</span></button>
                                  <button type="button" onClick={() => openVersionHistory({ id: file.resource_id, name: file.name, size_bytes: file.size_bytes })}>🕘 <span>Versions</span></button>
                                  <button type="button" onClick={() => openPublicLinkModal(file)}>🔗 <span>Public Link</span></button>
                                  <button type="button" onClick={() => toggleStar("file", file.resource_id)} disabled={starLoading[key]}><StarIcon size={14} filled /> <span>{starLoading[key] ? "..." : "Unstar"}</span></button>
                                </div>
                              </details>

                              <details className="mobile-file-options">
                                <summary aria-label="File options">⋮</summary>
                                <div className="mobile-file-options-menu">
                                  <button type="button" onClick={() => previewFile({ id: file.resource_id, name: file.name, size_bytes: file.size_bytes })}><EyeIcon size={14} /> Preview</button>
                                  <button type="button" onClick={() => downloadFile({ id: file.resource_id, name: file.name })}><DownloadIcon size={14} /> Download</button>
                                  <button type="button" onClick={() => openPublicLinkModal(file)}>🔗 Public Link</button>
                                  <button type="button" onClick={() => openVersionHistory({ id: file.resource_id, name: file.name, size_bytes: file.size_bytes })}>🕘 Versions</button>
                                  <button type="button" onClick={() => toggleStar("file", file.resource_id)} disabled={starLoading[key]}>
                                    <StarIcon size={14} filled />
                                    {starLoading[key] ? "..." : "Unstar"}
                                  </button>
                                </div>
                              </details>

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
                                  openVersionHistory({
                                    id: file.resource_id,
                                    name: file.name,
                                    size_bytes: file.size_bytes,
                                  })
                                }
                              >
                                🕘
                                Versions
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
                   <div className="frontend-skeleton-list" aria-label="Loading shared items">
    {Array.from({ length: 5 }).map((_, index) => (
      <div className="frontend-skeleton-row" key={index}>
        <span className="skeleton-box skeleton-icon" />
        <span className="skeleton-box skeleton-line wide" />
        <span className="skeleton-box skeleton-line short" />
      </div>
    ))}
  </div>
                ) : filteredSharedResources.length > 0 ? (
                  <section className="shared-items-section">
                    <h3 className="section-title">
                      Shared items
                    </h3>

                    <div className={`items-list ${viewMode === "grid" ? "grid-view" : ""}`}>
                      {filteredSharedResources.map(
                        (resource) => (
                          <div
                            className={`file-row ${viewMode === "grid" ? "grid-view-item" : ""}`}
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

                            <div className="shared-owner shared-meta-box">
                              <span className="shared-owner-label">
                                Shared by
                              </span>

                              <span className="shared-owner-name">
                                {resource.owner_name ||
                                  resource.owner_email}
                              </span>
                            </div>

                            <div className={`shared-role shared-meta-box ${String(resource.role || "viewer").toLowerCase()}`}>
                              <span className="shared-role-label">Role</span>
                              <span className="shared-role-value">{resource.role || "viewer"}</span>
                            </div>

                            <details className="shared-desktop-file-options">
                              <summary aria-label="Shared item options">⋮</summary>
                              <div className="desktop-file-options-menu">
                                {resource.resource_type === "folder" ? (
                                  <button type="button" onClick={() => openSharedFolder(resource)}><FolderIcon size={14} /> <span>Open</span></button>
                                ) : (
                                  <>
                                    <button type="button" onClick={() => previewFile({ id: resource.resource_id, name: resource.resource_name, size_bytes: resource.size_bytes }, true)}><EyeIcon size={14} /> <span>Preview</span></button>
                                    <button type="button" onClick={() => downloadSharedFile({ id: resource.resource_id, name: resource.resource_name })}><DownloadIcon size={14} /> <span>Download</span></button>
                                  </>
                                )}
                                <button type="button" className="shared-remove-option" onClick={() => removeSharedResource(resource)}><TrashIcon size={14} /> <span>Remove</span></button>
                              </div>
                            </details>

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

                        <div className={`items-list ${viewMode === "grid" ? "grid-view" : ""}`}>
                          {filteredSharedFiles.map(
                            (file) => (
                              <div
                                className={`file-row ${viewMode === "grid" ? "grid-view-item" : ""}`}
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

            <div
              className={`upload-dropzone ${dragActive ? "active" : ""} ${uploading ? "uploading" : ""}`}
              onDragEnter={handleDragOver}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (!uploading) {
                  document.getElementById("cloud-drive-upload-inline")?.click();
                }
              }}
              onKeyDown={(e) => {
                if (!uploading && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  document.getElementById("cloud-drive-upload-inline")?.click();
                }
              }}
            >
              <UploadIcon size={20} />
              <div className="upload-dropzone-copy">
                <strong>{uploading ? `Uploading... ${uploadProgress}%` : "Drag & drop files here"}</strong>
                <span>{uploading ? "Please wait while the file uploads" : "Drop one or more files here, or click to choose"}</span>
              </div>
              {uploading && (
                <div className="upload-progress-track">
                  <div
                    className="upload-progress-fill"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
              <input
                id="cloud-drive-upload-inline"
                type="file"
                multiple
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []).filter(Boolean);
                  if (!files.length || uploading) {
                    e.target.value = "";
                    return;
                  }

                  try {
                    for (const file of files) {
                      await uploadSelectedFile(file);
                    }
                  } catch (error) {
                    console.error("Inline upload failed:", error);
                  } finally {
                    e.target.value = "";
                  }
                }}
                disabled={uploading}
                style={{ display: "none" }}
              />
            </div>

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

              <button
                type="button"
                className={`advanced-filter-button ${filterOpen || activeFilterCount ? "active" : ""}`}
                onClick={() => setFilterOpen((value) => !value)}
                aria-expanded={filterOpen}
              >
                Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </button>

              <select
                className="sort-select"
                value={sortOption}
                onChange={(e) =>
                  setSortOption(e.target.value)
                }
                aria-label="Sort files"
              >
                <option value="name-asc">Name A–Z</option>
                <option value="name-desc">Name Z–A</option>
                <option value="date-desc">Newest first</option>
                <option value="date-asc">Oldest first</option>
                <option value="size-desc">Largest first</option>
                <option value="size-asc">Smallest first</option>
              </select>

              <div className="view-toggle" role="group" aria-label="View mode">
                <button
                  type="button"
                  className={`view-toggle-button ${viewMode === "list" ? "active" : ""}`}
                  onClick={() => setViewMode("list")}
                  aria-label="List view"
                  title="List view"
                >
                  ☷
                </button>
                <button
                  type="button"
                  className={`view-toggle-button ${viewMode === "grid" ? "active" : ""}`}
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                  title="Grid view"
                >
                  ▦
                </button>
              </div>

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="clear-search"
                >
                  ×
                </button>
              )}
            </div>

            {filterOpen && (
              <div className="advanced-filter-panel">
                <div className="advanced-filter-field">
                  <label htmlFor="file-type-filter">File type</label>
                  <select
                    id="file-type-filter"
                    value={fileTypeFilter}
                    onChange={(e) => setFileTypeFilter(e.target.value)}
                  >
                    <option value="all">All types</option>
                    <option value="image">Images</option>
                    <option value="pdf">PDF</option>
                    <option value="document">Documents</option>
                    <option value="presentation">Presentations</option>
                    <option value="spreadsheet">Spreadsheets</option>
                    <option value="video">Videos</option>
                    <option value="audio">Audio</option>
                    <option value="text">Text</option>
                    <option value="archive">Archives</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="advanced-filter-field">
                  <label htmlFor="owner-filter">Owner</label>
                  <select
                    id="owner-filter"
                    value={ownerFilter}
                    onChange={(e) => setOwnerFilter(e.target.value)}
                  >
                    <option value="all">All owners</option>
                    {ownerOptions.map((owner) => (
                      <option key={owner.id} value={owner.id}>
                        {owner.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  className="advanced-filter-clear"
                  onClick={clearAdvancedFilters}
                  disabled={!activeFilterCount}
                >
                  Clear filters
                </button>
              </div>
            )}

            {filteredFiles.length > 0 && (
              <div className="bulk-actions-toolbar">
                <label className="bulk-select-toggle">
                  <input
                    type="checkbox"
                    checked={
                      filteredFiles.length > 0 &&
                      filteredFiles.every((file) =>
                        selectedFileIds.includes(file.id)
                      )
                    }
                    onChange={toggleSelectAllFiles}
                  />
                  <span>
                    {selectedFileIds.length > 0
                      ? `${selectedFileIds.length} selected`
                      : "Select files"}
                  </span>
                </label>

                {selectedFileIds.length > 0 && (
                  <div className="bulk-action-buttons">
                    <button type="button" onClick={bulkDownloadFiles}>
                      Download
                    </button>
                    <button type="button" onClick={bulkStarFiles}>
                      Star
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={bulkDeleteFiles}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      className="clear"
                      onClick={clearFileSelection}
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            )}

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
              <div className="frontend-skeleton-list" aria-label="Loading files">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div className="frontend-skeleton-row" key={index}>
                    <span className="skeleton-box skeleton-icon" />
                    <span className="skeleton-box skeleton-line wide" />
                    <span className="skeleton-box skeleton-line short" />
                  </div>
                ))}
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
                             onContextMenu={(e) => openContextMenu(e, folder, "folder")}>
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

                    <div className={`items-list mobile-actions-list ${viewMode === "grid" ? "grid-view" : ""}`}>
                      {visibleFiles.map(
                        (file) => {
                          const starKey =
                            `file-${file.id}`;

                          return (
                            <div
                              className={`file-row ${viewMode === "grid" ? "grid-view-item" : ""}`}
                              key={file.id}
                             onContextMenu={(e) => openContextMenu(e, file, "file")}>
                              {renamingFile?.id === file.id ? (
                                <form className="rename-file-form" onSubmit={renameFile}>
                                  <div className="rename-file-label">Rename file</div>
                                  <input
                                    autoFocus
                                    type="text"
                                    value={renameFileValue}
                                    onChange={(e) => setRenameFileValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Escape") cancelRenameFile();
                                    }}
                                  />
                                  <div className="rename-file-actions">
                                    <button type="submit">Save</button>
                                    <button type="button" onClick={cancelRenameFile}>Cancel</button>
                                  </div>
                                </form>
                              ) : (
                              <>
                              <label className="file-select-checkbox">
                                <input
                                  type="checkbox"
                                  checked={selectedFileIds.includes(file.id)}
                                  onChange={() =>
                                    toggleFileSelection(file.id)
                                  }
                                  aria-label={`Select ${file.name}`}
                                />
                              </label>

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
                                {fileTags[file.id]?.length > 0 && (
                                  <div className="file-tags-inline">
                                    {fileTags[file.id].slice(0, 3).map((tag) => (
                                      <span className="file-tag" key={tag}>#{tag}</span>
                                    ))}
                                  </div>
                                )}

                              </div>

                              <details className="mobile-file-options">
                                <summary aria-label="File options">⋮</summary>
                                <div className="mobile-file-options-menu">
                                  <button type="button" onClick={() => startRenameFile(file)}><EditIcon size={14} /> Rename</button>
                                  <button type="button" onClick={() => openDetails(file)}>ℹ️ Details</button>
                                  <button type="button" onClick={() => previewFile(file)}><EyeIcon size={14} /> Preview</button>
                                  <button type="button" onClick={() => downloadFile(file)}><DownloadIcon size={14} /> Download</button>
                                  <button type="button" onClick={() => openShareModal("file", file)}><UsersIcon size={14} /> Share</button>
                                  <button type="button" onClick={() => openPublicLinkModal(file)}>🔗 Public Link</button>
                                  <button type="button" onClick={() => openVersionHistory(file)}>🕘 Versions</button>
                                  <button type="button" onClick={() => toggleStar("file", file.id)} disabled={starLoading[starKey]}>
                                    <StarIcon size={14} filled={isStarred("file", file.id)} />
                                    {starLoading[starKey] ? "..." : isStarred("file", file.id) ? "Unstar" : "Star"}
                                  </button>
                                  <button type="button" className="mobile-file-delete" onClick={() => deleteFile(file)}><TrashIcon size={14} /> Delete</button>
                                </div>
                              </details>

                              <details className="desktop-file-options">
                                <summary aria-label="File options">⋯</summary>
                                <div className="desktop-file-options-menu">
                                  <button type="button" onClick={() => openDetails(file)}>
                                    ℹ️ <span>Details</span>
                                  </button>
                                  <button type="button" onClick={() => startRenameFile(file)}>
                                    <EditIcon size={14} /> <span>Rename</span>
                                  </button>
                                  <button type="button" onClick={() => previewFile(file)}>
                                    <EyeIcon size={14} /> <span>Preview</span>
                                  </button>
                                  <button type="button" onClick={() => downloadFile(file)}>
                                    <DownloadIcon size={14} /> <span>Download</span>
                                  </button>
                                  <button type="button" onClick={() => openShareModal("file", file)}>
                                    <UsersIcon size={14} /> <span>Share</span>
                                  </button>
                                  <button type="button" onClick={() => openPublicLinkModal(file)}>
                                    🔗 <span>Public Link</span>
                                  </button>
                                  <button type="button" onClick={() => openVersionHistory(file)}>
                                    🕘 <span>Versions</span>
                                  </button>
                                  <button type="button" onClick={() => toggleStar("file", file.id)} disabled={starLoading[starKey]}>
                                    <StarIcon size={14} filled={isStarred("file", file.id)} />
                                    <span>{starLoading[starKey] ? "..." : isStarred("file", file.id) ? "Unstar" : "Star"}</span>
                                  </button>
                                  <button type="button" className="desktop-file-delete" onClick={() => deleteFile(file)}>
                                    <TrashIcon size={14} /> <span>Delete</span>
                                  </button>
                                </div>
                              </details>
                              </>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                    {visibleFileCount < filteredFiles.length && (
                      <div className="infinite-scroll-more">
                        <button type="button" onClick={loadMoreFiles}>Load more files</button>
                      </div>
                    )}
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

      {detailsTarget && (
        <div
          className="details-modal-overlay"
          onClick={closeDetails}
        >
          <div
            className="details-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="details-header">
              <div>
                <h2>File Details</h2>
                <p>{detailsTarget.name}</p>
              </div>

              <button
                type="button"
                className="preview-close"
                onClick={closeDetails}
              >
                ×
              </button>
            </div>

            <div className="details-content">
              <div className="details-file-icon">
                <FileIcon
                  fileName={detailsTarget.name}
                  size={42}
                />
              </div>

              <div className="details-grid">
                <div className="details-item details-item-wide">
                  <span>Name</span>
                  <strong>{detailsTarget.name}</strong>
                </div>

                <div className="details-item">
                  <span>Size</span>
                  <strong>{formatFileSize(detailsTarget.size_bytes)}</strong>
                </div>

                <div className="details-item">
                  <span>Type</span>
                  <strong>{detailsTarget.mime_type || getPreviewType(detailsTarget.name)}</strong>
                </div>

                <div className="details-item">
                  <span>Created</span>
                  <strong>
                    {detailsTarget.created_at
                      ? new Date(detailsTarget.created_at).toLocaleString()
                      : "—"}
                  </strong>
                </div>

                <div className="details-item">
                  <span>Updated</span>
                  <strong>
                    {detailsTarget.updated_at
                      ? new Date(detailsTarget.updated_at).toLocaleString()
                      : "—"}
                  </strong>
                </div>
              </div>

              <div className="share-modal-actions">
                <button
                  type="button"
                  className="file-action"
                  onClick={closeDetails}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {versionTarget && (
        <div
          className="version-history-overlay"
          onClick={closeVersionHistory}
        >
          <div
            className="version-history-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="share-modal-header">
              <div>
                <strong>Version History</strong>
                <span>{versionTarget.name}</span>
              </div>

              <button
                className="preview-close"
                onClick={closeVersionHistory}
                disabled={
                  versionLoading ||
                  versionUploading
                }
              >
                ×
              </button>
            </div>

            <div className="share-form">
              <button
                type="button"
                className="new-folder-button"
                onClick={uploadNewFileVersion}
                disabled={
                  versionLoading ||
                  versionUploading
                }
              >
                {versionUploading
                  ? "Uploading..."
                  : "Upload New Version"}
              </button>

              {versionMessage && (
                <p
                  className={`message ${
                    versionMessage
                      .toLowerCase()
                      .includes("success")
                      ? "success"
                      : "error"
                  }`}
                >
                  {versionMessage}
                </p>
              )}

              <label>
                Versions
              </label>

              {versionLoading ? (
                <div className="empty-state">
                  Loading version history...
                </div>
              ) : fileVersions.length === 0 ? (
                <div
                  style={{
                    padding: "18px",
                    border: "1px solid #ddd",
                    borderRadius: "10px",
                    textAlign: "center",
                  }}
                >
                  No archived versions yet.
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    maxHeight: "360px",
                    overflowY: "auto",
                  }}
                >
                  {fileVersions.map((version) => (
                    <div
                      key={version.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px",
                        border: "1px solid #ddd",
                        borderRadius: "10px",
                      }}
                    >
                      <div
                        style={{
                          width: "42px",
                          height: "42px",
                          borderRadius: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#f3f4f6",
                          fontWeight: "700",
                          flexShrink: 0,
                        }}
                      >
                        v{version.version_number}
                      </div>

                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <strong>
                          Version{" "}
                          {version.version_number}
                        </strong>

                        <span
                          style={{
                            display: "block",
                            marginTop: "4px",
                            fontSize: "12px",
                            color: "#666",
                          }}
                        >
                          {formatFileSize(
                            Number(
                              version.size_bytes
                            )
                          )}{" "}
                          ·{" "}
                          {new Date(
                            version.created_at
                          ).toLocaleString()}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          flexShrink: 0,
                        }}
                      >
                        <button
                          type="button"
                          className="file-action"
                          onClick={() =>
                            downloadFileVersion(
                              version
                            )
                          }
                          disabled={versionLoading}
                        >
                          Download
                        </button>

                        <button
                          type="button"
                          className="file-action"
                          onClick={() =>
                            restoreVersion(
                              version
                            )
                          }
                          disabled={versionLoading}
                        >
                          Restore
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {publicLinkTarget && (
        <div
          className="public-link-modal-overlay"
          onClick={closePublicLinkModal}
        >
          <div
            className="public-link-modal"
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
          className="preview-modal-overlay"
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
                  {formatFileSize(previewFileData.size_bytes)}
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
                <div className="constant-preview-placeholder">
                  <div className="constant-preview-icon">
                    <FileIcon
                      fileName={previewFileData.name}
                      size={64}
                    />
                  </div>
                  <h3>Loading Preview</h3>
                  <p>Preparing your file preview...</p>
                </div>
              ) : (
                previewUrl ||
                getPreviewType(previewFileData.name) === "text" ||
                getPreviewType(previewFileData.name) === "powerpoint"
              ) ? (
                <div className="constant-preview-viewer">
                  {getPreviewType(previewFileData.name) === "image" ? (
                    <img
                      src={previewUrl}
                      alt={previewFileData.name}
                      className="constant-preview-media"
                    />
                  ) : getPreviewType(previewFileData.name) === "pdf" ? (
                    <iframe
                      src={previewUrl}
                      title={previewFileData.name}
                      className="constant-preview-frame"
                    />
                  ) : getPreviewType(previewFileData.name) === "text" ? (
                    <pre className="constant-preview-text">
                      {previewText}
                    </pre>
                  ) : getPreviewType(previewFileData.name) === "powerpoint" ? (
                    <div className="pptx-preview-shell">
                      {previewPptxBuffer ? (
                        <PptxPreviewPane arrayBuffer={previewPptxBuffer} />
                      ) : (
                        <div className="constant-preview-placeholder">
                          <div className="constant-preview-icon">
                            <FileIcon fileName={previewFileData.name} size={64} />
                          </div>
                          <h3>Loading Presentation</h3>
                          <p>Preparing the PowerPoint preview...</p>
                        </div>
                      )}
                    </div>
                  ) : getPreviewType(previewFileData.name) === "video" ? (
                    <video
                      src={previewUrl}
                      controls
                      className="constant-preview-media"
                    />
                  ) : getPreviewType(previewFileData.name) === "audio" ? (
                    <div className="constant-preview-audio">
                      <div className="constant-preview-icon">
                        <FileIcon
                          fileName={previewFileData.name}
                          size={64}
                        />
                      </div>
                      <audio src={previewUrl} controls />
                    </div>
                  ) : (
                    <div className="constant-preview-placeholder">
                      <div className="constant-preview-icon">
                        <FileIcon
                          fileName={previewFileData.name}
                          size={64}
                        />
                      </div>
                      <h3>Preview Unavailable</h3>
                      <p>
                        This file type cannot be displayed in the browser.
                      </p>
                    </div>
                  )}

                  <div className="constant-preview-footer">
                    <div className="constant-preview-meta">
                      <span>{previewFileData.name}</span>
                      <span>
                        {formatFileSize(previewFileData.size_bytes)}
                      </span>
                    </div>

                    <button
                      className="file-action"
                      onClick={() =>
                        previewFileData.shared
                          ? downloadSharedFile(previewFileData)
                          : downloadFile(previewFileData)
                      }
                    >
                      <DownloadIcon size={15} />
                      Download File
                    </button>
                  </div>
                </div>
              ) : (
                <div className="constant-preview-placeholder">
                  <div className="constant-preview-icon">
                    <FileIcon
                      fileName={previewFileData.name}
                      size={64}
                    />
                  </div>
                  <h3>Preview Unavailable</h3>
                  <p>Unable to load this file preview.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {contextMenu && (
        <div className="frontend-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(e) => e.stopPropagation()}>
          {contextMenu.type === "file" ? (
            <>
              <button type="button" onClick={() => { setContextMenu(null); openDetails(contextMenu.item); }}>Details</button>
              <button type="button" onClick={() => { setContextMenu(null); previewFile(contextMenu.item); }}>Preview</button>
              <button type="button" onClick={() => { setContextMenu(null); startRenameFile(contextMenu.item); }}>Rename</button>
              <button type="button" onClick={() => { setContextMenu(null); openShareModal("file", contextMenu.item); }}>Share</button>
              <button type="button" onClick={() => { setTagEditor(contextMenu.item.id); setContextMenu(null); }}>Add label</button>
              <button type="button" className="danger" onClick={() => { setContextMenu(null); deleteFile(contextMenu.item); }}>Delete</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => { setContextMenu(null); openFolder(contextMenu.item); }}>Open</button>
              <button type="button" onClick={() => { setContextMenu(null); startRenameFolder(contextMenu.item); }}>Rename</button>
              <button type="button" onClick={() => { setContextMenu(null); openShareModal("folder", contextMenu.item); }}>Share</button>
              <button type="button" className="danger" onClick={() => { setContextMenu(null); deleteFolder(contextMenu.item); }}>Delete</button>
            </>
          )}
        </div>
      )}

      {tagEditor && (
        <div className="frontend-tag-popover" onClick={(e) => e.stopPropagation()}>
          <strong>Labels</strong>
          <input autoFocus value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addFileTag(tagEditor); if (e.key === "Escape") setTagEditor(null); }} placeholder="Add a label" />
          <div className="frontend-tag-list">
            {(fileTags[tagEditor] || []).map((tag) => <button type="button" key={tag} onClick={() => removeFileTag(tagEditor, tag)}>#{tag} ×</button>)}
          </div>
          <div className="frontend-tag-actions"><button type="button" onClick={() => setTagEditor(null)}>Cancel</button><button type="button" onClick={() => addFileTag(tagEditor)}>Add</button></div>
        </div>
      )}

      {shortcutHelpOpen && (
        <div className="frontend-modal-overlay" onClick={() => setShortcutHelpOpen(false)}>
          <div className="frontend-shortcuts-modal" onClick={(e) => e.stopPropagation()}>
            <div className="frontend-shortcuts-header"><strong>Keyboard shortcuts</strong><button type="button" onClick={() => setShortcutHelpOpen(false)}>×</button></div>
            <div className="shortcut-grid">
              <div><kbd>Ctrl/⌘ + A</kbd><span>Select all files</span></div>
              <div><kbd>Delete</kbd><span>Delete selected files</span></div>
              <div><kbd>Esc</kbd><span>Close menus/dialogs</span></div>
              <div><kbd>?</kbd><span>Show shortcuts</span></div>
            </div>
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="logout-confirm-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="logout-confirm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="logout-confirm-title">
            <div className="logout-confirm-icon"><LogoutIcon size={22} /></div>
            <h3 id="logout-confirm-title">Log out?</h3>
            <p>Are you sure you want to log out of your Cloud Drive account?</p>
            <div className="logout-confirm-actions">
              <button type="button" className="logout-cancel-button" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
              <button type="button" className="logout-confirm-button" onClick={async () => { setShowLogoutConfirm(false); await logout(); }}>Log out</button>
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
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
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

function ClockIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
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

function PptxPreviewPane({ arrayBuffer }) {
  const containerRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let viewer = null;

    const renderPresentation = async () => {
      setError("");

      if (!containerRef.current || !arrayBuffer) return;

      containerRef.current.innerHTML = "";

      try {
        const module = await import("pptx-preview");

        if (cancelled || !containerRef.current) return;

        const init = module.init || module.default?.init;

        if (typeof init !== "function") {
          throw new Error("PowerPoint preview library could not be loaded.");
        }

        viewer = init(containerRef.current, {
          width: 960,
          height: 540,
        });

        await viewer.preview(arrayBuffer);
      } catch (error) {
        console.error("PPTX preview failed:", error);
        if (!cancelled) {
          setError("This PowerPoint file could not be previewed.");
        }
      }
    };

    renderPresentation();

    return () => {
      cancelled = true;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      viewer = null;
    };
  }, [arrayBuffer]);

  if (error) {
    return (
      <div className="constant-preview-placeholder">
        <div className="constant-preview-icon">
          <FileIcon fileName="presentation.pptx" size={64} />
        </div>
        <h3>Preview Unavailable</h3>
        <p>{error}</p>
      </div>
    );
  }

  return <div ref={containerRef} className="pptx-preview-container" />;
}

function FileIcon({
  fileName,
  size = 32,
}) {
  const extension = getFileExtension(fileName);

  const extensionMap = {
    // Images
    jpg: { label: "JPG", color: "#38a169" },
    jpeg: { label: "JPEG", color: "#38a169" },
    png: { label: "PNG", color: "#1597d3" },
    gif: { label: "GIF", color: "#38a169" },
    webp: { label: "WEBP", color: "#38a169" },
    bmp: { label: "BMP", color: "#1597d3" },
    svg: { label: "SVG", color: "#1597d3" },
    ico: { label: "ICO", color: "#1597d3" },
    tif: { label: "TIF", color: "#38a169" },
    tiff: { label: "TIFF", color: "#38a169" },

    // Documents
    pdf: { label: "PDF", color: "#f28c28" },
    doc: { label: "DOC", color: "#1597d3" },
    docx: { label: "DOCX", color: "#1597d3" },
    odt: { label: "ODT", color: "#1597d3" },
    rtf: { label: "RTF", color: "#7fbf3f" },

    // Spreadsheets
    xls: { label: "XLS", color: "#4caf50" },
    xlsx: { label: "XLSX", color: "#4caf50" },
    csv: { label: "CSV", color: "#4caf50" },
    ods: { label: "ODS", color: "#4caf50" },

    // Presentations
    ppt: { label: "PPT", color: "#f28c28" },
    pptx: { label: "PPTX", color: "#f28c28" },
    odp: { label: "ODP", color: "#f28c28" },

    // Text / code
    txt: { label: "TXT", color: "#38a169" },
    md: { label: "MD", color: "#1597d3" },
    json: { label: "JSON", color: "#1597d3" },
    xml: { label: "XML", color: "#1597d3" },
    html: { label: "HTML", color: "#1597d3" },
    htm: { label: "HTM", color: "#1597d3" },
    css: { label: "CSS", color: "#1597d3" },
    js: { label: "JS", color: "#eab308" },
    jsx: { label: "JSX", color: "#1597d3" },
    ts: { label: "TS", color: "#1597d3" },
    tsx: { label: "TSX", color: "#1597d3" },
    java: { label: "JAVA", color: "#e58a25" },
    py: { label: "PY", color: "#4caf50" },
    c: { label: "C", color: "#1597d3" },
    cpp: { label: "CPP", color: "#1597d3" },
    h: { label: "H", color: "#1597d3" },
    hpp: { label: "HPP", color: "#1597d3" },
    php: { label: "PHP", color: "#e53e3e" },
    sql: { label: "SQL", color: "#1597d3" },

    // Archives
    zip: { label: "ZIP", color: "#1597d3" },
    rar: { label: "RAR", color: "#e58a25" },
    "7z": { label: "7Z", color: "#e58a25" },
    tar: { label: "TAR", color: "#e58a25" },
    gz: { label: "GZ", color: "#e58a25" },
    bz2: { label: "BZ2", color: "#e58a25" },

    // Audio
    mp3: { label: "MP3", color: "#c04ad9" },
    wav: { label: "WAV", color: "#c04ad9" },
    ogg: { label: "OGG", color: "#c04ad9" },
    m4a: { label: "M4A", color: "#c04ad9" },
    aac: { label: "AAC", color: "#c04ad9" },
    flac: { label: "FLAC", color: "#c04ad9" },

    // Video
    mp4: { label: "MP4", color: "#46a56b" },
    webm: { label: "WEBM", color: "#46a56b" },
    mov: { label: "MOV", color: "#46a56b" },
    avi: { label: "AVI", color: "#46a56b" },
    mkv: { label: "MKV", color: "#46a56b" },
    mpg: { label: "MPG", color: "#46a56b" },
    mpeg: { label: "MPEG", color: "#46a56b" },

    // Other common file types
    exe: { label: "EXE", color: "#7fbf3f" },
    dmg: { label: "DMG", color: "#e58a25" },
    eps: { label: "EPS", color: "#1597d3" },
    psd: { label: "PSD", color: "#e53e3e" },
    ai: { label: "AI", color: "#1597d3" },
    dwg: { label: "DWG", color: "#e53e3e" },
    cdr: { label: "CDR", color: "#e53e3e" },
    sys: { label: "SYS", color: "#e58a25" },
    rss: { label: "RSS", color: "#38a169" },
    ini: { label: "INI", color: "#e53e3e" },
    ps: { label: "PS", color: "#1597d3" },
    ace: { label: "ACE", color: "#1597d3" },
    aces: { label: "ACE", color: "#1597d3" },
  };

  const fallbackLabel = extension
    ? extension.slice(0, 5).toUpperCase()
    : "FILE";

  const config = extensionMap[extension] || {
    label: fallbackLabel,
    color: "#64748b",
  };

  return (
    <span
      className="cloud-file-icon"
      data-extension={extension || "file"}
      style={{
        "--cloud-file-accent": config.color,
        width: size,
        height: Math.round(size * 1.2),
      }}
      title={extension ? `${config.label} file` : "File"}
      aria-label={extension ? `${config.label} file` : "File"}
    >
      <svg
        viewBox="0 0 48 58"
        className="cloud-file-shape"
        aria-hidden="true"
      >
        <path
          d="M7 2.5h22.5L41 14v39.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-49a2 2 0 0 1 2-2Z"
          fill="#ffffff"
          stroke="#26313a"
          strokeWidth="1.5"
        />
        <path
          d="M29.5 2.5V12a2 2 0 0 0 2 2H41"
          fill="#eef2f4"
          stroke="#26313a"
          strokeWidth="1.5"
        />
        <path
          d="M29.5 2.5L41 14"
          fill="none"
          stroke="#26313a"
          strokeWidth="1.5"
        />

        <rect
          x="2.5"
          y="27"
          width="43"
          height="14"
          rx="2.5"
          fill="var(--cloud-file-accent)"
        />

        <text
          x="24"
          y="37.2"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="8"
          fontWeight="800"
          fontFamily="Arial, Helvetica, sans-serif"
          letterSpacing=".15"
        >
          {config.label}
        </text>
      </svg>
    </span>
  );
}

function getFileExtension(fileName) {
  return fileName
    .split(".")
    .pop()
    .toLowerCase();
}

function getAdvancedFileType(file) {
  const extension = getFileExtension(file?.name || "");
  const mime = (file?.mime_type || "").toLowerCase();

  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "ico", "tif", "tiff"].includes(extension)) return "image";
  if (mime === "application/pdf" || extension === "pdf") return "pdf";
  if (mime.includes("presentation") || ["ppt", "pptx", "odp"].includes(extension)) return "presentation";
  if (mime.includes("spreadsheet") || ["xls", "xlsx", "csv", "ods"].includes(extension)) return "spreadsheet";
  if (mime.includes("word") || mime.includes("document") || ["doc", "docx", "odt", "rtf"].includes(extension)) return "document";
  if (mime.startsWith("video/") || ["mp4", "webm", "ogg", "mov", "avi", "mkv"].includes(extension)) return "video";
  if (mime.startsWith("audio/") || ["mp3", "wav", "m4a", "aac", "flac", "oga"].includes(extension)) return "audio";
  if (mime.startsWith("text/") || ["txt", "md", "json", "xml", "html", "css", "js", "jsx", "ts", "tsx"].includes(extension)) return "text";
  if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(extension)) return "archive";
  return "other";
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

  if (["ppt", "pptx"].includes(extension)) {
    return "powerpoint";
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

function sortItems(items, option) {
  const sorted = [...items];

  sorted.sort((a, b) => {
    switch (option) {
      case "name-desc":
        return (b.name || "").localeCompare(a.name || "", undefined, {
          sensitivity: "base",
        });

      case "date-desc":
        return (
          new Date(b.updated_at || b.created_at || 0).getTime() -
          new Date(a.updated_at || a.created_at || 0).getTime()
        );

      case "date-asc":
        return (
          new Date(a.updated_at || a.created_at || 0).getTime() -
          new Date(b.updated_at || b.created_at || 0).getTime()
        );

      case "size-desc":
        return Number(b.size_bytes || 0) - Number(a.size_bytes || 0);

      case "size-asc":
        return Number(a.size_bytes || 0) - Number(b.size_bytes || 0);

      case "name-asc":
      default:
        return (a.name || "").localeCompare(b.name || "", undefined, {
          sensitivity: "base",
        });
    }
  });

  return sorted;
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