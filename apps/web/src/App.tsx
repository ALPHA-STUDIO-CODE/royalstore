import type { JSX } from 'react';

import { useApiHealth } from './useApiHealth';

export default function App(): JSX.Element {
  const apiStatus = useApiHealth();

  return (
    <main>
      <h1>Royal Store</h1>
      <p role="status">API status: {apiStatus}</p>
    </main>
  );
}
