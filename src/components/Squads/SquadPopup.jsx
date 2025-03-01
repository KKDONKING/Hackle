import "./SquadPopup.css";

const SquadPopup = ({ squad, onClose }) => {
  return (
    <div className="squad-popup-overlay">
      <div className="squad-popup">
        <button className="close-btn" onClick={onClose}>&times;</button>

        <img src={squad.bannerURL || "/default-banner.jpg"} alt="Squad Banner" className="squad-banner" />
        <h2>{squad.squadName}</h2>
        <p><strong>Squad ID:</strong> {squad.squadId}</p>

        <h3>Members:</h3>
        <ul>
          {squad.members.map((member, index) => (
            <li key={index}>{member}</li>
          ))}
        </ul>

        {squad.leaderId === "user123" && ( // Replace with user.uid for real auth
          <button className="edit-btn">Edit Squad</button>
        )}
      </div>
    </div>
  );
};

export default SquadPopup;
