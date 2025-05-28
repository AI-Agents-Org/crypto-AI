import { Injectable, RendererFactory2, Inject, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    private renderer;
    private currentTheme: 'light' | 'dark' = 'light'; // Default theme
    private readonly themeStorageKey = 'app-theme';

    constructor(
        private rendererFactory: RendererFactory2,
        @Inject(DOCUMENT) private document: Document,
        @Inject(PLATFORM_ID) private platformId: Object
    ) {
        this.renderer = this.rendererFactory.createRenderer(null, null);
        console.log('ThemeService: Constructor - loading theme...');
        this.loadTheme();
    }

    private loadTheme() {
        if (isPlatformBrowser(this.platformId)) {
            const storedTheme = localStorage.getItem(this.themeStorageKey) as 'light' | 'dark';
            console.log('ThemeService: Stored theme from localStorage:', storedTheme);
            if (storedTheme) {
                this.setTheme(storedTheme, false); // Pass false to avoid loop with console.log
            } else {
                // Optional: Check for system preference if no theme is stored
                const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                console.log('ThemeService: Prefers dark scheme (system):', prefersDark);
                this.setTheme(prefersDark ? 'dark' : 'light', false);
            }
        }
    }

    private saveTheme(theme: 'light' | 'dark') {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem(this.themeStorageKey, theme);
            console.log('ThemeService: Theme saved to localStorage:', theme);
        }
    }

    setTheme(theme: 'light' | 'dark', fromToggle: boolean = true) {
        if (fromToggle) {
            console.log(`ThemeService: setTheme called with theme: ${theme}`);
        }
        this.currentTheme = theme;
        this.saveTheme(theme);

        if (theme === 'dark') {
            this.renderer.addClass(this.document.body, 'dark-theme');
            console.log('ThemeService: Added .dark-theme class to body');
        } else {
            this.renderer.removeClass(this.document.body, 'dark-theme');
            console.log('ThemeService: Removed .dark-theme class from body');
        }
    }

    toggleTheme() {
        console.log('ThemeService: toggleTheme called. Current theme:', this.currentTheme);
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    getCurrentTheme(): 'light' | 'dark' {
        return this.currentTheme;
    }
} 