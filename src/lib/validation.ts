// Input validation and sanitization utilities for security

/**
 * Sanitizes user input to prevent XSS attacks
 */
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    // Remove potentially dangerous characters
    .replace(/[<>\"'&]/g, '')
    // Limit length to prevent abuse
    .slice(0, 255);
};

/**
 * Validates username format and content
 */
export const validateUsername = (username: string): { isValid: boolean; error?: string } => {
  const sanitized = sanitizeInput(username);
  
  if (!sanitized) {
    return { isValid: false, error: "Le nom d'utilisateur est requis" };
  }
  
  if (sanitized.length < 2) {
    return { isValid: false, error: "Le nom d'utilisateur doit contenir au moins 2 caractères" };
  }
  
  if (sanitized.length > 50) {
    return { isValid: false, error: "Le nom d'utilisateur ne peut pas dépasser 50 caractères" };
  }
  
  // Only allow alphanumeric characters, dots, underscores, and hyphens
  if (!/^[a-zA-Z0-9._-]+$/.test(sanitized)) {
    return { isValid: false, error: "Le nom d'utilisateur ne peut contenir que des lettres, chiffres, points, tirets et underscores" };
  }
  
  return { isValid: true };
};

/**
 * Validates email format
 */
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  const sanitized = sanitizeInput(email);
  
  if (!sanitized) {
    return { isValid: false, error: "L'email est requis" };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    return { isValid: false, error: "Format d'email invalide" };
  }
  
  if (sanitized.length > 100) {
    return { isValid: false, error: "L'email ne peut pas dépasser 100 caractères" };
  }
  
  return { isValid: true };
};

/**
 * Validates password strength
 */
export const validatePassword = (password: string): { isValid: boolean; error?: string } => {
  if (!password) {
    return { isValid: false, error: "Le mot de passe est requis" };
  }
  
  if (password.length < 8) {
    return { isValid: false, error: "Le mot de passe doit contenir au moins 8 caractères" };
  }
  
  if (password.length > 128) {
    return { isValid: false, error: "Le mot de passe ne peut pas dépasser 128 caractères" };
  }
  
  // Check for at least one uppercase, one lowercase, one number
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return { isValid: false, error: "Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre" };
  }
  
  return { isValid: true };
};

/**
 * Sanitizes text content (descriptions, messages, etc.)
 */
export const sanitizeTextContent = (content: string, maxLength: number = 1000): string => {
  if (!content || typeof content !== 'string') return '';
  
  return content
    .trim()
    // Remove script tags and dangerous content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // Limit length
    .slice(0, maxLength);
};