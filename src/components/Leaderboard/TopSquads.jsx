import React, { useState, useEffect } from 'react';
import { getSquadLeaderboard } from '../../firebase/leaderboardService';
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
        
        // Fetch top squads from leaderboard
        const squads = await getSquadLeaderboard(3);
        setTopSquads(squads);
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

  // Rank medal icons
  const getRankMedal = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return rank;
    }
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

  // Get the top squad
  const topSquad = topSquads.length > 0 ? topSquads[0] : null;

  return (
    <div className="top-squads-container">
      <h2 className="top-squads-title">TOP SQUADS</h2>
      
      {!topSquad ? (
        <div className="no-squads-message">No squads available yet</div>
      ) : (
        <div className="top-squad-card">
          <div className="squad-avatar">
            <img 
              src={topSquad.image || defaultSquadImage} 
              alt={topSquad.squadName}
              onError={(e) => {
                e.target.src = defaultSquadImage;
                e.target.onerror = null;
              }}
            />
          </div>
          <div className="squad-info">
            <h3 className="squad-name">{topSquad.squadName}</h3>
            <div className="squad-score">
              <span className="score-label">Score:</span>
              <span className="score-value">{topSquad.totalScore || 0}</span>
            </div>
          </div>
          <div className="rank-medal">{getRankMedal(topSquad.rank)}</div>
        </div>
      )}
    </div>
  );
};

export default TopSquads; 