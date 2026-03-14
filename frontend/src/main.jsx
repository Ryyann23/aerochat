import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/layout.css';
import './styles/sidebar.css';
import './styles/chat.css';
import './styles/auth.css';
import './styles/profile.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
