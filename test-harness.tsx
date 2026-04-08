// Inject testing mode
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App';
import { DataProvider } from './src/context/DataContext';

// We override the start to just bypass Import
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <DataProvider>
      <App />
    </DataProvider>
  </React.StrictMode>
);
