import "./SquadPopup.css";

const SquadPopup = ({ squad, onClose }) => {
  return (
    <div className="squad-popup-overlay">
      <div className="squad-popup">
        <button className="close-btn" onClick={onClose}>&times;</button>

        <img src={squad.bannerURL || "/default-banner.jpg"} alt="Squad Banner" className="squad-banner" />
        <h2>{squad.squadName}</h2>
        <p><strong>Squad ID:</strong> {squad.squadId}</p>

        <div className="squad-members">
          <h3>Squad Members</h3>
          {Object.keys(squad.members)
            .filter(memberId => squad.members[memberId] === true)
            .map((memberId, index) => (
              <div key={memberId} className="member-item">
                {memberUsernames[memberId] || "Loading..."}
                {memberId === squad.ownerId && <span className="leader-badge">👑</span>}
              </div>
            ))}
        </div>

        {squad.leaderId === "user123" && ( // Replace with user.uid for real auth
          <button className="edit-btn">Edit Squad</button>
        )}
      </div>
    </div>
  );
};

export default SquadPopup;
