import React, { useState, useEffect } from 'react';
import { getSquadLeaderboard } from '../../firebase/leaderboardService';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import './TopSquads.css';
import defaultSquadImage from '../../assets/pfp.png';

const TopSquads = () => {
  const [topSquads, setTopSquads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTopSquads = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch top 5 squads from leaderboard
        const leaderboardSquads = await getSquadLeaderboard(5);
        console.log("Leaderboard squads:", leaderboardSquads);
        
        // Get complete squad data for each squad
        const completeSquads = await Promise.all(
          leaderboardSquads.map(async (squad) => {
            try {
              const squadId = squad.squadId || squad.id;
              if (!squadId) return squad;
              
              // Fetch full squad data from Firestore
              const squadDoc = await getDoc(doc(db, "squads", squadId));
              
              if (squadDoc.exists()) {
                const fullSquadData = squadDoc.data();
                console.log(`Full data for squad ${squad.squadName || squadId}:`, fullSquadData);
                
                // Ensure squad has a name
                const squadName = fullSquadData.squadName || fullSquadData.name || squad.squadName || "Unknown Squad";
                
                // Combine leaderboard data with complete squad data
                return {
                  ...squad,
                  ...fullSquadData,
                  squadName: squadName,
                  // Ensure rank is preserved from leaderboard data
                  rank: squad.rank
                };
              }
              return squad;
            } catch (err) {
              console.error(`Error fetching complete data for squad ${squad.squadName}:`, err);
              return squad;
            }
          })
        );
        
        console.log("Complete squads data:", completeSquads);
        setTopSquads(completeSquads);
      } catch (err) {
        console.error('Error fetching top squads:', err);
        setError('Failed to load top squads');
      } finally {
        setLoading(false);
      }
    };

    fetchTopSquads();
    
    // Refresh top squads every 5 minutes
    const interval = setInterval(fetchTopSquads, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Get rank medal
  const getRankMedal = (rank) => {
    return rank === 1 ? '🔥' : '';
  };

  // Helper function to get the correct squad icon
  const getSquadIcon = (squad) => {
    // Log all possible image fields for debugging
    console.log("Squad icon fields:", {
      image: squad.image,
      profileImage: squad.profileImage,
      avatar: squad.avatar,
      banner: squad.banner,
      squadImage: squad.squadImage,
      squadPicture: squad.squadPicture,
      picture: squad.picture
    });
    
    // Check for various possible image field names in order of likelihood
    return squad.image || 
           squad.profileImage || 
           squad.squadPicture ||
           squad.picture || 
           squad.banner || 
           squad.avatar || 
           squad.squadImage || 
           defaultSquadImage;
  };

  if (loading) {
    return (
      <div className="top-squads-container">
        <h2 className="top-squads-title">TOP SQUADS</h2>
        <div className="top-squads-loading">Loading top squads...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="top-squads-container">
        <h2 className="top-squads-title">TOP SQUADS</h2>
        <div className="top-squads-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="top-squads-container">
      <h2 className="top-squads-title">TOP SQUADS</h2>
      
      {topSquads.length === 0 ? (
        <div className="no-squads-message">No squads available yet</div>
      ) : (
        <div className="top-squads-list">
          {topSquads.map((squad) => (
            <div key={squad.squadId || squad.id} className="top-squad-card">
              <div className="squad-avatar">
                <img 
                  src={getSquadIcon(squad)}
                  alt={squad.squadName}
                  onError={(e) => {
                    console.log(`Image failed to load for ${squad.squadName}:`, e.target.src);
                    e.target.src = defaultSquadImage;
                    e.target.onerror = null;
                  }}
                />
              </div>
              <div className="squad-info">
                <h3 className="squad-name">{squad.squadName}</h3>
                <div className="squad-score">
                  <span className="score-value">{squad.totalScore || 0}</span>
                </div>
              </div>
              <div className="rank-medal">{getRankMedal(squad.rank)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TopSquads; 