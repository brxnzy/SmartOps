import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SIDEBAR_ITEMS from "../constants/navigation";
import useAuth from "./useAuth";

const useSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, userProfile, roleProfile, companyProfile, canAccess } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const visibleSidebarItems = useMemo(
    () =>
      SIDEBAR_ITEMS.flatMap((item) => {
        const visibleChildren = item.children?.filter(
          (child) => !child.permission || canAccess(child.permission)
        );

        if (visibleChildren?.length) {
          return [{ ...item, children: visibleChildren }];
        }

        if (!item.children?.length && (!item.permission || canAccess(item.permission))) {
          return [item];
        }

        return [];
      }),
    [canAccess]
  );
  const activePaths = useMemo(() => {
    const paths = new Set<string>();

    visibleSidebarItems.forEach((item) => {
      if (item.to) paths.add(item.to);
      item.children?.forEach((child) => paths.add(child.to));
    });

    return paths;
  }, [visibleSidebarItems]);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  const closeSidebar = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    setMobileOpen((current) => !current);
  }, []);

  const isGroupOpen = useCallback(
    (key: string, childPaths: string[]) => {
      if (openGroups[key] !== undefined) return openGroups[key];
      return childPaths.some((path) => location.pathname.startsWith(path));
    },
    [location.pathname, openGroups]
  );

  const toggleGroup = useCallback(
    (key: string, childPaths: string[]) => {
      setOpenGroups((current) => ({ ...current, [key]: !isGroupOpen(key, childPaths) }));
    },
    [isGroupOpen]
  );

  const handleLogout = useCallback(async () => {
    await logout();
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  return {
    mobileOpen,
    userProfile,
    roleProfile,
    companyProfile,
    visibleSidebarItems,
    activePaths,
    closeSidebar,
    toggleSidebar,
    isGroupOpen,
    toggleGroup,
    handleLogout,
  };
};

export default useSidebar;
