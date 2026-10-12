import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { useStore } from './store/useStore';

vi.mock('./store/useStore', () => ({
  useStore: vi.fn((selector?: (state: any) => any) => {
    const state = {
      currentUser: null,
      isLoading: false,
      isInitialized: true,
      initializeAuth: () => () => undefined,
      toggleNotifications: vi.fn(),
    };

    return selector ? selector(state) : state;
  }),
}));

describe('App', () => {
  it('renders the landing page without crashing', () => {
    render(<App />);
    expect(screen.getByText(/Bem-vindo|Vizinho|Oferta|Fazer Login/i)).toBeInTheDocument();
  });
});
