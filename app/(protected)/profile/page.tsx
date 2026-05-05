"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { Camera, KeyRound, Mail, ShieldCheck, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import { adminAuthApi } from "@/lib/api";
import { useAuth } from "@/context/auth";

const emptyPasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
};

export default function ProfilePage() {
  const { user, token, setSession } = useAuth();
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    phone: user?.phone || ""
  });
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const profileInsights = useMemo(
    () => [
      {
        label: "Role",
        value: user?.role === "superAdmin" ? "Super admin" : "Admin",
        detail: "Current dashboard access level",
        icon: ShieldCheck
      },
      {
        label: "Email",
        value: user?.email || "No email",
        detail: "Primary sign-in address",
        icon: Mail
      },
      {
        label: "Profile",
        value: user?.fullName || "Admin user",
        detail: "Account identity used across admin tools",
        icon: UserRound
      },
      {
        label: "Security",
        value: "Managed",
        detail: "Update password and account details here",
        icon: KeyRound
      }
    ],
    [user]
  );

  const syncSessionUser = (nextUser: typeof user) => {
    if (token && nextUser) {
      setSession(token, nextUser);
    }
  };

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProfile(true);

    try {
      const response = await adminAuthApi.updateProfile({
        fullName: profileForm.fullName,
        email: profileForm.email,
        phone: profileForm.phone
      });
      syncSessionUser(response.data);
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingPassword(true);

    try {
      await adminAuthApi.changePassword(passwordForm);
      setPasswordForm(emptyPasswordForm);
      toast.success("Password updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const response = await adminAuthApi.updateAvatar(file);
      if (user) {
        syncSessionUser({
          ...user,
          avatar: response.data.avatar
        });
      }
      toast.success("Profile image updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update profile image");
    } finally {
      event.target.value = "";
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="stack-lg">
      <section className="stats-grid">
        {profileInsights.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="panel stat-card metric-card">
              <div className="metric-card-head">
                <div className="metric-icon">
                  <Icon size={18} />
                </div>
                <span>{item.label}</span>
              </div>
              <strong>{item.value}</strong>
              <p className="mini-text">{item.detail}</p>
            </article>
          );
        })}
      </section>

      <div className="two-column-grid">
        <section className="panel stack-md">
          <div className="section-heading">
            <div>
              <h3>Profile</h3>
              <p>Manage your admin identity, contact information, and profile image.</p>
            </div>
          </div>

          <div className="editor-banner profile-banner">
            <div className="avatar-dot avatar-dot-large profile-avatar">
              {user?.avatar?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar.url} alt={user.fullName || "Admin"} className="profile-avatar-image" />
              ) : (
                user?.fullName?.charAt(0) || "A"
              )}
            </div>
            <div className="stack-sm">
              <div className="product-editor-mode-row">
                <strong>{user?.fullName || "Admin user"}</strong>
                <span className="pill pill-soft">{user?.role === "superAdmin" ? "Super admin" : "Admin"}</span>
              </div>
              <div className="mini-text">{user?.email || "No email configured"}</div>
              <label className="ghost-button profile-avatar-button">
                <Camera size={16} />
                <span>{uploadingAvatar ? "Uploading..." : "Update profile image"}</span>
                <input type="file" accept="image/*" onChange={uploadAvatar} hidden />
              </label>
            </div>
          </div>

          <form className="stack-md" onSubmit={submitProfile}>
            <div className="form-section">
              <div className="form-section-head">
                <h4>Profile details</h4>
                <p>Update the account identity shown across the admin workspace.</p>
              </div>
              <div className="stack-sm">
                <label className="field">
                  <span>Full name</span>
                  <input
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                    required
                  />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    required
                  />
                </label>
                <label className="field">
                  <span>Phone</span>
                  <input
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  />
                </label>
              </div>
            </div>

            <button className="primary-button" type="submit" disabled={savingProfile}>
              {savingProfile ? "Saving..." : "Update profile"}
            </button>
          </form>
        </section>

        <section className="panel stack-md">
          <div className="section-heading">
            <div>
              <h3>Security</h3>
              <p>Change your password and keep admin access secure.</p>
            </div>
          </div>

          <form className="stack-md" onSubmit={submitPassword}>
            <div className="form-section">
              <div className="form-section-head">
                <h4>Password</h4>
                <p>Use a strong password to protect this admin account.</p>
              </div>
              <div className="stack-sm">
                <label className="field">
                  <span>Current password</span>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>New password</span>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>Confirm password</span>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                    }
                    required
                  />
                </label>
              </div>
            </div>

            <button className="primary-button" type="submit" disabled={savingPassword}>
              {savingPassword ? "Updating..." : "Change password"}
            </button>
          </form>

          <div className="form-section">
            <div className="form-section-head">
              <h4>Admin access</h4>
              <p>Your current dashboard role and account state.</p>
            </div>
            <div className="stack-sm">
              <div className="profile-meta-row">
                <span>Role</span>
                <strong>{user?.role === "superAdmin" ? "Super admin" : "Admin"}</strong>
              </div>
              <div className="profile-meta-row">
                <span>Last login</span>
                <strong>{user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("en-IN") : "Secure session"}</strong>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
