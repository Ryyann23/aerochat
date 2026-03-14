import { useEffect, useState } from 'react';
import GroupChat from './pages/GroupChat';
import AuthPage from './pages/AuthPage';

const STORAGE_KEY = 'aerochat_user';

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const storedUser = window.localStorage.getItem(STORAGE_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  });

  useEffect(() => {
    if (currentUser) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
      return;
    }

    window.localStorage.removeItem(STORAGE_KEY);
  }, [currentUser]);

  if (!currentUser) {
    return <AuthPage onAuthenticated={setCurrentUser} />;
  }

  return (
    <GroupChat
      currentUser={currentUser}
      onLogout={() => setCurrentUser(null)}
      onCurrentUserChange={setCurrentUser}
    />
  );
}

export default App;
