import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthGate } from "../modules/auth/AuthGate";
import { LobbyPage } from "../modules/lobby/LobbyPage";
import { MatchPage } from "../modules/match/MatchPage";
import { CreateRoomPage } from "../modules/lobby/CreateRoomPage";
import { PrivateRoomPage } from "../modules/room/PrivateRoomPage";
import { ProfilePage } from "../modules/profile/ProfilePage";
import { StatsPage } from "../modules/stats/StatsPage";
import { ShopPage } from "../modules/shop/ShopPage";
import { SettingsPage } from "../modules/settings/SettingsPage";
import { Layout } from "../shared/ui/Layout";
import { ConnectionOverlay } from "../shared/ui/ConnectionOverlay";
import { RealtimeProvider } from "../shared/realtimeClient";

export const App: React.FC = () => {
  return (
    <RealtimeProvider>
      <Layout>
        <AuthGate>
          <Routes>
            <Route path="/" element={<LobbyPage />} />
            <Route path="/rooms/create" element={<CreateRoomPage />} />
            <Route path="/rooms/private/:roomId" element={<PrivateRoomPage />} />
            <Route path="/match/:matchId" element={<MatchPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthGate>
        <ConnectionOverlay />
      </Layout>
    </RealtimeProvider>
  );
};

