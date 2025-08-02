import { supabase } from '@/integrations/supabase/client';
import { validateEmail, validatePasswordStrength, isRateLimited } from '@/utils/inputValidation';

export interface SecurityEvent {
  eventType: string;
  details?: Record<string, any>;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthValidationResult {
  isValid: boolean;
  errors: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export const securityService = {
  /**
   * Enhanced authentication input validation with security logging
   */
  async validateAuthInput(
    email?: string,
    password?: string,
    actionType: 'login' | 'signup' | 'password_change' = 'login'
  ): Promise<AuthValidationResult> {
    try {
      // Client-side rate limiting first
      const rateLimitKey = `auth_${actionType}`;
      const isLimited = isRateLimited(rateLimitKey, 5, 15 * 60 * 1000); // 5 attempts per 15 minutes
      
      if (isLimited) {
        await this.logSecurityEvent({
          eventType: 'RATE_LIMIT_EXCEEDED',
          details: { actionType, email: email?.substring(0, 3) + '***' },
          riskLevel: 'high'
        });
        
        return {
          isValid: false,
          errors: ['Too many attempts. Please wait 15 minutes before trying again.'],
          riskLevel: 'high'
        };
      }

      // Call database validation function if available
      const { data, error } = await supabase.rpc('validate_authentication_input', {
        email: email || null,
        password: password || null,
        action_type: actionType
      });

      if (error) {
        console.error('Database validation error:', error);
        
        // Fallback to client-side validation
        const errors: string[] = [];
        let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

        if (email) {
          const emailValidation = validateEmail(email);
          if (!emailValidation.isValid) {
            errors.push(emailValidation.error!);
            riskLevel = 'medium';
          }
        }

        if (password && (actionType === 'signup' || actionType === 'password_change')) {
          const passwordValidation = validatePasswordStrength(password);
          if (!passwordValidation.isValid) {
            errors.push(...passwordValidation.errors);
            riskLevel = 'medium';
          }
        }

        return {
          isValid: errors.length === 0,
          errors,
          riskLevel
        };
      }

      const validationResult = data as any;
      return {
        isValid: validationResult?.is_valid || false,
        errors: validationResult?.errors || [],
        riskLevel: validationResult?.risk_level || 'low'
      };

    } catch (error) {
      console.error('Auth validation error:', error);
      
      await this.logSecurityEvent({
        eventType: 'AUTH_VALIDATION_ERROR',
        details: { error: error instanceof Error ? error.message : 'Unknown error', actionType },
        riskLevel: 'high'
      });

      return {
        isValid: false,
        errors: ['Security validation failed. Please try again.'],
        riskLevel: 'high'
      };
    }
  },

  /**
   * Log security events to the database
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Try to use enhanced logging function first
      const { error } = await supabase.rpc('log_security_event_enhanced', {
        event_type: event.eventType,
        details: event.details || {},
        risk_level: event.riskLevel || 'low',
        ip_address: event.ipAddress || null,
        user_agent: event.userAgent || null
      });

      if (error) {
        console.error('Enhanced security logging failed, using fallback:', error);
        
        // Fallback to direct insertion
        await supabase.from('security_audit_logs').insert([{
          action_type: event.eventType,
          risk_level: event.riskLevel || 'low',
          metadata: event.details || {},
          ip_address: event.ipAddress || null,
          user_agent: event.userAgent || null
        }]);
      }
    } catch (error) {
      console.error('Security event logging failed:', error);
      // Don't throw - we don't want security logging failures to break the application
    }
  },

  /**
   * Check if a user's account is locked due to security violations
   */
  async checkAccountLockStatus(email: string): Promise<{ isLocked: boolean; lockedUntil?: Date; reason?: string }> {
    try {
      const { data, error } = await supabase
        .from('rate_limit_violations')
        .select('*')
        .or(`user_id.eq.${supabase.auth.getUser()?.then(u => u.data.user?.id)},ip_address.eq.${this.getCurrentIP()}`)
        .eq('action_type', 'auth_attempt')
        .gte('blocked_until', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking account lock status:', error);
        return { isLocked: false };
      }

      if (data && data.length > 0) {
        const lockRecord = data[0];
        return {
          isLocked: true,
          lockedUntil: new Date(lockRecord.blocked_until),
          reason: 'Multiple failed authentication attempts'
        };
      }

      return { isLocked: false };
    } catch (error) {
      console.error('Account lock check failed:', error);
      return { isLocked: false };
    }
  },

  /**
   * Get current user's IP address (best effort)
   */
  getCurrentIP(): string | null {
    // This is a simplified approach - in production you'd want to get this from the server
    // or use a service to detect the actual IP
    return null;
  },

  /**
   * Get security audit logs for admin users
   */
  async getSecurityAuditLogs(limit: number = 100): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('security_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching security audit logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch security audit logs:', error);
      return [];
    }
  },

  /**
   * Check for suspicious activity patterns
   */
  async detectSuspiciousActivity(userId?: string): Promise<{ 
    suspicious: boolean; 
    patterns: string[]; 
    riskLevel: 'low' | 'medium' | 'high' | 'critical' 
  }> {
    try {
      const patterns: string[] = [];
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

      // Check for rapid successive login attempts
      const { data: recentAttempts, error } = await supabase
        .from('security_audit_logs')
        .select('*')
        .eq('action_type', 'AUTH_VALIDATION')
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
        .order('created_at', { ascending: false });

      if (!error && recentAttempts && recentAttempts.length > 10) {
        patterns.push('Rapid authentication attempts detected');
        riskLevel = 'high';
      }

      // Check for failed password attempts with different emails
      const failedAttempts = recentAttempts?.filter(log => {
        const metadata = log.metadata as any;
        return metadata?.errors_count && metadata.errors_count > 0;
      }) || [];

      if (failedAttempts.length > 5) {
        patterns.push('Multiple failed authentication attempts');
        riskLevel = riskLevel === 'high' ? 'critical' : 'high';
      }

      return {
        suspicious: patterns.length > 0,
        patterns,
        riskLevel
      };
    } catch (error) {
      console.error('Error detecting suspicious activity:', error);
      return {
        suspicious: false,
        patterns: [],
        riskLevel: 'low'
      };
    }
  },

  /**
   * Sanitize and validate user input for security
   */
  sanitizeInput(input: string, maxLength: number = 1000): string {
    if (!input) return '';
    
    // Remove potential script injections
    let sanitized = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();

    // Limit length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }
};