"use client";

import { useState } from "react";
import { EditUsernameModal } from "@/components/profile/EditUsernameModal";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { mockCurrentUser } from "@/lib/mock/fixtures";

export default function ProfilePage() {
  const [username, setUsername] = useState(mockCurrentUser.username);
  const [editing, setEditing] = useState(false);

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
