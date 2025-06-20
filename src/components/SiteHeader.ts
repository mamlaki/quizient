class SiteHeader extends HTMLElement {
    constructor() {
        super();
    }

    async connectedCallback() {
        const headerPartialPath = `${import.meta.env.BASE_URL}partials/header-content.html`;

        try {
            const response = await fetch(headerPartialPath);
            if (!response.ok) {
                throw new Error(`Failed to fetch header content: ${response.statusText}`);
            }
            const headerHTML = await response.text();
            this.innerHTML = headerHTML;
            this.classList.add('loaded');
            this.updateNavLinks();
            this.initScrollTransition();
        } catch (error) {
            console.error('Error loading header: ', error);
            this.classList.add('loaded');
        }
    }

    updateNavLinks() {
        const normalizePath = (path: string): string => {
            return path.replace(/\/$/, '') || '/';
        }
        const links = this.querySelectorAll('a');
        const currentPath = normalizePath(window.location.pathname);
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return; 

            let linkPath = normalizePath(new URL(href, window.location.href).pathname);

            if (linkPath === currentPath) {
                link.classList.remove('text-gray-700');
                link.classList.add('text-sky-600', 'dark:text-sky-400');
            } else {
                link.classList.remove('text-sky-600');
                link.classList.add('text-gray-700');
            }
        })
    }

    private initScrollTransition() {
        const header = this.querySelector('#main-header');
        if (!header) return;

        const toggle = () => {
            header.classList.toggle('scrolled', window.scrollY > 10);
        };

        toggle();
        window.addEventListener('scroll', toggle);
    }
}

customElements.define('site-header', SiteHeader);