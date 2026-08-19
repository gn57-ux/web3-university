"use client";

import { useState } from "react";
import { EditUsernameModal } from "@/components/profile/EditUsernameModal";
import { LoginRequiredGate } from "@/components/profile/LoginRequiredGate";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { mockCurrentUser } from "@/lib/mock/fixtures";
import { useWallet } from "@/lib/wallet/useWallet";

export default function ProfilePage() {
  const { connected, loading, login } = useWallet();
  const [username, setUsername] = useState(mockCurrentUser.username);
  const [editing, setEditing] = useState(false);

  // 门禁必须在渲染层面排除未登录内容（不渲染，而不是渲染后用 CSS 隐藏），避免
  // 未登录用户通过开发者工具短暂看到资料结构。
  if (!connected) {
    return (
      <div className="container-app py-stack-lg">
        <LoginRequiredGate loading={loading} onLogin={login} />
      </div>
    );
  }

  return (
    <div className="container-app py-stack-lg">
      <ProfileHeader username={username} onEditUsername={() => setEditing(true)} />
      <ProfileTabs />

      {editing && (
        <EditUsernameModal
          currentUsername={username}
          onCancel={() => setEditing(false)}
          onConfirm={(newUsername) => {
            setUsername(newUsername);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}
