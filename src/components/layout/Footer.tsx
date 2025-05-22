
import { Facebook, Twitter, Instagram } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-puma-blue-50 border-t">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6 text-puma-blue-500"
              >
                <path d="M12 22c7.5 0 10-8 10-10a3.076 3.076 0 0 0-5.954-1" />
                <path d="M17.5 11.5a3.5 3.5 0 0 0-7 0" />
                <path d="M5 10.5 A3.5 3.5 0 0 1 8.5 7" />
                <path d="M2 12c0 2 2.5 10 10 10s10-8 10-10c0-1.688-1.5-3-3-3 0-1.5-1.5-3-3-3-1.022 0-1.917.548-2.410 1.364" />
                <path d="M8.5 7c-.99 0-1.898.38-2.575 1" />
                <path d="M2 12c0-1.688 1.5-3 3-3" />
              </svg>
              <h3 className="text-xl font-bold text-puma-blue-500">Puma-AI</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              The comprehensive platform for managing football teams and clubs.
            </p>
            <div className="flex space-x-4">
              <a 
                href="#" 
                className="text-muted-foreground hover:text-puma-blue-500 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a 
                href="#" 
                className="text-muted-foreground hover:text-puma-blue-500 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a 
                href="#" 
                className="text-muted-foreground hover:text-puma-blue-500 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-base mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/features" className="hover:text-puma-blue-500 transition-colors">Features</a></li>
              <li><a href="/pricing" className="hover:text-puma-blue-500 transition-colors">Pricing</a></li>
              <li><a href="/integrations" className="hover:text-puma-blue-500 transition-colors">Integrations</a></li>
              <li><a href="/documentation" className="hover:text-puma-blue-500 transition-colors">Documentation</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-base mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/about" className="hover:text-puma-blue-500 transition-colors">About</a></li>
              <li><a href="/blog" className="hover:text-puma-blue-500 transition-colors">Blog</a></li>
              <li><a href="/careers" className="hover:text-puma-blue-500 transition-colors">Careers</a></li>
              <li><a href="/contact" className="hover:text-puma-blue-500 transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-base mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/privacy" className="hover:text-puma-blue-500 transition-colors">Privacy Policy</a></li>
              <li><a href="/terms" className="hover:text-puma-blue-500 transition-colors">Terms of Service</a></li>
              <li><a href="/cookie-policy" className="hover:text-puma-blue-500 transition-colors">Cookie Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Puma-AI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
