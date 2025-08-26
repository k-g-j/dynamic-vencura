import { apiService as api } from '../api';

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Token Management', () => {
    it('should store token in localStorage', () => {
      api.setToken('test-token');
      expect(localStorage.getItem('auth_token')).toBe('test-token');
    });

    it('should retrieve token from localStorage', () => {
      // Clear any cached token first
      api.clearToken();
      localStorage.setItem('auth_token', 'stored-token');
      const token = api.getToken();
      expect(token).toBe('stored-token');
    });

    it('should clear token from localStorage', () => {
      localStorage.setItem('auth_token', 'token-to-clear');
      api.clearToken();
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });
});