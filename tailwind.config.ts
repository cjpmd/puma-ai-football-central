
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			spacing: {
				'safe-top': 'env(safe-area-inset-top)',
				'safe-bottom': 'env(safe-area-inset-bottom)',
				'safe-left': 'env(safe-area-inset-left)',
				'safe-right': 'env(safe-area-inset-right)',
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// Brand-specific colors — purple palette (iOS redesign)
				"puma-purple": {
					50: "#f5f0ff",
					100: "#ede5ff",
					200: "#d8c9ff",
					300: "#b89fff",
					400: "#9370f5",
					500: "#7c4de8",
					600: "#6930d0",
					700: "#5520a8",
					800: "#3d1680",
					900: "#280d58",
					950: "#160637",
				},
				// Legacy alias kept for migration — maps to purple
				"puma-blue": {
					50: "#f5f0ff",
					100: "#ede5ff",
					200: "#d8c9ff",
					300: "#b89fff",
					400: "#9370f5",
					500: "#7c4de8",
					600: "#6930d0",
					700: "#5520a8",
					800: "#3d1680",
					900: "#280d58",
				},
				"puma-green": {
					50: "#f5f0ff",
					100: "#ede5ff",
					200: "#d8c9ff",
					300: "#b89fff",
					400: "#9370f5",
					500: "#7c4de8",
					600: "#6930d0",
					700: "#5520a8",
					800: "#3d1680",
					900: "#280d58",
				},
				"puma-amber": "#FFC107",
				"puma-red": "#DC3545",
				// iOS liquid glass surface tokens
				"ios-bg": "#0A0511",
				"ios-bg2": "#150A1F",
				"ios-surface": "rgba(28,18,38,0.72)",
				"ios-glass": "rgba(255,255,255,0.06)",
				"ios-hairline": "rgba(255,255,255,0.08)",
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'ping': {
					'75%, 100%': {
						transform: 'scale(1.2)',
						opacity: '0'
					}
				},
				'flip': {
					'0%': {
						transform: 'rotateY(0deg)'
					},
					'100%': {
						transform: 'rotateY(180deg)'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'ping': 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
				'flip': 'flip 0.7s ease-in-out'
			},
			fontFamily: {
				sans: ['Inter', 'sans-serif'],
			},
			perspective: {
				'1000': '1000px',
			},
			rotate: {
				'y-180': 'rotateY(180deg)',
			}
		}
	},
	plugins: [
		require("tailwindcss-animate"),
		function({ addUtilities }) {
			const newUtilities = {
				'.perspective-1000': {
					perspective: '1000px',
				},
				'.transform-style-preserve-3d': {
					'transform-style': 'preserve-3d',
				},
				'.backface-hidden': {
					'backface-visibility': 'hidden',
				},
				'.rotate-y-180': {
					transform: 'rotateY(180deg)',
				},
			}
			addUtilities(newUtilities)
		}
	],
} satisfies Config;
