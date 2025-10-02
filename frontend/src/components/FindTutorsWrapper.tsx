import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import FindTutors from '../pages/FindTutors';

const FindTutorsWrapper: React.FC = () => {
  const location = useLocation();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Force refresh when navigating to FindTutors
    const currentPath = location.pathname;
    const previousPath = sessionStorage.getItem('previousPath');
    
    console.log('🔄 FindTutorsWrapper: Path changed', { currentPath, previousPath });
    
    if (currentPath === '/tutors') {
      if (previousPath === '/messages') {
        console.log('🔄 Force refreshing FindTutors after Messages navigation');
        setRefreshKey(prev => prev + 1);
      }
      sessionStorage.setItem('previousPath', currentPath);
    } else if (currentPath === '/messages') {
      sessionStorage.setItem('previousPath', currentPath);
    }
  }, [location.pathname]);

  return <FindTutors key={refreshKey} />;
};

export default FindTutorsWrapper;
