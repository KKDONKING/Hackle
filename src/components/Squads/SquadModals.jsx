import { useState } from "react";
import { createSquad, searchSquads, joinSquad } from "../../firebase/squadService";
import "./SquadModal.css";

const SquadModal = ({ userId, onClose, onSquadChange }) => {
  const [mode, setMode] = useState("create"); // "create" or "join"
  const [squadName, setSquadName] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState("");

  const handleCreateSquad = async () => {
    try {
      if (!squadName) return setError("Please enter a squad name.");
      const squadId = await createSquad(userId, squadName);
      onSquadChange(squadId);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSearchSquads = async () => {
    try {
      setError("");
      const results = await searchSquads(squadName);
      setSearchResults(results);
    } catch (err) {
      setError("Error searching squads.");
    }
  };

  const handleJoinSquad = async (squadId) => {
    try {
      await joinSquad(userId, squadId);
      onSquadChange(squadId);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-btn" onClick={onClose}>&times;</button>
        <h2>{mode === "create" ? "Create a Squad" : "Join a Squad"}</h2>

        {mode === "create" ? (
          <>
            <input
              type="text"
              placeholder="Enter Squad Name"
              value={squadName}
              onChange={(e) => setSquadName(e.target.value)}
            />
            {error && <p className="error-text">{error}</p>}
            <button onClick={handleCreateSquad}>Create Squad</button>
          </>
        ) : (
          <>
            <input
              type="text"
              placeholder="Search Squad by Name"
              value={squadName}
              onChange={(e) => setSquadName(e.target.value)}
            />
            <button onClick={handleSearchSquads}>Search</button>

            {searchResults.length > 0 && (
              <ul>
                {searchResults.map((squad) => (
                  <li key={squad.squadId}>
                    {squad.squadName} (ID: {squad.squadId})
                    <button onClick={() => handleJoinSquad(squad.squadId)}>Join</button>
                  </li>
                ))}
              </ul>
            )}

            {error && <p className="error-text">{error}</p>}
          </>
        )}

        <button onClick={() => setMode(mode === "create" ? "join" : "create")}>
          {mode === "create" ? "Switch to Join" : "Switch to Create"}
        </button>
      </div>
    </div>
  );
};

export default SquadModal;
