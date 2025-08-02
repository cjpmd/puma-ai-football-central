import { validatePasswordStrength } from "@/utils/inputValidation";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const validation = validatePasswordStrength(password);
  
  if (!password) return null;

  const strength = validation.isValid ? 'strong' : validation.errors.length <= 2 ? 'medium' : 'weak';
  
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex space-x-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={cn(
              "h-1 flex-1 rounded-full bg-muted",
              strength === 'strong' && "bg-green-500",
              strength === 'medium' && level <= 2 && "bg-yellow-500",
              strength === 'weak' && level === 1 && "bg-red-500"
            )}
          />
        ))}
      </div>
      
      {!validation.isValid && (
        <div className="space-y-1">
          {validation.errors.map((error, index) => (
            <p key={index} className="text-xs text-muted-foreground">
              • {error}
            </p>
          ))}
        </div>
      )}
      
      {validation.isValid && (
        <p className="text-xs text-green-600">
          ✓ Strong password
        </p>
      )}
    </div>
  );
}