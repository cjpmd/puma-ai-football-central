import DOMPurify from 'dompurify';

// Password strength validation
export const validatePasswordStrength = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for common weak passwords
  const commonPasswords = ['password123', '123456789', 'qwerty123'];
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    errors.push('Password contains common patterns that are not secure');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Email validation
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  if (email.length > 254) {
    return { isValid: false, error: 'Email is too long' };
  }

  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  return { isValid: true };
};

// Name validation
export const validateName = (name: string): { isValid: boolean; error?: string } => {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Name is required' };
  }

  if (name.length > 100) {
    return { isValid: false, error: 'Name is too long (maximum 100 characters)' };
  }

  // Check for suspicious patterns (potential XSS)
  if (/<[^>]*>/g.test(name) || /javascript:/i.test(name)) {
    return { isValid: false, error: 'Name contains invalid characters' };
  }

  return { isValid: true };
};

// Generic text sanitization (preserves spaces for typing, trim on submit)
export const sanitizeText = (text: string): string => {
  if (!text) return '';
  
  // Remove HTML tags and scripts
  const sanitized = DOMPurify.sanitize(text, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });

  // Additional cleanup for potential script injection
  // Note: Don't trim here - that should happen on form submit, not during typing
  return sanitized
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};

// HTML content sanitization (for rich text)
export const sanitizeHtml = (html: string): string => {
  if (!html) return '';
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['class']
  });
};

// Rate limiting helper (client-side)
export const isRateLimited = (key: string, limit: number, windowMs: number): boolean => {
  const now = Date.now();
  const windowKey = `${key}_${Math.floor(now / windowMs)}`;
  
  const attempts = parseInt(localStorage.getItem(windowKey) || '0');
  
  if (attempts >= limit) {
    return true;
  }

  localStorage.setItem(windowKey, (attempts + 1).toString());
  
  // Clean up old entries
  setTimeout(() => {
    localStorage.removeItem(windowKey);
  }, windowMs);

  return false;
};

// Input length validation
export const validateLength = (text: string, min: number = 0, max: number = 1000): { isValid: boolean; error?: string } => {
  if (text.length < min) {
    return { isValid: false, error: `Must be at least ${min} characters` };
  }

  if (text.length > max) {
    return { isValid: false, error: `Must be no more than ${max} characters` };
  }

  return { isValid: true };
};