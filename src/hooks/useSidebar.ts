import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SIDEBAR_ITEMS } from "../constants/navigation";
import useAuth from "./useAuth";

const useSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, userProfile, roleProfile, companyProfile, canAccess } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

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

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

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
    closeSidebar,
    toggleSidebar,
    handleLogout,
  };
};

export default useSidebar;
