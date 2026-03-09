import React from "react";
import { useParams } from "react-router-dom";

export const MatchPage: React.FC = () => {
  const { matchId } = useParams();
  return <div>Матч {matchId}. Здесь будет игровой стол.</div>;
};

