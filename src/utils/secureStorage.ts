/**
 * Secure Storage Utility
 * 
 * This module provides a template for secure credential storage
 * using platform-specific secure storage mechanisms.
 * 
 * For production use:
 * - iOS: Uses Keychain
 * - Android: Uses Android Keystore
 * 
 * Install required package:
 * npm install react-native-keychain
 * or
 * yarn add react-native-keychain
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO: Replace with react-native-keychain for production
// import * as Keychain from 'react-native-keychain';

interface Credentials {
  username: string;
  password: string;
}

interface AuthToken {
  token: string;
  refreshToken?: string;
  expiresAt?: number;
}

class SecureStorageService {
  private static instance: SecureStorageService;

  private constructor() {}

  static getInstance(): SecureStorageService {
    if (!SecureStorageService.instance) {
      SecureStorageService.instance = new SecureStorageService();
    }
    return SecureStorageService.instance;
  }

  /**
   * Store authentication token securely
   * WARNING: Currently using AsyncStorage - NOT SECURE
   * TODO: Implement with react-native-keychain
   */
  async storeAuthToken(token: AuthToken): Promise<void> {
    // INSECURE - For development only
    console.warn('⚠️ Using AsyncStorage for tokens - NOT SECURE FOR PRODUCTION');
    await AsyncStorage.setItem('@auth/token', JSON.stringify(token));

    // SECURE - Production implementation:
    // await Keychain.setInternetCredentials(
    //   'com.nativevideos.api',
    //   'authToken',
    //   token.token
    // );
  }

  /**
   * Retrieve authentication token
   * WARNING: Currently using AsyncStorage - NOT SECURE
   * TODO: Implement with react-native-keychain
   */
  async getAuthToken(): Promise<AuthToken | null> {
    // INSECURE - For development only
    console.warn('⚠️ Using AsyncStorage for tokens - NOT SECURE FOR PRODUCTION');
    const tokenStr = await AsyncStorage.getItem('@auth/token');
    return tokenStr ? JSON.parse(tokenStr) : null;

    // SECURE - Production implementation:
    // const credentials = await Keychain.getInternetCredentials('com.nativevideos.api');
    // if (credentials) {
    //   return { token: credentials.password };
    // }
    // return null;
  }

  /**
   * Clear all stored authentication data
   */
  async clearAuthData(): Promise<void> {
    // INSECURE - For development only
    await AsyncStorage.removeItem('@auth/token');

    // SECURE - Production implementation:
    // await Keychain.resetInternetCredentials('com.nativevideos.api');
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: AuthToken): boolean {
    if (!token.expiresAt) return false;
    return Date.now() > token.expiresAt;
  }

  /**
   * Store user credentials (for biometric re-authentication)
   * WARNING: NEVER store actual passwords
   * This should only store a secure token after biometric verification
   */
  async storeBiometricToken(token: string): Promise<void> {
    // Production implementation with biometric protection:
    // await Keychain.setInternetCredentials(
    //   'com.nativevideos.biometric',
    //   'biometricToken',
    //   token,
    //   {
    //     accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
    //     accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    //   }
    // );
    
    console.warn('⚠️ Biometric storage not implemented - requires react-native-keychain');
  }
}

export const secureStorage = SecureStorageService.getInstance();

/**
 * Authentication API Service Template
 * 
 * This is a template for implementing secure authentication
 */
export class AuthenticationService {
  private static instance: AuthenticationService;
  private baseURL: string = 'https://api.example.com'; // TODO: Configure your API endpoint

  private constructor() {}

  static getInstance(): AuthenticationService {
    if (!AuthenticationService.instance) {
      AuthenticationService.instance = new AuthenticationService();
    }
    return AuthenticationService.instance;
  }

  /**
   * Authenticate user with backend API
   * TODO: Implement actual API call
   */
  async login(email: string, password: string): Promise<AuthToken> {
    // TODO: Implement secure API call
    // Example implementation:
    /*
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password, // Should be sent over HTTPS only
        }),
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const data = await response.json();
      const token: AuthToken = {
        token: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: Date.now() + (data.expiresIn * 1000),
      };

      // Store token securely
      await secureStorage.storeAuthToken(token);

      return token;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
    */

    // Mock implementation - REMOVE IN PRODUCTION
    console.error('⚠️ Using mock authentication - IMPLEMENT REAL API');
    const mockToken: AuthToken = {
      token: 'mock-token-' + Date.now(),
      expiresAt: Date.now() + (3600 * 1000), // 1 hour
    };
    await secureStorage.storeAuthToken(mockToken);
    return mockToken;
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<AuthToken> {
    const currentToken = await secureStorage.getAuthToken();
    if (!currentToken?.refreshToken) {
      throw new Error('No refresh token available');
    }

    // TODO: Implement API call to refresh token
    /*
    const response = await fetch(`${this.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken: currentToken.refreshToken,
      }),
    });

    // ... handle response and store new token
    */

    throw new Error('Token refresh not implemented');
  }

  /**
   * Logout user and clear stored credentials
   */
  async logout(): Promise<void> {
    const token = await secureStorage.getAuthToken();
    
    if (token) {
      // TODO: Call backend to invalidate token
      /*
      await fetch(`${this.baseURL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.token}`,
        },
      });
      */
    }

    // Clear local storage
    await secureStorage.clearAuthData();
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await secureStorage.getAuthToken();
    if (!token) return false;
    
    if (secureStorage.isTokenExpired(token)) {
      // Try to refresh token
      try {
        await this.refreshToken();
        return true;
      } catch {
        return false;
      }
    }
    
    return true;
  }
}

export const authService = AuthenticationService.getInstance();
