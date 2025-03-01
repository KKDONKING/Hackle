import React, { useState } from "react";
import "./SquadCard.css";

const SquadCard = ({ squad = null, user, onCreate, onLeave, onDelete }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newSquad, setNewSquad] = useState({ name: "", bio: "", image: "" });

    const isSquadOwner = squad && squad.ownerId === user.id;
    const isSquadMember = squad !== null;

    // Open and close modal
    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);

    // Handle squad creation form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        onCreate(newSquad);
        closeModal();
    };

    return (
        <div className="squad-card">
            {isSquadMember ? (
                <>
                    {squad.banner && <img src={squad.banner} alt="Squad Banner" className="squad-banner" />}
                    <img src={squad.image || "/default-profile.png"} alt="Squad" className="squad-image" />
                    <h2>{squad.name}</h2>
                    <p className="squad-bio">{squad.bio || "No bio available."}</p>

                    <div className="squad-members">
                        <h3>Members</h3>
                        {squad.members.length > 0 ? (
                            <ul>
                                {squad.members.map((member, index) => (
                                    <li key={index}>
                                        {member.name} <span>{member.rank}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>No members yet.</p>
                        )}
                    </div>

                    <div className="squad-actions">
                        {isSquadOwner ? (
                            <button className="delete-squad" onClick={onDelete}>Delete Squad</button>
                        ) : (
                            <button className="leave-squad" onClick={onLeave}>Leave Squad</button>
                        )}
                    </div>
                </>
            ) : (
                <div className="no-squad">
                    <h2>No Squad Found</h2>
                    <p>You are not part of any squad. Create one to get started!</p>
                    <button className="create-squad" onClick={openModal}>Create Squad</button>
                </div>
            )}

            {/* MODAL POPUP */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>Create Squad</h2>
                        <form onSubmit={handleSubmit}>
                            <label>Squad Name</label>
                            <input 
                                type="text" 
                                value={newSquad.name} 
                                onChange={(e) => setNewSquad({ ...newSquad, name: e.target.value })} 
                                required 
                            />

                            <label>Bio</label>
                            <textarea 
                                value={newSquad.bio} 
                                onChange={(e) => setNewSquad({ ...newSquad, bio: e.target.value })} 
                            />

                            <label>Squad Image (URL)</label>
                            <input 
                                type="text" 
                                value={newSquad.image} 
                                onChange={(e) => setNewSquad({ ...newSquad, image: e.target.value })} 
                            />

                            <button type="submit">Create</button>
                            <button type="button" onClick={closeModal}>Cancel</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SquadCard;
